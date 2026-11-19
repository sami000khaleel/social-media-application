import { useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import Icon from '../components/Icon.jsx'
import Composer from '../components/Composer.jsx'
import PostCard, { PostSkeleton } from '../components/PostCard.jsx'
import { Page } from '../components/Layout.jsx'
import { Empty, Menu, PersonRow, Problem, Spinner, Tabs, Topic, useLoad } from '../components/ui.jsx'
import { api, urls } from '../api.js'
import { useAuth, useFeedback } from '../context.jsx'
import { count, has, idOf } from '../lib.js'

export default function Community() {
  const { id } = useParams()
  const { user, isDemo } = useAuth()
  const { attempt, confirm } = useFeedback()
  const navigate = useNavigate()
  const me = idOf(user)
  const community = useLoad(() => api.community(id), [id])
  const [tab, setTab] = useState('posts')
  const [busy, setBusy] = useState(false)
  const coverInput = useRef(null)

  const c = community.data
  const role = !c ? null
    : idOf(c.manager) === me ? 'manager'
    : has(c.admins, me) ? 'admin'
    : c.members.some((m) => idOf(m.memberId) === me) ? 'member'
    : c.waitingList.some((w) => idOf(w.userId) === me) ? 'waiting' : null
  // the demo accounts can not manage a community, so they see it like a member
  const staff = !isDemo && (role === 'manager' || role === 'admin') ? role : null
  const canRead = Boolean(c) && (c.public || (role && role !== 'waiting'))

  const posts = useLoad(() => (canRead ? api.communityPosts(id) : Promise.resolve([])), [id, canRead])
  const pending = useLoad(() => (staff ? api.pendingPosts(id) : Promise.resolve([])), [id, staff])

  // every button on this page: run it, then show the community the server sends back
  const act = async (work, done) => {
    setBusy(true)
    const fresh = await attempt(work, done)
    setBusy(false)
    if (fresh && fresh._id) community.setData(fresh)
    return fresh
  }
  const leave = async () => {
    if (await confirm({ title: 'Leave this community?', message: c.public ? 'You can join again at any time.' : 'To come back you have to ask again.', confirmLabel: 'Leave', danger: true })) act(() => api.leave(id), 'You left the community')
  }
  const removeIt = async () => {
    if (!(await confirm({ title: `Delete ${c.communityName}?`, message: 'The community is deleted for all members. This can not be undone.', confirmLabel: 'Delete community', danger: true }))) return
    if (await attempt(() => api.deleteCommunity(id), 'Community deleted')) navigate('/communities')
  }
  const uploadCover = async (event) => {
    const file = event.target.files[0]
    event.target.value = ''
    if (!file) return
    const name = await attempt(() => api.uploadCommunityCover(id, file), 'Cover updated')
    if (name) community.setData((old) => ({ ...old, coverImageName: name }))
  }

  if (community.error) return <Page rail={null}><Problem error={community.error === 'no community was found' ? 'This community does not exist any more.' : community.error} onRetry={community.reload} /></Page>
  if (!c) return <Page rail={null}><Spinner /></Page>

  const requests = c.waitingList.filter((w) => w.userId && typeof w.userId === 'object')
  const todo = requests.length + (pending.data || []).length
  const tabs = [
    { key: 'posts', label: 'Posts' },
    { key: 'members', label: 'Members', count: c.members.length },
    staff && { key: 'requests', label: 'To review', count: todo },
    role === 'manager' && !isDemo && { key: 'settings', label: 'Settings' },
  ].filter(Boolean)
  const roleOf = (userId) => (idOf(c.manager) === userId ? 'Manager' : has(c.admins, userId) ? 'Admin' : '')

  return (
    <Page rail={null}>
      <div className="profile community-head" style={{ '--topic': `var(--topic-${c.category})` }}>
        <div className="profile-cover">
          {c.coverImageName && <img src={urls.communityCover(id, c.coverImageName)} alt="" />}
        </div>
        <div className="community-title">
          <div>
            <h1>{c.communityName}</h1>
            <div className="profile-facts">
              <Topic topic={c.category} />
              <span><Icon name={c.public ? 'globe' : 'lock'} size={16} />{c.public ? 'Public' : 'Private'}</span>
              <span>{count(c.members.length, 'member')}</span>
              {role && role !== 'waiting' && <span className="tag">{role === 'member' ? 'Member' : role === 'admin' ? 'Admin' : 'Manager'}</span>}
            </div>
          </div>
          <div className="profile-actions">
            {!role && c.public && <button className="btn btn-primary" disabled={busy} onClick={() => act(() => api.join(id), 'You joined')}>Join</button>}
            {!role && !c.public && <button className="btn btn-primary" disabled={busy} onClick={() => act(() => api.askToJoin(id), 'Request sent')}>Ask to join</button>}
            {role === 'waiting' && <button className="btn" disabled={busy} onClick={() => act(() => api.cancelAsk(id), 'Request withdrawn')}>Withdraw request</button>}
            {role === 'member' && <button className="btn" disabled={busy} onClick={leave}>Leave</button>}
            {role === 'admin' && !isDemo && <button className="btn" disabled={busy} onClick={() => act(() => api.resignAdmin(id), 'You are no longer an admin')}>Step down as admin</button>}
          </div>
        </div>
        <p className="community-about">{c.describtion}</p>
      </div>
      <Tabs tabs={tabs} value={tab} onChange={setTab} />

      {tab === 'posts' && (
        <>
          {role && role !== 'waiting' && (
            <Composer communityId={id} placeholder={`Write something to ${c.communityName}`} onPosted={(post) => {
              const waits = c.postApproval && !staff
              if (waits) attempt(async () => true, 'Sent. An admin has to approve it first.')
              else posts.setData((all) => [post, ...(all || [])])
            }} />
          )}
          {!canRead && <Empty title="This community is private">{role === 'waiting' ? 'Your request is waiting for the manager or an admin.' : 'Ask to join to read and write posts here.'}</Empty>}
          {canRead && posts.loading && !posts.data && <><PostSkeleton /><PostSkeleton /></>}
          {canRead && posts.error && <Problem error={posts.error} onRetry={posts.reload} />}
          {canRead && posts.data && posts.data.map((post) => (
            <PostCard key={post._id} post={post} staffRole={staff}
              onChange={(fresh) => posts.setData((all) => all.map((p) => (p._id === fresh._id ? fresh : p)))}
              onRemove={(postId) => posts.setData((all) => all.filter((p) => p._id !== postId))} />
          ))}
          {canRead && posts.data && !posts.data.length && <Empty title="No posts yet">{role && role !== 'waiting' ? 'Write the first one.' : 'Join to write the first one.'}</Empty>}
        </>
      )}

      {tab === 'members' && (
        <div className="people section">
          {c.members.filter((m) => m.memberId && typeof m.memberId === 'object').map(({ memberId: member }) => {
            const memberId = idOf(member)
            const memberRole = roleOf(memberId)
            return (
              <PersonRow key={memberId} user={member} note={memberRole || 'Member'}>
                {memberRole && <span className="tag">{memberRole}</span>}
                <Menu label={`Actions for ${member.firstName}`} items={[
                  role === 'manager' && !isDemo && !memberRole && { label: 'Make admin', icon: 'shield', onClick: () => act(() => api.addAdmin(id, memberId), `${member.firstName} is now an admin`) },
                  role === 'manager' && !isDemo && memberRole === 'Admin' && { label: 'Remove as admin', icon: 'shield', onClick: () => act(() => api.removeAdmin(id, memberId), `${member.firstName} is no longer an admin`) },
                  staff && !memberRole && memberId !== me && { label: 'Remove from community', icon: 'trash', danger: true, onClick: async () => {
                    if (await confirm({ title: `Remove ${member.firstName}?`, message: 'They lose access to the community.', confirmLabel: 'Remove', danger: true })) act(() => api.removeMember(id, memberId, staff), 'Member removed')
                  } },
                ]} />
              </PersonRow>
            )
          })}
        </div>
      )}

      {tab === 'requests' && staff && (
        <>
          <section className="section">
            <h2>People who want to join</h2>
            {!requests.length && <p className="muted">No open requests.</p>}
            <div className="people">
              {requests.map(({ userId: person }) => (
                <PersonRow key={idOf(person)} user={person}>
                  <button className="btn btn-sm" disabled={busy} onClick={() => act(() => api.declineMember(id, idOf(person), staff), 'Request declined')}>Decline</button>
                  <button className="btn btn-sm btn-primary" disabled={busy} onClick={() => act(() => api.approveMember(id, idOf(person), staff), `${person.firstName} is now a member`)}>Approve</button>
                </PersonRow>
              ))}
            </div>
          </section>
          <section className="section">
            <h2>Posts waiting for approval</h2>
            {pending.data && !pending.data.length && <p className="muted">No posts are waiting.</p>}
          </section>
          {(pending.data || []).map((post) => (
            <div key={post._id} className="pending">
              <PostCard post={post} onChange={() => {}} />
              <div className="pending-actions">
                <button className="btn btn-sm" disabled={busy} onClick={async () => { if (await attempt(() => api.removeCommunityPost(id, post._id, staff), 'Post removed')) pending.setData((all) => all.filter((p) => p._id !== post._id)) }}>Remove</button>
                <button className="btn btn-sm btn-primary" disabled={busy} onClick={async () => { if (await attempt(() => api.approvePost(id, post._id), 'Post approved')) { pending.setData((all) => all.filter((p) => p._id !== post._id)); posts.reload() } }}>Approve</button>
              </div>
            </div>
          ))}
        </>
      )}

      {tab === 'settings' && role === 'manager' && (
        <>
          <section className="section">
            <h2>Access</h2>
            <label className="check"><input type="checkbox" checked={c.public} disabled={busy} onChange={() => act(() => api.togglePublic(id), 'Saved')} /><span><strong>Public</strong>Anyone can join and read. Turn off to approve every member yourself.</span></label>
            <label className="check"><input type="checkbox" checked={c.postApproval} disabled={busy} onChange={() => act(() => api.toggleApproval(id), 'Saved')} /><span><strong>Approve posts</strong>Posts of members wait until you or an admin approve them.</span></label>
          </section>
          <section className="section">
            <h2>Cover picture</h2>
            <input ref={coverInput} type="file" accept="image/*" hidden onChange={uploadCover} />
            <button className="btn" onClick={() => coverInput.current.click()}><Icon name="camera" size={16} />Upload a new cover</button>
          </section>
          <section className="section">
            <h2>Delete</h2>
            <p className="muted">Deleting removes the community for all {c.members.length} members.</p>
            <button className="btn btn-danger" onClick={removeIt}>Delete community</button>
          </section>
        </>
      )}
    </Page>
  )
}
