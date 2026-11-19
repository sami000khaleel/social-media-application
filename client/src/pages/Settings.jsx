import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Page } from '../components/Layout.jsx'
import { PageHead } from '../components/ui.jsx'
import { api } from '../api.js'
import { useAuth, useFeedback, useTheme } from '../context.jsx'
import * as browser from '../notify.js'

export default function Settings() {
  const { user, setUser, signOut, isDemo } = useAuth()
  const { theme, setTheme } = useTheme()
  const { attempt } = useFeedback()
  const navigate = useNavigate()
  const [form, setForm] = useState({
    firstName: user.firstName || '', lastName: user.lastName || '', job: user.job || '', age: user.age || '',
    city: user.address?.city || '', country: user.address?.country || '',
  })
  const [busy, setBusy] = useState(false)
  const [allowed, setAllowed] = useState(browser.permission)
  const [notifyOn, setNotifyOn] = useState(browser.enabled)
  const set = (key) => (event) => setForm((f) => ({ ...f, [key]: event.target.value }))

  const save = async (event) => {
    event.preventDefault()
    setBusy(true)
    const fields = { firstName: form.firstName.trim(), lastName: form.lastName.trim(), age: Number(form.age), address: { city: form.city.trim(), country: form.country.trim() } }
    if (form.job.trim()) fields.job = form.job.trim()
    const fresh = await attempt(() => api.updateMe(fields), 'Saved')
    setBusy(false)
    if (fresh) setUser(fresh)
  }
  return (
    <Page rail={null}>
      <PageHead title="Settings" />
      <section className="section">
        <h2>Appearance</h2>
        <div className="segmented" role="radiogroup" aria-label="Appearance">
          <button role="radio" aria-checked={theme === 'light'} className={theme === 'light' ? 'on' : ''} onClick={() => setTheme('light')}>Light</button>
          <button role="radio" aria-checked={theme === 'dark'} className={theme === 'dark' ? 'on' : ''} onClick={() => setTheme('dark')}>Night</button>
        </div>
      </section>
      <section className="section">
        <h2>Browser notifications</h2>
        {allowed === 'unsupported' && <p className="muted">This browser can not show notifications.</p>}
        {allowed === 'denied' && <p className="muted">Notifications are blocked for this site. Allow them in the site settings of your browser (the icon left of the address), then reload the page.</p>}
        {allowed === 'default' && (
          <>
            <p className="muted">Get a notification on your computer for new messages, likes, comments and followers while Upswing is open in a background tab.</p>
            <button className="btn btn-primary" onClick={async () => setAllowed(await browser.ask())}>Turn on browser notifications</button>
          </>
        )}
        {allowed === 'granted' && (
          <label className="check">
            <input type="checkbox" checked={notifyOn} onChange={(event) => { browser.setEnabled(event.target.checked); setNotifyOn(event.target.checked) }} />
            <span><strong>Show browser notifications</strong>For new messages, likes, comments and followers while this tab is in the background. Upswing has to stay open in a tab.</span>
          </label>
        )}
      </section>
      <section className="section">
        <h2>Your profile</h2>
        {isDemo && <p className="demo-off">This is a made-up person, so the profile can't be changed.</p>}
        <form className="form" onSubmit={save}>
          <fieldset disabled={isDemo} className="plain-fieldset">
          <div className="row">
            <label>First name<input className="field" value={form.firstName} onChange={set('firstName')} required /></label>
            <label>Last name<input className="field" value={form.lastName} onChange={set('lastName')} required /></label>
          </div>
          <div className="row">
            <label>Job<input className="field" value={form.job} onChange={set('job')} placeholder="What you do" /></label>
            <label>Age<input className="field" type="number" min="13" max="120" value={form.age} onChange={set('age')} required /></label>
          </div>
          <div className="row">
            <label>City<input className="field" value={form.city} onChange={set('city')} /></label>
            <label>Country<input className="field" value={form.country} onChange={set('country')} /></label>
          </div>
          <p className="hint">Your profile and cover pictures are changed on your profile page.</p>
          <div><button className="btn btn-primary" disabled={busy}>Save changes</button></div>
          </fieldset>
        </form>
      </section>
      <section className="section">
        <h2>Account</h2>
        <p className="muted">{user.demo ? 'Signed in as a made-up demo person' : `Signed in as ${user.email}`}</p>
        <button className="btn" onClick={() => { signOut(); navigate('/login') }}>Sign out</button>
      </section>
    </Page>
  )
}
