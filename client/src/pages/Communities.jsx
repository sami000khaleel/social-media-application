import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import Icon from '../components/Icon.jsx'
import { Page } from '../components/Layout.jsx'
import { Empty, Modal, PageHead, Problem, Spinner, Tabs, Topic, useLoad } from '../components/ui.jsx'
import { api, urls } from '../api.js'
import { useAuth, useFeedback } from '../context.jsx'
import { TOPICS } from '../lib.js'

const ROLE = { manager: 'You manage this', admin: 'You are an admin', member: 'Member', waiting: 'Request sent' }

export function CommunityCard({ community }) {
  return (
    <Link to={`/c/${community._id}`} className="community-card">
      <span className="community-cover" style={{ '--topic': `var(--topic-${community.category})` }}>
        {community.coverImageName && <img src={urls.communityCover(community._id, community.coverImageName)} alt="" loading="lazy" />}
      </span>
      <span className="community-body">
        <strong>{community.communityName}</strong>
        <span className="community-desc">{community.describtion}</span>
        <span className="community-meta">
          <Topic topic={community.category} />
          <span className="muted"><Icon name={community.public ? 'globe' : 'lock'} size={14} />{community.public ? 'Public' : 'Private'}</span>
          <span className="muted">{community.membersCount} members</span>
        </span>
        {community.role && <span className="tag">{ROLE[community.role]}</span>}
      </span>
    </Link>
  )
}

function CreateCommunity({ onClose }) {
  const { attempt } = useFeedback()
  const navigate = useNavigate()
  const [form, setForm] = useState({ communityName: '', describtion: '', category: '', publicity: true, postApproval: false })
  const [busy, setBusy] = useState(false)
  const ready = form.communityName.trim() && form.describtion.trim() && form.category
  const create = async (event) => {
    event.preventDefault()
    setBusy(true)
    const made = await attempt(() => api.createCommunity({ ...form, communityName: form.communityName.trim(), describtion: form.describtion.trim() }), 'Community created')
    setBusy(false)
    if (made) navigate(`/c/${made._id}`)
  }
  return (
    <Modal title="Create a community" onClose={onClose}>
      <form className="form" onSubmit={create}>
        <label>Name<input className="field" value={form.communityName} onChange={(e) => setForm({ ...form, communityName: e.target.value })} maxLength={60} required /></label>
        <label>What is it about?<textarea className="field" rows={3} value={form.describtion} onChange={(e) => setForm({ ...form, describtion: e.target.value })} maxLength={300} required /></label>
        <div>
          <span className="label">Topic</span>
          <div className="topic-picker" role="radiogroup" aria-label="Topic">
            {TOPICS.map((t) => (
              <button type="button" key={t.key} role="radio" aria-checked={form.category === t.key} className={`chip${form.category === t.key ? ' on' : ''}`} onClick={() => setForm({ ...form, category: t.key })}>
                <i className="dot" style={{ background: `var(--topic-${t.key})` }} />{t.label}
              </button>
            ))}
          </div>
        </div>
        <label className="check"><input type="checkbox" checked={form.publicity} onChange={(e) => setForm({ ...form, publicity: e.target.checked })} /><span><strong>Public</strong>Anyone can join and read. Turn off to approve every member yourself.</span></label>
        <label className="check"><input type="checkbox" checked={form.postApproval} onChange={(e) => setForm({ ...form, postApproval: e.target.checked })} /><span><strong>Approve posts</strong>Posts of members wait until you or an admin approve them.</span></label>
        <div className="modal-actions">
          <button type="button" className="btn" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" disabled={!ready || busy}>Create community</button>
        </div>
      </form>
    </Modal>
  )
}

export default function Communities() {
  const { isDemo } = useAuth()
  const { data, error, loading, reload } = useLoad(() => api.communities(), [])
  const [tab, setTab] = useState('all')
  const [creating, setCreating] = useState(false)
  const mine = (data || []).filter((c) => c.role && c.role !== 'waiting')
  const shown = tab === 'mine' ? mine : data || []
  return (
    <Page rail={null}>
      <PageHead title="Communities">
        {!isDemo && <button className="btn btn-primary btn-sm" onClick={() => setCreating(true)}><Icon name="plus" size={16} />Create</button>}
      </PageHead>
      <Tabs value={tab} onChange={setTab} tabs={[{ key: 'all', label: 'All' }, { key: 'mine', label: 'Yours', count: mine.length }]} />
      {loading && !data && <Spinner />}
      {error && <Problem error={error} onRetry={reload} />}
      <div className="community-grid">{shown.map((c) => <CommunityCard key={c._id} community={c} />)}</div>
      {data && !shown.length && <Empty title={tab === 'mine' ? 'You have not joined a community yet' : 'No communities yet'}>{tab === 'mine' ? 'Join one from the list, or start your own.' : 'Start the first one.'}</Empty>}
      {creating && <CreateCommunity onClose={() => setCreating(false)} />}
    </Page>
  )
}
