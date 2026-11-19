import { Link, NavLink } from 'react-router-dom'
import Icon from './Icon.jsx'
import { PageTiles } from './charts.jsx'
import { PAGE_SIZE, TOPICS } from '../lib.js'

// the posts of the next page as tiles, in topic order, then the random surprises (the server worked out the numbers)
export function tilesOfPage(results, surprises = 0) {
  if (!results) return []
  return TOPICS.flatMap((t) => {
    const r = results.find((x) => x.interest === t.key)
    return Array.from({ length: r?.postsNumber || 0 }, () => ({ topic: t.key, title: t.label }))
  }).concat(Array.from({ length: surprises }, () => ({ topic: 'surprise', surprise: true, title: 'A surprise: a post from a topic picked at random' })))
}

// the button that asks to be clicked: a ring in the five topic colours turns around it
export function PopButton({ children = 'Show me how my feed works', className = '' }) {
  return (
    <Link to="/insights" className={`cta-pop ${className}`}>
      <Icon name="chart" size={20} />
      <span>{children}</span>
    </Link>
  )
}

// in the side menu
export function InsightsNavLink() {
  return (
    <NavLink to="/insights" className={({ isActive }) => `side-link side-cta${isActive ? ' on' : ''}`}>
      <span className="side-icon cta-ring"><Icon name="chart" size={20} /></span>
      <span className="side-label">How my feed works</span>
    </NavLink>
  )
}

// on top of the home feed: a slim strip with the topics of the next page and the button. It stands out,
// but it is one line above the feed, not the feed itself.
export function InsightsCard({ mix }) {
  const tiles = tilesOfPage(mix?.results, mix?.surprises)
  return (
    <div className="feed-why">
      <div className="feed-why-text">
        <strong>Why these posts?</strong>
        <span>Half follow your week, half follow what you do right now.</span>
      </div>
      <PopButton className="cta-sm">How it works</PopButton>
      {tiles.length > 0 && <PageTiles key={tiles.map((t) => t.topic[0]).join('')} posts={tiles} size="sm" label={`The topics of your next ${PAGE_SIZE} posts`} />}
    </div>
  )
}
