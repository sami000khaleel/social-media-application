import { Navigate, Route, Routes } from 'react-router-dom'
import { useAuth } from './context.jsx'
import Layout from './components/Layout.jsx'
import { Spinner } from './components/ui.jsx'
import Auth from './pages/Auth.jsx'
import Home from './pages/Home.jsx'
import Profile from './pages/Profile.jsx'
import PostPage from './pages/PostPage.jsx'
import Communities from './pages/Communities.jsx'
import Community from './pages/Community.jsx'
import Search from './pages/Search.jsx'
import Notifications from './pages/Notifications.jsx'
import Settings from './pages/Settings.jsx'
import Messages from './pages/Messages.jsx'
import Insights from './pages/Insights.jsx'
import { RealtimeProvider } from './realtime.jsx'

export default function App() {
  const { user, ready } = useAuth()
  if (!ready) return <div className="boot"><Spinner /></div>
  if (!user) {
    return (
      <Routes>
        <Route path="/signup" element={<Auth mode="signup" />} />
        <Route path="*" element={<Auth mode="login" />} />
      </Routes>
    )
  }
  return (
    <RealtimeProvider>
    <Layout>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/search" element={<Search />} />
        <Route path="/communities" element={<Communities />} />
        <Route path="/c/:id" element={<Community />} />
        <Route path="/u/:id" element={<Profile />} />
        <Route path="/post/:id" element={<PostPage />} />
        <Route path="/notifications" element={<Notifications />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="/insights" element={<Insights />} />
        <Route path="/messages" element={<Messages />} />
        <Route path="/messages/:id" element={<Messages />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Layout>
    </RealtimeProvider>
  )
}
