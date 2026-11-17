import { Billboard } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import { createContext, useContext, useMemo, useRef, type ReactNode } from 'react'
import * as THREE from 'three'
import { theme } from '../../config/theme'
import type { Vec3 } from '../../core/cameraRig'
import { useApp } from '../../core/store'
import { HoloText } from '../../holo/HoloText'
import { useHoloLine, useHoloMesh } from '../../holo/hooks'
import { setHoloColor } from '../../holo/materials'
import { polyline } from './layout'

/** Colour roles. Red marks a gap, green a Cognecto control. */
export const tone = {
  base: theme.holo.blue,
  edge: theme.holo.cyan,
  gap: theme.alert.red,
  control: theme.ok,
  warn: theme.alert.amber,
} as const

interface BoxProps {
  size: Vec3
  position?: Vec3
  rotation?: Vec3
  color?: string
  edge?: string
  intensity?: number
  opacity?: number
  /** Edge-only box with dashed look (lower opacity), for things that exist only on paper. */
  ghost?: boolean
}

/** Translucent box with glowing edges. */
export function HoloBox({ size, position, rotation, color = tone.base, edge = tone.edge, intensity = 1.3, opacity = 0.45, ghost = false }: BoxProps) {
  const geom = useMemo(() => new THREE.BoxGeometry(...size), [size])
  const edges = useMemo(() => new THREE.EdgesGeometry(geom), [geom])
  const mat = useHoloMesh({ color, intensity, opacity: ghost ? 0.08 : opacity, rim: 1.1 }, [color, intensity, opacity, ghost])
  const lineMat = useHoloLine({ color: edge, intensity: ghost ? 1.2 : 1.7, opacity: ghost ? 0.55 : 0.9 }, [edge, ghost])
  return (
    <group position={position} rotation={rotation}>
      <mesh geometry={geom} material={mat} />
      <lineSegments geometry={edges} material={lineMat} />
    </group>
  )
}

/** Polyline, solid or dashed. */
export function Polyline({
  points,
  color,
  dash = 0,
  intensity = 1.6,
  opacity = 0.9,
}: {
  points: Vec3[]
  color: string
  dash?: number
  intensity?: number
  opacity?: number
}) {
  const key = JSON.stringify(points)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const geom = useMemo(() => polyline(points, dash), [key, dash])
  const mat = useHoloLine({ color, intensity, opacity, scan: 0.2 }, [color, intensity, opacity])
  return <lineSegments geometry={geom} material={mat} />
}

/** Station a model belongs to, so its callouts show only while that station is in focus. */
export const StationContext = createContext(0)

/** True when callouts of station `n` should show: in the overview, or while `n` is focused. */
function inFocus(n: number) {
  const focus = useApp.getState().station
  return n === 0 || focus === 0 || focus === n
}

const DIM = 0.22

/**
 * Wraps a station. While another station is in focus, every hologram material
 * inside fades to a fraction of its opacity so the focused step stands out.
 * Materials that drive their own opacity (pulse rings) set `userData.ownOpacity`.
 */
export function FocusGroup({ n, children }: { n: number; children: ReactNode }) {
  const ref = useRef<THREE.Group>(null)
  const state = useRef<{ mats: { m: THREE.ShaderMaterial; base: number }[] | null; f: number }>({ mats: null, f: 1 })
  useFrame((_, dt) => {
    const g = ref.current
    if (!g) return
    const st = state.current
    if (!st.mats) {
      const seen = new Set<THREE.Material>()
      st.mats = []
      g.traverse((o) => {
        const m = (o as THREE.Mesh).material as THREE.ShaderMaterial | undefined
        if (!m || seen.has(m) || !m.uniforms?.uOpacity || m.userData.ownOpacity) return
        seen.add(m)
        st.mats!.push({ m, base: m.uniforms.uOpacity.value as number })
      })
    }
    const target = inFocus(n) ? 1 : DIM
    st.f += (target - st.f) * Math.min(1, dt * 5)
    for (const { m, base } of st.mats) m.uniforms.uOpacity.value = base * st.f
  })
  return (
    <StationContext.Provider value={n}>
      <group ref={ref}>{children}</group>
    </StationContext.Provider>
  )
}

/** Camera distance beyond which small callouts are too small to read, so they hide. */
const NOTE_FAR = 34

const tmpWorld = new THREE.Vector3()

