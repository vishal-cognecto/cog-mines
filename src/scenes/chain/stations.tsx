import { useFrame } from '@react-three/fiber'
import { useMemo, useRef } from 'react'
import * as THREE from 'three'
import type { Mode } from '../../config/content'
import { theme } from '../../config/theme'
import type { Vec3 } from '../../core/cameraRig'
import { HoloText } from '../../holo/HoloText'
import { useHoloLine, useHoloMesh } from '../../holo/hooks'
import { pulses, DROP_PULSE } from './chainStore'
import { BYPASS_OFFSET, DROP_D, bypassAmount, roadEdge, roadPoint, roadTangent, stationAt, stationD } from './layout'
import {
  Blink,
  CameraPole,
  Gantry,
  GroundRect,
  Heap,
  HoloBox,
  Note,
  Person,
  Polyline,
  PulseRing,
  QrPattern,
  Screen,
  StationBadge,
  FocusGroup,
  pulseOf,
  tone,
} from './parts'

interface StationProps {
  mode: Mode
}

const at = (i: number): Vec3 => [stationAt[i].x, 0, stationAt[i].z]

/** Front-row badges sit low, in front of the road, so close-ups never put them on the back row. */
const FRONT_BADGE_Y = 0.9
const FRONT_BADGE_DZ = 1.75

/** Badge colour: red where the number is typed in today, green where it is captured. */
const badgeTone = (mode: Mode) => (mode === 'before' ? tone.gap : tone.control)

/* ------------------------------------------------------------------ */
/* 1 · Stone mine                                                      */
/* ------------------------------------------------------------------ */

const PIT: Vec3 = [-1.9, 0, -2.6]
const PIT_RX = 2.5
const PIT_RZ = 1.5
const PIT_BENCHES = 3
const PIT_BENCH_H = 0.42

function pitRing(rx: number, rz: number, y: number, out: number[]) {
  const n = 72
  for (let i = 0; i < n; i++) {
    const a0 = (i / n) * Math.PI * 2
    const a1 = ((i + 1) / n) * Math.PI * 2
    out.push(Math.cos(a0) * rx, y, Math.sin(a0) * rz, Math.cos(a1) * rx, y, Math.sin(a1) * rz)
  }
}

/** Small open pit: benches step down from the ground to the floor. */
function Pit() {
  const geom = useMemo(() => {
    const pts: number[] = []
    for (let k = 0; k <= PIT_BENCHES; k++) {
      const s = 1 - k * 0.22
      pitRing(PIT_RX * s, PIT_RZ * s, -k * PIT_BENCH_H, pts)
      if (k > 0) pitRing(PIT_RX * (s + 0.08), PIT_RZ * (s + 0.08), -(k - 1) * PIT_BENCH_H - PIT_BENCH_H * 0.05, pts)
    }
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3))
    return g
  }, [])
  const floor = useMemo(() => new THREE.CircleGeometry(1, 48).rotateX(-Math.PI / 2), [])
  const line = useHoloLine({ color: tone.edge, intensity: 1.3, opacity: 0.8, scan: 0.3 })
  const fill = useHoloMesh({ color: theme.brand.primaryTo, intensity: 0.8, opacity: 0.22, rim: 0, scan: 0.3 })
  const s = 1 - PIT_BENCHES * 0.22
  return (
    <group position={PIT}>
      <lineSegments geometry={geom} material={line} />
      <mesh geometry={floor} material={fill} scale={[PIT_RX * s, 1, PIT_RZ * s]} position-y={-PIT_BENCHES * PIT_BENCH_H + 0.01} />
      {/* Ramp from the pit floor up to the road. */}
      <Polyline
        points={[
          [PIT_RX * s * 0.6, -PIT_BENCHES * PIT_BENCH_H, 0.3],
          [PIT_RX * 0.9, -0.4, 0.9],
          [PIT_RX + 0.9, 0, 2.6],
        ]}
        color={tone.edge}
        intensity={1.4}
      />
      <Excavator at={[-0.6, -PIT_BENCHES * PIT_BENCH_H, -0.1]} />
    </group>
  )
}

function Excavator({ at: p }: { at: Vec3 }) {
  const house = useRef<THREE.Group>(null)
  useFrame(({ clock }) => {
    if (house.current) house.current.rotation.y = 0.4 + Math.sin(clock.elapsedTime * 0.9) * 0.9
  })
  return (
    <group position={p}>
      <HoloBox size={[0.9, 0.2, 0.2]} position={[0, 0.1, 0.24]} />
      <HoloBox size={[0.9, 0.2, 0.2]} position={[0, 0.1, -0.24]} />
      <group ref={house} position-y={0.22}>
        <HoloBox size={[0.7, 0.36, 0.55]} position={[-0.08, 0.18, 0]} />
        <HoloBox size={[0.9, 0.1, 0.12]} position={[0.62, 0.5, 0]} rotation={[0, 0, 0.5]} color={tone.edge} />
        <HoloBox size={[0.6, 0.08, 0.1]} position={[1.12, 0.42, 0]} rotation={[0, 0, -1.2]} color={tone.edge} />
      </group>
    </group>
  )
}

