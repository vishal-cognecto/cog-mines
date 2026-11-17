import { CameraControls } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import { Suspense, useEffect, useRef } from 'react'
import { holoUniforms } from '../holo/uniforms'
import { scenes } from '../scenes'
import { shotFor } from '../scenes/chain/layout'
import { cameraRig, type CameraShot } from './cameraRig'
import { useApp } from './store'

const OUT_S = 0.65
const IN_S = 1.5

const easeInOut = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2)

function pulledBack(shot: CameraShot, factor: number): CameraShot {
  const [px, py, pz] = shot.position
  const [tx, ty, tz] = shot.target
  return {
    target: shot.target,
    position: [tx + (px - tx) * factor, ty + (py - ty) * factor + 1.5, tz + (pz - tz) * factor],
  }
}

/**
 * Mounts the active scene and runs the transition between scenes:
 * dissolve out + camera push, swap, then materialise + camera settle.
 * Within a scene, a station change flies the camera to that step.
 */
export function SceneRouter() {
  const scene = useApp((s) => s.scene)
  const controls = useRef<CameraControls>(null)
  const phase = useRef<{ kind: 'idle' | 'out' | 'in'; t: number }>({ kind: 'in', t: 0 })
  const module = scenes[scene]

  useEffect(() => {
    cameraRig.attach(controls.current)
    return () => cameraRig.attach(null)
  }, [])

  useEffect(
    () =>
      useApp.subscribe((s, prev) => {
        // Start a dissolve when a new scene is requested.
        if (s.pendingScene && !prev.pendingScene) {
          phase.current = { kind: 'out', t: 0 }
          const c = controls.current
          if (c) {
            c.smoothTime = 0.5
            void cameraRig.push(0.35)
          }
        }
        // Fly to a new station inside the same scene.
        if (s.station !== prev.station && s.scene === prev.scene) {
          const c = controls.current
          if (c) c.smoothTime = 0.9
          void cameraRig.fly(shotFor(s.station), true)
        }
      }),
    [],
  )

  // When the scene changes (or on first load), materialise it and fly in.
  useEffect(() => {
    const c = controls.current
    if (!c) return
    const shot = shotFor(useApp.getState().station)
    void cameraRig.fly(pulledBack(shot, 1.45), false)
    c.smoothTime = 1.1
    void cameraRig.fly(shot, true)
    phase.current = { kind: 'in', t: 0 }
  }, [module])

  useFrame((_, dt) => {
    holoUniforms.uTime.value += dt
    const p = phase.current
    if (p.kind === 'out') {
      p.t += dt
      holoUniforms.uReveal.value = 1 - easeInOut(Math.min(p.t / OUT_S, 1))
      if (p.t >= OUT_S) {
        holoUniforms.uReveal.value = 0
        p.kind = 'idle'
        useApp.getState().commitScene()
      }
    } else if (p.kind === 'in') {
      p.t += dt
      holoUniforms.uReveal.value = easeInOut(Math.min(p.t / IN_S, 1))
      if (p.t >= IN_S) {
        holoUniforms.uReveal.value = 1
        p.kind = 'idle'
        if (controls.current) controls.current.smoothTime = 0.35
      }
    }
  })

  return (
    <>
      <CameraControls ref={controls} makeDefault minDistance={6} maxDistance={80} maxPolarAngle={Math.PI * 0.47} draggingSmoothTime={0.12} />
      <Suspense fallback={null}>
        <module.Stage key={scene} />
      </Suspense>
    </>
  )
}