/** Small mono callout, for numbers and short notes next to a model. Hidden in the far overview. */
export function Note({
  at,
  children,
  color = theme.holo.cyan,
  size = 0.24,
  glow = 1.6,
}: {
  at: Vec3
  children: string
  color?: string
  size?: number
  glow?: number
}) {
  const ref = useRef<THREE.Group>(null)
  const station = useContext(StationContext)
  useFrame(({ camera }) => {
    const g = ref.current
    if (!g) return
    g.getWorldPosition(tmpWorld)
    g.visible = inFocus(station) && camera.position.distanceTo(tmpWorld) < NOTE_FAR + size * 20
  })
  return (
    <group ref={ref} position={at}>
      <HoloText fontSize={size} variant="mono" color={color} glow={glow} billboard>
        {children}
      </HoloText>
    </group>
  )
}

/** Station number disc and title, floating above the station. */
export function StationBadge({ at, n, title, color }: { at: Vec3; n: number; title: string; color: string }) {
  const ring = useHoloLine({ color, intensity: 1.8, opacity: 0.95, scan: 0 }, [color])
  const fill = useHoloMesh({ color, intensity: 0.9, opacity: 0.22, rim: 0, scan: 0 }, [color])
  const circle = useMemo(() => {
    const pts: number[] = []
    const n = 48
    for (let i = 0; i < n; i++) {
      const a0 = (i / n) * Math.PI * 2
      const a1 = ((i + 1) / n) * Math.PI * 2
      pts.push(Math.cos(a0) * 0.34, Math.sin(a0) * 0.34, 0, Math.cos(a1) * 0.34, Math.sin(a1) * 0.34, 0)
    }
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3))
    return g
  }, [])
  // Rajdhani bold capitals with HUD letter spacing run about 0.62 em per character.
  const titleW = title.length * 0.48 * 0.62
  const left = -(0.68 + 0.22 + titleW) / 2
  const ref = useRef<THREE.Group>(null)
  useFrame(({ camera }) => {
    const g = ref.current
    if (!g) return
    g.visible = inFocus(n)
    g.getWorldPosition(tmpWorld)
    g.scale.setScalar(THREE.MathUtils.clamp(camera.position.distanceTo(tmpWorld) / 24, 1, 1.75))
  })
  return (
    <group ref={ref} position={at}>
      <Billboard>
        <group position={[left + 0.34, 0, 0]}>
          <lineSegments geometry={circle} material={ring} />
          <mesh material={fill}>
            <circleGeometry args={[0.34, 40]} />
          </mesh>
          <HoloText fontSize={0.36} variant="hudBold" color={theme.holo.white} glow={1.6}>
            {String(n)}
          </HoloText>
        </group>
        <HoloText position={[left + 0.68 + 0.22, 0, 0]} anchorX="left" fontSize={0.48} variant="hudBold" color={theme.holo.ice} glow={1.8}>
          {title.toUpperCase()}
        </HoloText>
      </Billboard>
    </group>
  )
}

/** A camera-facing holo screen (glass plate with a frame). Children are drawn on it. */
export function Screen({
  at,
  w,
  h,
  color = tone.edge,
  fill = tone.base,
  children,
}: {
  at: Vec3
  w: number
  h: number
  color?: string
  fill?: string
  children?: ReactNode
}) {
  const frame = useMemo(
    () =>
      polyline(
        [
          [-w / 2, -h / 2, 0],
          [w / 2, -h / 2, 0],
          [w / 2, h / 2, 0],
          [-w / 2, h / 2, 0],
          [-w / 2, -h / 2, 0],
        ],
        0,
      ),
    [w, h],
  )
  const frameMat = useHoloLine({ color, intensity: 1.8, opacity: 0.95, scan: 0.2 }, [color])
  const glass = useHoloMesh({ color: fill, intensity: 0.8, opacity: 0.2, rim: 0, scan: 0.5 }, [fill])
  const station = useContext(StationContext)
  const ref = useRef<THREE.Group>(null)
  // A neighbour's screen is noise while another station is in focus.
  useFrame(() => {
    if (ref.current) ref.current.visible = inFocus(station)
  })
  return (
    <group ref={ref} position={at}>
      <Billboard>
        <mesh material={glass}>
          <planeGeometry args={[w, h]} />
        </mesh>
        <lineSegments geometry={frame} material={frameMat} />
        {children}
      </Billboard>
    </group>
  )
}

