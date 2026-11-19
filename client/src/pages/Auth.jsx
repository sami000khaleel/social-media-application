import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import Icon from '../components/Icon.jsx'
import { Avatar, Logo, Spinner } from '../components/ui.jsx'
import { useAuth, useTheme } from '../context.jsx'
import { fullName } from '../lib.js'
import { api } from '../api.js'
import { SEED_ACCOUNTS } from '../seedAccounts.js'

// What makes Upswing different, in a small moving picture: two rows of posts, "Your week" stays blue (tech),
// "Right now" turns orange (sport) one post at a time, the way it does after you like a few sport posts.
function FeedPicture() {
  return (
    <div className="star-tiles" aria-hidden="true">
      <span className="star-row-name">Your week</span>
      <span className="star-row">{Array.from({ length: 10 }, (_, i) => <i key={i} />)}</span>
      <span className="star-row-name">Right now</span>
      <span className="star-row star-row-live">{Array.from({ length: 10 }, (_, i) => <i key={i} style={{ '--i': i }} />)}</span>
    </div>
  )
}

const FEATURES = [
  { icon: 'image', text: 'Posts, pictures and shares' },
  { icon: 'reply', text: 'Comments with replies' },
  { icon: 'users', text: 'Communities with roles' },
  { icon: 'message', text: 'Live chat and notifications' },
]

