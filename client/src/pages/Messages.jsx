import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import Icon from '../components/Icon.jsx'
import NotifyPrompt from '../components/NotifyPrompt.jsx'
import { Page } from '../components/Layout.jsx'
import { Avatar, Empty, Modal, Problem, Spinner, useLoad } from '../components/ui.jsx'
import { api } from '../api.js'
import { useAuth, useFeedback } from '../context.jsx'
import { useRealtime, useSocketEvent } from '../realtime.jsx'
import { fullName, idOf, timeAgo } from '../lib.js'

const sameDay = (a, b) => new Date(a).toDateString() === new Date(b).toDateString()
function dayLabel(value) {
  const date = new Date(value)
  const today = new Date()
  const yesterday = new Date(Date.now() - 864e5)
  if (sameDay(date, today)) return 'Today'
  if (sameDay(date, yesterday)) return 'Yesterday'
  return date.toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' })
}
const clock = (value) => new Date(value).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })

function PersonAvatar({ user, size }) {
  const { online } = useRealtime()
  return (
    <span className="presence">
      <Avatar user={user} size={size} />
      {online.has(idOf(user)) && <span className="presence-dot" aria-label="Online" />}
    </span>
  )
}

function NewMessage({ onClose }) {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [text, setText] = useState('')
  const people = useLoad(() => api.everyone(), [])
  const shown = (people.data || []).filter((p) => idOf(p) !== idOf(user) && fullName(p).toLowerCase().includes(text.trim().toLowerCase()))
  return (
    <Modal title="New message" onClose={onClose}>
      <input className="field" value={text} onChange={(e) => setText(e.target.value)} placeholder="Search people" aria-label="Search people" />
      {people.loading && <Spinner />}
      <div className="people pick-list">
        {shown.map((person) => (
          <button key={idOf(person)} className="person person-pick" onClick={() => { onClose(); navigate(`/messages/${idOf(person)}`) }}>
            <PersonAvatar user={person} size={40} />
            <span className="person-text"><strong>{fullName(person)}</strong>{person.job && <span>{person.job}</span>}</span>
          </button>
        ))}
        {people.data && !shown.length && <p className="muted">Nobody found.</p>}
      </div>
    </Modal>
  )
}

function Conversations({ activeId, onNew }) {
  const { user } = useAuth()
  const { data, error, loading, reload } = useLoad(() => api.conversations(), [])
  // a new or read message changes the order, the preview and the counts
  useSocketEvent('message:new', reload)
  useSocketEvent('message:read', reload)
  useEffect(() => { if (activeId) { const t = setTimeout(reload, 400); return () => clearTimeout(t) } return undefined }, [activeId])
  return (
    <aside className="convos" aria-label="Conversations">
      <div className="convos-head">
        <h1>Messages</h1>
        <button className="icon-btn" onClick={onNew} aria-label="New message" title="New message"><Icon name="edit" /></button>
      </div>
      {loading && !data && <Spinner />}
      {error && <Problem error={error} onRetry={reload} />}
      {data && !data.length && <p className="muted convos-empty">No conversations yet. Start one with the pencil button.</p>}
      {data && data.map(({ user: other, lastMessage, unread }) => {
        const mine = idOf(lastMessage.from) === idOf(user)
        return (
          <Link key={other._id} to={`/messages/${other._id}`} className={`convo${other._id === activeId ? ' on' : ''}${unread ? ' unread' : ''}`}>
            <PersonAvatar user={other} size={44} />
            <span className="convo-text">
              <span className="convo-top"><strong>{fullName(other)}</strong><span className="muted">{timeAgo(lastMessage.createdAt)}</span></span>
              <span className="convo-last">{mine ? 'You: ' : ''}{lastMessage.text}</span>
            </span>
            {unread > 0 && <span className="pill" aria-label={`${unread} unread`}>{unread}</span>}
          </Link>
        )
      })}
    </aside>
  )
}

