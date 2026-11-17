import { Billboard, Text } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import { useRef, type ComponentProps } from 'react'
import * as THREE from 'three'
import { theme } from '../config/theme'
import { fonts } from './fonts'
import { holoUniforms } from './uniforms'

type TextProps = ComponentProps<typeof Text>

interface Props extends Omit<TextProps, 'font' | 'color'> {
  variant?: 'hud' | 'hudLight' | 'hudBold' | 'mono' | 'monoLight'
  color?: string
  /** Colour multiplier. Above 1 blooms. */
  glow?: number
  opacity?: number
  billboard?: boolean
}

/**
 * 3D text for the hologram. Fades with the scene reveal.
 * Uses troika SDF text, so it stays sharp at any zoom.
 *
 * With `billboard`, `position` is applied inside the billboard, so it acts as a
 * screen-aligned offset from the parent's origin. That keeps stacked lines
 * (title, subtitle) evenly spaced on screen from any camera angle. To place a
 * billboarded label somewhere in the world, wrap it in a positioned <group>.
 */
export function HoloText({
  variant = 'hud',
  color = theme.holo.ice,
  glow = 1.4,
  opacity = 1,
  billboard = false,
  children,
  ...rest
}: Props) {
  // troika Text instance; typed loosely because drei does not export it.
  const ref = useRef<THREE.Mesh & { fillOpacity: number }>(null)
  const colorRef = useRef(new THREE.Color())
  colorRef.current.set(color).multiplyScalar(glow)

  useFrame(() => {
    if (!ref.current) return
    const r = holoUniforms.uReveal.value
    ref.current.fillOpacity = opacity * THREE.MathUtils.smoothstep(r, 0.35, 0.9)
  })

  const text = (
    <Text
      ref={ref}
      font={fonts[variant]}
      color={colorRef.current}
      anchorX="center"
      anchorY="middle"
      letterSpacing={variant.startsWith('hud') ? 0.08 : 0}
      material-toneMapped={false}
      material-depthWrite={false}
      material-transparent
      {...rest}
    >
      {children}
    </Text>
  )

  return billboard ? <Billboard>{text}</Billboard> : text
}
