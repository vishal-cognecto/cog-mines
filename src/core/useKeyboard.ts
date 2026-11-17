import { useEffect } from 'react'
import { STATIONS, useApp, type Station } from './store'

/**
 * B flips before / after at the same step. 1-6 jump to a step, 0 shows the
 * whole chain, arrows step through the chain. Space toggles autoplay,
 * H hides the HUD, P projector mode, ` presenter panel.
 */
export function useKeyboard() {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return
      const t = e.target as HTMLElement
      if (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA') return
      const s = useApp.getState()
      const n = Number(e.key)
      if (e.key !== ' ' && Number.isInteger(n) && n >= 0 && n <= STATIONS) {
        s.setAutoplay(false)
        s.setStation(n as Station)
      } else if (e.key === 'ArrowRight') {
        s.setAutoplay(false)
        s.stepStation(1)
      } else if (e.key === 'ArrowLeft') {
        s.setAutoplay(false)
        s.stepStation(-1)
      } else if (e.key === 'b' || e.key === 'B') {
        s.setAutoplay(false)
        s.flip()
      } else if (e.key === ' ') {
        e.preventDefault()
        s.setAutoplay(!s.autoplay)
      } else if (e.key === 'h' || e.key === 'H') {
        s.toggleHud()
      } else if (e.key === 'p' || e.key === 'P') {
        s.toggleProjector()
      } else if (e.key === '`') {
        s.togglePresenter()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])
}
