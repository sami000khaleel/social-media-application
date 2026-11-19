import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { io } from 'socket.io-client'
import { SERVER, api, token } from './api.js'
import { useAuth, useFeedback } from './context.jsx'
import { fullName, idOf } from './lib.js'
import { ABOUT } from './notificationText.js'
import * as browser from './notify.js'

// One Socket.IO connection per signed-in tab: live notifications, direct messages, typing,
// who is online, and new points in your interest scores.
const RealtimeContext = createContext(null)
export const useRealtime = () => useContext(RealtimeContext)

// runs handler whenever the server sends `event`
export function useSocketEvent(event, handler) {
  const { socket } = useRealtime()
  const latest = useRef(handler)
  latest.current = handler
  useEffect(() => {
    if (!socket) return undefined
    const listener = (...args) => latest.current(...args)
    socket.on(event, listener)
    return () => socket.off(event, listener)
  }, [socket, event])
}

export function RealtimeProvider({ children }) {
  const { user } = useAuth()
  const { toast } = useFeedback()
  const navigate = useNavigate()
  const location = useLocation()
  const me = idOf(user)
  const [socket, setSocket] = useState(null)
  const [connected, setConnected] = useState(false)
  const [online, setOnline] = useState(() => new Set())
  const [unreadNotes, setUnreadNotes] = useState(0)
  const [unreadMessages, setUnreadMessages] = useState(0)
  const openThread = useRef(null)          // the person whose conversation is on screen
  const path = useRef(location.pathname)
  path.current = location.pathname
  const names = useRef(new Map())

  const refreshCounts = useCallback(() => {
    api.unreadCount().then(setUnreadNotes).catch(() => {})
    api.unreadMessages().then(setUnreadMessages).catch(() => {})
  }, [])

  // a short alert: a system notification when the tab is in the background, otherwise a message in the page
  const alert = useCallback(({ title, body, tag, to }) => {
    if (browser.inBackground() && browser.show({ title, body, tag, onClick: () => to && navigate(to) })) return
    toast(body ? `${title}: ${body}` : title)
  }, [navigate, toast])

  const nameOf = useCallback(async (userId) => {
    if (!names.current.has(userId)) names.current.set(userId, api.user(userId).then(fullName).catch(() => 'Someone'))
    return names.current.get(userId)
  }, [])

  useEffect(() => {
    if (!me) return undefined
    const s = io(SERVER || undefined, { auth: { token: token.get() } })
    setSocket(s)
    s.on('connect', () => { setConnected(true); refreshCounts() })
    s.on('disconnect', () => setConnected(false))
    s.on('presence:list', (ids) => setOnline(new Set(ids)))
    s.on('presence', ({ userId, online: isOnline }) => setOnline((old) => {
      const next = new Set(old)
      if (isOnline) next.add(userId); else next.delete(userId)
      return next
    }))
    s.on('notification', (note) => {
      const about = ABOUT[note.subject?.action]
      if (!about || !note.notifier) return
      if (path.current !== '/notifications') setUnreadNotes((n) => n + 1)
      const [text, , where] = about
      alert({ title: `${fullName(note.notifier)} ${text}`, tag: note._id, to: where ? where(note) : '/notifications' })
    })
    s.on('message:new', async (message) => {
      if (message.from === me) return
      const looking = openThread.current === message.from && !browser.inBackground()
      if (looking) return
      if (openThread.current !== message.from) setUnreadMessages((n) => n + 1)
      alert({ title: await nameOf(message.from), body: message.text, tag: `message-${message.from}`, to: `/messages/${message.from}` })
    })
    return () => { s.disconnect(); setSocket(null); setConnected(false) }
  }, [me, refreshCounts, alert, nameOf])

  useEffect(() => { if (location.pathname === '/notifications') setUnreadNotes(0) }, [location.pathname])

  const value = useMemo(() => ({
    socket, connected, online, unreadNotes, unreadMessages, refreshCounts,
    setOpenThread: (userId) => { openThread.current = userId },
  }), [socket, connected, online, unreadNotes, unreadMessages, refreshCounts])
  return <RealtimeContext.Provider value={value}>{children}</RealtimeContext.Provider>
}