/** 10 x 10 grid of loads. `entered` of them are on the books; the rest show as red ghosts. */
function LoadGrid({ at: p, entered, enteredColor }: { at: Vec3; entered: number; enteredColor: string }) {
  const { solid, ghost } = useMemo(() => {
    const cube = new THREE.BoxGeometry(0.15, 0.15, 0.15)
    const solidParts: number[] = []
    const ghostParts: number[] = []
    const edges = new THREE.EdgesGeometry(cube)
    const e = edges.getAttribute('position')
    for (let i = 0; i < 100; i++) {
      const x = (i % 10) * 0.22 - 0.99
      const z = Math.floor(i / 10) * 0.22 - 0.99
      const target = i < entered ? solidParts : ghostParts
      for (let k = 0; k < e.count; k++) target.push(e.getX(k) + x, e.getY(k) + 0.08, e.getZ(k) + z)
    }
    const mk = (arr: number[]) => {
      const g = new THREE.BufferGeometry()
      g.setAttribute('position', new THREE.Float32BufferAttribute(arr, 3))
      return g
    }
    return { solid: mk(solidParts), ghost: mk(ghostParts) }
  }, [entered])
  const solidMat = useHoloLine({ color: enteredColor, intensity: 1.7, opacity: 0.95, scan: 0 }, [enteredColor])
  const ghostMat = useHoloLine({ color: tone.gap, intensity: 1.9, opacity: 0.75, scan: 0 })
  return (
    <group position={p}>
      <lineSegments geometry={solid} material={solidMat} />
      <lineSegments geometry={ghost} material={ghostMat} />
    </group>
  )
}

/** Hovering quadcopter with a scan cone. */
function Drone({ at: p, sweep = 1.2 }: { at: Vec3; sweep?: number }) {
  const ref = useRef<THREE.Group>(null)
  const cone = useMemo(() => new THREE.ConeGeometry(1.4, 2.6, 4, 1, true).translate(0, -1.3, 0).rotateY(Math.PI / 4), [])
  const coneMat = useHoloMesh({ color: tone.control, intensity: 1.0, opacity: 0.13, rim: 0.5, scan: 1 })
  useFrame(({ clock }) => {
    const t = clock.elapsedTime
    if (ref.current) {
      ref.current.position.x = p[0] + Math.sin(t * 0.5) * sweep
      ref.current.position.y = p[1] + Math.sin(t * 1.7) * 0.08
    }
  })
  return (
    <group ref={ref} position={p}>
      <HoloBox size={[0.4, 0.12, 0.4]} color={tone.control} edge={tone.control} opacity={0.6} />
      {[
        [0.32, 0.32],
        [-0.32, 0.32],
        [0.32, -0.32],
        [-0.32, -0.32],
      ].map(([x, z], i) => (
        <HoloBox key={i} size={[0.28, 0.02, 0.28]} position={[x, 0.08, z]} color={tone.control} edge={tone.control} opacity={0.3} />
      ))}
      <mesh geometry={cone} material={coneMat} />
    </group>
  )
}

/** Dashed fence posts round the lease boundary. */
function GeoFence({ center, w, d }: { center: Vec3; w: number; d: number }) {
  const geom = useMemo(() => {
    const pts: number[] = []
    const corners: [number, number][] = [
      [-w / 2, -d / 2],
      [w / 2, -d / 2],
      [w / 2, d / 2],
      [-w / 2, d / 2],
    ]
    const h = 0.7
    for (let c = 0; c < 4; c++) {
      const [x0, z0] = corners[c]
      const [x1, z1] = corners[(c + 1) % 4]
      const len = Math.hypot(x1 - x0, z1 - z0)
      const n = Math.round(len / 0.45)
      for (let k = 0; k < n; k++) {
        const t = k / n
        const x = x0 + (x1 - x0) * t
        const z = z0 + (z1 - z0) * t
        pts.push(x, 0, z, x, h, z)
        if (k % 2 === 0) {
          const t2 = (k + 1) / n
          pts.push(x, h, z, x0 + (x1 - x0) * t2, h, z0 + (z1 - z0) * t2)
        }
      }
    }
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3))
    return g
  }, [w, d])
  const mat = useHoloLine({ color: tone.control, intensity: 1.6, opacity: 0.8, scan: 0.3 })
  return <lineSegments position={center} geometry={geom} material={mat} />
}

/** A hand-held tablet: the inspector's mobile app. */
function Inspector({ at: p }: { at: Vec3 }) {
  return (
    <group position={p}>
      <Person at={[0, 0, 0]} color={tone.control} scale={0.9} />
      <HoloBox size={[0.34, 0.24, 0.03]} position={[0.3, 0.85, 0.2]} rotation={[-0.4, -0.4, 0]} color={tone.control} edge={tone.control} opacity={0.7} />
    </group>
  )
}

