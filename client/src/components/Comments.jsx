import { useState } from 'react'
import { Link } from 'react-router-dom'
import Icon from './Icon.jsx'
import { Avatar, Menu, Problem, Spinner, useLoad } from './ui.jsx'
import { api } from '../api.js'
import { useAuth, useFeedback } from '../context.jsx'
import { fullName, has, idOf, timeAgo } from '../lib.js'

function CommentForm({ onSend, placeholder, autoFocus, initial = '', label = 'Send', onCancel }) {
  const [text, setText] = useState(initial)
  const [busy, setBusy] = useState(false)
  const send = async (event) => {
    event.preventDefault()
    if (!text.trim() || busy) return
    setBusy(true)
    const ok = await onSend(text.trim())
    setBusy(false)
    if (ok) setText('')
  }
  return (
    <form className="comment-form" onSubmit={send}>
      <input className="field" value={text} onChange={(event) => setText(event.target.value)} placeholder={placeholder} autoFocus={autoFocus} maxLength={600} aria-label={placeholder} />
      {onCancel && <button type="button" className="btn btn-sm" onClick={onCancel}>Cancel</button>}
      <button className="btn btn-sm btn-primary" disabled={!text.trim() || busy}>{label}</button>
    </form>
  )
}

function Comment({ comment, postId, depth, actions }) {
  const { user, isDemo } = useAuth()
  const me = idOf(user)
  const [mode, setMode] = useState(null)        // 'reply' | 'edit'
  const liked = has(comment.likedBy, me)
  const disliked = has(comment.dislikedBy, me)
  const mine = idOf(comment.user) === me
  const replies = (comment.repliedBy || []).filter((reply) => reply && typeof reply === 'object')
  return (
    <div className="comment">
      <Link to={`/u/${idOf(comment.user)}`} tabIndex={-1} aria-hidden="true"><Avatar user={comment.user} size={depth ? 28 : 32} /></Link>
      <div className="comment-main">
        <div className="comment-bubble">
          <div className="comment-head">
            <Link to={`/u/${idOf(comment.user)}`} className="post-name">{fullName(comment.user) || 'Someone'}</Link>
            <span className="muted">{timeAgo(comment.createdAt)}</span>
            {mine && !isDemo && <Menu label="Comment actions" items={[
              { label: 'Edit', icon: 'edit', onClick: () => setMode('edit') },
              { label: 'Delete', icon: 'trash', danger: true, onClick: () => actions.remove(comment) },
            ]} />}
          </div>
          {mode === 'edit'
            ? <CommentForm initial={comment.content} label="Save" autoFocus placeholder="Edit your comment" onCancel={() => setMode(null)} onSend={async (text) => { const ok = await actions.edit(comment, text); if (ok) setMode(null); return ok }} />
            : <p>{comment.content}</p>}
        </div>
        <div className="comment-actions">
          <button className={liked ? 'on' : ''} onClick={() => actions.like(comment)} aria-pressed={liked}><Icon name="heart" size={15} filled={liked} />{comment.likedBy.length || ''} Like</button>
          <button className={disliked ? 'on' : ''} onClick={() => actions.dislike(comment)} aria-pressed={disliked}><Icon name="thumbDown" size={15} filled={disliked} />{comment.dislikedBy.length || ''}<span className="sr-only">Dislike</span></button>
          {!isDemo && <button onClick={() => setMode(mode === 'reply' ? null : 'reply')}><Icon name="reply" size={15} />Reply</button>}
        </div>
        {mode === 'reply' && <CommentForm autoFocus placeholder={`Reply to ${comment.user?.firstName || 'this comment'}`} onSend={async (text) => { const ok = await actions.add(text, comment._id); if (ok) setMode(null); return ok }} />}
        {replies.length > 0 && (
          <div className="replies">
            {replies.map((reply) => <Comment key={reply._id} comment={reply} postId={postId} depth={depth + 1} actions={actions} />)}
          </div>
        )}
      </div>
    </div>
  )
}

// replaces one comment anywhere in the tree
const patchTree = (list, id, change) => list.map((c) => (c._id === id ? { ...c, ...change } : { ...c, repliedBy: patchTree((c.repliedBy || []).filter((r) => typeof r === 'object'), id, change) }))

export default function Comments({ postId, onCount }) {
  const { attempt, confirm } = useFeedback()
  const { isDemo } = useAuth()
  const { data, error, loading, reload, setData } = useLoad(() => api.comments(postId), [postId])

  const actions = {
    async add(text, repliedCommentId) {
      const created = await attempt(() => api.addComment(postId, text, repliedCommentId))
      if (!created) return false
      onCount?.(1)
      reload()
      return true
    },
    async edit(comment, text) {
      const fresh = await attempt(() => api.editComment(comment._id, text))
      if (fresh) setData((list) => patchTree(list, comment._id, { content: fresh.content }))
      return Boolean(fresh)
    },
    async remove(comment) {
      if (!(await confirm({ title: 'Delete this comment?', message: 'Replies to it are deleted too.', confirmLabel: 'Delete', danger: true }))) return
      const countAll = (c) => 1 + (c.repliedBy || []).filter((r) => typeof r === 'object').reduce((n, r) => n + countAll(r), 0)
      if (await attempt(() => api.deleteComment(comment._id))) { onCount?.(-countAll(comment)); reload() }
    },
    async like(comment) {
      const fresh = await attempt(() => api.likeComment(postId, comment._id))
      if (fresh) setData((list) => patchTree(list, comment._id, { likedBy: fresh.likedBy, dislikedBy: fresh.dislikedBy }))
    },
    async dislike(comment) {
      const fresh = await attempt(() => api.dislikeComment(postId, comment._id))
      if (fresh) setData((list) => patchTree(list, comment._id, { likedBy: fresh.likedBy, dislikedBy: fresh.dislikedBy }))
    },
  }
  return (
    <section className="comments" aria-label="Comments">
      {isDemo
        ? <p className="demo-off">Writing comments is turned off in the demo account. You can like comments.</p>
        : <CommentForm placeholder="Write a comment" onSend={(text) => actions.add(text)} />}
      {loading && !data && <Spinner />}
      {error && <Problem error={error} onRetry={reload} />}
      {data && data.map((comment) => <Comment key={comment._id} comment={comment} postId={postId} depth={0} actions={actions} />)}
      {data && !data.length && <p className="muted comments-empty">No comments yet. Say something first.</p>}
    </section>
  )
}
