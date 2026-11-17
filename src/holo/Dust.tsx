import { useFrame } from '@react-three/fiber'
import { useMemo, useRef } from 'react'
import * as THREE from 'three'
import { theme } from '../config/theme'
import { createRng } from '../sim/rng'

/** Slow-drifting motes that give the dark space some depth. */
export function Dust({ count = 900, radius = 70 }: { count?: number; radius?: number }) {
  const ref = useRef<THREE.Points>(null)
  const geometry = useMemo(() => {
    const rng = createRng(7)
    const pos = new Float32Array(count * 3)
    for (let i = 0; i < count; i++) {
      pos[i * 3] = rng.range(-radius, radius)
      pos[i * 3 + 1] = rng.range(-10, radius * 0.6)
      pos[i * 3 + 2] = rng.range(-radius, radius)
    }
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3))
    return g
  }, [count, radius])

  const material = useMemo(
    () =>
      new THREE.PointsMaterial({
        color: new THREE.Color(theme.holo.cyan).multiplyScalar(0.55),
        size: 0.09,
        sizeAttenuation: true,
        transparent: true,
        opacity: 0.55,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        toneMapped: false,
      }),
    [],
  )

  useFrame((_, dt) => {
    if (ref.current) ref.current.rotation.y += dt * 0.006
  })

  return <points ref={ref} geometry={geometry} material={material} />
}
