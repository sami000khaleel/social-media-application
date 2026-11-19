import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Modal } from './ui.jsx'
import { TOPICS } from '../lib.js'

const BASIS = {
  split: 'Half your week, half right now',
  week: 'Your week (nothing new right now)',
  even: 'Nothing yet, so every topic gets the same',
}
const HALF_NAMES = { week: 'Your week', session: 'Right now' }
// results: [{ interest, score, value, probability, postsNumber }] straight from GET /api/get-posts
const ordered = (results) => TOPICS.map((topic) => ({ ...topic, ...(results.find((r) => r.interest === topic.key) || { probability: 0, score: 0, value: 0 }) }))
const percent = (p) => `${Math.round(p * 100)}%`

// The thin bar under the page title: how the next page of the feed is split between the topics.
export function MixStrip({ mix, onOpen }) {
  if (!mix) return <div className="mix-strip mix-strip-empty" />
  return (
    <button className="mix-strip" onClick={onOpen} aria-label="How your feed is mixed right now">
      {ordered(mix.results).filter((t) => t.probability > 0).map((t) => (
        <span key={t.key} style={{ flexGrow: t.probability, background: `var(--topic-${t.key})` }} title={`${t.label} ${percent(t.probability)}`} />
      ))}
    </button>
  )
}

export function MixPanel({ mix }) {
  const [open, setOpen] = useState(false)
  if (!mix) return null
  const topics = ordered(mix.results)
  return (
    <section className="rail-block mix">
      <h2>Your feed right now</h2>
      <p className="mix-basis">{BASIS[mix.basis] || BASIS.week}</p>
      {/* one bar per half: the page is half your week and half this session */}
      {(mix.halves || [{ key: 'week', results: mix.results }]).map((half) => {
        const parts = ordered(half.results)
        return (
          <div key={half.key} className="mix-half">
            <span className="mix-half-name">{HALF_NAMES[half.key]}{half.basis === 'followsWeek' ? <span className="muted"> (same as week)</span> : ''}</span>
            <div className="mix-bar" role="img" aria-label={`${HALF_NAMES[half.key]}: ${parts.map((t) => `${t.label} ${percent(t.probability)}`).join(', ')}`}>
              {parts.filter((t) => t.probability > 0).map((t) => (
                <span key={t.key} style={{ flexGrow: t.probability, background: `var(--topic-${t.key})` }} title={`${t.label} ${percent(t.probability)}`} />
              ))}
            </div>
          </div>
        )
      })}
      <ul className="mix-list">
        {topics.map((t) => (
          <li key={t.key} className={t.probability > 0 ? '' : 'off'}>
            <i className="dot" style={{ background: `var(--topic-${t.key})` }} />
            <span>{t.label}</span>
            <strong>{percent(t.probability)}</strong>
          </li>
        ))}
      </ul>
      {mix.surprises > 0 && <p className="mix-note">Plus {mix.surprises} surprise {mix.surprises === 1 ? 'post' : 'posts'}, picked at random.</p>}
      <button className="link" onClick={() => setOpen(true)}>Quick explanation</button>
      <Link to="/insights" className="mix-more">See the full explanation</Link>
      {open && <MixExplained mix={mix} onClose={() => setOpen(false)} />}
    </section>
  )
}

export function MixExplained({ mix, onClose }) {
  const topics = ordered(mix.results)
  const perHour = (v) => { const n = v * 3600; return Math.abs(n) < 0.005 ? '0' : `${n > 0 ? '+' : ''}${n.toFixed(Math.abs(n) < 10 ? 2 : 0)}` }
  return (
    <Modal title="How your feed is mixed" onClose={onClose}>
      <div className="explain">
        <p>Likes, comments, shares and joins give a topic points. A topic you ignore loses 2 points a day.</p>
        <p>We don't show you your biggest topics. We show you the ones that are <em>growing</em>: twice the growth, twice the posts.</p>
        <ol>
          <li>Half of your page follows your week.</li>
          <li>Half follows what you did in the last 30 minutes.</li>
          <li>A shrinking topic gets nothing.</li>
          <li>A few surprise posts come from topics you don't see.</li>
        </ol>
        <p className="mix-basis"><strong>Right now:</strong> {(BASIS[mix.basis] || BASIS.week).toLowerCase()}.</p>
        <table className="mix-table">
          <thead><tr><th>Topic</th><th>Points</th><th>Growth per hour, week</th><th>Growth per hour, right now</th><th>Share</th></tr></thead>
          <tbody>
            {topics.map((t) => (
              <tr key={t.key}>
                <td><i className="dot" style={{ background: `var(--topic-${t.key})` }} />{t.label}</td>
                <td>{Math.round(t.score)}</td>
                <td>{perHour(t.value)}</td>
                <td>{perHour(t.sessionValue || 0)}</td>
                <td>{percent(t.probability)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Modal>
  )
}
