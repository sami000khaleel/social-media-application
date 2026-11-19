import { useEffect, useMemo, useRef, useState } from 'react'
import Icon from './Icon.jsx'
import { Avatar } from './ui.jsx'
import { api } from '../api.js'
import { useAuth, useFeedback } from '../context.jsx'
import { TOPICS } from '../lib.js'

// Writes a post. Outside a community the writer picks the topic;
// inside a community the post takes the topic of the community.
export default function Composer({ communityId, onPosted, placeholder = 'What is on your mind?' }) {
  const { user, isDemo } = useAuth()
  const { toast } = useFeedback()
  const [text, setText] = useState('')
  const [topic, setTopic] = useState('')
  const [files, setFiles] = useState([])
  const [busy, setBusy] = useState(false)
  const [nudge, setNudge] = useState(false)
  const input = useRef(null)
  const area = useRef(null)

  const previews = useMemo(() => files.map((file) => URL.createObjectURL(file)), [files])
  useEffect(() => () => previews.forEach((url) => URL.revokeObjectURL(url)), [previews])

  const grow = () => { const el = area.current; if (el) { el.style.height = 'auto'; el.style.height = `${el.scrollHeight}px` } }
  const pickFiles = (event) => {
    const chosen = [...event.target.files].filter((file) => file.type.startsWith('image/'))
    setFiles((list) => [...list, ...chosen].slice(0, 4))
    event.target.value = ''
  }
  const hasContent = text.trim() || files.length
  const submit = async () => {
    if (!hasContent || busy) return
    if (!communityId && !topic) { setNudge(true); return }
    setBusy(true)
    try {
      const post = await api.createPost({ text: text.trim(), category: topic, files, communityId })
      setText(''); setFiles([]); setTopic(''); setNudge(false)
      requestAnimationFrame(grow)
      onPosted?.(post)
    } catch (error) { toast(error.message, 'error') }
    setBusy(false)
  }
  if (isDemo) {
    return (
      <div className="composer composer-demo">
        <Avatar user={user} size={40} />
        <p>Made-up people can't write posts. Liking, disliking and sharing all work, and they change your feed.</p>
      </div>
    )
  }
  return (
    <div className="composer">
      <Avatar user={user} size={40} />
      <div className="composer-body">
        <textarea ref={area} rows={1} value={text} placeholder={placeholder} maxLength={2000}
          onChange={(event) => { setText(event.target.value); grow() }}
          onKeyDown={(event) => { if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) submit() }} />
        {files.length > 0 && (
          <div className="composer-files">
            {files.map((file, index) => (
              <div key={`${file.name}-${index}`} className="composer-file">
                <img src={previews[index]} alt="" />
                <button className="icon-btn" onClick={() => setFiles((list) => list.filter((_, i) => i !== index))} aria-label={`Remove ${file.name}`}><Icon name="close" size={14} /></button>
              </div>
            ))}
          </div>
        )}
        {!communityId && (
          <div className={`topic-picker${nudge && !topic ? ' nudge' : ''}`} role="radiogroup" aria-label="Topic of the post">
            {TOPICS.map((t) => (
              <button key={t.key} role="radio" aria-checked={topic === t.key} className={`chip${topic === t.key ? ' on' : ''}`} onClick={() => { setTopic(t.key); setNudge(false) }}>
                <i className="dot" style={{ background: `var(--topic-${t.key})` }} />{t.label}
              </button>
            ))}
          </div>
        )}
        {nudge && !topic && <p className="composer-hint">Pick a topic so the post reaches people who care about it.</p>}
        <div className="composer-foot">
          <input ref={input} type="file" accept="image/*" multiple hidden onChange={pickFiles} />
          <button className="icon-btn" onClick={() => input.current.click()} aria-label="Add pictures" title="Add pictures" disabled={files.length >= 4}><Icon name="image" /></button>
          <button className="btn btn-primary" onClick={submit} disabled={!hasContent || busy}>{busy ? 'Posting' : 'Post'}</button>
        </div>
      </div>
    </div>
  )
}
