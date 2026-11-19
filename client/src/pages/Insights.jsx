import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import Icon from '../components/Icon.jsx'
import { Page } from '../components/Layout.jsx'
import { Avatar, Empty, Problem, Spinner } from '../components/ui.jsx'
import { useAuth, useFeedback } from '../context.jsx'
import { PageTiles, useCountUp, useInView } from '../components/charts.jsx'
import { api } from '../api.js'
import { useRealtime, useSocketEvent } from '../realtime.jsx'
import { PAGE_SIZE, TOPICS, fullName, timeAgo, topicLabel } from '../lib.js'
import { tilesOfPage } from '../components/InsightsCta.jsx'
import { HALF, actionWords, basisOf, explainHalf, fallingNote, signed, topicsInWords } from '../insightsText.js'

const DAY = 864e5
const color = (topic) => `var(--topic-${topic})`
const pct = (p) => `${Math.round(p * 100)}%`
// why a post was on a page (FeedLog posts[].reason); 'mix' is the name pages had before the split
const REASONS = [
  { key: 'week', label: 'your week' },
  { key: 'session', label: 'right now' },
  { key: 'surprise', label: 'surprises' },
  { key: 'filler', label: 'fillers (a topic ran out)' },
]
const reasonOf = (p) => (p.reason === 'mix' || !p.reason ? 'week' : p.reason)

// how many random surprise posts a logged page had
const surprisesOf = (page) => page.posts.filter((p) => p.reason === 'surprise').length
const SURPRISE_TILE = { topic: 'surprise', surprise: true, title: 'A surprise: a post from a topic picked at random' }
// the posts of one half as tiles, in topic order, then the surprises that were taken out of this half
function halfTiles(half) {
  return TOPICS.flatMap((t) => {
    const r = half.results.find((x) => x.interest === t.key)
    return Array.from({ length: r?.postsNumber || 0 }, () => ({ topic: t.key, title: t.label }))
  }).concat(Array.from({ length: half.surprises || 0 }, () => SURPRISE_TILE))
}
// the halves of a page; a page made before the split had one calculation for the whole page
function halvesOfPage(page) {
  if (page.halves?.length) return page.halves
  return [{ key: 'week', basis: page.basis === 'even' ? 'even' : 'week', limit: page.limit || PAGE_SIZE, surprises: 0, results: page.results }]
}
function Count({ value, suffix = '' }) {
  const shown = useCountUp(value)
  return <>{Math.round(shown)}{suffix}</>
}
// a section that starts its animations when it scrolls into view
function Section({ title, intro, children, className = '' }) {
  const [ref, seen] = useInView()
  return (
    <section ref={ref} className={`ins-section ${className}${seen ? ' in' : ''}`}>
      {title && <h2>{title}</h2>}
      {intro && <p className="ins-intro">{intro}</p>}
      {children}
    </section>
  )
}

