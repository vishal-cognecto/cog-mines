import { useRef, useState, type CSSProperties, type PointerEvent, type ReactNode } from 'react'

interface Props {
  title: string
  /** Small right-aligned tag in the header, e.g. "LIVE". */
  tag?: ReactNode
  tone?: 'default' | 'alert' | 'ok'
  /** Initial anchor. Use any of top/right/bottom/left in px. */
  anchor: CSSProperties
  width?: number
  children: ReactNode
  onClose?: () => void
  collapsible?: boolean
  className?: string
  testId?: string
}

/**
 * Holographic panel. Drag by the header; it tilts slightly while held so it
 * feels like a physical sheet. Double-click the header to collapse.
 */
export function Panel({ title, tag, tone = 'default', anchor, width = 320, children, onClose, collapsible = true, className, testId }: Props) {
  const [offset, setOffset] = useState({ x: 0, y: 0 })
  const [dragging, setDragging] = useState(false)
  const [collapsed, setCollapsed] = useState(false)
  const start = useRef<{ px: number; py: number; ox: number; oy: number } | null>(null)
  const root = useRef<HTMLDivElement>(null)

  const onDown = (e: PointerEvent<HTMLDivElement>) => {
    if ((e.target as HTMLElement).closest('button')) return
    e.currentTarget.setPointerCapture(e.pointerId)
    start.current = { px: e.clientX, py: e.clientY, ox: offset.x, oy: offset.y }
    setDragging(true)
  }
  const onMove = (e: PointerEvent<HTMLDivElement>) => {
    const s = start.current
    if (!s || !root.current) return
    let x = s.ox + e.clientX - s.px
    let y = s.oy + e.clientY - s.py
    // Keep the header on screen.
    const r = root.current.getBoundingClientRect()
    const baseLeft = r.left - offset.x
    const baseTop = r.top - offset.y
    x = Math.min(Math.max(x, -baseLeft), window.innerWidth - baseLeft - 80)
    y = Math.min(Math.max(y, -baseTop), window.innerHeight - baseTop - 32)
    setOffset({ x, y })
  }
  const onUp = () => {
    start.current = null
    setDragging(false)
  }

  return (
    <div
      ref={root}
      data-testid={testId}
      className={`panel panel--${tone} ${dragging ? 'is-dragging' : ''} ${className ?? ''}`}
      style={{ ...anchor, width, transform: `translate(${offset.x}px, ${offset.y}px)` }}
      onPointerDown={(e) => e.stopPropagation()}
    >
      <div
        className="panel__head"
        onPointerDown={onDown}
        onPointerMove={onMove}
        onPointerUp={onUp}
        onPointerCancel={onUp}
        onDoubleClick={() => collapsible && setCollapsed((c) => !c)}
      >
        <span className="panel__title">{title}</span>
        {tag && <span className="panel__tag">{tag}</span>}
        {collapsible && (
          <button className="panel__btn" aria-label={collapsed ? 'Expand' : 'Collapse'} onClick={() => setCollapsed((c) => !c)}>
            {collapsed ? '+' : '–'}
          </button>
        )}
        {onClose && (
          <button className="panel__btn" aria-label="Close" onClick={onClose}>
            ×
          </button>
        )}
      </div>
      {!collapsed && <div className="panel__body">{children}</div>}
      <i className="panel__corner panel__corner--tl" />
      <i className="panel__corner panel__corner--tr" />
      <i className="panel__corner panel__corner--bl" />
      <i className="panel__corner panel__corner--br" />
    </div>
  )
}
