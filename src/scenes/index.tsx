import type { SceneModule } from '../core/sceneTypes'
import type { SceneId } from '../core/store'
import { ChainHud } from './chain/ChainHud'
import { ChainStage } from './chain/ChainStage'
import './chain/chain.css'

/** Scene registry: the same chain, today and with Cognecto. */
export const scenes: Record<SceneId, SceneModule> = {
  before: {
    id: 'before',
    index: 1,
    title: 'TODAY',
    subtitle: 'Six points where the number is typed in',
    Stage: () => <ChainStage mode="before" />,
    Hud: () => <ChainHud mode="before" />,
  },
  after: {
    id: 'after',
    index: 2,
    title: 'WITH COGNECTO',
    subtitle: 'Every number captured at the source',
    Stage: () => <ChainStage mode="after" />,
    Hud: () => <ChainHud mode="after" />,
  },
}