// ---------------------------------------------------------------- the top: your next 30 posts, in two halves
function Hero({ now, live }) {
  const { user, isDemo, signOut } = useAuth()
  const navigate = useNavigate()
  const [ref, seen] = useInView({ threshold: 0.1 })
  const halves = halvesOfPage(now)
  const surprises = now.surprises || 0
  const counts = TOPICS.map((t) => ({ ...t, n: halves.reduce((sum, h) => sum + (h.results.find((r) => r.interest === t.key)?.postsNumber || 0), 0) }))
    .filter((t) => t.n > 0).sort((a, b) => b.n - a.n)
  const note = fallingNote(halves)
  // a new mix replays the tile animation
  const signature = halves.map((h) => halfTiles(h).map((t) => t.topic[0]).join('')).join('|')
  return (
    <section ref={ref} className={`ins-hero${seen ? ' in' : ''}`}>
      <div className="ins-hero-top">
        <h1>Your feed, explained</h1>
        {live && <span className="live"><i />Live</span>}
      </div>
      <p className="ins-lead">We count what you like. Half of your next posts follow your week, half follow what you are doing right now.</p>
      {isDemo && (
        <p className="demo-banner">
          <Avatar user={user} size={28} />
          <span>You are looking around as <strong>{fullName(user)}</strong>, a made-up person.</span>
          <button className="link" onClick={() => { signOut(); navigate('/login') }}>Be someone else</button>
        </p>
      )}
      <div className="ins-next">
        <p className="ins-next-title">Your next {now.limit || PAGE_SIZE} posts</p>
        <div className="ins-halves">
          {halves.map((h) => (
            <div key={h.key} className="ins-half">
              <p className="ins-half-title"><strong>{HALF[h.key].title}</strong><span className="muted">{h.limit} posts from the {HALF[h.key].short.toLowerCase()}</span></p>
              <PageTiles key={`${signature}-${h.key}`} posts={halfTiles(h)} label={`${HALF[h.key].title}: ${halfTiles(h).length} posts`} />
              <p className="ins-half-why">{explainHalf(h)}</p>
            </div>
          ))}
        </div>
        <div className="ins-counts">
          {counts.map((t) => (
            <span key={t.key} className="ins-count"><i className="dot" style={{ background: color(t.key) }} /><strong><Count value={t.n} /></strong> {t.label}</span>
          ))}
          {surprises > 0 && <span className="ins-count" title="A random topic, so you can find something new"><i className="dot dot-surprise" /><strong><Count value={surprises} /></strong> {surprises === 1 ? 'Surprise' : 'Surprises'}</span>}
        </div>
        {surprises > 0 && <p className="ins-half-why">A <strong>?</strong> is a surprise: a random topic, so you can find something new.</p>}
      </div>
      {note && <p className="ins-surprise"><Icon name="info" size={18} />{note}</p>}
    </section>
  )
}

