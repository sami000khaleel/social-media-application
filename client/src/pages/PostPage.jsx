import { useNavigate, useParams } from 'react-router-dom'
import PostCard from '../components/PostCard.jsx'
import { Page } from '../components/Layout.jsx'
import { PageHead, Problem, Spinner, useLoad } from '../components/ui.jsx'
import { api } from '../api.js'

export default function PostPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { data, error, loading, reload, setData } = useLoad(() => api.post(id), [id])
  return (
    <Page>
      <PageHead title="Post" />
      {loading && !data && <Spinner />}
      {error && <Problem error={error === 'post was not found' ? 'This post does not exist any more.' : error} onRetry={reload} />}
      {data && <PostCard post={data} openComments onChange={setData} onRemove={() => navigate('/')} onShared={() => navigate('/')} />}
    </Page>
  )
}
