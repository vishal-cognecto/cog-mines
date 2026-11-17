import { useEffect, useState } from 'react'
import { chain, facts, type FactId } from '../config/content'
import { useTour } from '../core/Director'
import { STATIONS, useApp, useFact, type Station } from '../core/store'
import { scenes } from '../scenes'
import { Panel } from './Panel'

const base = import.meta.env.BASE_URL

export function TopBar() {
  const scene = scenes[useApp((s) => s.pendingScene ?? s.scene)]
  const simulated = useFact('simulatedBadge')
  const autoplay = useApp((s) => s.autoplay)
  const setAutoplay = useApp((s) => s.setAutoplay)
  const togglePresenter = useApp((s) => s.togglePresenter)
  const wordmark = useFact('wordmark')
  const client = useFact('client')
  return (
    <header className="topbar">
      <div className="topbar__brand">
        {wordmark && <img src={`${base}brand/logo-white-cropped.svg`} alt={wordmark} className="topbar__logo" />}
        <span className="topbar__sep" />
        <span className="topbar__product">{client ? client.toUpperCase() : 'MINERAL CHAIN'}</span>
      </div>
      <div className="topbar__scene">
        <span className="topbar__index">{String(scene.index).padStart(2, '0')}</span>
        <span className="topbar__title">{scene.title}</span>
        <span className="topbar__subtitle">{scene.subtitle}</span>
      </div>
      <div className="topbar__right">
        {simulated && <span className="badge-sim">{simulated}</span>}
        <Clock />
        <button data-tour-control className={`btn btn--small ${autoplay ? 'btn--on' : ''}`} onClick={() => setAutoplay(!autoplay)}>
          {autoplay ? '❚❚ Autoplay' : '▶ Autoplay'}
        </button>
        <button className="btn btn--small btn--icon" aria-label="Presenter settings" onClick={togglePresenter}>
          <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true">
            <path d="M1 3.5h12M1 7h12M1 10.5h12" stroke="currentColor" strokeWidth="1.2" />
            <circle cx="4" cy="3.5" r="1.6" fill="#02060f" stroke="currentColor" strokeWidth="1.2" />
            <circle cx="9.5" cy="7" r="1.6" fill="#02060f" stroke="currentColor" strokeWidth="1.2" />
            <circle cx="6" cy="10.5" r="1.6" fill="#02060f" stroke="currentColor" strokeWidth="1.2" />
          </svg>
        </button>
      </div>
    </header>
  )
}

function Clock() {
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 1000)
    return () => window.clearInterval(id)
  }, [])
  const ist = now.toLocaleTimeString('en-GB', { timeZone: 'Asia/Kolkata', hour12: false })
  return <span className="clock mono">{ist} IST</span>
}

/** Today / With Cognecto switch. B flips it from the keyboard. */
export function ModeSwitch() {
  const scene = useApp((s) => s.pendingScene ?? s.scene)
  const goTo = useApp((s) => s.goTo)
  const setAutoplay = useApp((s) => s.setAutoplay)
  const pick = (id: 'before' | 'after') => {
    setAutoplay(false)
    goTo(id)
  }
  return (
    <div className="modeswitch" role="tablist" aria-label="Before and after">
      <button
        role="tab"
        aria-selected={scene === 'before'}
        className={`modeswitch__btn modeswitch__btn--before ${scene === 'before' ? 'is-on' : ''}`}
        onClick={() => pick('before')}
      >
        <span className="modeswitch__k mono">B</span>
        Today
      </button>
      <button
        role="tab"
        aria-selected={scene === 'after'}
        className={`modeswitch__btn modeswitch__btn--after ${scene === 'after' ? 'is-on' : ''}`}
        onClick={() => pick('after')}
      >
        With Cognecto
      </button>
    </div>
  )
}

