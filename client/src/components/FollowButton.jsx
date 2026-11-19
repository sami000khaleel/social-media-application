import { useState } from 'react'
import { api } from '../api.js'
import { useAuth, useFeedback } from '../context.jsx'
import { has, idOf } from '../lib.js'

export default function FollowButton({ userId, small = false, onChange }) {
  const { user, setUser } = useAuth()
  const { attempt } = useFeedback()
  const [busy, setBusy] = useState(false)
  if (idOf(user) === userId) return null
  const following = has(user.followes, userId)
  const click = async () => {
    setBusy(true)
    const result = await attempt(() => api.follow(userId))
    setBusy(false)
    if (!result) return
    const followes = result.following ? [...user.followes, userId] : user.followes.filter((id) => idOf(id) !== userId)
    setUser({ ...user, followes })
    onChange?.(result.following)
  }
  return (
    <button className={`btn ${small ? 'btn-sm' : ''} ${following ? '' : 'btn-primary'}`} onClick={click} disabled={busy}>
      {following ? 'Following' : 'Follow'}
    </button>
  )
}
