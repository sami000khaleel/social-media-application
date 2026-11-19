import { useCallback, useEffect, useRef, useState } from 'react'
import Composer from '../components/Composer.jsx'
import PostCard, { PostSkeleton } from '../components/PostCard.jsx'
import { MixPanel, MixStrip } from '../components/FeedMix.jsx'
import { InsightsCard } from '../components/InsightsCta.jsx'
import { useNavigate } from 'react-router-dom'
import { Page, Suggestions } from '../components/Layout.jsx'
import { Empty, PageHead, Problem } from '../components/ui.jsx'
import { api } from '../api.js'
import { PAGE_SIZE, TOPICS } from '../lib.js'
import { useSocketEvent } from '../realtime.jsx'

const PAGE = PAGE_SIZE

export default function Home() {
  const [posts, setPosts] = useState([])
  const [mix, setMix] = useState(null)
  const [state, setState] = useState('loading')        // loading | idle | more | done | error
  const [error, setError] = useState('')
  const navigate = useNavigate()
  const cursors = useRef({})
  const run = useRef(0)

  // lowest sequence number per topic that is already on screen: the server continues below it
  const remember = (list) => list.forEach((post) => {
    if (!post.postCategorySeq) return
    const seen = cursors.current[post.category]
    if (!seen || post.postCategorySeq < seen) cursors.current[post.category] = post.postCategorySeq
  })

  const load = useCallback(async (fresh) => {
    const mine = ++run.current
    if (fresh) cursors.current = {}
    setState(fresh ? 'loading' : 'more')
    try {
      const data = await api.feed(Object.fromEntries(TOPICS.map((t) => [t.key, cursors.current[t.key] || 0])), PAGE)
      if (mine !== run.current) return
      remember(data.posts)
      setMix({ results: data.results, halves: data.halves, basis: data.basis, surprises: data.surprises || 0 })
      setPosts((old) => {
        const known = new Set(fresh ? [] : old.map((p) => p._id))
        return [...(fresh ? [] : old), ...data.posts.filter((p) => !known.has(p._id))]
      })
      setState(data.posts.length < PAGE ? 'done' : 'idle')
    } catch (problem) {
      if (mine !== run.current) return
      setError(problem.message); setState('error')
    }
  }, [])
  useEffect(() => { load(true) }, [load])

  // after a reaction only the mix is asked again, the posts on screen stay where they are.
  // The server also sends "interests" over the socket whenever one of your scores moves
  // (from this tab, another tab or another device), so a short wait joins the two into one request.
  const mixTimer = useRef(null)
  const refreshMix = useCallback(() => {
    clearTimeout(mixTimer.current)
    mixTimer.current = setTimeout(() => {
      api.feedMix().then((data) => setMix({ results: data.results, halves: data.halves, basis: data.basis, surprises: data.surprises || 0 })).catch(() => {})
    }, 250)
  }, [])
  useEffect(() => () => clearTimeout(mixTimer.current), [])
  useSocketEvent('interests', refreshMix)

  // load the next page when the end of the list comes into view
  const sentinel = useRef(null)
  useEffect(() => {
    if (state !== 'idle' || !sentinel.current) return undefined
    const observer = new IntersectionObserver((entries) => { if (entries[0].isIntersecting) load(false) }, { rootMargin: '600px' })
    observer.observe(sentinel.current)
    return () => observer.disconnect()
  }, [state, load])

  const change = (fresh) => setPosts((list) => list.map((p) => (p._id === fresh._id ? fresh : p)))
  const remove = (id) => setPosts((list) => list.filter((p) => p._id !== id))
  const add = (post) => { setPosts((list) => [post, ...list]); refreshMix() }

  return (
    <Page rail={<><MixPanel mix={mix} /><Suggestions /></>}>
      <PageHead title="Home">
        <button className="btn btn-sm" onClick={() => load(true)} disabled={state === 'loading'}>Refresh feed</button>
      </PageHead>
      <MixStrip mix={mix} onOpen={() => navigate('/insights')} />
      <InsightsCard mix={mix} />
      <Composer onPosted={add} />
      {state === 'loading' && <><PostSkeleton /><PostSkeleton /><PostSkeleton /></>}
      {state !== 'loading' && posts.map((post) => (
        <PostCard key={post._id} post={post} onChange={change} onRemove={remove} onReacted={refreshMix} onShared={add} />
      ))}
      {state === 'error' && <Problem error={error} onRetry={() => load(posts.length === 0)} />}
      {state === 'more' && <PostSkeleton />}
      {state === 'idle' && <div ref={sentinel} className="sentinel" />}
      {state === 'done' && (posts.length
        ? <p className="feed-end">You have seen everything. New posts show up here when you refresh.</p>
        : <Empty title="Nothing here yet">Write the first post, or load the demo data with the seed script.</Empty>)}
    </Page>
  )
}
