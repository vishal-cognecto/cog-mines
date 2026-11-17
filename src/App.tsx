import { useEffect } from 'react'
import { Director } from './core/Director'
import { Renderer } from './core/Renderer'
import { useApp } from './core/store'
import { useKeyboard } from './core/useKeyboard'
import { KeyHints, ModeSwitch, PresenterPanel, StationRail, Ticker, TopBar, TransitionWipe } from './hud/Chrome'
import { scenes } from './scenes'

export function App() {
  useKeyboard()
  const scene = useApp((s) => s.scene)
  const hudVisible = useApp((s) => s.hudVisible)
  const projector = useApp((s) => s.projector)
  const SceneHud = scenes[scene].Hud

  useEffect(() => {
    document.documentElement.classList.toggle('projector', projector)
  }, [projector])

  return (
    <>
      <Renderer />
      <div className="scanlines" />
      <TransitionWipe />
      <Director />
      <div className={`hud ${hudVisible ? '' : 'is-hidden'}`}>
        <TopBar />
        <ModeSwitch />
        <StationRail />
        <SceneHud key={scene} />
        <Ticker />
        <KeyHints />
        <PresenterPanel />
      </div>
    </>
  )
}
