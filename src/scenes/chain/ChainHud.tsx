import { chain, controls, headline, leakPatterns, type Mode } from '../../config/content'
import { useApp, useFact } from '../../core/store'
import { Panel } from '../../hud/Panel'
import { Divider } from '../../hud/widgets'
import { LOAD_T, ROYALTY_PER_T, useChain } from './chainStore'

/** Panels inside a column flow normally instead of being absolutely placed. */
const STACKED = { position: 'relative' } as const

export function ChainHud({ mode }: { mode: Mode }) {
  return (
    <>
      <div className="chain__col chain__col--left">
        <StepPanel mode={mode} />
      </div>
      <div className="chain__col chain__col--right">
        <SourcePanel mode={mode} />
        <LoadsPanel mode={mode} />
        {mode === 'after' ? <MatrixPanel /> : <PatternsPanel />}
      </div>
      <Closing mode={mode} />
    </>
  )
}

function StepPanel({ mode }: { mode: Mode }) {
  const station = useApp((s) => s.station)
  const portal = useFact('system')
  if (station === 0) {
    const h = headline[mode]
    return (
      <Panel
        key={`overview-${mode}`}
        title={mode === 'before' ? 'Today' : 'With Cognecto'}
        tag={portal ? `${portal} flow` : undefined}
        tone={mode === 'before' ? 'alert' : 'ok'}
        anchor={STACKED}
        width={380}
        testId="step-panel"
      >
        <div className="chain__kicker">{h.kicker}</div>
        <div className={`chain__headline chain__headline--${mode}`}>{h.title}</div>
        <p className="chain__lead">{h.lead}</p>
        <Divider label="The chain" />
        <ol className="chain__mini">
          {chain.map((s) => (
            <li key={s.id}>
              <button className="chain__mini-btn" onClick={() => go(s.n)}>
                <span className={`chain__dot chain__dot--${mode}`}>{s.n}</span>
                <span>{mode === 'before' ? s.before.title : s.after.title}</span>
              </button>
            </li>
          ))}
        </ol>
        <div className="chain__hint mono">Pick a step, or press 1-6. B flips today and with Cognecto.</div>
      </Panel>
    )
  }
  const step = chain[station - 1]
  if (mode === 'before') {
    return (
      <Panel
        key={`step-${mode}-${station}`}
        title={`Step ${step.n} · today`}
        tag="current process"
        tone="alert"
        anchor={STACKED}
        width={380}
        testId="step-panel"
      >
        <div className="chain__step-title">
          <span className="chain__dot chain__dot--before">{step.n}</span>
          {step.before.title}
        </div>
        <p className="chain__lead">{step.before.what}</p>
        <Divider label="Gaps" />
        <ul className="chain__list">
          {step.before.gaps.map((g) => (
            <li key={g} className="chain__gap">
              {g}
            </li>
          ))}
        </ul>
      </Panel>
    )
  }
  return (
    <Panel
      key={`step-${mode}-${station}`}
      title={`Step ${step.n} · with Cognecto`}
      tag="proposed controls"
      tone="ok"
      anchor={STACKED}
      width={380}
      testId="step-panel"
    >
      <div className="chain__step-title">
        <span className="chain__dot chain__dot--after">{step.n}</span>
        {step.after.title}
      </div>
      <div className="chain__closes">
        <span className="chain__closes-k">Closes</span>
        <s>{step.after.closes}</s>
      </div>
      <Divider label="Controls" />
      <ul className="chain__list">
        {step.after.controls.map((c) => (
          <li key={c.name} className="chain__control">
            <b>{c.name}</b> {c.text}
          </li>
        ))}
      </ul>
    </Panel>
  )
}

function go(n: number) {
  const s = useApp.getState()
  s.setAutoplay(false)
  s.setStation(n as never)
}

