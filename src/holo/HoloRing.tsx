import { useMemo } from 'react'
import * as THREE from 'three'
import { useHoloLine } from './hooks'

interface Props {
  radius: number
  segments?: number
  color: string
  intensity?: number
  opacity?: number
  /** Dash pattern: fraction of each dash cell that is drawn (1 = solid). */
  dash?: number
  dashCount?: number
  /** Arc length in radians. Default full circle. */
  arc?: number
  startAngle?: number
}

/** Thin circular line (optionally dashed) in the XZ plane. */
export function HoloRing({
  radius,
  segments = 256,
  color,
  intensity = 1.6,
  opacity = 0.9,
  dash = 1,
  dashCount = 64,
  arc = Math.PI * 2,
  startAngle = 0,
}: Props) {
  const geometry = useMemo(() => {
    const pts: number[] = []
    const push = (a: number) => pts.push(Math.cos(a) * radius, 0, Math.sin(a) * radius)
    if (dash >= 1) {
      for (let i = 0; i < segments; i++) {
        const a0 = startAngle + (i / segments) * arc
        const a1 = startAngle + ((i + 1) / segments) * arc
        push(a0)
        push(a1)
      }
    } else {
      const cell = arc / dashCount
      for (let i = 0; i < dashCount; i++) {
        const a0 = startAngle + i * cell
        const a1 = a0 + cell * dash
        const sub = 4
        for (let k = 0; k < sub; k++) {
          push(a0 + ((a1 - a0) * k) / sub)
          push(a0 + ((a1 - a0) * (k + 1)) / sub)
        }
      }
    }
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3))
    return g
  }, [radius, segments, dash, dashCount, arc, startAngle])

  const mat = useHoloLine({ color, intensity, opacity, scan: 0.4 }, [color, intensity, opacity])
  return <lineSegments geometry={geometry} material={mat} />
}
