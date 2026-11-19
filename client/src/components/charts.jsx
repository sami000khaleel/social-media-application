import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'

// Small hand-written SVG charts. Colours only ever mark data; every text uses the ink colours.

export function useWidth(fallback = 600) {
  const ref = useRef(null)
  const [width, setWidth] = useState(fallback)
  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return undefined
    setWidth(el.clientWidth || fallback)
    const observer = new ResizeObserver(([entry]) => setWidth(Math.max(240, Math.floor(entry.contentRect.width))))
    observer.observe(el)
    return () => observer.disconnect()
  }, [fallback])
  return [ref, width]
}

const dayMs = 864e5
export const shortDate = (t) => new Date(t).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })
// a round step for an axis: 1, 2, 2.5 or 5 times a power of ten
const niceStep = (span, n = 4) => {
  const raw = Math.max(span, 1e-9) / n
  const pow = 10 ** Math.floor(Math.log10(raw))
  return ([1, 2, 2.5, 5, 10].find((k) => k * pow >= raw) || 10) * pow
}
const niceMax = (v) => {
  if (v <= 0) return 10
  const step = 10 ** Math.floor(Math.log10(v))
  return Math.ceil(v / step * 2) / 2 * step
}
const ticks = (min, max, n = 4) => Array.from({ length: n + 1 }, (_, i) => min + (max - min) * i / n)
const fmt = (v) => (Math.abs(v) >= 1000 ? `${(v / 1000).toFixed(1).replace(/\.0$/, '')}K` : String(Math.round(v)))

function Tip({ tip, width }) {
  if (!tip) return null
  const left = Math.min(Math.max(tip.x + 14, 4), width - 214)
  return (
    <div className="chart-tip" style={{ left, top: tip.y }} role="status">
      {tip.title && <div className="chart-tip-title">{tip.title}</div>}
      {tip.rows.map((row) => (
        <div key={row.label} className="chart-tip-row">
          <i style={{ background: row.color }} />
          <strong>{row.value}</strong>
          <span>{row.label}</span>
        </div>
      ))}
      {tip.note && <div className="chart-tip-note">{tip.note}</div>}
    </div>
  )
}

export function Legend({ items, kind = 'line' }) {
  return (
    <div className="legend">
      {items.map((item) => (
        <span key={item.label} className="legend-item">
          <i className={`legend-key legend-${kind}`} style={{ background: item.color }} />{item.label}
        </span>
      ))}
    </div>
  )
}

