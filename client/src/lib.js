// The five topics of the app. The order and the colours are fixed everywhere:
// in the composer, on posts, in the feed mix (and later in the charts).
// posts on one page of the feed (the server uses the same number: PAGE_SIZE in interestsMiddleware.js)
export const PAGE_SIZE = 30

export const TOPICS = [
  { key: 'tech', label: 'Tech' },
  { key: 'sport', label: 'Sport' },
  { key: 'business', label: 'Business' },
  { key: 'politics', label: 'Politics' },
  { key: 'entertainment', label: 'Entertainment' },
]
export const topicLabel = (key) => TOPICS.find((t) => t.key === key)?.label || 'No topic'

export const idOf = (value) => (value && typeof value === 'object' ? String(value._id || value.id || '') : value ? String(value) : '')
export const fullName = (user) => (user ? [user.firstName, user.lastName].filter(Boolean).join(' ') : '')
export const has = (list, id) => (list || []).some((item) => idOf(item) === String(id))

export function timeAgo(value) {
  const then = new Date(value).getTime()
  if (!then) return ''
  const seconds = Math.max(0, Math.round((Date.now() - then) / 1000))
  if (seconds < 60) return 'now'
  const minutes = Math.round(seconds / 60)
  if (minutes < 60) return `${minutes} min`
  const hours = Math.round(minutes / 60)
  if (hours < 24) return `${hours} h`
  const days = Math.round(hours / 24)
  if (days < 7) return `${days} d`
  const date = new Date(then)
  return date.toLocaleDateString(undefined, { day: 'numeric', month: 'short', ...(date.getFullYear() === new Date().getFullYear() ? {} : { year: 'numeric' }) })
}
export const fullDate = (value) => (value ? new Date(value).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' }) : '')
export const count = (n, one, many = `${one}s`) => `${n} ${n === 1 ? one : many}`
export const isImage = (name = '') => /\.(png|jpe?g|gif|webp|avif|svg|bmp)$/i.test(name)
// uploads are stored as "<16 hex characters>-<original name>"
export const originalName = (name = '') => name.replace(/^[0-9a-f]{16}-/, '')