export function MineStation({ mode }: StationProps) {
  const p = at(1)
  const before = mode === 'before'
  return (
    <FocusGroup n={1}>
      <group>
        <group position={p}>
          <Pit />
          <LoadGrid at={[-1.6, 0, 1.5]} entered={before ? 60 : 100} enteredColor={before ? tone.edge : tone.control} />
          {before ? (
            <>
              <Note at={[-1.6, 0.35, 3.05]} color={theme.holo.ice} size={0.3}>
                100 loads dug
              </Note>
              <Note at={[0.3, 0.2, 0.9]} color={tone.edge} size={0.22}>
                60 entered
              </Note>
              <Note at={[0.55, 0.2, 2.1]} color={tone.gap} size={0.22}>
                40 never entered
              </Note>
              <Screen at={[-1.9, 2.5, -2.6]} w={2.6} h={0.95} color={tone.gap} fill={tone.gap}>
                <HoloText position={[0, 0.18, 0.01]} fontSize={0.2} variant="mono" color={theme.holo.ice} glow={1.4}>
                  HMGIS · quantity dug
                </HoloText>
                <HoloText position={[0, -0.16, 0.01]} fontSize={0.3} variant="hudBold" color={tone.gap} glow={2}>
                  60 ENTERED
                </HoloText>
              </Screen>
              <Note at={[-1.9, 1.55, -2.6]} color={tone.gap} size={0.2}>
                typed by the contractor
              </Note>
            </>
          ) : (
            <>
              <GeoFence center={[-1.5, 0, -1.0]} w={6.2} d={5.4} />
              <Note at={[-4.4, 1.0, -3.8]} color={tone.control} size={0.22}>
                geo-fence
              </Note>
              <Drone at={[-1.9, 3.2, -2.6]} />
              <Note at={[-1.9, 4.05, -2.6]} color={tone.control} size={0.22}>
                drone survey · 100 loads measured
              </Note>
              <Inspector at={[1.6, 0, -2.4]} />
              <Note at={[1.7, 1.6, -2.4]} color={tone.control} size={0.2}>
                inspector app
              </Note>
              <Note at={[-1.6, 0.35, 3.05]} color={theme.holo.ice} size={0.3}>
                100 dug · 100 on the books
              </Note>
            </>
          )}
          <PulseRing at={[1.4, 0.03, 0]} radius={1.2} color={before ? tone.gap : tone.control} pulse={pulseOf(pulses, 1)} />
        </group>
        <StationBadge at={[p[0], 5.2, p[2] - 2]} n={1} title="Stone mine" color={badgeTone(mode)} />
      </group>
    </FocusGroup>
  )
}

/* ------------------------------------------------------------------ */
/* 2 · Pass                                                            */
/* ------------------------------------------------------------------ */

function Lock({ at: p }: { at: Vec3 }) {
  const arc = useMemo(() => {
    const pts: Vec3[] = []
    for (let i = 0; i <= 16; i++) {
      const a = (i / 16) * Math.PI
      pts.push([Math.cos(a) * 0.13, 0.12 + Math.sin(a) * 0.15, 0])
    }
    return pts
  }, [])
  return (
    <group position={p}>
      <HoloBox size={[0.36, 0.26, 0.04]} color={tone.control} edge={tone.control} opacity={0.6} />
      <Polyline points={arc} color={tone.control} intensity={2} />
    </group>
  )
}

