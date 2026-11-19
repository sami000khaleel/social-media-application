import { useState } from 'react'
import { Link } from 'react-router-dom'
import Icon from './Icon.jsx'
import Comments from './Comments.jsx'
import { Avatar, Menu, Modal, PersonRow, Spinner, Topic, useLoad } from './ui.jsx'
import { api, urls } from '../api.js'
import { useAuth, useFeedback } from '../context.jsx'
import { fullDate, fullName, has, idOf, isImage, originalName, timeAgo } from '../lib.js'

function Media({ post }) {
  const [viewing, setViewing] = useState(null)
  const files = (post.files || []).filter((file) => file.fileName)
  if (!files.length) return null
  const pictures = files.filter((file) => isImage(file.fileName))
  const others = files.filter((file) => !isImage(file.fileName))
  const url = (file) => urls.postFile(post._id, file.fileName)
  return (
    <>
      {pictures.length > 0 && (
        <div className="media" data-count={Math.min(pictures.length, 4)}>
          {pictures.slice(0, 4).map((file, index) => (
            <button key={file.fileName} onClick={() => setViewing(file)} aria-label={`Open picture ${index + 1} of ${pictures.length}`}>
              <img src={url(file)} alt="" loading="lazy" />
            </button>
          ))}
        </div>
      )}
      {others.map((file) => <a key={file.fileName} className="media-file" href={url(file)} target="_blank" rel="noreferrer">{originalName(file.fileName)}</a>)}
      {viewing && <Modal title="Picture" wide onClose={() => setViewing(null)}><img className="lightbox" src={url(viewing)} alt="" /></Modal>}
    </>
  )
}

// The original post inside a shared post
function Embedded({ shared }) {
  if (!shared.post || typeof shared.post !== 'object') return <div className="embed embed-gone">The original post was removed.</div>
  const post = shared.post
  return (
    <div className="embed">
      <Link to={`/post/${post._id}`} className="embed-head">
        <Avatar user={post.publisher} size={24} />
        <strong>{fullName(post.publisher)}</strong>
        <span className="muted">{timeAgo(post.createdAt)}</span>
      </Link>
      {post.describtion && <p className="post-text">{post.describtion}</p>}
      <Media post={post} />
    </div>
  )
}

function Reactions({ postId, onClose }) {
  const { data, loading } = useLoad(() => api.reactions(postId), [postId])
  return (
    <Modal title="Reactions" onClose={onClose}>
      {loading ? <Spinner /> : (
        <div className="people">
          {data.likers.map((u) => <PersonRow key={u._id} user={u} note="Liked" onNavigate={onClose} />)}
          {data.dislikers.map((u) => <PersonRow key={u._id} user={u} note="Disliked" onNavigate={onClose} />)}
          {!data.likers.length && !data.dislikers.length && <p className="muted">Nobody has reacted yet.</p>}
        </div>
      )}
    </Modal>
  )
}