function SourcePanel({ mode }: { mode: Mode }) {
  const station = useApp((s) => s.station)
  const before = mode === 'before'
  return (
    <Panel
      title="Who writes the number"
      tag={before ? '6 of 6 typed in' : '6 of 6 captured'}
      tone={before ? 'alert' : 'ok'}
      anchor={STACKED}
      width={380}
      testId="source-panel"
    >
      <div className="chain__sources">
        {chain.map((s) => (
          <button key={s.id} className={`chain__source ${station === s.n ? 'is-on' : ''}`} onClick={() => go(s.n)}>
            <span className={`chain__dot chain__dot--${mode}`}>{s.n}</span>
            <span className="chain__source-step">{s.short}</span>
            <span className={`chain__source-by chain__source-by--${mode}`}>{before ? s.before.source : s.after.source}</span>
          </button>
        ))}
      </div>
      <div className={`chain__verdict chain__verdict--${mode}`}>
        {before
          ? 'Declared by the party that benefits. Nothing checks it against what physically moved.'
          : 'From a sensor, a camera, a government record or a scan. Every entry is kept.'}
      </div>
    </Panel>
  )
}

const inr = (n: number) => n.toLocaleString('en-IN')

function LoadsPanel({ mode }: { mode: Mode }) {
  const dug = useChain((s) => s.dug)
  const entered = useChain((s) => s.entered)
  const royalty = useFact('royaltyRates')
  const gap = dug - entered
  const rupees = gap * LOAD_T * ROYALTY_PER_T
  const before = mode === 'before'
  return (
    <Panel title="Loads dug vs on the books" tag={`${LOAD_T} t stone loads`} anchor={STACKED} width={380} testId="loads-panel">
      <div className="chain__loads">
        <div>
          <div className="stat__label">Dug</div>
          <div className="chain__big mono">{dug}</div>
        </div>
        <div>
          <div className="stat__label">On the books</div>
          <div className={`chain__big mono ${before ? 'is-gap' : 'is-ok'}`} data-testid="loads-entered">
            {entered}
          </div>
        </div>
        <div>
          <div className="stat__label">Royalty missed</div>
          <div className={`chain__big mono ${before && gap > 0 ? 'is-gap' : 'is-ok'}`} data-testid="royalty-gap">
            ₹{inr(rupees)}
          </div>
        </div>
      </div>
      <div className="chain__bar">
        <div className="chain__bar-in" style={{ width: `${(entered / dug) * 100}%` }} />
        <div className={`chain__bar-out ${before ? '' : 'is-none'}`} style={{ width: `${(gap / dug) * 100}%` }} />
      </div>
      <div className="chain__note">
        {before
          ? `Fee paid on ${Math.round((entered / dug) * 100)} of every 100 loads. Each load off the books is ₹${inr(LOAD_T * ROYALTY_PER_T)} of royalty.`
          : 'Drone volume and gate weights put every load on the books.'}
        {royalty && <span className="chain__source-note"> Royalty: {royalty}.</span>}
      </div>
    </Panel>
  )
}

function MatrixPanel() {
  const station = useApp((s) => s.station)
  return (
    <Panel title="Where each control comes in" tag="dot = step it changes" tone="ok" anchor={STACKED} width={380} testId="matrix-panel">
      <div className="chain__matrix">
        <span />
        {chain.map((s) => (
          <button key={s.id} className={`chain__matrix-h ${station === s.n ? 'is-on' : ''}`} onClick={() => go(s.n)} title={s.title}>
            {s.n}
          </button>
        ))}
        {controls.map((c) => {
          const live = station === 0 || c.steps.includes(chain[station - 1].id)
          return (
            <div key={c.name} className={`chain__matrix-row ${live ? '' : 'is-dim'}`}>
              <span className="chain__matrix-name" title={c.does}>
                {c.name}
              </span>
              {chain.map((s) => (
                <span key={s.id} className={`chain__matrix-cell ${station === s.n ? 'is-col' : ''}`}>
                  {c.steps.includes(s.id) && <i />}
                </span>
              ))}
            </div>
          )
        })}
      </div>
    </Panel>
  )
}

function PatternsPanel() {
  const station = useApp((s) => s.station)
  const focus = station === 0 ? null : chain[station - 1].id
  return (
    <Panel title="Already found by the department" tag="leakage patterns" tone="alert" anchor={STACKED} width={380} testId="patterns-panel">
      <ul className="chain__patterns">
        {leakPatterns.map((p) => (
          <li key={p.name} className={focus && p.step !== focus ? 'is-dim' : ''}>
            <b>{p.name}.</b> {p.text}
          </li>
        ))}
      </ul>
    </Panel>
  )
}

function Closing({ mode }: { mode: Mode }) {
  return (
    <div className={`chain__closing chain__closing--${mode}`} data-testid="closing">
      {headline[mode].closing}
    </div>
  )
}
