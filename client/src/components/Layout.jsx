import { useEffect, useState } from 'react'
import { useRealtime } from '../realtime.jsx'
import { InsightsNavLink } from './InsightsCta.jsx'
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom'
import Icon from './Icon.jsx'
import { Avatar, Logo, PersonRow, Topic, useLoad } from './ui.jsx'
import FollowButton from './FollowButton.jsx'
import { api } from '../api.js'
import { useAuth, useTheme } from '../context.jsx'
import { fullName, idOf } from '../lib.js'

const LINKS = [
  { to: '/', icon: 'home', label: 'Home', end: true },
  { to: '/search', icon: 'search', label: 'Search' },
  { to: '/communities', icon: 'users', label: 'Communities' },
  { to: '/messages', icon: 'message', label: 'Messages', count: 'messages' },
  { to: '/notifications', icon: 'bell', label: 'Notifications', count: 'notes' },
]

export default function Layout({ children }) {
  const { user, signOut } = useAuth()
  const { theme, toggle } = useTheme()
  const location = useLocation()
  const navigate = useNavigate()
  // the counts come live over Socket.IO (see realtime.jsx)
  const { unreadNotes, unreadMessages } = useRealtime()
  const counts = { notes: unreadNotes, messages: unreadMessages }
  useEffect(() => { window.scrollTo(0, 0) }, [location.pathname])

  const links = [...LINKS, { to: `/u/${idOf(user)}`, icon: 'user', label: 'Profile' }]
  return (
    <div className="shell">
      <header className="topbar">
        <Link to="/" aria-label="Home"><Logo size={26} /></Link>
        <Link to="/insights" className="topbar-cta" aria-label="How my feed works"><span className="cta-ring"><Icon name="chart" size={18} /></span>How my feed works</Link>
        <button className="icon-btn" onClick={toggle} aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to night mode'}>
          <Icon name={theme === 'dark' ? 'sun' : 'moon'} />
        </button>
      </header>
      <nav className="side" aria-label="Main">
        <Link to="/" className="side-logo" aria-label="Home"><Logo /></Link>
        <div className="side-links">
          {links.map((link) => (
            <NavLink key={link.label} to={link.to} end={link.end} className={({ isActive }) => `side-link${isActive ? ' on' : ''}`}>
              <span className="side-icon">
                <Icon name={link.icon} size={22} />
                {link.count && counts[link.count] > 0 && <span className="badge">{counts[link.count] > 9 ? '9+' : counts[link.count]}</span>}
              </span>
              <span className="side-label">{link.label}</span>
            </NavLink>
          ))}
          <InsightsNavLink />
          <NavLink to="/settings" className={({ isActive }) => `side-link side-extra${isActive ? ' on' : ''}`}>
            <span className="side-icon"><Icon name="settings" size={22} /></span><span className="side-label">Settings</span>
          </NavLink>
          <button className="side-link side-extra" onClick={toggle}>
            <span className="side-icon"><Icon name={theme === 'dark' ? 'sun' : 'moon'} size={22} /></span>
            <span className="side-label">{theme === 'dark' ? 'Light mode' : 'Night mode'}</span>
          </button>
        </div>
        <div className="side-me">
          <Link to={`/u/${idOf(user)}`} className="side-me-link">
            <Avatar user={user} size={36} />
            <span className="side-label"><strong>{fullName(user)}</strong><span>{user.demo ? 'Demo account' : user.email}</span></span>
          </Link>
          <button className="icon-btn side-label" onClick={() => { signOut(); navigate('/login') }} aria-label="Sign out" title="Sign out"><Icon name="logout" size={18} /></button>
        </div>
      </nav>
      <div className="content">{children}</div>
    </div>
  )
}

// The two columns of a page: the content and a quiet rail on the right.
export function Page({ children, rail }) {
  return (
    <div className={`columns${rail === null ? ' columns-wide' : ''}`}>
      <main className="main">{children}</main>
      {rail !== null && <aside className="rail">{rail === undefined ? <Suggestions /> : rail}</aside>}
    </div>
  )
}

export function Suggestions() {
  const { user } = useAuth()
  const people = useLoad(() => api.everyone(), [])
  const groups = useLoad(() => api.communities(), [])
  const me = idOf(user)
  // who was already followed when the page opened: people followed now stay in the list
  const [known] = useState(() => (user.followes || []).map(idOf))
  const strangers = (people.data || []).filter((p) => idOf(p) !== me && !known.includes(idOf(p))).slice(0, 4)
  const open = (groups.data || []).filter((c) => !c.role).slice(0, 3)
  return (
    <>
      {strangers.length > 0 && (
        <section className="rail-block">
          <h2>People to follow</h2>
          {strangers.map((person) => <PersonRow key={idOf(person)} user={person}><FollowButton userId={idOf(person)} small /></PersonRow>)}
        </section>
      )}
      {open.length > 0 && (
        <section className="rail-block">
          <h2>Communities</h2>
          {open.map((c) => (
            <Link key={c._id} to={`/c/${c._id}`} className="rail-community">
              <strong>{c.communityName}</strong>
              <span><Topic topic={c.category} /> <span className="muted">{c.membersCount} members</span></span>
            </Link>
          ))}
          <Link to="/communities" className="rail-more">See all communities</Link>
        </section>
      )}
    </>
  )
}