export function PassStation({ mode }: StationProps) {
  const p = at(2)
  const before = mode === 'before'
  return (
    <FocusGroup n={2}>
      <group>
        <group position={p}>
          {/* Site office where the pass is raised. */}
          <HoloBox size={[1.6, 1.0, 1.1]} position={[0, 0.5, -2.0]} />
          <HoloBox
            size={[0.5, 0.35, 0.05]}
            position={[0, 1.2, -1.45]}
            rotation={[-0.3, 0, 0]}
            color={before ? tone.gap : tone.control}
            edge={before ? tone.gap : tone.control}
          />
          {before ? (
            <Screen at={[0, 3.2, -2.2]} w={3.6} h={2.0} color={tone.edge}>
              <HoloText position={[-0.4, 0.62, 0.01]} fontSize={0.26} variant="hudBold" color={theme.holo.white} glow={1.6}>
                TEMPORARY PASS
              </HoloText>
              <HoloText position={[-1.55, 0.15, 0.01]} fontSize={0.22} variant="mono" color={theme.holo.ice} glow={1.4} anchorX="left">
                Qty: 60
              </HoloText>
              <HoloText position={[-1.55, -0.2, 0.01]} fontSize={0.17} variant="mono" color={theme.holo.cyan} glow={1.2} anchorX="left">
                from step 1 · nobody checked
              </HoloText>
              <group position={[1.05, -0.45, 0.02]} rotation-z={0.28}>
                <HoloText fontSize={0.24} variant="hudBold" color={tone.gap} glow={2.2}>
                  SELF
                </HoloText>
                <HoloText position={[0, -0.27, 0]} fontSize={0.24} variant="hudBold" color={tone.gap} glow={2.2}>
                  ISSUED
                </HoloText>
              </group>
            </Screen>
          ) : (
            <Screen at={[0, 3.2, -2.2]} w={3.6} h={2.0} color={tone.control}>
              <QrPattern at={[-1.05, -0.05, 0.01]} size={1.25} />
              <HoloText position={[-0.25, 0.6, 0.01]} fontSize={0.26} variant="hudBold" color={theme.holo.white} glow={1.6} anchorX="left">
                QR PASS
              </HoloText>
              <HoloText position={[-0.25, 0.2, 0.01]} fontSize={0.18} variant="mono" color={tone.control} glow={1.6} anchorX="left">
                Vahan: vehicle ✓
              </HoloText>
              <HoloText position={[-0.25, -0.1, 0.01]} fontSize={0.18} variant="mono" color={tone.control} glow={1.6} anchorX="left">
                GST: buyer ✓
              </HoloText>
              <HoloText position={[-0.25, -0.4, 0.01]} fontSize={0.18} variant="mono" color={tone.control} glow={1.6} anchorX="left">
                Locked record
              </HoloText>
              <Lock at={[1.45, -0.5, 0.02]} />
            </Screen>
          )}
          <PulseRing at={[0, 0.03, 0]} radius={1.2} color={before ? tone.gap : tone.control} pulse={pulseOf(pulses, 2)} />
        </group>
        {before && (
          // The pass inherits the unchecked figure from step 1.
          <Polyline
            points={[
              [at(1)[0] - 0.4, 2.5, at(1)[2] - 2.6],
              [-6, 3.4, p[2] - 2.4],
              [p[0] - 1.8, 3.2, p[2] - 2.2],
            ]}
            color={tone.gap}
            dash={0.25}
            intensity={1.4}
          />
        )}
        {before && (
          <Note at={[-3.6, 3.75, p[2] - 2.3]} color={tone.gap} size={0.2}>
            figure from step 1
          </Note>
        )}
        <StationBadge at={[p[0], 5.2, p[2] - 2]} n={2} title={before ? 'Temporary pass' : 'Transit pass'} color={badgeTone(mode)} />
      </group>
    </FocusGroup>
  )
}

/* ------------------------------------------------------------------ */
/* 3 · Weighbridge and road                                            */
/* ------------------------------------------------------------------ */

function Cloud({ at: p }: { at: Vec3 }) {
  const mat = useHoloMesh({ color: tone.control, intensity: 1.4, opacity: 0.35, rim: 1.4 })
  return (
    <group position={p}>
      {(
        [
          [0, 0, 0, 0.32],
          [0.32, -0.05, 0, 0.25],
          [-0.32, -0.06, 0, 0.24],
          [0.12, 0.18, 0, 0.24],
        ] as const
      ).map(([x, y, z, r], i) => (
        <mesh key={i} position={[x, y, z]} material={mat}>
          <sphereGeometry args={[r, 14, 10]} />
        </mesh>
      ))}
    </group>
  )
}

/** The bypass track round the weighbridge, drawn with the same offset trucks use. */
function BypassTrack() {
  const geom = useMemo(() => roadEdge(0, 0.05, 3, stationD[3] - 4.4, stationD[3] + 4.4, (d) => BYPASS_OFFSET * bypassAmount(d)), [])
  const mat = useHoloLine({ color: tone.gap, intensity: 1.8, opacity: 0.9, scan: 0 })
  return <lineSegments geometry={geom} material={mat} />
}

/** Point on the road at distance d, pushed sideways by `side`. */
function besideRoad(d: number, side: number, y = 0): Vec3 {
  const p = roadPoint(d, new THREE.Vector3())
  const t = roadTangent(d, new THREE.Vector3())
  return [p.x - t.z * side, y, p.z + t.x * side]
}