// ---------------------------------------------------------------- try it: like 3 posts and watch the tiles change
function TryIt({ now }) {
  const { attempt } = useFeedback()
  // suggest a topic that hardly gets any posts now (best: one that still has points), so the change is easy to see
  const suggested = useMemo(() => {
    const ranked = [...now.results].sort((a, b) => a.probability - b.probability || b.score - a.score)
    return (ranked.find((r) => r.probability < 0.2 && r.score > 0) || ranked[0]).interest
    // only once, when the page opens
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  const [topic, setTopic] = useState(suggested)
  const [posts, setPosts] = useState(null)
  const [liked, setLiked] = useState(() => new Set())
  const [busy, setBusy] = useState('')
  useEffect(() => {
    let live = true
    setPosts(null)
    setLiked(new Set())
    api.tryPosts(topic).then((list) => live && setPosts(list)).catch(() => live && setPosts([]))
    return () => { live = false }
  }, [topic])
  const goal = Math.min(3, posts?.length || 0)
  const done = goal > 0 && liked.size >= goal
  const like = async (post) => {
    if (liked.has(post._id) || busy) return
    setBusy(post._id)
    const fresh = await attempt(() => api.like(post._id))
    setBusy('')
    if (!fresh) return
    const next = new Set(liked).add(post._id)
    setLiked(next)
    // after the last like, scroll up so the new tiles are in view (the page reloads its numbers by itself)
    if (next.size >= goal) setTimeout(() => document.querySelector('.ins-hero')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 1600)
  }
  const label = topicLabel(topic)
  return (
    <section className="try-box" aria-label="Try it yourself">
      <div className="try-head">
        <span className="step-n">!</span>
        <div>
          <h2>Try it</h2>
          <p>{done
            ? <>Done! <strong>Right now</strong> is {label} now. <strong>Your week</strong> barely moved. In 30 minutes it goes back.</>
            : <>Like these {goal || 3} {label} posts and watch the <strong>Right now</strong> row turn {label}.</>}
          </p>
        </div>
      </div>
      <div className="topic-picker try-topics" role="radiogroup" aria-label="Topic to try">
        {TOPICS.map((t) => (
          <button key={t.key} role="radio" aria-checked={topic === t.key} className={`chip${topic === t.key ? ' on' : ''}`} onClick={() => setTopic(t.key)}>
            <i className="dot" style={{ background: color(t.key) }} />{t.label}
          </button>
        ))}
      </div>
      {posts === null && <Spinner />}
      {posts && !posts.length && <p className="muted">No new {label} posts. Pick another topic.</p>}
      {posts && posts.length > 0 && (
        <ul className="try-posts">
          {posts.map((post) => {
            const on = liked.has(post._id)
            return (
              <li key={post._id} className={`try-post${on ? ' on' : ''}`} style={{ '--c': color(post.category) }}>
                <Avatar user={post.publisher} size={36} />
                <div className="try-text">
                  <strong>{fullName(post.publisher)}</strong>
                  <p>{post.describtion || 'A picture'}</p>
                </div>
                <button className={`try-like${on ? ' on' : ''}`} onClick={() => like(post)} disabled={on || busy === post._id} aria-pressed={on}>
                  <Icon name={on ? 'check' : 'heart'} size={20} />{on ? 'Liked' : 'Like'}
                </button>
              </li>
            )
          })}
        </ul>
      )}
      {goal > 0 && <p className="try-progress"><strong>{Math.min(liked.size, goal)} of {goal}</strong> liked{done && <button className="btn btn-sm" onClick={() => document.querySelector('.ins-hero')?.scrollIntoView({ behavior: 'smooth', block: 'start' })}>Show me</button>}</p>}
    </section>
  )
}

// ---------------------------------------------------------------- how it works: one small diagram, three boxes
// a tiny line for a score: its last 7 days, on its own scale (flat when nothing changed)
function Spark({ points, topic, width = 96, height = 28 }) {
  if (points.length < 2) return <svg className="spark" viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" aria-hidden="true"><line x1="2" x2={width - 2} y1={height / 2} y2={height / 2} stroke="var(--line-strong)" strokeWidth="2" strokeLinecap="round" /></svg>
  const t0 = points[0].t, t1 = points.at(-1).t || t0 + 1
  // at least 20 points tall, so a change of 1 or 2 points looks as small as it is
  const vs = points.map((p) => p.v), mid = (Math.min(...vs) + Math.max(...vs)) / 2, half = Math.max(10, (Math.max(...vs) - Math.min(...vs)) / 2)
  const lo = mid - half, hi = mid + half
  const x = (t) => 2 + ((t - t0) / Math.max(1, t1 - t0)) * (width - 6)
  const y = (v) => height - 3 - ((v - lo) / (hi - lo)) * (height - 6)
  const d = points.map((p, i) => `${i ? 'L' : 'M'}${x(p.t).toFixed(1)} ${y(p.v).toFixed(1)}`).join('')
  const end = points.at(-1)
  return (
    <svg className="spark" viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" aria-hidden="true">
      <path d={d} fill="none" stroke={color(topic)} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
      <circle cx={x(end.t)} cy={y(end.v)} r="3" fill={color(topic)} />
    </svg>
  )
}
// the score of one topic over the last 7 days, the way the server sees it (with the daily decay up to now)
function weekLine(history, topic, nowT) {
  const all = (history[topic] || []).map((p) => ({ t: new Date(p.date).getTime(), v: p.score }))
  const from = nowT - 7 * DAY
  const before = all.filter((p) => p.t < from).at(-1)
  const decay = (p, t) => { const days = Math.floor((t - p.t) / DAY); return p.v > 0 ? Math.max(0, p.v - 2 * days) : p.v < 0 ? Math.min(0, p.v + 2 * days) : 0 }
  const points = (before ? [{ t: from, v: decay(before, from) }] : []).concat(all.filter((p) => p.t >= from))
  const last = points.at(-1) || before
  if (last) points.push({ t: nowT, v: decay(last, nowT) })
  return points
}
function HowItWorks({ now, recent }) {
  const halves = halvesOfPage(now)
  const week = halves.find((h) => h.key === 'week')
  // the newest thing you did that gave points (a like rather than a dislike), to match "You like posts"
  const last = recent.find((a) => a.points > 0) || recent[0]
  const top = week.results.filter((r) => r.weight > 0).sort((a, b) => b.probability - a.probability)[0]
  const down = week.results.filter((r) => r.score > 0 && r.score < r.scoreThen).sort((a, b) => b.score - a.score)[0]
  return (
    <Section title="How it works" className="flow-section">
      <ol className="flow">
        <li className="flow-box" style={{ '--i': 0 }}>
          <span className="flow-art flow-like">
            <Icon name="heart" size={22} />
            <span className="flow-chip"><i className="dot" style={{ background: color(last?.topic || 'tech') }} />{topicLabel(last?.topic || 'tech')} <strong>{last ? signed(last.points) : '+3'}</strong></span>
          </span>
          <h3>You like posts</h3>
          <p>Likes, comments and shares give a topic points.</p>
        </li>
        <li className="flow-box" style={{ '--i': 1 }}>
          <svg className="flow-art" viewBox="0 0 120 48" width="120" height="48" aria-hidden="true">
            <path d="M6 40 L40 32 L74 20 L110 8" fill="none" stroke={color(top?.interest || 'tech')} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M102 6 L111 7.5 L108 16" fill="none" stroke={color(top?.interest || 'tech')} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M6 14 L40 20 L74 28 L110 40" fill="none" stroke="var(--ink-3)" strokeWidth="2.5" strokeDasharray="4 5" strokeLinecap="round" />
          </svg>
          <h3>We see what grows</h3>
          <p>{top ? topicLabel(top.interest) : 'A topic'} is growing, so it gets posts.{down ? ` ${topicLabel(down.interest)} is shrinking, so it gets none.` : ' A shrinking topic gets none.'}</p>
        </li>
        <li className="flow-box" style={{ '--i': 2 }}>
          <span className="flow-art flow-page" aria-hidden="true">
            {halves.map((h) => <span key={h.key} className="flow-row">{halfTiles(h).map((t, i) => <i key={i} className={t.surprise ? 'is-surprise' : ''} style={{ background: t.surprise ? undefined : color(t.topic) }} />)}</span>)}
          </span>
          <h3>We fill your page</h3>
          <p>{PAGE_SIZE / 2} posts from your week, {PAGE_SIZE / 2} from right now.</p>
        </li>
      </ol>
    </Section>
  )
}

// ---------------------------------------------------------------- your five topics: one row each, a tiny line instead of a big chart
function Change({ value }) {
  const r = Math.round(value)
  if (!r) return <span className="chg chg-flat">no change</span>
  return <span className={`chg ${r > 0 ? 'chg-up' : 'chg-down'}`}>{r > 0 ? '▲' : '▼'} {Math.abs(r)}</span>
}
// why a topic gets no posts, in two or three words
function whyNone(w) {
  const grew = Math.round((w.score || 0) - (w.scoreThen || 0))
  if ((w.score || 0) <= 0) return 'no points yet'
  if (grew < 0) return 'shrinking'
  if (grew === 0) return ''
  return 'grew too little'
}
function TopicRows({ data }) {
  const nowT = new Date(data.now.date).getTime()
  const halves = halvesOfPage(data.now)
  const week = halves.find((h) => h.key === 'week')
  const session = halves.find((h) => h.key === 'session')
  const rows = TOPICS.map((t) => {
    const w = week.results.find((r) => r.interest === t.key) || {}
    const n = session?.results.find((r) => r.interest === t.key) || {}
    const posts = halves.reduce((sum, h) => sum + (h.results.find((r) => r.interest === t.key)?.postsNumber || 0), 0)
    return { ...t, w, n, posts, line: weekLine(data.history, t.key, nowT) }
  }).sort((a, b) => b.posts - a.posts || (b.w.score || 0) - (a.w.score || 0))
  return (
    <Section title="Your topics" intro="Each line is the last 7 days. The more a topic grew, the more posts it gets.">
      <div className="topic-rows" role="table" aria-label="Your five topics">
        <div className="topic-row topic-row-head" role="row">
          <span role="columnheader">Topic</span><span role="columnheader">Last 7 days</span><span role="columnheader" className="hide-phone">Right now</span><span role="columnheader" className="num">Posts</span>
        </div>
        {rows.map((r) => (
          <div key={r.key} role="row" className={`topic-row${r.posts ? '' : ' off'}`}>
            <span role="cell" className="cell-topic"><i className="dot" style={{ background: color(r.key) }} />{r.label}</span>
            <span role="cell" className="topic-week"><Spark points={r.line} topic={r.key} /><Change value={(r.w.score || 0) - (r.w.scoreThen || 0)} />{!r.posts && <span className="muted topic-why">{whyNone(r.w)}</span>}</span>
            <span role="cell" className="hide-phone"><Change value={(r.n.score || 0) - (r.n.scoreThen || 0)} /></span>
            <span role="cell" className="num"><strong>{r.posts}</strong></span>
          </div>
        ))}
        {data.now.surprises > 0 && (
          <div role="row" className="topic-row">
            <span role="cell" className="cell-topic"><i className="dot dot-surprise" />Surprises</span>
            <span role="cell" className="muted">random topics, so you find something new</span>
            <span role="cell" className="hide-phone" />
            <span role="cell" className="num"><strong>{data.now.surprises}</strong></span>
          </div>
        )}
      </div>
    </Section>
  )
}

// ---------------------------------------------------------------- the maths of one half as a table
function MathsTable({ half }) {
  const info = HALF[half.key]
  const even = half.basis === 'even'
  const follows = half.basis === 'followsWeek'
  const rows = TOPICS.map((t) => half.results.find((r) => r.interest === t.key)).filter(Boolean)
  const rising = rows.filter((r) => r.weight > 0)
  const totalClimb = rising.reduce((sum, r) => sum + (r.score - r.scoreThen), 0)
  const size = half.limit || PAGE_SIZE / 2
  const columns = 2 + (even ? 0 : 2)
  return (
    <div className="maths">
      <div className="table-scroll">
      <table className="ins-table">
        <thead>
          <tr>
            <th>Topic</th>
            {!even && <th className="num">{info.then}</th>}
            <th className="num">Now</th>
            {!even && <th className="num">Grew</th>}
            <th>Share</th>
            <th className="num">Posts</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => {
            const climb = r.score - r.scoreThen
            const why = even || follows || r.weight > 0 ? '' : r.score <= 0 ? 'no points' : Math.round(climb) < 0 ? 'shrinking' : 'not growing'
            return (
              <tr key={r.interest} className={r.probability > 0 ? '' : 'off'}>
                <td><span className="cell-topic"><i className="dot" style={{ background: color(r.interest) }} />{topicLabel(r.interest)}</span></td>
                {!even && <td className="num">{Math.round(r.scoreThen)}</td>}
                <td className="num">{Math.round(r.score)}</td>
                {!even && <td className="num"><span className={climb > 0 ? 'up' : climb < 0 ? 'down' : ''}>{signed(climb)}</span></td>}
                <td>
                  <span className="share">
                    <span className="share-track"><span className="share-fill" style={{ width: pct(r.probability), background: color(r.interest), '--i': i }} /></span>
                    <span className="share-text">{pct(r.probability)}{why && <span className="muted"> {why}</span>}</span>
                  </span>
                </td>
                <td className="num"><strong>{r.postsNumber ?? '–'}</strong></td>
              </tr>
            )
          })}
          {half.surprises > 0 && (
            <tr className="row-surprise">
              <td><span className="cell-topic"><i className="dot dot-surprise" />Surprises</span></td>
              <td colSpan={columns} className="muted">random topics</td>
              <td className="num"><strong>{half.surprises}</strong></td>
            </tr>
          )}
        </tbody>
      </table>
      </div>
      <p className="maths-note">
        {even
          ? `Nothing grew this week, so the ${size} posts are split evenly (topics you dislike get none).`
          : follows
            ? 'Nothing grew in the last 30 minutes, so this half copies your week.'
            : <>Share = how much a topic grew ÷ how much all growing topics grew ({rising.map((r) => `${topicLabel(r.interest)} ${signed(r.score - r.scoreThen).replace('+', '')}`).join(' + ')} = {signed(totalClimb).replace('+', '')}). Then rounded to {size} posts.</>}
      </p>
    </div>
  )
}

