import { AdaptiveDpr, PerformanceMonitor } from '@react-three/drei'
import { Canvas } from '@react-three/fiber'
import { useState } from 'react'
import * as THREE from 'three'
import { theme } from '../config/theme'
import { Dust } from '../holo/Dust'
import { PostFX } from './PostFX'
import { SceneRouter } from './SceneRouter'

/** WebGL canvas, post effects and the scene router. */
export function Renderer() {
  const [dpr, setDpr] = useState<[number, number]>([1, 2])
  return (
    <Canvas
      className="stage"
      dpr={dpr}
      camera={{ fov: 42, near: 0.1, far: 600, position: [0, 10, 24] }}
      gl={{ antialias: false, powerPreference: 'high-performance', alpha: false, stencil: false }}
      onCreated={({ gl, scene }) => {
        gl.toneMapping = THREE.ACESFilmicToneMapping
        gl.toneMappingExposure = 1.0
        scene.background = new THREE.Color(theme.background)
        scene.fog = new THREE.FogExp2(theme.background, 0.012)
      }}
    >
      <PerformanceMonitor onDecline={() => setDpr([1, 1])} onIncline={() => setDpr([1, 2])} />
      <AdaptiveDpr pixelated={false} />
      <Dust />
      <SceneRouter />
      <PostFX />
    </Canvas>
  )
}
