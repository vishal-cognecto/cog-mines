import { create } from 'zustand'
import { facts, type FactId } from '../config/content'

export type SceneId = 'before' | 'after'

export const sceneOrder: SceneId[] = ['before', 'after']

/** 0 is the overview of the whole chain, 1-6 are the steps. */
export type Station = 0 | 1 | 2 | 3 | 4 | 5 | 6

export const STATIONS = 6

export interface TickerItem {
  id: string
  at: number
  level: 'info' | 'ok' | 'alert'
  text: string
}

interface AppState {
  scene: SceneId
  station: Station
  /** Scene being transitioned to, while a transition runs. */
  pendingScene: SceneId | null
  /** Station to show once the pending scene is in. */
  pendingStation: Station | null
  autoplay: boolean
  hudVisible: boolean
  projector: boolean
  presenterOpen: boolean
  /** Runtime visibility overrides keyed by fact id. */
  factOverrides: Partial<Record<FactId, boolean>>
  ticker: TickerItem[]

  /** Switches to a scene, optionally landing on a station. */
  goTo: (scene: SceneId, station?: Station) => void
  commitScene: () => void
  /** Flips between before and after, keeping the station. */
  flip: () => void
  setStation: (station: Station) => void
  stepStation: (delta: 1 | -1) => void
  setAutoplay: (on: boolean) => void
  toggleHud: () => void
  toggleProjector: () => void
  togglePresenter: () => void
  setFactVisible: (id: FactId, visible: boolean) => void
  pushTicker: (item: Omit<TickerItem, 'id' | 'at'>) => void
}

let tickerSeq = 0

const initial = parseHash()

export const useApp = create<AppState>((set, get) => ({
  scene: initial.scene,
  station: initial.station,
  pendingScene: null,
  pendingStation: null,
  autoplay: false,
  hudVisible: true,
  projector: false,
  presenterOpen: false,
  factOverrides: {},
  ticker: [],

  goTo: (scene, station) => {
    const s = get()
    if (s.pendingScene) return
    if (scene === s.scene) {
      if (station !== undefined) get().setStation(station)
      return
    }
    set({ pendingScene: scene, pendingStation: station ?? s.station, ticker: [] })
  },
  commitScene: () => {
    const { pendingScene, pendingStation, station } = get()
    if (!pendingScene) return
    const next = pendingStation ?? station
    set({ scene: pendingScene, station: next, pendingScene: null, pendingStation: null })
    writeHash(pendingScene, next)
  },
  flip: () => {
    const s = get()
    get().goTo(s.scene === 'before' ? 'after' : 'before')
  },
  setStation: (station) => {
    if (get().station === station) return
    set({ station })
    writeHash(get().scene, station)
  },
  stepStation: (delta) => {
    const n = STATIONS + 1
    get().setStation(((((get().station + delta) % n) + n) % n) as Station)
  },
  setAutoplay: (autoplay) => set({ autoplay }),
  toggleHud: () => set((s) => ({ hudVisible: !s.hudVisible })),
  toggleProjector: () => set((s) => ({ projector: !s.projector })),
  togglePresenter: () => set((s) => ({ presenterOpen: !s.presenterOpen })),
  setFactVisible: (id, visible) => set((s) => ({ factOverrides: { ...s.factOverrides, [id]: visible } })),
  pushTicker: (item) =>
    set((s) => ({
      ticker: [{ ...item, id: `t${++tickerSeq}`, at: Date.now() }, ...s.ticker].slice(0, 30),
    })),
}))

/** Hash format: #before, #after, #before/3 (station 3). */
function parseHash(): { scene: SceneId; station: Station } {
  if (typeof window === 'undefined') return { scene: 'before', station: 0 }
  const [rawScene, rawStation] = window.location.hash.replace('#', '').split('/')
  const scene = sceneOrder.includes(rawScene as SceneId) ? (rawScene as SceneId) : 'before'
  const n = Number(rawStation)
  const station = (Number.isInteger(n) && n >= 0 && n <= STATIONS ? n : 0) as Station
  return { scene, station }
}

function writeHash(scene: SceneId, station: Station) {
  if (typeof window === 'undefined') return
  window.history.replaceState(null, '', station ? `#${scene}/${station}` : `#${scene}`)
}

/** Returns the fact text, or null when the fact is hidden. */
export function useFact(id: FactId): string | null {
  const override = useApp((s) => s.factOverrides[id])
  const f = facts[id]
  const visible = override ?? f.visible
  return visible ? f.text : null
}