// both halves of a page, and how they add up
function PageMaths({ page }) {
  const halves = halvesOfPage(page)
  const size = page.limit || PAGE_SIZE
  const surprises = page.posts ? surprisesOf(page) : page.surprises || 0
  const surpriseTopics = page.posts ? [...new Set(page.posts.filter((p) => p.reason === 'surprise').map((p) => p.category))] : []
  const totals = TOPICS.map((t) => ({ ...t, parts: halves.map((h) => h.results.find((r) => r.interest === t.key)?.postsNumber || 0) }))
    .filter((t) => t.parts.some(Boolean))
  return (
    <div className="maths-halves">
      {halves.map((h) => (
        <div key={h.key} className="maths-half">
          <h3 className="maths-title">{HALF[h.key].title}: {h.limit} posts <span className="muted">({HALF[h.key].short})</span></h3>
          <MathsTable half={h} />
        </div>
      ))}
      {halves.length > 1 && (
        <div className="maths-total">
          <h3 className="maths-title">Together: {size} posts</h3>
          <p>
            {totals.map((t, i) => (
              <span key={t.key} className="total-part">
                {i > 0 && <span className="muted"> + </span>}
                <i className="dot" style={{ background: color(t.key) }} />{t.label} <strong>{t.parts.reduce((a, b) => a + b, 0)}</strong>
                <span className="muted"> ({t.parts.join(' + ')})</span>
              </span>
            ))}
            {surprises > 0 && <span className="total-part"><span className="muted"> + </span><i className="dot dot-surprise" />Surprises <strong>{surprises}</strong></span>}
          </p>
          {surprises > 0 && (
            <p className="maths-note">Surprises go to topics you don't see that aren't shrinking, picked at random{surpriseTopics.length ? `: this time ${topicsInWords(surpriseTopics)}` : ''}. Without them, a feed that is all one topic could never change.</p>
          )}
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------- every page of the feed
function PageRow({ page, previousDate, actions, selected, onSelect }) {
  const t = new Date(page.createdAt).getTime()
  const before = actions.filter((a) => a.t < t && a.t >= previousDate)
  // the tiles in the order of the page plan: the week half, the session half, then surprises and fillers
  const order = TOPICS.map((x) => x.key)
  const reasonOrder = REASONS.map((r) => r.key)
  const sorted = [...page.posts].sort((a, b) => reasonOrder.indexOf(reasonOf(a)) - reasonOrder.indexOf(reasonOf(b)) || order.indexOf(a.category) - order.indexOf(b.category))
  const posts = sorted.map((p, i) => ({ topic: p.category, filler: p.reason === 'filler', surpriseSent: p.reason === 'surprise',
    gap: i > 0 && reasonOf(p) !== reasonOf(sorted[i - 1]),
    title: `${topicLabel(p.category)} (${REASONS.find((r) => r.key === reasonOf(p)).label})` }))
  return (
    <li className={`page-row${selected ? ' on' : ''}`}>
      <button className="prow-head" onClick={onSelect} aria-expanded={selected}>
        <span className="page-when"><strong>{timeAgo(page.createdAt)}</strong><span className="muted">{new Date(page.createdAt).toLocaleString(undefined, { weekday: 'short', hour: '2-digit', minute: '2-digit' })}</span></span>
        <PageTiles posts={posts} size="sm" label={`${posts.length} posts`} />
        <span className="page-basis">{basisOf(page.basis).short}</span>
        <span className="page-did muted">{before.length ? `${before.length} ${before.length === 1 ? 'action' : 'actions'} before` : 'no actions before'}</span>
        <Icon name="chevron" size={18} className="page-chev" />
      </button>
      {selected && (
        <div className="page-body">
          <div className="page-col">
            <h3>What you did before this page</h3>
            {!before.length && <p className="muted">Nothing since the page before.</p>}
            <ul className="did-list">
              {before.slice(-8).reverse().map((a) => (
                <li key={`${a.t}-${a.topic}-${a.action}`}>
                  <span className="muted did-time">{new Date(a.t).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}</span>
                  <i className="dot" style={{ background: color(a.topic) }} />
                  <span>{actionWords(a.action)} <span className="muted">about {topicLabel(a.topic)}</span></span>
                  <strong className={a.points > 0 ? 'up' : 'down'}>{signed(a.points)}</strong>
                </li>
              ))}
              {before.length > 8 && <li className="muted">and {before.length - 8} more</li>}
            </ul>
          </div>
          <div className="page-col">
            <h3>The {page.posts.length} posts it sent</h3>
            <ul className="sent-list">
              {page.posts.map((p, i) => p.post && typeof p.post === 'object' && (
                <li key={`${p.post._id}-${i}`}>
                  <i className="dot" style={{ background: color(p.category) }} />
                  <Link to={`/post/${p.post._id}`} className="sent-text">
                    <strong>{fullName(p.post.publisher)}</strong> {(p.post.describtion || 'A picture').slice(0, 90)}{(p.post.describtion || '').length > 90 ? '…' : ''}
                  </Link>
                  {p.reason === 'filler' && <span className="tag" title="This topic ran out of new posts, so the page was filled with the newest other posts">filler</span>}
                  {p.reason === 'surprise' && <span className="tag" title="Picked at random from a topic the page gave nothing, so you can still discover something new">surprise</span>}
                  {p.reason === 'session' && <span className="tag tag-session" title="Picked because of what you did in the 30 minutes before this page">right now</span>}
                </li>
              ))}
            </ul>
          </div>
          <div className="page-col page-col-wide">
            <h3>The maths <span className="muted">(based on {basisOf(page.basis).long})</span></h3>
            <PageMaths page={page} />
          </div>
        </div>
      )}
    </li>
  )
}

// ---------------------------------------------------------------- the page
export default function Insights() {
  const { connected } = useRealtime()
  const [data, setData] = useState(null)
  const [error, setError] = useState('')
  const [refreshing, setRefreshing] = useState(false)
  const [selected, setSelected] = useState(null)        // the _id of the page that is open, null = right now
  const [visible, setVisible] = useState(8)
  const timer = useRef(null)

  const load = useCallback(() => {
    setRefreshing(true)
    return api.insights().then((fresh) => { setData(fresh); setError('') }).catch((problem) => setError(problem.message)).finally(() => setRefreshing(false))
  }, [])
  useEffect(() => { load() }, [load])
  // live: a new point in a score or a new page of the feed (from any tab) reloads the page data
  const later = useCallback(() => { clearTimeout(timer.current); timer.current = setTimeout(load, 500) }, [load])
  useEffect(() => () => clearTimeout(timer.current), [])
  useSocketEvent('interests', later)
  useSocketEvent('feed', later)

  // every scored action in the period, oldest first, with its points
  const actions = useMemo(() => {
    if (!data) return []
    return TOPICS.flatMap((t) => (data.history[t.key] || []).filter((p) => p.action).map((p) => ({ t: new Date(p.date).getTime(), topic: t.key, action: p.action, points: data.rules.scores[p.action] || 0 })))
      .sort((a, b) => a.t - b.t)
  }, [data])

  if (error && !data) return <Page rail={null}><Problem error={error} onRetry={load} /></Page>
  if (!data) return <Page rail={null}><Spinner /></Page>

  const pages = data.deliveries
  const pageDates = data.mixHistory.map((m) => new Date(m.date).getTime())
  const previousOf = (page) => { const t = new Date(page.createdAt).getTime(); return pageDates.filter((d) => d < t).at(-1) ?? 0 }

  return (
    <Page rail={null}>
      <div className={`insights${refreshing ? ' refreshing' : ''}`}>
        <Hero now={data.now} live={connected} />
        <TryIt now={data.now} />
        <HowItWorks now={data.now} recent={[...actions].reverse()} />
        <TopicRows data={data} />

        {/* for the curious: folded away, so the page stays short */}
        <Section className="ins-folds">
          <details className="ins-more">
            <summary><span>The maths</span><span className="muted">the exact numbers behind your next page</span><Icon name="chevron" size={18} /></summary>
            <PageMaths page={{ ...data.now, posts: null }} />
          </details>
          <details className="ins-more">
            <summary><span>Every page we sent you</span><span className="muted">{pages.length} {pages.length === 1 ? 'page' : 'pages'}, with what you did before each one</span><Icon name="chevron" size={18} /></summary>
            {!pages.length ? (
              <Empty title="No pages yet" action={<Link className="btn btn-primary" to="/">Open your feed</Link>}>Open your feed once, then come back here.</Empty>
            ) : (
              <>
                <ul className="pages">
                  {pages.slice(0, visible).map((page) => (
                    <PageRow key={page._id} page={page} previousDate={previousOf(page)} actions={actions}
                      selected={selected === page._id} onSelect={() => setSelected(selected === page._id ? null : page._id)} />
                  ))}
                </ul>
                {visible < pages.length && <button className="btn btn-sm pages-more" onClick={() => setVisible((n) => n + 10)}>Show more pages</button>}
              </>
            )}
          </details>
        </Section>

        <aside className="try-it">
          <span className="try-icon"><Icon name="heart" size={22} /></span>
          <div>
            <h2>See the whole app</h2>
            <p>Upswing is a full social network: posts, comments, communities and chat. Like posts in another tab and this page changes live.</p>
          </div>
          <a className="btn btn-primary" href="/" target="_blank" rel="noreferrer">Open the feed in a new tab</a>
        </aside>
      </div>
    </Page>
  )
}
