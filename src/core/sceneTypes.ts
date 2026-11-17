import type { ComponentType } from 'react'
import type { SceneId } from './store'

export interface SceneModule {
  id: SceneId
  /** Number shown in the top bar. */
  index: number
  title: string
  subtitle: string
  /** 3D content, rendered inside the Canvas. */
  Stage: ComponentType
  /** DOM HUD panels for this scene. */
  Hud: ComponentType
}
