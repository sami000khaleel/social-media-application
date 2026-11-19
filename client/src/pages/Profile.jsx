import { useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import Icon from '../components/Icon.jsx'
import PostCard, { PostSkeleton } from '../components/PostCard.jsx'
import FollowButton from '../components/FollowButton.jsx'
import { Page } from '../components/Layout.jsx'
import { Avatar, Empty, Modal, PersonRow, Problem, Spinner, useLoad } from '../components/ui.jsx'
import { api, urls } from '../api.js'
import { useAuth, useFeedback } from '../context.jsx'
import { count, fullName, idOf } from '../lib.js'

function PeopleList({ title, load, onClose }) {
  const { data, loading, error } = useLoad(load, [])
  return (
    <Modal title={title} onClose={onClose}>
      {loading && <Spinner />}
      {error && <Problem error={error} />}
      {data && (data.length
        ? <div className="people">{data.map((u) => <PersonRow key={u._id} user={u} onNavigate={onClose}><FollowButton userId={idOf(u)} small /></PersonRow>)}</div>
        : <p className="muted">Nobody yet.</p>)}
    </Modal>
  )
}

export default function Profile() {
  const { id } = useParams()
  const { user: me, refresh, isDemo } = useAuth()
  const { attempt } = useFeedback()
  const mine = idOf(me) === id
  const canEdit = mine && !isDemo
  const profile = useLoad(() => api.user(id), [id])
  const posts = useLoad(() => api.userPosts(id), [id])
  const [list, setList] = useState(null)       // 'followers' | 'following'
  const avatarInput = useRef(null)
  const coverInput = useRef(null)

  const upload = (kind) => async (event) => {
    const file = event.target.files[0]
    event.target.value = ''
    if (!file) return
    const image = await attempt(() => api.uploadPhoto(kind, file), 'Picture updated')
    if (!image) return
    profile.setData((u) => ({ ...u, [kind === 'cover' ? 'coverImage' : 'profileImage']: image }))
    refresh()
  }
  if (profile.error) return <Page><Problem error={profile.error === 'no user was found' ? 'This person does not exist.' : profile.error} onRetry={profile.reload} /></Page>
  if (!profile.data) return <Page><Spinner /></Page>
  const user = profile.data
  const place = [user.address?.city, user.address?.country].filter(Boolean).join(', ')
  return (
    <Page>
      <div className="profile">
        <div className="profile-cover">
          {user.coverImage?.imageName && <img src={urls.cover(id, user.coverImage.imageName)} alt="" />}
          {canEdit && <button className="btn btn-sm cover-btn" onClick={() => coverInput.current.click()}><Icon name="camera" size={16} />Change cover</button>}
        </div>
        <div className="profile-top">
          <div className="profile-avatar">
            <Avatar user={user} size={104} />
            {canEdit && <button className="icon-btn avatar-btn" onClick={() => avatarInput.current.click()} aria-label="Change profile picture"><Icon name="camera" size={16} /></button>}
          </div>
          <div className="profile-actions">
            {!mine && <Link to={`/messages/${id}`} className="btn"><Icon name="message" size={16} />Message</Link>}
            {mine ? (isDemo ? <Link to="/insights" className="btn">How my feed works</Link> : <Link to="/settings" className="btn">Edit profile</Link>)
              : <FollowButton userId={id} onChange={(following) => profile.setData((u) => ({ ...u, followers: following ? [...u.followers, idOf(me)] : u.followers.filter((f) => idOf(f) !== idOf(me)) }))} />}
          </div>
        </div>
        <input ref={avatarInput} type="file" accept="image/*" hidden onChange={upload('profile')} />
        <input ref={coverInput} type="file" accept="image/*" hidden onChange={upload('cover')} />
        <h1>{fullName(user)}</h1>
        <div className="profile-facts">
          {user.job && <span><Icon name="briefcase" size={16} />{user.job}</span>}
          {place && <span><Icon name="pin" size={16} />{place}</span>}
        </div>
        <div className="profile-stats">
          <span><strong>{posts.data ? posts.data.length : user.posts.length}</strong> posts</span>
          <button onClick={() => setList('followers')}><strong>{user.followers.length}</strong> followers</button>
          <button onClick={() => setList('following')}><strong>{user.followes.length}</strong> following</button>
        </div>
      </div>
      {posts.loading && !posts.data && <><PostSkeleton /><PostSkeleton /></>}
      {posts.error && <Problem error={posts.error} onRetry={posts.reload} />}
      {posts.data && posts.data.map((post) => (
        <PostCard key={post._id} post={post}
          onChange={(fresh) => posts.setData((all) => all.map((p) => (p._id === fresh._id ? fresh : p)))}
          onRemove={(postId) => posts.setData((all) => all.filter((p) => p._id !== postId))} />
      ))}
      {posts.data && !posts.data.length && <Empty title={mine ? 'You have not posted yet' : `${user.firstName} has not posted yet`}>{mine ? 'Your posts show up here.' : `${count(user.followers.length, 'person', 'people')} follow ${user.firstName}.`}</Empty>}
      {list === 'followers' && <PeopleList title="Followers" load={() => api.followers(id)} onClose={() => setList(null)} />}
      {list === 'following' && <PeopleList title="Following" load={() => api.following(id)} onClose={() => setList(null)} />}
    </Page>
  )
}