export function WeighbridgeStation({ mode }: StationProps) {
  const p = at(3)
  const before = mode === 'before'
  const drop = besideRoad(DROP_D, -1.1)
  const gantry = besideRoad(DROP_D, 0)
  const dropYaw = (() => {
    const t = roadTangent(DROP_D, new THREE.Vector3())
    return Math.atan2(-t.z, t.x)
  })()
  return (
    <FocusGroup n={3}>
      <group>
        <group position={p}>
          {/* Scale platform on the road and the operator's cabin with its PC. */}
          <HoloBox size={[3.0, 0.12, 1.3]} position={[0, 0.06, 0]} color={tone.base} opacity={0.5} />
          <HoloBox size={[1.5, 1.1, 1.0]} position={[0, 0.55, -2.1]} />
          <HoloBox
            size={[0.55, 0.38, 0.05]}
            position={[0, 1.4, -1.6]}
            rotation={[-0.25, 0, 0]}
            color={before ? tone.gap : tone.control}
            edge={before ? tone.gap : tone.control}
          />
          <Note at={[0, 2.1, -1.6]} color={theme.holo.white} size={0.34}>
            42.0 t
          </Note>
          {before ? (
            <>
              <BypassGlobal />
              <Note at={[0, 2.55, -1.6]} color={tone.gap} size={0.2}>
                operator's own PC · editable
              </Note>
              <CameraPole at={[-2.9, 0, -0.9]} yaw={0.4} crossed />
              <Note at={[-2.9, 3.0, -0.9]} color={tone.gap} size={0.2}>
                no photo
              </Note>
              <Note at={[0, 0.5, 3.3]} color={tone.gap} size={0.24}>
                weighbridge skipped
              </Note>
              <Screen at={[3.4, 3.5, -2.4]} w={2.6} h={1.0} color={tone.gap} fill={tone.gap}>
                <HoloText position={[0, 0.24, 0.01]} fontSize={0.17} variant="mono" color={theme.holo.ice} glow={1.4}>
                  e-Rawaana · pass for this trip
                </HoloText>
                <HoloText position={[0, -0.12, 0.01]} fontSize={0.3} variant="hudBold" color={tone.gap} glow={2.2}>
                  CANCELLED
                </HoloText>
              </Screen>
              <Note at={[3.4, 2.75, -2.4]} color={tone.gap} size={0.18}>
                after the truck left, as if the trip never happened
              </Note>
            </>
          ) : (
            <>
              <CameraPole at={[-2.9, 0, -0.9]} yaw={0.35} />
              <Note at={[-2.9, 3.0, -0.9]} color={tone.control} size={0.2}>
                ANPR · photo per weighing
              </Note>
              <Cloud at={[2.4, 3.3, -2.3]} />
              <Polyline
                points={[
                  [0.2, 1.6, -1.6],
                  [2.2, 3.1, -2.3],
                ]}
                color={tone.control}
                dash={0.18}
                intensity={1.8}
              />
              <Blink at={[0.28, 1.4, -1.55]} color={tone.control} r={0.06} />
              <Note at={[2.4, 3.95, -2.3]} color={tone.control} size={0.2}>
                online · scale to system
              </Note>
              <Note at={[0, 2.55, -1.6]} color={tone.control} size={0.2}>
                no typing, no edits
              </Note>
            </>
          )}
          <PulseRing at={[0, 0.03, 0]} radius={1.8} color={before ? tone.gap : tone.control} pulse={pulseOf(pulses, 3)} />
        </group>
        {/* On the road after the weighbridge. */}
        {before ? (
          <group>
            <Heap at={drop} r={0.55} h={0.35} color={tone.gap} edge={tone.gap} opacity={0.3} />
            <Note at={[drop[0] + 0.2, 0.95, drop[2]]} color={tone.gap} size={0.24}>
              -20 t dropped
            </Note>
            <PulseRing at={[drop[0], 0.03, drop[2]]} radius={0.9} color={tone.gap} pulse={pulseOf(pulses, DROP_PULSE)} />
          </group>
        ) : (
          <group>
            <Gantry at={gantry} yaw={dropYaw} span={2.0} label="FASTag · route and timing" />
            <Note at={[gantry[0], 3.6, gantry[2]]} color={tone.control} size={0.2}>
              GPS: unplanned stops flagged
            </Note>
          </group>
        )}
        <StationBadge at={[p[0], 5.2, p[2] - 2]} n={3} title={before ? 'Weighbridge' : 'Weighbridge and road'} color={badgeTone(mode)} />
      </group>
    </FocusGroup>
  )
}

/** Wrapper so the bypass track sits in world space (it is built from the road). */
function BypassGlobal() {
  const p = at(3)
  return (
    <group position={[-p[0], 0, -p[2]]}>
      <BypassTrack />
    </group>
  )
}

/* ------------------------------------------------------------------ */
/* 4 · Crusher                                                         */
/* ------------------------------------------------------------------ */

/** Ten slabs of 10 t. Top `paper` slabs are red ghosts: stock that exists only on paper. */
function TonneStack({ at: p, paper }: { at: Vec3; paper: number }) {
  return (
    <group position={p}>
      {Array.from({ length: 10 }, (_, i) => {
        const ghost = i >= 10 - paper
        return (
          <HoloBox
            key={i}
            size={[0.9, 0.16, 0.9]}
            position={[0, 0.1 + i * 0.2, 0]}
            color={ghost ? tone.gap : tone.base}
            edge={ghost ? tone.gap : paper === 0 ? tone.control : tone.edge}
            ghost={ghost}
            opacity={0.4}
          />
        )
      })}
    </group>
  )
}