// value of a polyline (sorted by t) at time t
function valueAt(points, t) {
  if (!points.length || t < points[0].t) return null
  for (let i = points.length - 1; i >= 0; i--) {
    if (points[i].t <= t) {
      const next = points[i + 1]
      if (!next) return points[i].v
      return points[i].v + (next.v - points[i].v) * (t - points[i].t) / (next.t - points[i].t)
    }
  }
  return null
}
const HOUR = 36e5
// tick positions for a time range: days for long ranges, hours or minutes for a zoom
function timeTicks(from, to, width) {
  const span = to - from
  const steps = [5 * 60e3, 15 * 60e3, 30 * 60e3, HOUR, 3 * HOUR, 6 * HOUR, dayMs, 2 * dayMs, 7 * dayMs]
  const step = steps.find((s) => span / s <= Math.max(3, width / 90)) || 14 * dayMs
  const list = []
  for (let t = to; t >= from - 1; t -= step) list.unshift(t)
  const label = (t) => (t === to ? 'Now' : step < dayMs ? new Date(t).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' }) : shortDate(t))
  return list.map((t) => ({ t, label: label(t) }))
}

// series: [{ key, label, color, points: [{ t, v }] }]
// band: { from, to, label } a shaded time window;  tangents: [{ key, color, t1, v1, t2, v2 }]
// The lines draw themselves in when the chart scrolls into view (see .chart-anim in styles.css).
export function LineChart({ series, from, to, height = 300, band, tangents = [], ariaLabel, nowLabel = 'Now', fitY = false }) {
  const [ref, width] = useWidth()
  const [tip, setTip] = useState(null)
  const [cursor, setCursor] = useState(null)
  const clipId = useMemo(() => `clip-${Math.random().toString(36).slice(2)}`, [])
  const m = { top: 14, right: width < 480 ? 64 : 112, bottom: 28, left: 42 }
  const w = Math.max(10, width - m.left - m.right)
  const h = height - m.top - m.bottom
  // the y range covers what is visible: the points inside the range and the values at its two edges
  const visible = series.flatMap((s) => s.points.filter((p) => p.t >= from && p.t <= to).map((p) => p.v)
    .concat([valueAt(s.points, from), valueAt(s.points, to)].filter((v) => v !== null)))
  const all = visible.concat(tangents.flatMap((t) => [t.v1, t.v2]))
  // round ticks; normally the axis starts at 0, a zoom fits the axis to the values (fitY)
  const lo = fitY ? Math.min(...all) : Math.min(0, ...all)
  const hi = fitY ? Math.max(...all) : Math.max(10, ...all)
  const step = niceStep(Math.max(hi - lo, fitY ? 4 : 10))
  // a tiny dip below zero (a score of -4 next to 400) does not get a whole empty band
  const floor = !fitY && lo < 0 && lo > -step * 0.15 ? 0 : lo
  const minV = Math.floor((fitY ? lo - step * 0.25 : floor) / step) * step
  const maxV = Math.max(minV + step, Math.ceil((fitY ? hi + step * 0.25 : hi) / step) * step)
  const yTicks = []
  for (let v = minV; v <= maxV + step / 2; v += step) yTicks.push(Number(v.toFixed(6)))
  const x = (t) => m.left + (t - from) / (to - from) * w
  const y = (v) => m.top + h - (v - minV) / (maxV - minV) * h
  const xTicks = timeTicks(from, to, w)

  // end labels: only where they do not collide (the legend and the tooltip cover the rest)
  const ends = series.map((s) => ({ s, v: valueAt(s.points, to) ?? s.points.at(-1)?.v ?? 0 })).sort((a, b) => y(a.v) - y(b.v))
  let lastY = -Infinity
  const labels = ends.filter((e) => { const yy = y(e.v); if (yy - lastY < 17) return false; lastY = yy; return true })

  const show = (t, px, py) => {
    const tt = Math.min(to, Math.max(from, t))
    setCursor(tt)
    const rows = series.map((s) => ({ label: s.label, color: s.color, v: valueAt(s.points, tt) }))
      .filter((r) => r.v !== null).sort((a, b) => b.v - a.v).map((r) => ({ ...r, value: `${Math.round(r.v)} points` }))
    setTip({ x: px, y: Math.max(0, py - 20), title: new Date(tt).toLocaleString(undefined, { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }), rows })
  }
  const onMove = (event) => {
    const box = event.currentTarget.getBoundingClientRect()
    const px = event.clientX - box.left
    show(from + (px - m.left) / w * (to - from), px, event.clientY - box.top)
  }
  const onKey = (event) => {
    if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return
    event.preventDefault()
    const stepMs = (to - from) / 35
    const now = cursor ?? to
    const next = event.key === 'Home' ? from : event.key === 'End' ? to : now + (event.key === 'ArrowLeft' ? -stepMs : stepMs)
    show(next, x(Math.min(to, Math.max(from, next))), m.top + 20)
  }
  const visiblePoints = (points) => {
    // the points inside the range plus one on each side, so the line reaches both edges
    const first = Math.max(0, points.findIndex((p) => p.t >= from) - 1)
    let last = points.findIndex((p) => p.t > to)
    last = last === -1 ? points.length : last + 1
    return points.slice(first < 0 ? 0 : first, last)
  }
  const bandFrom = band ? Math.max(from, band.from) : 0
  return (
    <div className="chart" ref={ref}>
      <svg width={width} height={height} role="img" aria-label={ariaLabel} tabIndex={0}
        onPointerMove={onMove} onPointerLeave={() => { setTip(null); setCursor(null) }} onKeyDown={onKey} onBlur={() => { setTip(null); setCursor(null) }}>
        <defs><clipPath id={clipId}><rect x={m.left} y={0} width={w + 6} height={height} /></clipPath></defs>
        {band && (
          <g className="chart-band-g">
            <rect x={x(bandFrom)} y={m.top} width={Math.max(3, x(band.to) - x(bandFrom))} height={h} className="chart-band" />
            <text x={Math.min(x(bandFrom) + 6, m.left + w - 150)} y={m.top + 14} className="chart-band-label">{band.label}</text>
          </g>
        )}
        {yTicks.map((v) => (
          <g key={v}>
            <line x1={m.left} x2={m.left + w} y1={y(v)} y2={y(v)} className={v === 0 ? 'chart-zero' : 'chart-grid'} />
            <text x={m.left - 8} y={y(v) + 4} className="chart-axis" textAnchor="end">{fmt(v)}</text>
          </g>
        ))}
        {xTicks.map(({ t, label }) => <text key={t} x={x(t)} y={height - 8} className="chart-axis" textAnchor={t === to ? 'end' : 'middle'}>{t === to ? nowLabel : label}</text>)}
        <g clipPath={`url(#${clipId})`}>
          {series.map((s, i) => (
            <polyline key={s.key} className="chart-line" style={{ '--i': i }} pathLength="1" fill="none" stroke={s.color} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round"
              points={visiblePoints(s.points).map((p) => `${x(p.t).toFixed(1)},${y(p.v).toFixed(1)}`).join(' ')} />
          ))}
          {tangents.map((t, i) => (
            <g key={t.key} className="tangent" style={{ '--i': i }}>
              <line x1={x(t.t1)} y1={y(t.v1)} x2={x(t.t2)} y2={y(t.v2)} stroke={t.color} pathLength="1" />
              <circle cx={x(t.t1)} cy={y(t.v1)} r="4.5" fill={t.color} className="chart-dot" />
              <circle cx={x(t.t2)} cy={y(t.v2)} r="4.5" fill={t.color} className="chart-dot" />
            </g>
          ))}
        </g>
        {ends.map(({ s, v }) => <circle key={s.key} cx={x(to)} cy={y(v)} r="4" fill={s.color} className="chart-dot chart-end-dot" />)}
        {labels.map(({ s, v }) => (
          <text key={s.key} x={m.left + w + 10} y={y(v) + 4} className="chart-end"><tspan className="chart-end-value">{Math.round(v)}</tspan>{width >= 480 ? ` ${s.label}` : ''}</text>
        ))}
        {cursor !== null && <line x1={x(cursor)} x2={x(cursor)} y1={m.top} y2={m.top + h} className="chart-cursor" />}
      </svg>
      <Tip tip={tip} width={width} />
    </div>
  )
}

// columns: [{ key, label, title, parts: { [series key]: number }, note }]
// series: [{ key, label, color }]; percent: every column fills to 100%
export function Columns({ columns, series, height = 220, percent = false, ariaLabel, formatValue = (v) => String(v) }) {
  const [ref, width] = useWidth()
  const [tip, setTip] = useState(null)
  const [hover, setHover] = useState(null)
  const m = { top: 10, right: 8, bottom: 28, left: percent ? 40 : 32 }
  const w = width - m.left - m.right
  const h = height - m.top - m.bottom
  const totals = columns.map((c) => series.reduce((sum, s) => sum + (c.parts[s.key] || 0), 0))
  const maxV = percent ? 1 : niceMax(Math.max(1, ...totals))
  const band = w / Math.max(1, columns.length)
  const barW = Math.min(24, Math.max(3, band * 0.7))
  const y = (v) => m.top + h - v / maxV * h
  const every = Math.ceil(columns.length / Math.max(1, Math.floor(w / 64)))
  const show = (index, px, py) => {
    const c = columns[index]
    const total = totals[index]
    setHover(index)
    const rows = series.filter((s) => c.parts[s.key]).slice().reverse().map((s) => ({
      label: s.label, color: s.color,
      value: percent ? `${Math.round(c.parts[s.key] / (total || 1) * 100)}%` : formatValue(c.parts[s.key]),
    }))
    setTip({ x: px, y: py, title: c.title || c.label, rows, note: c.note })
  }
  return (
    <div className="chart" ref={ref}>
      <svg width={width} height={height} role="img" aria-label={ariaLabel} onPointerLeave={() => { setTip(null); setHover(null) }}>
        {ticks(0, maxV, percent ? 4 : 3).map((v) => (
          <g key={v}>
            <line x1={m.left} x2={m.left + w} y1={y(v)} y2={y(v)} className={v === 0 ? 'chart-zero' : 'chart-grid'} />
            <text x={m.left - 8} y={y(v) + 4} className="chart-axis" textAnchor="end">{percent ? `${Math.round(v * 100)}%` : fmt(v)}</text>
          </g>
        ))}
        {columns.map((c, i) => {
          const total = totals[i]
          const cx = m.left + band * i + band / 2
          let acc = 0
          const parts = series.filter((s) => c.parts[s.key] > 0)
          return (
            <g key={c.key} className={hover === i ? 'col on' : 'col'} style={{ '--i': i }} tabIndex={0} aria-label={`${c.title || c.label}: ${parts.map((s) => `${s.label} ${percent ? `${Math.round(c.parts[s.key] / (total || 1) * 100)}%` : formatValue(c.parts[s.key])}`).join(', ') || 'nothing'}`}
              onPointerMove={(event) => { const box = event.currentTarget.ownerSVGElement.getBoundingClientRect(); show(i, event.clientX - box.left, event.clientY - box.top - 30) }}
              onFocus={() => show(i, cx, m.top)} onBlur={() => { setTip(null); setHover(null) }}>
              <rect x={m.left + band * i} y={m.top} width={band} height={h} fill="transparent" />
              {parts.map((s, k) => {
                const v = percent ? c.parts[s.key] / (total || 1) : c.parts[s.key]
                const y1 = y(acc + v)
                const y0 = y(acc)
                acc += v
                const gap = k > 0 ? 2 : 0
                const top = k === parts.length - 1
                const hh = Math.max(0, y0 - y1 - gap)
                return top
                  ? <path key={s.key} d={roundTop(cx - barW / 2, y1, barW, hh, Math.min(4, hh))} fill={s.color} />
                  : <rect key={s.key} x={cx - barW / 2} y={y1} width={barW} height={hh} fill={s.color} />
              })}
            </g>
          )
        })}
        {columns.map((c, i) => (i % every === 0 || i === columns.length - 1) && (i === columns.length - 1 || columns.length - 1 - i >= every / 2)
          ? <text key={c.key} x={m.left + band * i + band / 2} y={height - 8} className="chart-axis" textAnchor="middle">{c.label}</text> : null)}
      </svg>
      <Tip tip={tip} width={width} />
    </div>
  )
}
function roundTop(x, y, w, h, r) {
  if (h <= 0) return ''
  return `M${x},${y + h}V${y + r}Q${x},${y} ${x + r},${y}H${x + w - r}Q${x + w},${y} ${x + w},${y + r}V${y + h}Z`
}

// a page of the feed as a row of tiles, one per post, coloured by topic
// a page of the feed as a row of tiles, one per post, coloured by topic.
// Each tile pops in a little after the one before it (when its parent has the class "in").
export function PageTiles({ posts, size = 'lg', label }) {
  return (
    <div className={`tiles tiles-${size}${posts.length > 12 ? ' tiles-many' : ''}`} role="img" aria-label={label}>
      {posts.map((p, i) => (
        <span key={i} className={`tile${p.filler ? ' tile-filler' : ''}${p.surprise ? ' tile-surprise' : ''}${p.surpriseSent ? ' tile-surprise-sent' : ''}${p.gap ? ' tile-gap' : ''}`} style={{ '--c': `var(--topic-${p.topic})`, '--i': i }} title={p.title}>
          {size === 'lg' && <><i /><i /></>}
        </span>
      ))}
    </div>
  )
}

// true once the element has been on screen (animations start then, not while it is still below the fold)
export function useInView(options = { threshold: 0.2 }) {
  const ref = useRef(null)
  const [seen, setSeen] = useState(false)
  useEffect(() => {
    const el = ref.current
    if (!el || seen) return undefined
    if (!('IntersectionObserver' in window)) { setSeen(true); return undefined }
    const observer = new IntersectionObserver(([entry]) => { if (entry.isIntersecting) { setSeen(true); observer.disconnect() } }, options)
    observer.observe(el)
    return () => observer.disconnect()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seen])
  return [ref, seen]
}

// animates a number from its previous value (once, when it changes)
export function useCountUp(value, ms = 600) {
  const [shown, setShown] = useState(value)
  const from = useRef(value)
  useEffect(() => {
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) { setShown(value); from.current = value; return undefined }
    const start = performance.now()
    const a = from.current
    let frame
    const step = (now) => {
      const k = Math.min(1, (now - start) / ms)
      setShown(a + (value - a) * (1 - (1 - k) ** 3))
      if (k < 1) frame = requestAnimationFrame(step); else from.current = value
    }
    frame = requestAnimationFrame(step)
    return () => cancelAnimationFrame(frame)
  }, [value, ms])
  return shown
}
export const useStable = (fn, deps) => useMemo(fn, deps) // eslint-disable-line react-hooks/exhaustive-deps
