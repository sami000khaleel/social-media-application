import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import Icon from '../components/Icon.jsx'
import FollowButton from '../components/FollowButton.jsx'
import { Page } from '../components/Layout.jsx'
import { Empty, PageHead, PersonRow, Problem, Topic, useLoad } from '../components/ui.jsx'
import { api } from '../api.js'
import { useAuth } from '../context.jsx'
import { idOf } from '../lib.js'

export default function Search() {
  const { user } = useAuth()
  const [text, setText] = useState('')
  const [results, setResults] = useState(null)
  const [error, setError] = useState('')
  const everyone = useLoad(() => api.everyone(), [])

  useEffect(() => {
    const query = text.trim()
    if (!query) { setResults(null); setError(''); return undefined }
    let live = true
    const timer = setTimeout(() => {
      api.search(query).then((found) => { if (live) { setResults(found); setError('') } }).catch((problem) => live && setError(problem.message))
    }, 250)
    return () => { live = false; clearTimeout(timer) }
  }, [text])

  const people = results ? results.users : (everyone.data || [])
  return (
    <Page>
      <PageHead title="Search" />
      <div className="search-box">
        <Icon name="search" size={20} />
        <input value={text} onChange={(event) => setText(event.target.value)} placeholder="Search people and communities" autoFocus aria-label="Search people and communities" />
        {text && <button className="icon-btn" onClick={() => setText('')} aria-label="Clear"><Icon name="close" size={16} /></button>}
      </div>
      {error && <Problem error={error} />}
      {results && results.communities.length > 0 && (
        <section className="section">
          <h2>Communities</h2>
          {results.communities.map((c) => (
            <Link key={c._id} to={`/c/${c._id}`} className="result-row">
              <strong>{c.communityName}</strong>
              <span><Topic topic={c.category} /> <span className="muted">{c.membersCount} members</span></span>
            </Link>
          ))}
        </section>
      )}
      <section className="section">
        <h2>{results ? 'People' : 'Everyone on Upswing'}</h2>
        {people.filter((p) => idOf(p) !== idOf(user)).map((person) => <PersonRow key={idOf(person)} user={person}><FollowButton userId={idOf(person)} small /></PersonRow>)}
        {results && !results.users.length && !results.communities.length && <Empty title={`Nothing found for "${text.trim()}"`}>Check the spelling or try a first name.</Empty>}
      </section>
    </Page>
  )
}