function Crusher() {
  const hopper = useMemo(() => new THREE.CylinderGeometry(0.9, 0.4, 1.0, 4, 1, true), [])
  const hopperEdges = useMemo(() => new THREE.EdgesGeometry(hopper), [hopper])
  const mat = useHoloMesh({ color: tone.base, intensity: 1.4, opacity: 0.45, rim: 1.2 })
  const edge = useHoloLine({ color: tone.edge, intensity: 1.8, opacity: 0.9 })
  return (
    <group>
      <group position={[0.4, 1.7, -2.6]} rotation-y={Math.PI / 4}>
        <mesh geometry={hopper} material={mat} />
        <lineSegments geometry={hopperEdges} material={edge} />
      </group>
      <HoloBox size={[0.9, 1.2, 0.9]} position={[0.4, 0.6, -2.6]} opacity={0.3} />
      {/* Conveyor to the gravel pile. */}
      <HoloBox size={[2.6, 0.08, 0.32]} position={[-1.2, 0.95, -2.9]} rotation={[0, 0.2, -0.38]} color={tone.base} opacity={0.4} />
      <Heap at={[-2.6, 0, -3.2]} r={0.9} h={0.5} />
    </group>
  )
}

export function CrusherStation({ mode }: StationProps) {
  const p = at(4)
  const before = mode === 'before'
  return (
    <FocusGroup n={4}>
      <group>
        <group position={p}>
          <Crusher />
          <Note at={[-2.6, 0.95, -3.2]} color={theme.holo.ice} size={0.22}>
            gravel out
          </Note>
          <Heap at={[2.2, 0, -2.4]} r={0.75} h={0.45} />
          <Note at={[2.2, 0.85, -2.4]} color={theme.holo.ice} size={0.22}>
            stone in
          </Note>
          <TonneStack at={[3.8, 0, -1.4]} paper={before ? 3 : 0} />
          {before ? (
            <>
              <Screen at={[3.8, 3.35, -1.4]} w={2.2} h={1.15} color={tone.gap} fill={tone.gap}>
                <HoloText position={[-0.9, 0.3, 0.01]} fontSize={0.2} variant="mono" color={theme.holo.ice} glow={1.4} anchorX="left">
                  100 t claimed
                </HoloText>
                <HoloText position={[-0.9, 0.0, 0.01]} fontSize={0.2} variant="mono" color={theme.holo.ice} glow={1.4} anchorX="left">
                  70 t arrived
                </HoloText>
                <HoloText position={[-0.9, -0.32, 0.01]} fontSize={0.24} variant="hudBold" color={tone.gap} glow={2} anchorX="left">
                  30 t ON PAPER
                </HoloText>
              </Screen>
              <Note at={[0.4, 3.0, -2.6]} color={tone.gap} size={0.2}>
                owner types in stone in, gravel out
              </Note>
            </>
          ) : (
            <>
              <HoloBox size={[1.6, 0.1, 1.2]} position={[1.6, 0.05, 0]} color={tone.control} edge={tone.control} opacity={0.3} />
              <CameraPole at={[2.6, 0, -1.0]} yaw={Math.PI - 0.5} />
              <Note at={[2.6, 0.5, 1.0]} color={tone.control} size={0.2}>
                gate weighbridge + ANPR
              </Note>
              <Screen at={[3.8, 3.35, -1.4]} w={2.3} h={1.15} color={tone.control}>
                <HoloText position={[-0.95, 0.3, 0.01]} fontSize={0.19} variant="mono" color={tone.control} glow={1.6} anchorX="left">
                  In: weighed
                </HoloText>
                <HoloText position={[-0.95, 0.0, 0.01]} fontSize={0.19} variant="mono" color={tone.control} glow={1.6} anchorX="left">
                  Out: GST invoice
                </HoloText>
                <HoloText position={[-0.95, -0.32, 0.01]} fontSize={0.23} variant="hudBold" color={theme.holo.white} glow={1.8} anchorX="left">
                  PAPER STOCK: 0
                </HoloText>
              </Screen>
              <Drone at={[-2.6, 2.6, -3.2]} sweep={0.4} />
              <Note at={[-2.6, 3.4, -3.2]} color={tone.control} size={0.2}>
                drone · stock on hand
              </Note>
            </>
          )}
          <PulseRing at={[0, 0.03, 0]} radius={1.4} color={before ? tone.gap : tone.control} pulse={pulseOf(pulses, 4)} />
        </group>
        <StationBadge at={[p[0] - 1.4, FRONT_BADGE_Y, p[2] + FRONT_BADGE_DZ]} n={4} title="Crusher" color={badgeTone(mode)} />
      </group>
    </FocusGroup>
  )
}

/* ------------------------------------------------------------------ */
/* 5 · Dealer                                                          */
/* ------------------------------------------------------------------ */

const BORDER_Z = 2.6