/** Steps of the chain. 00 shows the whole chain. */
export function StationRail() {
  const scene = useApp((s) => s.pendingScene ?? s.scene)
  const station = useApp((s) => s.pendingStation ?? s.station)
  const setStation = useApp((s) => s.setStation)
  const setAutoplay = useApp((s) => s.setAutoplay)
  const autoplay = useApp((s) => s.autoplay)
  const { progress, pausedFor } = useTour()
  const items: { n: Station; name: string }[] = [
    { n: 0, name: 'Whole chain' },
    ...chain.map((c) => {
      // The rail is narrow: long step titles fall back to the short name.
      const title = scene === 'before' ? c.before.title : c.after.title
      return { n: c.n as Station, name: title.length <= 12 ? title : c.short }
    }),
  ]
  return (
    <nav className="rail" aria-label="Steps">
      {items.map((it) => {
        const active = it.n === station
        return (
          <button
            key={it.n}
            className={`rail__item ${active ? 'is-active' : ''} rail__item--${scene}`}
            onClick={() => {
              setAutoplay(false)
              setStation(it.n)
            }}
          >
            <span className="rail__index mono">{String(it.n).padStart(2, '0')}</span>
            <span className="rail__name">{it.name}</span>
            {it.n > 0 && <span className={`rail__flag rail__flag--${scene}`} />}
            {active && autoplay && <span className="rail__progress" style={{ transform: `scaleX(${progress})` }} />}
          </button>
        )
      })}
      {autoplay && pausedFor > 0 && <div className="rail__paused mono">Tour paused, resumes in {pausedFor}s</div>}
    </nav>
  )
}

export function Ticker() {
  const items = useApp((s) => s.ticker)
  return (
    <div className="ticker" aria-live="polite">
      {items.slice(0, 3).map((t, i) => (
        <div key={t.id} className={`ticker__row ticker__row--${t.level}`} style={{ opacity: 1 - i * 0.28 }}>
          <span className="mono ticker__time">{new Date(t.at).toLocaleTimeString('en-GB', { hour12: false })}</span>
          <span>{t.text}</span>
        </div>
      ))}
    </div>
  )
}

export function KeyHints() {
  return (
    <div className="keyhints mono">
      <span>
        <b>B</b> today / with Cognecto
      </span>
      <span>
        <b>0-{STATIONS}</b> steps
      </span>
      <span>
        <b>←→</b> step
      </span>
      <span>
        <b>space</b> autoplay
      </span>
      <span>
        <b>H</b> hide HUD
      </span>
      <span>
        <b>P</b> projector
      </span>
      <span>
        <b>`</b> presenter
      </span>
    </div>
  )
}

export function PresenterPanel() {
  const open = useApp((s) => s.presenterOpen)
  const toggle = useApp((s) => s.togglePresenter)
  const overrides = useApp((s) => s.factOverrides)
  const setFactVisible = useApp((s) => s.setFactVisible)
  const projector = useApp((s) => s.projector)
  const toggleProjector = useApp((s) => s.toggleProjector)
  if (!open) return null
  return (
    <Panel title="Presenter" tag="` to close" anchor={{ top: 92, right: 24 }} width={340} onClose={toggle} testId="presenter-panel" className="panel--top">
      <div className="presenter">
        <div className="presenter__group">Display</div>
        <Toggle label="Projector mode (P)" on={projector} set={() => toggleProjector()} />
        <div className="presenter__group">Figures and names</div>
        {(Object.keys(facts) as FactId[]).map((id) => (
          <Toggle key={id} label={facts[id].label} on={overrides[id] ?? facts[id].visible} set={(on) => setFactVisible(id, on)} />
        ))}
      </div>
    </Panel>
  )
}

function Toggle({ label, on, set }: { label: string; on: boolean; set: (on: boolean) => void }) {
  return (
    <label className="toggle">
      <input type="checkbox" checked={on} onChange={(e) => set(e.target.checked)} />
      <span className="toggle__track" />
      <span className="toggle__label">{label}</span>
    </label>
  )
}

/** Brief scanline wipe over the HUD while scenes swap. */
export function TransitionWipe() {
  const pending = useApp((s) => s.pendingScene)
  return <div className={`wipe ${pending ? 'is-on' : ''}`} />
}
