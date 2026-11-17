import * as THREE from 'three'
import { holoUniforms } from './uniforms'

/**
 * Shared hologram GLSL.
 * - Fresnel rim glow on meshes.
 * - Moving horizontal scanlines in world space.
 * - Slight flicker.
 * - Reveal: a glowing horizon sweeps upward in world Y while a scene materialises.
 */
const commonVaryings = /* glsl */ `
  varying vec3 vWorldPos;
  varying vec3 vViewNormal;
  varying vec3 vViewDir;
`

const meshVertex = /* glsl */ `
  ${commonVaryings}
  void main() {
    vec4 world = modelMatrix * vec4(position, 1.0);
    #ifdef USE_INSTANCING
      world = modelMatrix * instanceMatrix * vec4(position, 1.0);
    #endif
    vWorldPos = world.xyz;
    vec4 mv = viewMatrix * world;
    vec3 n = normal;
    #ifdef USE_INSTANCING
      n = mat3(instanceMatrix) * n;
    #endif
    vViewNormal = normalize(normalMatrix * n);
    vViewDir = normalize(-mv.xyz);
    gl_Position = projectionMatrix * mv;
  }
`

const holoFragmentCore = /* glsl */ `
  uniform float uTime;
  uniform float uReveal;
  uniform vec3 uColor;
  uniform float uOpacity;
  uniform float uRim;
  uniform float uScan;
  uniform float uRevealLow;
  uniform float uRevealHigh;

  float revealMask(out float edge) {
    float h = mix(uRevealLow, uRevealHigh, uReveal);
    float d = h - vWorldPos.y;
    edge = smoothstep(0.6, 0.0, abs(d)) * step(0.001, uReveal) * step(uReveal, 0.999);
    return step(0.0, d);
  }

  vec4 holoShade(float rimTerm) {
    float edge;
    float visible = revealMask(edge);
    if (visible < 0.5 && edge < 0.01) discard;
    float scan = 0.82 + 0.18 * sin(vWorldPos.y * 38.0 - uTime * 3.0);
    float band = smoothstep(0.0, 0.08, fract(vWorldPos.y * 0.18 - uTime * 0.12)) * 0.25 + 0.75;
    float flicker = 0.96 + 0.04 * sin(uTime * 37.0 + vWorldPos.x * 3.0);
    float scanTerm = mix(1.0, scan * band, uScan);
    vec3 col = uColor * scanTerm * flicker;
    float a = uOpacity * (0.35 + rimTerm * uRim) * scanTerm;
    col += vec3(0.6, 0.95, 1.0) * edge * 3.0;
    a = max(a * visible, edge);
    return vec4(col, a);
  }
`

const meshFragment = /* glsl */ `
  ${commonVaryings}
  ${holoFragmentCore}
  void main() {
    float rim = 1.0 - abs(dot(normalize(vViewNormal), normalize(vViewDir)));
    rim = pow(rim, 2.2);
    gl_FragColor = holoShade(rim * 2.0 + 0.15);
  }
`

const lineVertex = /* glsl */ `
  ${commonVaryings}
  void main() {
    vec4 world = modelMatrix * vec4(position, 1.0);
    vWorldPos = world.xyz;
    vViewNormal = vec3(0.0, 0.0, 1.0);
    vViewDir = vec3(0.0, 0.0, 1.0);
    gl_Position = projectionMatrix * viewMatrix * world;
  }
`

const lineFragment = /* glsl */ `
  ${commonVaryings}
  ${holoFragmentCore}
  void main() {
    gl_FragColor = holoShade(1.0);
  }
`

export interface HoloOptions {
  color: THREE.ColorRepresentation
  /** Colour multiplier. Values above 1 bloom. */
  intensity?: number
  opacity?: number
  /** Strength of the fresnel rim (meshes only). */
  rim?: number
  /** 0 disables scanlines, 1 is full. */
  scan?: number
  side?: THREE.Side
  /** World-space Y range that the reveal sweep covers. */
  revealRange?: [number, number]
}

function uniformsFor(o: HoloOptions) {
  const color = new THREE.Color(o.color).multiplyScalar(o.intensity ?? 1)
  return {
    uTime: holoUniforms.uTime,
    uReveal: holoUniforms.uReveal,
    uColor: { value: color },
    uOpacity: { value: o.opacity ?? 0.8 },
    uRim: { value: o.rim ?? 1 },
    uScan: { value: o.scan ?? 1 },
    uRevealLow: { value: o.revealRange?.[0] ?? -8 },
    uRevealHigh: { value: o.revealRange?.[1] ?? 14 },
  }
}

export function holoMeshMaterial(o: HoloOptions): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    uniforms: uniformsFor(o),
    vertexShader: meshVertex,
    fragmentShader: meshFragment,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    side: o.side ?? THREE.DoubleSide,
    toneMapped: false,
  })
}

export function holoLineMaterial(o: HoloOptions): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    uniforms: uniformsFor({ rim: 1, ...o }),
    vertexShader: lineVertex,
    fragmentShader: lineFragment,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    toneMapped: false,
  })
}

/** Update the colour of a holo material in place. */
export function setHoloColor(mat: THREE.ShaderMaterial, color: THREE.ColorRepresentation, intensity = 1) {
  ;(mat.uniforms.uColor.value as THREE.Color).set(color).multiplyScalar(intensity)
}

/**
 * Round glowing points. Per-vertex `aColor` (rgb) and `aSize` (px at distance 10)
 * attributes are optional; without them `color` and `size` are used.
 */
export function holoPointsMaterial(o: { color: THREE.ColorRepresentation; intensity?: number; size?: number; opacity?: number }) {
  return new THREE.ShaderMaterial({
    uniforms: {
      uTime: holoUniforms.uTime,
      uReveal: holoUniforms.uReveal,
      uColor: { value: new THREE.Color(o.color).multiplyScalar(o.intensity ?? 1) },
      uSize: { value: o.size ?? 3 },
      uOpacity: { value: o.opacity ?? 1 },
      uPixelRatio: { value: Math.min(window.devicePixelRatio, 2) },
    },
    vertexShader: /* glsl */ `
      uniform float uSize;
      uniform float uPixelRatio;
      attribute vec3 aColor;
      attribute float aSize;
      varying vec3 vTint;
      varying float vUseTint;
      void main() {
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        float s = aSize > 0.0 ? aSize : uSize;
        gl_PointSize = s * uPixelRatio * (10.0 / -mv.z);
        vTint = aColor;
        vUseTint = length(aColor) > 0.0 ? 1.0 : 0.0;
        gl_Position = projectionMatrix * mv;
      }
    `,
    fragmentShader: /* glsl */ `
      uniform vec3 uColor;
      uniform float uOpacity;
      uniform float uReveal;
      varying vec3 vTint;
      varying float vUseTint;
      void main() {
        float d = length(gl_PointCoord - 0.5);
        if (d > 0.5) discard;
        float a = smoothstep(0.5, 0.1, d) * uOpacity * uReveal;
        vec3 c = mix(uColor, vTint, vUseTint);
        gl_FragColor = vec4(c, a);
      }
    `,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    toneMapped: false,
  })
}
