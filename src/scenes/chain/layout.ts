import * as THREE from 'three'
import type { CameraShot, Vec3 } from '../../core/cameraRig'
import type { Station } from '../../core/store'

/**
 * Spatial layout of the mineral chain.
 * Six stations sit on one haul road that runs in a U: steps 1-3 along the back
 * row (west to east), a bend on the east side, then steps 4-6 along the front
 * row (east to west). The ground is y = 0. Distance `d` along the road starts
 * at the mine (d = 0) and ends at the buyer.
 */

export const ROW_BACK = -6
export const ROW_FRONT = 6
export const COL = 12

/** Road anchor for each station, index 1-6 (index 0 is unused). */
export const stationAt: THREE.Vector3[] = [
  new THREE.Vector3(0, 0, 0),
  new THREE.Vector3(-COL, 0, ROW_BACK),
  new THREE.Vector3(0, 0, ROW_BACK),
  new THREE.Vector3(COL, 0, ROW_BACK),
  new THREE.Vector3(COL, 0, ROW_FRONT),
  new THREE.Vector3(0, 0, ROW_FRONT),
  new THREE.Vector3(-COL, 0, ROW_FRONT),
]

/** Where the loaded truck starts: the ramp out of the pit. */
const PIT_EXIT = new THREE.Vector3(-COL + 1.4, 0, ROW_BACK)
/** Last point: the buyer's yard. */
const BUYER_YARD = new THREE.Vector3(-COL - 1.2, 0, ROW_FRONT)

function roadControlPoints(): THREE.Vector3[] {
  const east = COL + 5.2
  return [
    PIT_EXIT,
    new THREE.Vector3(-6, 0, ROW_BACK),
    stationAt[2].clone(),
    new THREE.Vector3(6, 0, ROW_BACK),
    stationAt[3].clone(),
    new THREE.Vector3(east - 1.6, 0, ROW_BACK + 0.2),
    new THREE.Vector3(east, 0, ROW_BACK + 2.4),
    new THREE.Vector3(east + 0.2, 0, 0),
    new THREE.Vector3(east, 0, ROW_FRONT - 2.4),
    new THREE.Vector3(east - 1.6, 0, ROW_FRONT - 0.2),
    stationAt[4].clone(),
    new THREE.Vector3(6, 0, ROW_FRONT),
    stationAt[5].clone(),
    new THREE.Vector3(-6, 0, ROW_FRONT),
    stationAt[6].clone(),
    BUYER_YARD,
  ]
}

export interface Route {
  /** Uniformly resampled positions, ROUTE_DS apart. */
  pos: Float32Array
  count: number
  length: number
}

export const ROUTE_DS = 0.05

function resample(points: THREE.Vector3[]): Route {
  const cum = [0]
  for (let i = 1; i < points.length; i++) cum.push(cum[i - 1] + points[i].distanceTo(points[i - 1]))
  const length = cum[cum.length - 1]
  const count = Math.floor(length / ROUTE_DS) + 1
  const pos = new Float32Array(count * 3)
  let j = 0
  const tmp = new THREE.Vector3()
  for (let i = 0; i < count; i++) {
    const d = Math.min(i * ROUTE_DS, length)
    while (j < cum.length - 2 && cum[j + 1] < d) j++
    const seg = cum[j + 1] - cum[j] || 1
    tmp.lerpVectors(points[j], points[j + 1], (d - cum[j]) / seg)
    pos[i * 3] = tmp.x
    pos[i * 3 + 1] = tmp.y
    pos[i * 3 + 2] = tmp.z
  }
  return { pos, count, length }
}

const curve = new THREE.CatmullRomCurve3(roadControlPoints(), false, 'centripetal', 0.5)
export const road: Route = resample(curve.getSpacedPoints(600))

/** Writes the road position at distance d into out. */
export function roadPoint(d: number, out: THREE.Vector3) {
  const f = Math.min(Math.max(d, 0), road.length) / ROUTE_DS
  const i = Math.min(Math.floor(f), road.count - 2)
  const k = f - i
  const p = road.pos
  return out.set(p[i * 3] + (p[i * 3 + 3] - p[i * 3]) * k, p[i * 3 + 1] + (p[i * 3 + 4] - p[i * 3 + 1]) * k, p[i * 3 + 2] + (p[i * 3 + 5] - p[i * 3 + 2]) * k)
}

/** Unit tangent (direction of increasing d) at distance d. */
export function roadTangent(d: number, out: THREE.Vector3) {
  const i = Math.min(Math.max(Math.floor(d / ROUTE_DS), 0), road.count - 3)
  const p = road.pos
  return out.set(p[i * 3 + 6] - p[i * 3], 0, p[i * 3 + 8] - p[i * 3 + 2]).normalize()
}

/** Distance along the road closest to a point. */
export function distanceAt(target: THREE.Vector3): number {
  let best = 0
  let bestD = Infinity
  const p = road.pos
  for (let i = 0; i < road.count; i++) {
    const dx = p[i * 3] - target.x
    const dz = p[i * 3 + 2] - target.z
    const dd = dx * dx + dz * dz
    if (dd < bestD) {
      bestD = dd
      best = i
    }
  }
  return best * ROUTE_DS
}

/** Distance along the road of each station, index 1-6. */
export const stationD: number[] = stationAt.map((p, i) => (i === 0 ? 0 : distanceAt(p)))

/** Where trucks drop part of the load in the "before" scene: on the east bend. */
export const DROP_D = distanceAt(new THREE.Vector3(COL + 5.2, 0, 0))