// post: a populated post from the server
// onChange(post) / onRemove(id) keep the list of the page up to date
// onReacted() is called after a like, dislike, comment or share (the feed uses it to refresh the mix)
// staffRole: 'manager' or 'admin' when the viewer may remove the post from its community
export default function PostCard({ post, onChange, onRemove, onReacted, onShared, staffRole, openComments = false }) {
  const { user, isDemo } = useAuth()
  const { toast, confirm, attempt } = useFeedback()
  const me = idOf(user)
  const [showComments, setShowComments] = useState(openComments)
  const [dialog, setDialog] = useState(null)       // 'share' | 'edit' | 'reactions'
  const [draft, setDraft] = useState('')
  const [busy, setBusy] = useState(false)

  const mine = idOf(post.publisher) === me
  const liked = has(post.likes, me)
  const disliked = has(post.dislikes, me)
  const isShare = Boolean(post.sharedPost && (post.sharedPost.post || post.sharedPost.removed))
  const community = post.community?.communityId && typeof post.community.communityId === 'object' ? post.community.communityId : null
  const shareTarget = isShare && post.sharedPost.post ? post.sharedPost.post : post

  const react = async (kind) => {
    if (busy) return
    setBusy(true)
    const fresh = await attempt(() => (kind === 'like' ? api.like(post._id) : api.dislike(post._id)))
    setBusy(false)
    if (!fresh) return
    onChange?.({ ...post, likes: fresh.likes, dislikes: fresh.dislikes })
    onReacted?.()
  }
  const share = async () => {
    setBusy(true)
    const created = await attempt(() => api.createPost({ text: draft.trim(), sharedPostId: shareTarget._id }), 'Shared')
    setBusy(false)
    if (!created) return
    setDialog(null)
    if (shareTarget._id === post._id) onChange?.({ ...post, shares: [...(post.shares || []), { user: me, post: created._id }] })
    onShared?.(created)
    onReacted?.()
  }
  const saveEdit = async () => {
    setBusy(true)
    const fresh = await attempt(() => api.editPost(post._id, draft.trim()), 'Saved')
    setBusy(false)
    if (!fresh) return
    setDialog(null)
    onChange?.({ ...post, describtion: fresh.describtion })
  }
  const remove = async () => {
    if (!(await confirm({ title: 'Delete this post?', message: 'The post and its comments are deleted for everyone.', confirmLabel: 'Delete', danger: true }))) return
    if (await attempt(() => api.deletePost(post._id), 'Deleted')) onRemove?.(post._id)
  }
  const removeFromCommunity = async () => {
    if (!(await confirm({ title: 'Remove from the community?', message: 'The post disappears from the community. The author is told.', confirmLabel: 'Remove', danger: true }))) return
    if (await attempt(() => api.removeCommunityPost(idOf(post.community.communityId), post._id, staffRole), 'Removed')) onRemove?.(post._id)
  }
  const copyLink = () => navigator.clipboard?.writeText(`${location.origin}/post/${post._id}`).then(() => toast('Link copied'), () => toast('Could not copy the link', 'error'))

  return (
    <article className="post" style={{ '--topic': post.category ? `var(--topic-${post.category})` : 'var(--ink-3)' }}>
      <Link to={`/u/${idOf(post.publisher)}`} className="post-avatar" tabIndex={-1} aria-hidden="true"><Avatar user={post.publisher} size={44} /></Link>
      <div className="post-main">
        <header className="post-head">
          <div className="post-who">
            <Link to={`/u/${idOf(post.publisher)}`} className="post-name">{fullName(post.publisher) || 'Someone'}</Link>
            {isShare && <span className="muted">shared a post</span>}
            <Link to={`/post/${post._id}`} className="post-time" title={fullDate(post.createdAt)}>{timeAgo(post.createdAt)}</Link>
          </div>
          <div className="post-meta">
            <Topic topic={post.category} />
            {community && <Link to={`/c/${community._id}`} className="post-community">in {community.communityName}</Link>}
          </div>
          <Menu items={[
            { label: 'Copy link', icon: 'share', onClick: copyLink },
            mine && !isShare && !isDemo && { label: 'Edit', icon: 'edit', onClick: () => { setDraft(post.describtion || ''); setDialog('edit') } },
            mine && !isDemo && { label: 'Delete', icon: 'trash', danger: true, onClick: remove },
            !mine && staffRole && !isDemo && { label: 'Remove from community', icon: 'shield', danger: true, onClick: removeFromCommunity },
          ]} />
        </header>
        {post.describtion && <p className="post-text">{post.describtion}</p>}
        <Media post={post} />
        {isShare && <Embedded shared={post.sharedPost} />}
        <footer className="post-actions">
          <button className={`act act-like${liked ? ' on' : ''}`} onClick={() => react('like')} aria-pressed={liked} aria-label="Like">
            <Icon name="heart" size={19} filled={liked} /><span>{post.likes.length || ''}</span>
          </button>
          <button className={`act act-dislike${disliked ? ' on' : ''}`} onClick={() => react('dislike')} aria-pressed={disliked} aria-label="Dislike">
            <Icon name="thumbDown" size={19} filled={disliked} /><span>{post.dislikes.length || ''}</span>
          </button>
          <button className={`act${showComments ? ' on' : ''}`} onClick={() => setShowComments((v) => !v)} aria-expanded={showComments} aria-label="Comments">
            <Icon name="message" size={19} /><span>{post.comments.length || ''}</span>
          </button>
          {!community && (
            <button className="act" onClick={() => { setDraft(''); setDialog('share') }} aria-label="Share">
              <Icon name="share" size={19} /><span>{(post.shares || []).length || ''}</span>
            </button>
          )}
          {(post.likes.length > 0 || post.dislikes.length > 0) && <button className="act act-who" onClick={() => setDialog('reactions')}>See who reacted</button>}
        </footer>
        {showComments && (
          <Comments postId={post._id} onCount={(change) => { onChange?.({ ...post, comments: change > 0 ? [...post.comments, 'new'] : post.comments.slice(0, Math.max(0, post.comments.length + change)) }); onReacted?.() }} />
        )}
      </div>
      {dialog === 'share' && (
        <Modal title="Share this post" onClose={() => setDialog(null)}>
          {isDemo
            ? <p className="demo-off">In the demo account a post is shared without your own words.</p>
            : <textarea className="field" rows={3} value={draft} onChange={(event) => setDraft(event.target.value)} placeholder="Add a few words (optional)" maxLength={500} />}
          <div className="embed embed-preview">
            <strong>{fullName(shareTarget.publisher)}</strong>
            <p className="post-text">{(shareTarget.describtion || 'Picture').slice(0, 160)}</p>
          </div>
          <div className="modal-actions">
            <button className="btn" onClick={() => setDialog(null)}>Cancel</button>
            <button className="btn btn-primary" onClick={share} disabled={busy}>Share</button>
          </div>
        </Modal>
      )}
      {dialog === 'edit' && (
        <Modal title="Edit post" onClose={() => setDialog(null)}>
          <textarea className="field" rows={5} value={draft} onChange={(event) => setDraft(event.target.value)} maxLength={2000} />
          <div className="modal-actions">
            <button className="btn" onClick={() => setDialog(null)}>Cancel</button>
            <button className="btn btn-primary" onClick={saveEdit} disabled={busy || (!draft.trim() && !post.files.length)}>Save changes</button>
          </div>
        </Modal>
      )}
      {dialog === 'reactions' && <Reactions postId={post._id} onClose={() => setDialog(null)} />}
    </article>
  )
}

export function PostSkeleton() {
  return (
    <div className="post post-skeleton" aria-hidden="true">
      <span className="avatar" style={{ width: 44, height: 44 }} />
      <div className="post-main"><i style={{ width: '34%' }} /><i style={{ width: '92%' }} /><i style={{ width: '60%' }} /></div>
    </div>
  )
}
