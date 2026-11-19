import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { api, setSignedOutHandler, token } from './api.js'
import { Modal } from './components/ui.jsx'

// ---------------------------------------------------------------- signed in user
const AuthContext = createContext(null)
export const useAuth = () => useContext(AuthContext)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [ready, setReady] = useState(false)

  const signOut = useCallback(() => { token.clear(); setUser(null) }, [])
  useEffect(() => {
    setSignedOutHandler(signOut)
    if (!token.get()) { setReady(true); return }
    api.me().then(setUser).catch(() => token.clear()).finally(() => setReady(true))
  }, [signOut])

  const value = useMemo(() => ({
    user, ready, signOut,
    setUser,
    refresh: () => api.me().then((fresh) => { setUser(fresh); return fresh }),
    async signIn(email, password) { const data = await api.login(email, password); token.set(data.token); setUser(data.user) },
    async signInDemo(who) { const data = await api.demoLogin(who); token.set(data.token); setUser(data.user) },
    // the demo accounts (private copies of made-up people) can react but not write (the server refuses it too)
    isDemo: Boolean(user?.demo),
    async signUp(fields) { const data = await api.signup(fields); token.set(data.token); setUser(data.user) },
  }), [user, ready, signOut])
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

// ---------------------------------------------------------------- light and night mode
const ThemeContext = createContext(null)
export const useTheme = () => useContext(ThemeContext)

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(() => document.documentElement.dataset.theme || 'light')
  useEffect(() => {
    document.documentElement.dataset.theme = theme
    try { localStorage.setItem('upswing.theme', theme) } catch { /* private window */ }
  }, [theme])
  const value = useMemo(() => ({ theme, setTheme, toggle: () => setTheme((t) => (t === 'dark' ? 'light' : 'dark')) }), [theme])
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

// ---------------------------------------------------------------- short messages and "are you sure" questions
const FeedbackContext = createContext(null)
export const useFeedback = () => useContext(FeedbackContext)

export function FeedbackProvider({ children }) {
  const [toasts, setToasts] = useState([])
  const [question, setQuestion] = useState(null)

  const toast = useCallback((message, kind = 'info') => {
    const id = Math.random().toString(36).slice(2)
    setToasts((list) => [...list.slice(-2), { id, message, kind }])
    setTimeout(() => setToasts((list) => list.filter((t) => t.id !== id)), kind === 'error' ? 6000 : 3200)
  }, [])
  const confirm = useCallback((options) => new Promise((resolve) => setQuestion({ ...options, resolve })), [])
  const answer = (result) => { question.resolve(result); setQuestion(null) }
  // run something and show the server's message when it fails
  const attempt = useCallback(async (work, done) => {
    try { const result = await work(); if (done) toast(done); return result }
    catch (error) { toast(error.message, 'error'); return undefined }
  }, [toast])

  const value = useMemo(() => ({ toast, confirm, attempt }), [toast, confirm, attempt])
  return (
    <FeedbackContext.Provider value={value}>
      {children}
      <div className="toasts" role="status" aria-live="polite">
        {toasts.map((t) => <div key={t.id} className={`toast toast-${t.kind}`}>{t.message}</div>)}
      </div>
      {question && (
        <Modal title={question.title} onClose={() => answer(false)}>
          <p className="confirm-text">{question.message}</p>
          <div className="modal-actions">
            <button className="btn" onClick={() => answer(false)}>Cancel</button>
            <button className={`btn ${question.danger ? 'btn-danger' : 'btn-primary'}`} onClick={() => answer(true)}>{question.confirmLabel || 'Confirm'}</button>
          </div>
        </Modal>
      )}
    </FeedbackContext.Provider>
  )
}
