import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import Icon from '../components/Icon.jsx'
import { Avatar, Logo } from '../components/ui.jsx'
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

// The loader while signing in. On a free host the first sign-in can take a while (the server wakes up, the database
// is far away), so it says what is happening, and after a few seconds that the wait is normal.
function SigningIn({ person }) {
  const [step, setStep] = useState(0)
  useEffect(() => {
    const timers = [2500, 7000, 22000].map((ms, i) => setTimeout(() => setStep(i + 1), ms))
    return () => timers.forEach(clearTimeout)
  }, [])
  const name = person?.firstName
  const lines = [
    name ? `Signing you in as ${name}` : 'Signing you in',
    name ? `Getting ${name}'s feed ready` : 'Getting your feed ready',
    'The free server is waking up. This can take up to a minute.',
    'Almost there. Thanks for waiting.',
  ]
  return (
    <div className="signing" role="status" aria-live="polite">
      <div className="signing-card">
        <span className="signing-avatar">
          <span className="signing-ring" aria-hidden="true" />
          {person?.firstName ? <Avatar user={person} size={64} /> : <span className="signing-logo"><Logo size={40} word={false} /></span>}
        </span>
        {name && <strong className="signing-name">{fullName(person)}</strong>}
        <p key={step} className="signing-line">{lines[step]}</p>
        <span className="signing-tiles" aria-hidden="true">{Array.from({ length: 10 }, (_, i) => <i key={i} style={{ '--i': i }} />)}</span>
      </div>
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
  const [signing, setSigning] = useState(null)        // who is being signed in (the loader shows while this is set)
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

  const fail = (problem) => { setError(problem.message); setBusy(''); setSigning(null) }
  const submit = async (event) => {
    event.preventDefault()
    setError('')
    setBusy('form')
    setSigning({})
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
    setSigning(person)
    try {
      if (demo?.enabled === false) await signIn(person.email, person.password)   // your own computer: the made-up password
      else {
        // demo mode, or not known yet because the server is still waking up: one click, no password (a private copy)
        try { await signInDemo({ email: person.email }) }
        catch (problem) {
          if (problem.status !== 404) throw problem       // 404: this server has no demo mode, so use the password
          await signIn(person.email, person.password)
        }
      }
      navigate('/', { replace: true })
    } catch (problem) {
      setBusy('')
      // a 503 keeps the loader up: the click goes on by itself when the demo is ready
      if (problem.status !== 503) setSigning(null)
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
  // the four people show at once, before the server answers (it adds their pictures when it does)
  const people = SEED_ACCOUNTS.map((s) => ({ ...s, ...(demo?.accounts || []).find((a) => a.email === s.email), email: s.email, password: s.password }))
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
              {preparing && (
                <div className="demo-wait" role="status">
                  <p>Getting the made-up people ready. This takes under a minute and goes on by itself{waitingFor ? `, then you are signed in as ${waitingFor.firstName}` : ''}.</p>
                  <span className="demo-wait-bar"><i /></span>
                </div>
              )}
              {!preparing && (
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
      {signing && <SigningIn person={signing.firstName ? signing : null} />}
    </div>
  )
}