/** Inbound truck from another state, crossing the border through the gantry. */
function InboundTruck({ from, to }: { from: Vec3; to: Vec3 }) {
  const ref = useRef<THREE.Group>(null)
  const yaw = Math.atan2(-(to[2] - from[2]), to[0] - from[0])
  useFrame(({ clock }) => {
    const u = (clock.elapsedTime * 0.16) % 1
    if (!ref.current) return
    ref.current.position.set(from[0] + (to[0] - from[0]) * u, 0, from[2] + (to[2] - from[2]) * u)
    ref.current.scale.setScalar(Math.min(1, u * 8, (1 - u) * 8))
  })
  return (
    <group ref={ref} rotation-y={yaw}>
      <HoloBox size={[0.8, 0.3, 0.42]} position={[0, 0.25, 0]} color={tone.control} edge={tone.control} opacity={0.4} />
      <HoloBox size={[0.24, 0.3, 0.4]} position={[0.5, 0.3, 0]} color={tone.control} edge={tone.control} opacity={0.5} />
    </group>
  )
}

export function DealerStation({ mode }: StationProps) {
  const p = at(5)
  const before = mode === 'before'
  const sideFrom: Vec3 = [3.4, 0, 5.0]
  const sideTo: Vec3 = [1.6, 0, 0.6]
  const cross: Vec3 = [sideFrom[0] + ((sideTo[0] - sideFrom[0]) * (sideFrom[2] - BORDER_Z)) / (sideFrom[2] - sideTo[2]), 0, BORDER_Z]
  return (
    <FocusGroup n={5}>
      <group>
        <group position={p}>
          {/* Dealer yard: shed and stock heap. */}
          <HoloBox size={[2.4, 1.3, 1.5]} position={[0.4, 0.65, -2.4]} />
          <Heap at={[-2.0, 0, -2.2]} r={0.9} h={0.55} />
          <GroundRect at={[-0.6, 0, -2.2]} w={5.6} d={3.0} color={tone.edge} dash={0.3} />
          {/* State border, crossing the side road on the camera side. */}
          <Polyline
            points={[
              [-4.6, 0.05, BORDER_Z],
              [5.4, 0.05, BORDER_Z],
            ]}
            color={theme.holo.ice}
            dash={0.3}
            intensity={1.4}
          />
          <Note at={[-3.6, 0.4, BORDER_Z + 0.6]} color={theme.holo.ice} size={0.22}>
            OTHER STATE
          </Note>
          <Note at={[-3.6, 0.4, BORDER_Z - 0.6]} color={theme.holo.ice} size={0.22}>
            HARYANA
          </Note>
          {before ? (
            <>
              <Polyline points={[sideFrom, cross]} color={tone.gap} dash={0.3} intensity={1.6} />
              <Polyline
                points={[
                  [cross[0] - 0.3, 0.06, cross[2] - 0.3],
                  [cross[0] + 0.3, 0.06, cross[2] + 0.3],
                ]}
                color={tone.gap}
                intensity={2.6}
              />
              <Polyline
                points={[
                  [cross[0] - 0.3, 0.06, cross[2] + 0.3],
                  [cross[0] + 0.3, 0.06, cross[2] - 0.3],
                ]}
                color={tone.gap}
                intensity={2.6}
              />
              <Note at={[cross[0] + 1.6, 0.5, cross[2]]} color={tone.gap} size={0.22}>
                no border crossing on record
              </Note>
              <Screen at={[0.4, 3.0, -2.4]} w={3.2} h={0.85} color={tone.gap} fill={tone.gap}>
                <HoloText position={[0, 0.12, 0.01]} fontSize={0.24} variant="hudBold" color={theme.holo.white} glow={1.6}>
                  "BROUGHT FROM ANOTHER STATE"
                </HoloText>
                <HoloText position={[0, -0.2, 0.01]} fontSize={0.17} variant="mono" color={tone.gap} glow={1.8}>
                  typed in by the dealer
                </HoloText>
              </Screen>
            </>
          ) : (
            <>
              <Polyline points={[sideFrom, sideTo]} color={tone.control} intensity={1.6} />
              <Gantry at={cross} yaw={Math.atan2(-(sideTo[2] - sideFrom[2]), sideTo[0] - sideFrom[0])} span={1.6} label="FASTag + ANPR" />
              <InboundTruck from={sideFrom} to={sideTo} />
              <Screen at={[0.4, 3.0, -2.4]} w={3.2} h={0.85} color={tone.control}>
                <HoloText position={[0, 0.12, 0.01]} fontSize={0.22} variant="hudBold" color={theme.holo.white} glow={1.6}>
                  ORIGIN VERIFIED
                </HoloText>
                <HoloText position={[0, -0.2, 0.01]} fontSize={0.17} variant="mono" color={tone.control} glow={1.8}>
                  FASTag + e-way bill
                </HoloText>
              </Screen>
            </>
          )}
          <PulseRing at={[0, 0.03, 0]} radius={1.3} color={before ? tone.gap : tone.control} pulse={pulseOf(pulses, 5)} />
        </group>
        <StationBadge at={[p[0] - 1.7, FRONT_BADGE_Y, p[2] + FRONT_BADGE_DZ]} n={5} title="Dealer" color={badgeTone(mode)} />
      </group>
    </FocusGroup>
  )
}