function Thread({ otherId }) {
  const { user, isDemo } = useAuth()
  const me = idOf(user)
  const { toast } = useFeedback()
  const { socket, connected, online, setOpenThread, refreshCounts } = useRealtime()
  const [state, setState] = useState({ loading: true, error: '', user: null, messages: [], more: false })
  const [text, setText] = useState('')
  const [typing, setTyping] = useState(false)
  const [sending, setSending] = useState(false)
  const list = useRef(null)
  const stick = useRef(true)
  const typingSent = useRef(0)
  const typingTimer = useRef(null)

  useEffect(() => {
    let live = true
    setState({ loading: true, error: '', user: null, messages: [], more: false })
    setOpenThread(otherId)
    stick.current = true
    api.thread(otherId)
      .then((data) => { if (live) { setState({ loading: false, error: '', user: data.user, messages: data.messages, more: data.more }); refreshCounts() } })
      .catch((problem) => live && setState((s) => ({ ...s, loading: false, error: problem.message })))
    return () => { live = false; setOpenThread(null) }
  }, [otherId, setOpenThread, refreshCounts])

  // when you come back to the tab, the messages you now see are read
  useEffect(() => {
    const seen = () => { if (document.visibilityState === 'visible' && socket) socket.emit('message:read', { from: otherId }) }
    document.addEventListener('visibilitychange', seen)
    return () => document.removeEventListener('visibilitychange', seen)
  }, [socket, otherId])

  const add = (message) => setState((s) => (s.messages.some((m) => m._id === message._id) ? s : { ...s, messages: [...s.messages, message] }))
  useSocketEvent('message:new', (message) => {
    const between = (message.from === otherId && message.to === me) || (message.from === me && message.to === otherId)
    if (!between) return
    add(message)
    if (message.from === otherId) {
      setTyping(false)
      if (document.visibilityState === 'visible') socket?.emit('message:read', { from: otherId })
    }
  })
  useSocketEvent('message:read', ({ by, at }) => {
    if (by !== otherId) return
    setState((s) => ({ ...s, messages: s.messages.map((m) => (m.from === me && !m.readAt ? { ...m, readAt: at } : m)) }))
  })
  useSocketEvent('typing', ({ from, typing: isTyping }) => {
    if (from !== otherId) return
    setTyping(isTyping)
    clearTimeout(typingTimer.current)
    if (isTyping) typingTimer.current = setTimeout(() => setTyping(false), 4000)
  })
  useEffect(() => () => clearTimeout(typingTimer.current), [])

  // stay at the bottom while new messages come in, unless you scrolled up to read
  useLayoutEffect(() => {
    const el = list.current
    if (el && stick.current) el.scrollTop = el.scrollHeight
  }, [state.messages, typing])
  const onScroll = () => { const el = list.current; stick.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80 }

  const loadOlder = async () => {
    const first = state.messages[0]
    const el = list.current
    const before = el.scrollHeight
    try {
      const data = await api.thread(otherId, first.createdAt)
      stick.current = false
      setState((s) => ({ ...s, messages: [...data.messages, ...s.messages], more: data.more }))
      requestAnimationFrame(() => { el.scrollTop = el.scrollHeight - before })
    } catch (problem) { toast(problem.message, 'error') }
  }

  const tellTyping = (value) => {
    if (!socket) return
    const now = Date.now()
    if (value && now - typingSent.current > 2500) { socket.emit('typing', { to: otherId, typing: true }); typingSent.current = now }
    if (!value) { socket.emit('typing', { to: otherId, typing: false }); typingSent.current = 0 }
  }
  const send = async (event) => {
    event.preventDefault()
    const body = text.trim()
    if (!body || sending) return
    setSending(true)
    stick.current = true
    try {
      let message
      if (socket && connected) {
        const answer = await new Promise((resolve) => socket.emit('message:send', { to: otherId, text: body }, resolve))
        if (!answer.success) throw new Error(answer.err)
        message = answer.message
      } else {
        message = await api.sendMessage(otherId, body)
      }
      add(message)
      setText('')
      tellTyping(false)
    } catch (problem) { toast(problem.message, 'error') }
    setSending(false)
  }

  const lastMine = useMemo(() => [...state.messages].reverse().find((m) => m.from === me), [state.messages, me])
  if (state.loading) return <section className="thread"><Spinner /></section>
  if (state.error) return <section className="thread"><Problem error={state.error === 'no user was found' ? 'This person does not exist.' : state.error} /></section>
  const other = state.user
  return (
    <section className="thread" aria-label={`Conversation with ${fullName(other)}`}>
      <header className="thread-head">
        <Link to="/messages" className="icon-btn thread-back" aria-label="All conversations"><Icon name="back" /></Link>
        <Link to={`/u/${otherId}`} className="thread-who">
          <PersonAvatar user={other} size={38} />
          <span className="person-text">
            <strong>{fullName(other)}</strong>
            <span>{typing ? 'typing…' : online.has(otherId) ? 'Online now' : 'Offline'}</span>
          </span>
        </Link>
      </header>
      <div className="thread-list" ref={list} onScroll={onScroll}>
        {state.more && <button className="btn btn-sm thread-older" onClick={loadOlder}>Load older messages</button>}
        {!state.messages.length && <p className="muted thread-empty">Say hello to {other.firstName}.</p>}
        {state.messages.map((message, index) => {
          const previous = state.messages[index - 1]
          const next = state.messages[index + 1]
          const mine = message.from === me
          const newDay = !previous || !sameDay(previous.createdAt, message.createdAt)
          const groupedWithNext = next && next.from === message.from && new Date(next.createdAt) - new Date(message.createdAt) < 5 * 60000 && sameDay(next.createdAt, message.createdAt)
          return (
            <div key={message._id}>
              {newDay && <div className="day"><span>{dayLabel(message.createdAt)}</span></div>}
              <div className={`bubble-row${mine ? ' mine' : ''}${groupedWithNext ? ' grouped' : ''}`}>
                <div className="bubble" title={new Date(message.createdAt).toLocaleString()}>{message.text}</div>
                {!groupedWithNext && <span className="bubble-time">{clock(message.createdAt)}{message === lastMine && message.readAt ? ' · Seen' : ''}</span>}
              </div>
            </div>
          )
        })}
        {typing && <div className="bubble-row"><div className="bubble typing-dots" aria-label={`${other.firstName} is typing`}><i /><i /><i /></div></div>}
      </div>
      {isDemo ? <p className="thread-form demo-off">Made-up people can't send messages. In your own account this chat is live: messages, typing and “Seen” arrive instantly.</p> : (
      <form className="thread-form" onSubmit={send}>
        <input className="field" value={text} placeholder={`Message ${other.firstName}`} maxLength={2000} aria-label={`Message ${other.firstName}`}
          onChange={(event) => { setText(event.target.value); tellTyping(event.target.value.length > 0) }}
          onBlur={() => tellTyping(false)} />
        <button className="btn btn-primary" disabled={!text.trim() || sending}>Send</button>
      </form>
      )}
    </section>
  )
}

export default function Messages() {
  const { id } = useParams()
  const [picking, setPicking] = useState(false)
  return (
    <Page rail={null}>
      <NotifyPrompt />
      <div className={`chat${id ? ' chat-open' : ''}`}>
        <Conversations activeId={id} onNew={() => setPicking(true)} />
        {id ? <Thread key={id} otherId={id} /> : (
          <section className="thread thread-none">
            <Empty title="Your messages" action={<button className="btn btn-primary" onClick={() => setPicking(true)}>New message</button>}>
              Pick a conversation, or start a new one.
            </Empty>
          </section>
        )}
      </div>
      {picking && <NewMessage onClose={() => setPicking(false)} />}
    </Page>
  )
}
