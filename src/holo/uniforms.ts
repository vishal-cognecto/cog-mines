import * as THREE from 'three'

/**
 * Uniforms shared by every hologram material.
 * `uTime` advances each frame. `uReveal` runs 0..1 during scene transitions:
 * 1 is fully materialised, 0 is fully dissolved.
 */
export const holoUniforms = {
  uTime: { value: 0 },
  uReveal: { value: 1 },
}

export const glowColor = (hex: string, intensity = 1): THREE.Color =>
  new THREE.Color(hex).multiplyScalar(intensity)
