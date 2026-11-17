import type { CameraControls } from '@react-three/drei'
import type { ElementRef } from 'react'

type Controls = ElementRef<typeof CameraControls>

export type Vec3 = [number, number, number]

export interface CameraShot {
  position: Vec3
  target: Vec3
}

/**
 * Thin wrapper around drei CameraControls so scenes and the tour director
 * can request camera moves without holding a ref.
 */
class CameraRig {
  controls: Controls | null = null

  attach(c: Controls | null) {
    this.controls = c
  }

  async fly(shot: CameraShot, smooth = true) {
    const c = this.controls
    if (!c) return
    const [px, py, pz] = shot.position
    const [tx, ty, tz] = shot.target
    await c.setLookAt(px, py, pz, tx, ty, tz, smooth)
  }

  /** Moves the camera toward its target by a fraction of the current distance. */
  async push(fraction: number, smooth = true) {
    const c = this.controls
    if (!c) return
    await c.dolly(c.distance * fraction, smooth)
  }
}

export const cameraRig = new CameraRig()
