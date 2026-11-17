import type { ReactNode } from 'react'

/** Label + big value, with optional unit and delta. */
export function Stat({ label, value, unit, tone }: { label: string; value: ReactNode; unit?: string; tone?: 'ok' | 'alert' | 'warn' }) {
  return (
    <div className={`stat ${tone ? `stat--${tone}` : ''}`}>
      <div className="stat__label">{label}</div>
      <div className="stat__value">
        {value}
        {unit && <span className="stat__unit">{unit}</span>}
      </div>
    </div>
  )
}

/** Thin horizontal bar, 0..1. */
export function Bar({ value, tone, label, right }: { value: number; tone?: 'ok' | 'alert' | 'warn'; label?: string; right?: ReactNode }) {
  return (
    <div className="bar">
      {(label || right) && (
        <div className="bar__row">
          <span>{label}</span>
          <span className="mono">{right}</span>
        </div>
      )}
      <div className="bar__track">
        <div className={`bar__fill ${tone ? `bar__fill--${tone}` : ''}`} style={{ width: `${Math.max(0, Math.min(1, value)) * 100}%` }} />
      </div>
    </div>
  )
}

/** Circular gauge, 0..1. */
export function Gauge({ value, label, size = 72, tone }: { value: number; label: string; size?: number; tone?: 'ok' | 'alert' | 'warn' }) {
  const r = size / 2 - 5
  const c = 2 * Math.PI * r
  const v = Math.max(0, Math.min(1, value))
  return (
    <div className={`gauge ${tone ? `gauge--${tone}` : ''}`} style={{ width: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle className="gauge__track" cx={size / 2} cy={size / 2} r={r} />
        <circle
          className="gauge__fill"
          cx={size / 2}
          cy={size / 2}
          r={r}
          strokeDasharray={`${c * v} ${c}`}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
        <text x="50%" y="52%" dominantBaseline="middle" textAnchor="middle" className="gauge__text">
          {Math.round(v * 100)}%
        </text>
      </svg>
      <div className="gauge__label">{label}</div>
    </div>
  )
}

/** Tiny line chart. */
export function Sparkline({ values, width = 140, height = 32, tone }: { values: number[]; width?: number; height?: number; tone?: 'ok' | 'alert' }) {
  if (values.length < 2) return <svg width={width} height={height} />
  const min = Math.min(...values)
  const max = Math.max(...values)
  const span = max - min || 1
  const pts = values.map((v, i) => `${(i / (values.length - 1)) * width},${height - 2 - ((v - min) / span) * (height - 4)}`).join(' ')
  return (
    <svg className={`spark ${tone ? `spark--${tone}` : ''}`} width={width} height={height}>
      <polyline points={pts} />
    </svg>
  )
}

/** Checklist row with a state glyph. */
export function CheckRow({ state, children }: { state: 'pass' | 'fail' | 'pending' | 'skipped' | 'active'; children: ReactNode }) {
  const glyph = { pass: '✓', fail: '✕', pending: '○', skipped: '–', active: '◉' }[state]
  return (
    <div className={`check check--${state}`}>
      <span className="check__glyph">{glyph}</span>
      <span>{children}</span>
    </div>
  )
}

/** Small uppercase key / value line. */
export function KV({ k, v, mono = true }: { k: string; v: ReactNode; mono?: boolean }) {
  return (
    <div className="kv">
      <span className="kv__k">{k}</span>
      <span className={`kv__v ${mono ? 'mono' : ''}`}>{v}</span>
    </div>
  )
}

export function Divider({ label }: { label?: string }) {
  return <div className="divider">{label && <span>{label}</span>}</div>
}

export function Chip({ children, tone }: { children: ReactNode; tone?: 'ok' | 'alert' | 'warn' | 'dim' }) {
  return <span className={`chip ${tone ? `chip--${tone}` : ''}`}>{children}</span>
}