/** Sideways offset of the bypass round the weighbridge, towards the camera side of the road. */
export const BYPASS_OFFSET = 2.3
const BYPASS_HALF = 4.2

/** 0..1 bump that moves a bypassing truck off the road round the weighbridge. */
export function bypassAmount(d: number) {
  const x = Math.abs(d - stationD[3]) / BYPASS_HALF
  if (x >= 1) return 0
  return 0.5 + 0.5 * Math.cos(Math.PI * x)
}

/** Flat ribbon along the road, `half` wide each side, lifted by `lift`. */
export function roadRibbon(half: number, lift = 0.02, from = 0, to = road.length) {
  const pos: number[] = []
  const idx: number[] = []
  const p = road.pos
  const step = 3
  const i0 = Math.floor(from / ROUTE_DS)
  const i1 = Math.min(Math.floor(to / ROUTE_DS), road.count - 1)
  let n = 0
  for (let i = i0; i <= i1; i += step) {
    const j = Math.min(i + step, road.count - 1)
    const a = i === j ? i - step : i
    const tx = p[j * 3] - p[a * 3]
    const tz = p[j * 3 + 2] - p[a * 3 + 2]
    const len = Math.hypot(tx, tz) || 1
    const nx = (-tz / len) * half
    const nz = (tx / len) * half
    pos.push(p[i * 3] - nx, p[i * 3 + 1] + lift, p[i * 3 + 2] - nz, p[i * 3] + nx, p[i * 3 + 1] + lift, p[i * 3 + 2] + nz)
    if (n > 0) {
      const k = (n - 1) * 2
      idx.push(k, k + 1, k + 2, k + 1, k + 3, k + 2)
    }
    n++
  }
  const g = new THREE.BufferGeometry()
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3))
  g.setIndex(idx)
  g.computeVertexNormals()
  return g
}

/** Line segments along the road, offset sideways by `side`, optionally dashed. */
export function roadEdge(side: number, lift = 0.04, dash = 0, from = 0, to = road.length, offsetFn?: (d: number) => number) {
  const pts: number[] = []
  const p = road.pos
  const step = 2
  const i0 = Math.floor(from / ROUTE_DS)
  const i1 = Math.min(Math.floor(to / ROUTE_DS), road.count - 1)
  const at = (i: number, out: number[]) => {
    const a = Math.max(i - 1, 0)
    const b = Math.min(i + 1, road.count - 1)
    const tx = p[b * 3] - p[a * 3]
    const tz = p[b * 3 + 2] - p[a * 3 + 2]
    const len = Math.hypot(tx, tz) || 1
    const s = side + (offsetFn ? offsetFn(i * ROUTE_DS) : 0)
    out.push(p[i * 3] + (-tz / len) * s, p[i * 3 + 1] + lift, p[i * 3 + 2] + (tx / len) * s)
  }
  for (let i = i0; i + step <= i1; i += step) {
    if (dash > 0 && Math.floor((i - i0) / dash) % 2 === 1) continue
    at(i, pts)
    at(i + step, pts)
  }
  const g = new THREE.BufferGeometry()
  g.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3))
  return g
}

/** Builds line-segment geometry from a polyline. */
export function polyline(points: Vec3[], dash = 0): THREE.BufferGeometry {
  const pts: number[] = []
  for (let i = 0; i < points.length - 1; i++) {
    const [ax, ay, az] = points[i]
    const [bx, by, bz] = points[i + 1]
    if (dash <= 0) {
      pts.push(ax, ay, az, bx, by, bz)
      continue
    }
    const len = Math.hypot(bx - ax, by - ay, bz - az)
    const n = Math.max(1, Math.round(len / dash))
    for (let k = 0; k < n; k += 2) {
      const t0 = k / n
      const t1 = Math.min((k + 1) / n, 1)
      pts.push(ax + (bx - ax) * t0, ay + (by - ay) * t0, az + (bz - az) * t0, ax + (bx - ax) * t1, ay + (by - ay) * t1, az + (bz - az) * t1)
    }
  }
  const g = new THREE.BufferGeometry()
  g.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3))
  return g
}

/**
 * Camera framing. Each frame names the centre of the content and the camera
 * distance. The centre is shifted so it lands midway between the left and
 * right panel columns, not in the middle of the screen.
 */
interface Frame {
  cx: number
  cz: number
  dist: number
}

const frames: Frame[] = [
  { cx: 1, cz: 1.2, dist: 55 },
  { cx: -12.4, cz: -7.2, dist: 19 },
  { cx: 0, cz: -7.6, dist: 17.5 },
  { cx: 14.4, cz: -5.2, dist: 21.5 },
  { cx: 13.4, cz: 5.0, dist: 20 },
  { cx: 0.4, cz: 6.0, dist: 21 },
  { cx: -12.8, cz: 5.0, dist: 19 },
]

/** Camera direction: from the front (+z), raised about 44 degrees. */
const VIEW = new THREE.Vector3(0, 0.7, 0.72).normalize()
/** Panel columns leave the visual centre about 95 px right of the screen centre at 1920 px. */
const RIGHT_SHIFT_PER_UNIT_DIST = 0.0675

export function shotFor(station: Station): CameraShot {
  const f = frames[station]
  const tx = f.cx - RIGHT_SHIFT_PER_UNIT_DIST * f.dist
  const target: Vec3 = [tx, 0.6, f.cz]
  return { position: [tx + VIEW.x * f.dist, 0.6 + VIEW.y * f.dist, f.cz + VIEW.z * f.dist], target }
}