// The sign-in page: everything on one screen. Left, what the app is (the feed that explains itself stands out,
// the rest of the network is listed next to it). Right, the sign-in form first, then four made-up people to try it
// with one click: with a password when demo mode is off, or as a private copy when it is on.
export default function Auth({ mode }) {
  const { signIn, signUp, signInDemo } = useAuth()
  const { theme, toggle } = useTheme()
  const navigate = useNavigate()
  const [form, setForm] = useState({ firstName: '', lastName: '', age: '', email: '', password: '' })
  const [error, setError] = useState('')
  const [busy, setBusy] = useState('')                // '' or what is loading: 'form' or a person's email
  const [demo, setDemo] = useState(null)              // null while asking the server, then { enabled, preparing, accounts }
  const [waitingFor, setWaitingFor] = useState(null)  // the person clicked while the demo was still getting ready
  const [askAgain, setAskAgain] = useState(0)         // bumping this starts asking the server again
  const signup = mode === 'signup'
  const set = (key) => (event) => setForm((f) => ({ ...f, [key]: event.target.value }))
  // ask the server about the made-up people; while it loads fresh demo data, ask again every 3 seconds
  useEffect(() => {
    let live = true
    let timer = null
    const ask = () => api.demoInfo()
      .then((info) => {
        if (!live) return
        setDemo(info)
        if (info.enabled && info.preparing) timer = setTimeout(ask, 3000)
      })
      .catch(() => live && setDemo({ enabled: false, accounts: [] }))
    ask()
    return () => { live = false; clearTimeout(timer) }
  }, [askAgain])

  const fail = (problem) => { setError(problem.message); setBusy('') }
  const submit = async (event) => {
    event.preventDefault()
    setError('')
    setBusy('form')
    try {
      if (signup) await signUp({ ...form, age: Number(form.age) })
      else await signIn(form.email, form.password)
      navigate('/', { replace: true })
    } catch (problem) { fail(problem) }
  }
  // one click on a made-up person, then straight to their feed
  const tryPerson = async (person) => {
    setError('')
    setBusy(person.email)
    try {
      if (demo?.enabled) await signInDemo(person._id)       // demo mode: a private copy, no password
      else await signIn(person.email, person.password)     // your own computer: the made-up password
      navigate('/', { replace: true })
    } catch (problem) {
      setBusy('')
      if (problem.status === 503) {
        // the server started loading fresh demo data a moment ago: wait, then carry on with the same person
        setWaitingFor(person)
        setDemo({ enabled: true, preparing: true, accounts: [] })
        setAskAgain((n) => n + 1)
      } else if (!demo?.enabled && problem.status >= 400 && problem.status < 500) {
        setError(`${person.firstName} is not in the database yet. Run "npm run seed" in the project folder, then try again.`)
      } else setError(problem.message)
    }
  }
  // the four people: always shown with demo mode off (the server adds their pictures); with demo mode on, the ones
  // the server has (it gives the id the one-click sign-in needs)
  const people = SEED_ACCOUNTS.map((s) => {
    const found = (demo?.accounts || []).find((a) => a.email === s.email)
    if (demo?.enabled) return found && { ...s, ...found, email: s.email }
    return { ...s, ...found, email: s.email, password: s.password }
  }).filter(Boolean)
  const preparing = Boolean(demo?.enabled && demo.preparing)
  // the demo is ready again: finish the click the visitor already made, so nobody has to click twice
  useEffect(() => {
    if (!waitingFor || !demo || demo.preparing) return
    const person = people.find((p) => p.email === waitingFor.email)
    setWaitingFor(null)
    if (person) tryPerson(person)
  }, [demo, waitingFor])

  return (
    <div className="auth">
      <section className="auth-side">
        <Logo size={32} />
        <div className="auth-pitch">
          <h1>Share posts, join communities, chat with friends.</h1>
          <div className="auth-star">
            <p className="auth-star-kicker"><Icon name="chart" size={16} />What makes it different</p>
            <h2>A feed that explains itself</h2>
            <p>Like 3 sport posts and your feed turns to sport within a second. One page shows you exactly why.</p>
            <FeedPicture />
          </div>
          <ul className="auth-features">
            {FEATURES.map((f) => <li key={f.text}><Icon name={f.icon} size={18} />{f.text}</li>)}
          </ul>
        </div>
      </section>
      <section className="auth-form-side">
        <button className="icon-btn auth-theme" onClick={toggle} aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to night mode'}><Icon name={theme === 'dark' ? 'sun' : 'moon'} /></button>
        <div className="auth-box">
          <form className="auth-form" onSubmit={submit}>
            <h2>{signup ? 'Create your account' : 'Sign in'}</h2>
            {signup && (
              <div className="row">
                <label>First name<input className="field" value={form.firstName} onChange={set('firstName')} required autoComplete="given-name" /></label>
                <label>Last name<input className="field" value={form.lastName} onChange={set('lastName')} required autoComplete="family-name" /></label>
              </div>
            )}
            {signup && <label>Age<input className="field" type="number" min="13" max="120" value={form.age} onChange={set('age')} required /></label>}
            <label>Email<input className="field" type="email" value={form.email} onChange={set('email')} required autoComplete="email" /></label>
            <label>Password<input className="field" type="password" value={form.password} onChange={set('password')} required minLength={signup ? 8 : undefined} autoComplete={signup ? 'new-password' : 'current-password'} />
              {signup && <span className="hint">At least 8 characters.</span>}
            </label>
            <button className="btn btn-primary btn-lg" disabled={Boolean(busy)}>{busy === 'form' ? 'One moment' : signup ? 'Create account' : 'Sign in'}</button>
            <p className="auth-switch">
              {signup ? <>Already have an account? <Link to="/login">Sign in</Link></> : <>New here? <Link to="/signup">Create an account</Link></>}
            </p>
          </form>
          {error && <p className="form-error" role="alert">{error}</p>}
          {!signup && (
            <div className="auth-people">
              <p className="auth-people-title"><strong>No account? Try it as a made-up person.</strong> One click, nothing to type.</p>
              {demo === null && <Spinner />}
              {preparing && (
                <div className="demo-wait" role="status">
                  <p>Getting the made-up people ready. This takes under a minute and goes on by itself{waitingFor ? `, then you are signed in as ${waitingFor.firstName}` : ''}.</p>
                  <span className="demo-wait-bar"><i /></span>
                </div>
              )}
              {demo !== null && !preparing && people.length > 0 && (
                <div className="demo-list">
                  {people.map((person) => (
                    <button key={person.email} type="button" className="demo-btn" onClick={() => tryPerson(person)} disabled={Boolean(busy)}>
                      <Avatar user={person} size={34} />
                      <span className="demo-btn-text"><strong>{busy === person.email ? 'Signing in' : fullName(person)}</strong><span>{person.story}</span></span>
                    </button>
                  ))}
                </div>
              )}
              {demo?.enabled && <p className="auth-people-note">Everything here is made up, and nothing you click can break anything.</p>}
            </div>
          )}
        </div>
      </section>
    </div>
  )
}
