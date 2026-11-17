import { useFrame } from '@react-three/fiber'
import { useEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import type { Mode } from '../../config/content'
import { theme } from '../../config/theme'
import { useApp } from '../../core/store'
import { HoloGrid } from '../../holo/HoloGrid'
import { HoloText } from '../../holo/HoloText'
import { useHoloLine, useHoloMesh } from '../../holo/hooks'
import { holoPointsMaterial } from '../../holo/materials'
import { useChain } from './chainStore'
import { BYPASS_OFFSET, bypassAmount, roadEdge, roadPoint, roadRibbon, roadTangent } from './layout'
import { tone } from './parts'
import { TRUCKS, loadLeft } from './sim'
import { BuyerStation, CrusherStation, DealerStation, MineStation, PassStation, WeighbridgeStation } from './stations'

export function ChainStage({ mode }: { mode: Mode }) {
  useEffect(() => {
    useChain.getState().start(mode)
  }, [mode])

  useFrame((_, dt) => {
    if (useApp.getState().pendingScene) return
    useChain.getState().tick(Math.min(dt, 0.1))
  })

  return (
    <>
      <HoloGrid y={-0.03} size={110} opacity={0.45} />
      <Road mode={mode} />
      <MineStation mode={mode} />
      <PassStation mode={mode} />
      <WeighbridgeStation mode={mode} />
      <CrusherStation mode={mode} />
      <DealerStation mode={mode} />
      <BuyerStation mode={mode} />
      <Trucks mode={mode} />
    </>
  )
}

const ROAD_HALF = 0.55

function Road({ mode }: { mode: Mode }) {
  const geoms = useMemo(
    () => ({
      strip: roadRibbon(ROAD_HALF),
      left: roadEdge(ROAD_HALF),
      right: roadEdge(-ROAD_HALF),
      centre: roadEdge(0, 0.05, 5),
      corridorL: roadEdge(ROAD_HALF + 0.35, 0.04, 2),
      corridorR: roadEdge(-ROAD_HALF - 0.35, 0.04, 2),
    }),
    [],
  )
  const strip = useHoloMesh({ color: tone.base, intensity: 0.9, opacity: 0.18, rim: 0, scan: 0.2 })
  const edge = useHoloLine({ color: tone.edge, intensity: 1.5, opacity: 0.8, scan: 0.2 })
  const centre = useHoloLine({ color: theme.holo.ice, intensity: 0.9, opacity: 0.45, scan: 0 })
  const corridor = useHoloLine({ color: tone.control, intensity: 1.2, opacity: 0.45, scan: 0 })
  return (
    <group>
      <mesh geometry={geoms.strip} material={strip} />
      <lineSegments geometry={geoms.left} material={edge} />
      <lineSegments geometry={geoms.right} material={edge} />
      <lineSegments geometry={geoms.centre} material={centre} />
      {/* With Cognecto every trip runs inside a GPS route corridor. */}
      {mode === 'after' && (
        <>
          <lineSegments geometry={geoms.corridorL} material={corridor} />
          <lineSegments geometry={geoms.corridorR} material={corridor} />
        </>
      )}
    </group>
  )
}

function truckGeometry() {
  const parts = [new THREE.BoxGeometry(0.9, 0.16, 0.44).translate(0, 0.17, 0), new THREE.BoxGeometry(0.24, 0.3, 0.42).translate(0.38, 0.38, 0)]
  const wheels = [-0.28, 0.28].flatMap((x) =>
    [-0.22, 0.22].map((z) => new THREE.CylinderGeometry(0.1, 0.1, 0.07, 10).rotateX(Math.PI / 2).translate(x, 0.1, z)),
  )
  return mergeGeometries([...parts, ...wheels].map((p) => p.toNonIndexed()))
}

const TRAIL = 14
const TRAIL_GAP = 0.55

const tmp = {
  p: new THREE.Vector3(),
  t: new THREE.Vector3(),
}

/** Trucks on the road, with a GPS fix and breadcrumb trail when Cognecto is in place. */
function Trucks({ mode }: { mode: Mode }) {
  const body = useMemo(truckGeometry, [])
  const bodyEdges = useMemo(() => new THREE.EdgesGeometry(body, 30), [body])
  const load = useMemo(() => new THREE.BoxGeometry(0.6, 0.22, 0.38).translate(-0.1, 0.11, 0), [])
  const bodyMat = useHoloMesh({ color: tone.base, intensity: 1.6, opacity: 0.6, rim: 1.2 })
  const edgeMat = useHoloLine({ color: tone.edge, intensity: 1.8, opacity: 0.9 })
  const loadMat = useHoloMesh({ color: theme.holo.ice, intensity: 1.2, opacity: 0.55, rim: 1.0 })
  const gpsMat = useHoloMesh({ color: tone.control, intensity: 2.4, opacity: 0.9, rim: 0.2, scan: 0 })
  const groups = useRef<(THREE.Group | null)[]>([])
  const loads = useRef<(THREE.Mesh | null)[]>([])

  const trail = useMemo(() => {
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(TRUCKS * TRAIL * 3), 3))
    const sizes = new Float32Array(TRUCKS * TRAIL)
    for (let i = 0; i < TRUCKS; i++) for (let k = 0; k < TRAIL; k++) sizes[i * TRAIL + k] = 2.6 * (1 - k / TRAIL)
    g.setAttribute('aSize', new THREE.BufferAttribute(sizes, 1))
    return g
  }, [])
  const trailMat = useMemo(() => holoPointsMaterial({ color: tone.control, intensity: 1.8, size: 2 }), [])
  useEffect(() => () => trailMat.dispose(), [trailMat])

  useFrame(() => {
    const { traffic } = useChain.getState()
    const tpos = trail.getAttribute('position') as THREE.BufferAttribute
    for (let i = 0; i < TRUCKS; i++) {
      const tr = traffic.trucks[i]
      const role = traffic.roles[i]
      const g = groups.current[i]
      const offset = role === 'bypass' ? BYPASS_OFFSET * bypassAmount(tr.d) : 0
      roadPoint(tr.d, tmp.p)
      roadTangent(tr.d, tmp.t)
      if (g) {
        g.position.set(tmp.p.x - tmp.t.z * offset, 0.02, tmp.p.z + tmp.t.x * offset)
        g.rotation.y = Math.atan2(-tmp.t.z, tmp.t.x)
        g.scale.setScalar(Math.max(0.001, tr.alpha))
      }
      const l = loads.current[i]
      if (l) l.scale.y = Math.max(0.001, loadLeft(role, tr.d))
      for (let k = 0; k < TRAIL; k++) {
        const d = tr.d - (k + 1) * TRAIL_GAP
        const j = (i * TRAIL + k) * 3
        if (mode !== 'after' || d < 0 || tr.alpha < 1) {
          tpos.array[j + 1] = -50
          continue
        }
        roadPoint(d, tmp.p)
        tpos.array[j] = tmp.p.x
        tpos.array[j + 1] = 0.08
        tpos.array[j + 2] = tmp.p.z
      }
    }
    tpos.needsUpdate = true
  })

  return (
    <group>
      {Array.from({ length: TRUCKS }, (_, i) => (
        <group key={i} ref={(el) => void (groups.current[i] = el)}>
          <mesh geometry={body} material={bodyMat} />
          <lineSegments geometry={bodyEdges} material={edgeMat} />
          <mesh ref={(el) => void (loads.current[i] = el)} geometry={load} material={loadMat} position-y={0.25} />
          {mode === 'after' && (
            <mesh material={gpsMat} position={[0.38, 0.72, 0]}>
              <sphereGeometry args={[0.08, 10, 8]} />
            </mesh>
          )}
          <group position={[0, 1.05, 0]}>
            <HoloText fontSize={0.2} variant="mono" color={theme.holo.ice} glow={1.3} billboard>
              {`T${i + 1}`}
            </HoloText>
          </group>
        </group>
      ))}
      <points geometry={trail} material={trailMat} frustumCulled={false} />
    </group>
  )
}