/* ------------------------------------------------------------------ */
/* 6 · Buyer                                                           */
/* ------------------------------------------------------------------ */

function arcPoints(a: Vec3, b: Vec3, h: number): Vec3[] {
  const pts: Vec3[] = []
  for (let i = 0; i <= 24; i++) {
    const t = i / 24
    pts.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t + Math.sin(t * Math.PI) * h, a[2] + (b[2] - a[2]) * t])
  }
  return pts
}

/** Map pin for a GPS fix. */
function Pin({ at: p }: { at: Vec3 }) {
  const ref = useRef<THREE.Group>(null)
  useFrame(({ clock }) => {
    if (ref.current) ref.current.position.y = p[1] + Math.sin(clock.elapsedTime * 2) * 0.08
  })
  const cone = useMemo(() => new THREE.ConeGeometry(0.16, 0.42, 12).rotateX(Math.PI), [])
  const mat = useHoloMesh({ color: tone.control, intensity: 1.8, opacity: 0.7, rim: 1 })
  return (
    <group ref={ref} position={p}>
      <mesh geometry={cone} material={mat} />
      <mesh material={mat} position-y={0.28}>
        <sphereGeometry args={[0.18, 14, 10]} />
      </mesh>
    </group>
  )
}

export function BuyerStation({ mode }: StationProps) {
  const p = at(6)
  const before = mode === 'before'
  const seller: Vec3 = [2.4, 0, -2.2]
  const buyer: Vec3 = [-1.7, 0, -2.0]
  return (
    <FocusGroup n={6}>
      <group>
        <group position={p}>
          {/* Buyer's site. */}
          <HoloBox size={[1.8, 1.2, 1.4]} position={[-4.4, 0.6, -3.4]} />
          <HoloBox size={[1.9, 0.08, 1.5]} position={[-4.4, 1.3, -3.4]} rotation={[0, 0, 0.12]} color={tone.edge} opacity={0.3} />
          <Person at={seller} />
          <Note at={[seller[0], 1.75, seller[2]]} color={theme.holo.ice} size={0.22}>
            seller
          </Note>
          <Screen at={[0.35, 2.2, -2.6]} w={1.4} h={0.9} color={before ? tone.edge : tone.control}>
            <HoloText position={[0, 0.25, 0.01]} fontSize={0.2} variant="hudBold" color={theme.holo.white} glow={1.6}>
              INVOICE
            </HoloText>
            {before ? (
              <HoloText position={[0, -0.12, 0.01]} fontSize={0.34} variant="hudBold" color={tone.gap} glow={2}>
                ?
              </HoloText>
            ) : (
              <QrPattern at={[0, -0.12, 0.01]} size={0.45} />
            )}
          </Screen>
          {before ? (
            <>
              <Person at={buyer} color={tone.gap} ghost />
              <Note at={[buyer[0], 1.75, buyer[2]]} color={tone.gap} size={0.22}>
                buyer?
              </Note>
              <Polyline points={arcPoints([seller[0], 1.4, seller[2]], [buyer[0], 1.4, buyer[2]], 2.0)} color={tone.gap} dash={0.22} intensity={1.6} />
              <Note at={[0.35, 3.75, -2.2]} color={tone.gap} size={0.22}>
                seller registers as buyer
              </Note>
              <Note at={[buyer[0], 0.25, buyer[2] + 1.1]} color={tone.gap} size={0.2}>
                receipt never confirmed
              </Note>
            </>
          ) : (
            <>
              <Person at={buyer} color={tone.control} />
              <HoloBox
                size={[0.18, 0.3, 0.03]}
                position={[buyer[0] + 0.3, 0.95, buyer[2] + 0.25]}
                rotation={[-0.3, 0.4, 0]}
                color={tone.control}
                edge={tone.control}
                opacity={0.8}
              />
              <Note at={[buyer[0], 1.75, buyer[2]]} color={tone.control} size={0.22}>
                buyer · GSTIN ✓
              </Note>
              <Polyline points={arcPoints([-0.3, 1.9, -2.6], [buyer[0] + 0.3, 1.1, buyer[2] + 0.25], 0.6)} color={tone.control} dash={0.16} intensity={1.8} />
              <Note at={[0.35, 3.0, -2.6]} color={tone.control} size={0.22}>
                receipt confirmed by QR scan
              </Note>
              <Pin at={[-1.2, 1.1, 0.2]} />
              <Note at={[-2.4, 0.25, 0.9]} color={tone.control} size={0.2}>
                GPS: truck reached the buyer
              </Note>
            </>
          )}
          <PulseRing at={[-1.2, 0.03, 0]} radius={1.3} color={before ? tone.gap : tone.control} pulse={pulseOf(pulses, 6)} />
        </group>
        <StationBadge at={[p[0] + 1.2, FRONT_BADGE_Y, p[2] + FRONT_BADGE_DZ]} n={6} title="Buyer" color={badgeTone(mode)} />
      </group>
    </FocusGroup>
  )
}