/** Simple standing person: body and head. `ghost` draws the outline only. */
export function Person({ at, color = tone.base, ghost = false, scale = 1 }: { at: Vec3; color?: string; ghost?: boolean; scale?: number }) {
  const body = useMemo(() => new THREE.CylinderGeometry(0.22, 0.32, 0.9, 14), [])
  const head = useMemo(() => new THREE.SphereGeometry(0.2, 14, 10), [])
  const bodyWire = useMemo(() => new THREE.EdgesGeometry(new THREE.CylinderGeometry(0.22, 0.32, 0.9, 8)), [])
  const headWire = useMemo(() => new THREE.WireframeGeometry(new THREE.SphereGeometry(0.2, 8, 5)), [])
  const mat = useHoloMesh({ color, intensity: 1.4, opacity: ghost ? 0.05 : 0.5, rim: 1.3 }, [color, ghost])
  const line = useHoloLine({ color, intensity: 1.6, opacity: ghost ? 0.6 : 0.5 }, [color, ghost])
  return (
    <group position={at} scale={scale}>
      <mesh geometry={body} material={mat} position-y={0.45} />
      <mesh geometry={head} material={mat} position-y={1.12} />
      {ghost && <lineSegments geometry={bodyWire} material={line} position-y={0.45} />}
      {ghost && <lineSegments geometry={headWire} material={line} position-y={1.12} />}
    </group>
  )
}

/** Pole-mounted camera. `crossed` draws a red cross over it (no photo). */
export function CameraPole({
  at,
  yaw = 0,
  color = tone.control,
  crossed = false,
  cone = true,
}: {
  at: Vec3
  yaw?: number
  color?: string
  crossed?: boolean
  cone?: boolean
}) {
  const coneGeom = useMemo(() => new THREE.ConeGeometry(0.9, 2.6, 4, 1, true).rotateZ(Math.PI / 2).translate(-1.3, 0, 0), [])
  const coneMat = useHoloMesh({ color, intensity: 1.0, opacity: 0.12, rim: 0.4, scan: 1 }, [color])
  const ref = useRef<THREE.Group>(null)
  useFrame(({ clock }) => {
    if (ref.current && cone) ref.current.rotation.y = Math.sin(clock.elapsedTime * 0.8) * 0.12
  })
  return (
    <group position={at}>
      <HoloBox size={[0.08, 2.2, 0.08]} position={[0, 1.1, 0]} color={tone.base} edge={tone.edge} opacity={0.4} />
      <group position={[0, 2.25, 0]} rotation-y={yaw}>
        <group ref={ref}>
          <HoloBox size={[0.5, 0.22, 0.24]} position={[-0.15, 0, 0]} color={crossed ? tone.gap : color} edge={crossed ? tone.gap : color} />
          {cone && !crossed && <mesh geometry={coneGeom} material={coneMat} position={[-0.4, -0.35, 0]} rotation-z={-0.35} />}
        </group>
      </group>
      {crossed && (
        <>
          <Polyline
            points={[
              [-0.45, 1.85, 0.2],
              [0.35, 2.65, 0.2],
            ]}
            color={tone.gap}
            intensity={2.4}
          />
          <Polyline
            points={[
              [-0.45, 2.65, 0.2],
              [0.35, 1.85, 0.2],
            ]}
            color={tone.gap}
            intensity={2.4}
          />
        </>
      )}
    </group>
  )
}

/** Overhead gantry across the road, for FASTag and ANPR reads. */
export function Gantry({ at, yaw = 0, span = 2.6, color = tone.control, label }: { at: Vec3; yaw?: number; span?: number; color?: string; label?: string }) {
  return (
    <group position={at} rotation-y={yaw}>
      <HoloBox size={[0.1, 2.2, 0.1]} position={[0, 1.1, -span / 2]} color={tone.base} opacity={0.4} />
      <HoloBox size={[0.1, 2.2, 0.1]} position={[0, 1.1, span / 2]} color={tone.base} opacity={0.4} />
      <HoloBox size={[0.22, 0.24, span + 0.2]} position={[0, 2.25, 0]} color={color} edge={color} opacity={0.35} />
      <HoloBox size={[0.2, 0.18, 0.4]} position={[0, 2.05, 0]} color={color} edge={color} opacity={0.6} />
      {label && (
        <Note at={[0, 2.85, 0]} color={color} size={0.22}>
          {label}
        </Note>
      )}
    </group>
  )
}

/** Ring on the ground that flashes when `pulse()` returns a value above 0. */
export function PulseRing({ at, radius, color, pulse }: { at: Vec3; radius: number; color: string; pulse: () => number }) {
  const ref = useRef<THREE.Mesh>(null)
  const mat = useHoloMesh({ color, intensity: 2.2, opacity: 0.0, rim: 0, scan: 0 }, [color])
  mat.userData.ownOpacity = true
  useFrame(() => {
    const p = pulse()
    mat.uniforms.uOpacity.value = p * 0.55
    if (ref.current) ref.current.scale.setScalar(1 + (1 - p) * 0.6)
  })
  return (
    <mesh ref={ref} position={at} rotation-x={-Math.PI / 2} material={mat}>
      <ringGeometry args={[radius * 0.92, radius, 64]} />
    </mesh>
  )
}

