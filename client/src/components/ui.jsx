import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Link } from 'react-router-dom'
import Icon from './Icon.jsx'
import { urls } from '../api.js'
import { fullName, idOf, topicLabel } from '../lib.js'

// The mark: a rising curve and the line that touches it (its tangent). Upswing follows the slope of your interests.
export function Logo({ size = 28, word = true }) {
  return (
    <span className="logo">
      <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true">
        <path d="M4 26C11 26 18 21 22 8" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" />
        <path className="logo-line" d="M8 27L28 7" stroke="var(--topic-tech)" strokeWidth="2.6" strokeLinecap="round" />
        <circle cx="17.6" cy="17.4" r="3.2" fill="currentColor" />
      </svg>
      {word && <span className="logo-word">upswing</span>}
    </span>
  )
}

const TINTS = ['tech', 'sport', 'business', 'politics', 'entertainment']
export function Avatar({ user, size = 40 }) {
  const id = idOf(user)
  const name = user?.profileImage?.imageName
  const [broken, setBroken] = useState(false)
  useEffect(() => setBroken(false), [name])
  const initials = [user?.firstName, user?.lastName].filter(Boolean).map((part) => part[0]).join('').toUpperCase() || '?'
  let hash = 0
  for (const char of id || initials) hash = (hash * 31 + char.charCodeAt(0)) >>> 0
  return (
    <span className="avatar" style={{ width: size, height: size, fontSize: Math.round(size * 0.38), '--tint': `var(--topic-${TINTS[hash % 5]})` }} aria-hidden="true">
      {name && !broken ? <img src={urls.avatar(id, name)} alt="" loading="lazy" onError={() => setBroken(true)} /> : initials}
    </span>
  )
}

export function Topic({ topic, className = '' }) {
  if (!topic) return null
  return <span className={`topic ${className}`}><i className="dot" style={{ background: `var(--topic-${topic})` }} />{topicLabel(topic)}</span>
}

export function Modal({ title, onClose, children, wide = false }) {
  const panel = useRef(null)
  const close = useRef(onClose)
  close.current = onClose
  useEffect(() => {
    const before = document.activeElement
    const onKey = (event) => { if (event.key === 'Escape') close.current() }
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    panel.current?.querySelector('textarea, input, .modal-body button')?.focus()
    return () => { document.removeEventListener('keydown', onKey); document.body.style.overflow = ''; before?.focus?.() }
  }, [])
  return createPortal(
    <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose() }}>
      <div className={`modal${wide ? ' modal-wide' : ''}`} role="dialog" aria-modal="true" aria-label={title} ref={panel}>
        <header className="modal-head">
          <h2>{title}</h2>
          <button className="icon-btn" onClick={onClose} aria-label="Close"><Icon name="close" /></button>
        </header>
        <div className="modal-body">{children}</div>
      </div>
    </div>,
    document.body,
  )
}

// A small "..." menu. items: [{ label, icon, onClick, danger }]
export function Menu({ items, label = 'More' }) {
  const [open, setOpen] = useState(false)
  const root = useRef(null)
  useEffect(() => {
    if (!open) return undefined
    const away = (event) => { if (!root.current?.contains(event.target)) setOpen(false) }
    const escape = (event) => { if (event.key === 'Escape') setOpen(false) }
    document.addEventListener('mousedown', away)
    document.addEventListener('keydown', escape)
    return () => { document.removeEventListener('mousedown', away); document.removeEventListener('keydown', escape) }
  }, [open])
  const shown = items.filter(Boolean)
  if (!shown.length) return null
  return (
    <div className="menu" ref={root}>
      <button className="icon-btn" onClick={() => setOpen((v) => !v)} aria-label={label} aria-haspopup="menu" aria-expanded={open}><Icon name="more" /></button>
      {open && (
        <div className="menu-list" role="menu">
          {shown.map((item) => (
            <button key={item.label} role="menuitem" className={item.danger ? 'danger' : ''} onClick={() => { setOpen(false); item.onClick() }}>
              <Icon name={item.icon} size={18} />{item.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

export const Spinner = () => <div className="spinner-wrap" role="status"><span className="spinner" /><span className="sr-only">Loading</span></div>

export function Empty({ title, children, action }) {
  return (
    <div className="empty">
      <h2>{title}</h2>
      {children && <p>{children}</p>}
      {action}
    </div>
  )
}
export function Problem({ error, onRetry }) {
  return (
    <div className="problem" role="alert">
      <p>{error}</p>
      {onRetry && <button className="btn btn-sm" onClick={onRetry}>Try again</button>}
    </div>
  )
}
export function PageHead({ title, children }) {
  return <header className="page-head"><h1>{title}</h1>{children}</header>
}
export function Tabs({ tabs, value, onChange }) {
  return (
    <div className="tabs" role="tablist">
      {tabs.map((tab) => (
        <button key={tab.key} role="tab" aria-selected={value === tab.key} className={value === tab.key ? 'on' : ''} onClick={() => onChange(tab.key)}>
          {tab.label}{tab.count ? <span className="tab-count">{tab.count}</span> : null}
        </button>
      ))}
    </div>
  )
}
// One person in a list, with something on the right (a button, a badge)
export function PersonRow({ user, note, children, onNavigate }) {
  return (
    <div className="person">
      <Link to={`/u/${idOf(user)}`} className="person-link" onClick={onNavigate}>
        <Avatar user={user} size={40} />
        <span className="person-text">
          <strong>{fullName(user)}</strong>
          {(note || user.job) && <span>{note || user.job}</span>}
        </span>
      </Link>
      {children}
    </div>
  )
}
// loads something when the page opens and whenever `deps` change
export function useLoad(load, deps) {
  const [state, setState] = useState({ data: null, error: '', loading: true })
  const [turn, setTurn] = useState(0)
  useEffect(() => {
    let live = true
    setState((s) => ({ ...s, loading: true, error: '' }))
    load().then((data) => { if (live) setState({ data, error: '', loading: false }) })
      .catch((error) => { if (live) setState({ data: null, error: error.message, loading: false }) })
    return () => { live = false }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, turn])
  return { ...state, reload: () => setTurn((n) => n + 1), setData: (data) => setState((s) => ({ ...s, data: typeof data === 'function' ? data(s.data) : data })) }
}
