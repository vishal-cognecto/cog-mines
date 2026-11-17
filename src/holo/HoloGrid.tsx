import { useMemo } from 'react'
import * as THREE from 'three'
import { theme } from '../config/theme'
import { holoUniforms } from './uniforms'

interface Props {
  size?: number
  y?: number
  cell?: number
  color?: string
  opacity?: number
}

/** Infinite-looking floor grid that fades with distance and pulses outward. */
export function HoloGrid({ size = 120, y = 0, cell = 2, color = theme.holo.grid, opacity = 0.7 }: Props) {
  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        toneMapped: false,
        uniforms: {
          uTime: holoUniforms.uTime,
          uReveal: holoUniforms.uReveal,
          uColor: { value: new THREE.Color(color).multiplyScalar(1.6) },
          uCell: { value: cell },
          uOpacity: { value: opacity },
          uHalf: { value: size / 2 },
        },
        vertexShader: /* glsl */ `
          varying vec3 vWorld;
          void main() {
            vec4 w = modelMatrix * vec4(position, 1.0);
            vWorld = w.xyz;
            gl_Position = projectionMatrix * viewMatrix * w;
          }
        `,
        fragmentShader: /* glsl */ `
          uniform float uTime;
          uniform float uReveal;
          uniform vec3 uColor;
          uniform float uCell;
          uniform float uOpacity;
          uniform float uHalf;
          varying vec3 vWorld;
          float gridLine(vec2 p, float cell, float width) {
            vec2 g = abs(fract(p / cell - 0.5) - 0.5) / fwidth(p / cell);
            return 1.0 - min(min(g.x, g.y) / width, 1.0);
          }
          void main() {
            vec2 p = vWorld.xz;
            float r = length(p);
            float minor = gridLine(p, uCell, 1.0) * 0.35;
            float major = gridLine(p, uCell * 5.0, 1.2) * 0.9;
            float fade = smoothstep(uHalf, uHalf * 0.15, r);
            float pulse = smoothstep(1.2, 0.0, abs(r - mod(uTime * 9.0, uHalf * 1.3))) * 0.6;
            float reveal = smoothstep(uReveal * uHalf * 1.2, uReveal * uHalf * 1.2 - 4.0, r);
            float a = (max(minor, major) * (1.0 + pulse)) * fade * uOpacity * reveal;
            if (a < 0.003) discard;
            gl_FragColor = vec4(uColor * (1.0 + pulse * 2.0), a);
          }
        `,
      }),
    [color, cell, opacity, size],
  )

  return (
    <mesh rotation-x={-Math.PI / 2} position-y={y} material={material} renderOrder={-10}>
      <planeGeometry args={[size, size, 1, 1]} />
    </mesh>
  )
}
