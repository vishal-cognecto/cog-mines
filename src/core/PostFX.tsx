import { Bloom, EffectComposer, Noise, Vignette } from '@react-three/postprocessing'
import { BlendFunction, KernelSize } from 'postprocessing'
import { useApp } from './store'

/** Bloom gives the hologram glow. Noise and vignette add a subtle display feel. */
export function PostFX() {
  const projector = useApp((s) => s.projector)
  return (
    <EffectComposer multisampling={4}>
      <Bloom mipmapBlur intensity={projector ? 1.0 : 1.25} luminanceThreshold={0.22} luminanceSmoothing={0.35} radius={0.75} kernelSize={KernelSize.LARGE} />
      <Noise opacity={0.018} blendFunction={BlendFunction.SCREEN} />
      <Vignette offset={0.25} darkness={projector ? 0.45 : 0.7} />
    </EffectComposer>
  )
}