/** Hemispherical heap (stockpile). */
export function Heap({
  at,
  r = 1,
  h = 0.6,
  color = tone.base,
  edge = tone.edge,
  opacity = 0.35,
}: {
  at: Vec3
  r?: number
  h?: number
  color?: string
  edge?: string
  opacity?: number
}) {
  const geom = useMemo(() => new THREE.SphereGeometry(1, 18, 8, 0, Math.PI * 2, 0, Math.PI / 2), [])
  const wire = useMemo(() => new THREE.WireframeGeometry(new THREE.SphereGeometry(1, 12, 4, 0, Math.PI * 2, 0, Math.PI / 2)), [])
  const mat = useHoloMesh({ color, intensity: 1.1, opacity, rim: 1.4 }, [color, opacity])
  const line = useHoloLine({ color: edge, intensity: 1.2, opacity: 0.5 }, [edge])
  return (
    <group position={at} scale={[r, h, r]}>
      <mesh geometry={geom} material={mat} />
      <lineSegments geometry={wire} material={line} />
    </group>
  )
}

/** Flat rectangle outline on the ground, solid or dashed. */
export function GroundRect({ at, w, d, color, dash = 0, yaw = 0 }: { at: Vec3; w: number; d: number; color: string; dash?: number; yaw?: number }) {
  return (
    <group position={at} rotation-y={yaw}>
      <Polyline
        points={[
          [-w / 2, 0.04, -d / 2],
          [w / 2, 0.04, -d / 2],
          [w / 2, 0.04, d / 2],
          [-w / 2, 0.04, d / 2],
          [-w / 2, 0.04, -d / 2],
        ]}
        color={color}
        dash={dash}
        intensity={1.4}
      />
    </group>
  )
}

/** Blinking status light, for "online" links. */
export function Blink({ at, color, r = 0.12 }: { at: Vec3; color: string; r?: number }) {
  const mat = useHoloMesh({ color, intensity: 2.6, opacity: 0.9, rim: 0.2, scan: 0 }, [color])
  useFrame(({ clock }) => {
    const on = 0.55 + 0.45 * Math.sin(clock.elapsedTime * 4)
    setHoloColor(mat, color, 1.6 + on * 1.6)
  })
  return (
    <mesh position={at} material={mat}>
      <sphereGeometry args={[r, 12, 8]} />
    </mesh>
  )
}

/** Small QR-code pattern made of cells, drawn flat in the XY plane. */
export function QrPattern({ at, size = 0.9, color = tone.control }: { at: Vec3; size?: number; color?: string }) {
  const mat = useHoloMesh({ color, intensity: 1.8, opacity: 0.85, rim: 0, scan: 0.2 }, [color])
  const geom = useMemo(() => {
    const n = 9
    const cell = size / n
    // Fixed pattern: three solid 3x3 finder squares and a scatter of data cells.
    const inFinder = (x: number, y: number) => (x < 3 || x > 5) && (y < 3 || y > 5) && !(x > 5 && y > 5)
    const nearFinder = (x: number, y: number) => (x < 4 || x > 4) && (y < 4 || y > 4) && !(x > 4 && y > 4) && (x === 3 || x === 5 || y === 3 || y === 5)
    const filled = (x: number, y: number) => inFinder(x, y) || (!nearFinder(x, y) && (x * 7 + y * 13 + x * y) % 5 < 2)
    const parts: THREE.BufferGeometry[] = []
    for (let x = 0; x < n; x++)
      for (let y = 0; y < n; y++)
        if (filled(x, y)) parts.push(new THREE.PlaneGeometry(cell * 0.86, cell * 0.86).translate((x - (n - 1) / 2) * cell, ((n - 1) / 2 - y) * cell, 0))
    const g = new THREE.BufferGeometry()
    const pos: number[] = []
    const idx: number[] = []
    let o = 0
    for (const p of parts) {
      const a = p.getAttribute('position')
      for (let i = 0; i < a.count; i++) pos.push(a.getX(i), a.getY(i), a.getZ(i))
      const ix = p.getIndex()!
      for (let i = 0; i < ix.count; i++) idx.push(ix.getX(i) + o)
      o += a.count
    }
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3))
    g.setIndex(idx)
    g.computeVertexNormals()
    return g
  }, [size])
  return <mesh position={at} geometry={geom} material={mat} />
}

/** Pulse value getter for a station. */
export const pulseOf = (arr: Float32Array, i: number) => () => arr[i]
