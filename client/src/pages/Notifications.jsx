import { useState } from 'react'
import { Link } from 'react-router-dom'
import Icon from '../components/Icon.jsx'
import { Page } from '../components/Layout.jsx'
import { Avatar, Empty, PageHead, Problem, Spinner, Tabs, useLoad } from '../components/ui.jsx'
import { api } from '../api.js'
import { fullName, timeAgo } from '../lib.js'
import { ABOUT } from '../notificationText.js'
import { useSocketEvent } from '../realtime.jsx'
import NotifyPrompt from '../components/NotifyPrompt.jsx'

export default function Notifications() {
  const { data, error, loading, reload, setData } = useLoad(() => api.notifications(), [])
  // new notifications appear at the top while the page is open
  useSocketEvent('notification', (note) => setData((list) => [{ ...note, sent: false }, ...(list || []).filter((n) => n._id !== note._id)]))
  const [tab, setTab] = useState('you')
  const known = (data || []).filter((n) => ABOUT[n.subject?.action])
  const shown = known.filter((n) => (tab === 'you' ? n.notifier : !n.notifier))
  return (
    <Page>
      <PageHead title="Notifications" />
      <NotifyPrompt />
      <Tabs value={tab} onChange={setTab} tabs={[{ key: 'you', label: 'From others' }, { key: 'own', label: 'Your activity' }]} />
      {loading && !data && <Spinner />}
      {error && <Problem error={error} onRetry={reload} />}
      {data && !shown.length && <Empty title="Nothing new">{tab === 'you' ? 'Likes, comments and new followers show up here.' : 'What you do on Upswing is listed here.'}</Empty>}
      <div className="notes">
        {shown.map((n) => {
          const [text, icon, where] = ABOUT[n.subject.action]
          const to = where ? where(n) : null
          const body = (
            <>
              <span className="note-icon">{n.notifier ? <Avatar user={n.notifier} size={40} /> : <span className="note-own"><Icon name={icon} size={18} /></span>}</span>
              <span className="note-text">{n.notifier && <strong>{fullName(n.notifier)} </strong>}{text}<span className="muted">{timeAgo(n.createdAt)}</span></span>
              {!n.sent && <span className="note-new" aria-label="New" />}
            </>
          )
          return to ? <Link key={n._id} to={to} className="note">{body}</Link> : <div key={n._id} className="note">{body}</div>
        })}
      </div>
    </Page>
  )
}
