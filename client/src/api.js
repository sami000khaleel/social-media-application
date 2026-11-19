// Every call the app makes to the Express server, in one place.
// Where the server is. Empty (the default): the same address as this page, which is the case when the server
// serves the built app (one deployment) and in development (Vite passes /api on). Two deployments: set
// VITE_API_URL to the server's address when building, e.g. VITE_API_URL=https://upswing-api.onrender.com
const raw = (import.meta.env?.VITE_API_URL || '').trim().replace(/\/$/, '')
export const SERVER = raw && !/^https?:\/\//.test(raw) ? `https://${raw}` : raw
const BASE = `${SERVER}/api`
const TOKEN_KEY = 'upswing.token'

export const token = {
  get: () => { try { return localStorage.getItem(TOKEN_KEY) } catch { return null } },
  set: (value) => { try { localStorage.setItem(TOKEN_KEY, value) } catch { /* private window */ } },
  clear: () => { try { localStorage.removeItem(TOKEN_KEY) } catch { /* private window */ } },
}

export class ApiError extends Error {
  constructor(message, status) { super(message); this.status = status }
}
let onSignedOut = () => {}
export const setSignedOutHandler = (fn) => { onSignedOut = fn }

// The server answers most problems with HTTP 200 and { success: false, err },
// so a response only counts as fine when the body says so too.
async function request(method, path, { query, body, form, headers = {} } = {}) {
  const params = new URLSearchParams()
  Object.entries(query || {}).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') params.append(key, value)
  })
  const init = { method, headers: { ...headers } }
  const saved = token.get()
  if (saved) init.headers.Authorization = `Bearer ${saved}`
  if (form) init.body = form
  else if (body !== undefined) { init.headers['Content-Type'] = 'application/json'; init.body = JSON.stringify(body) }

  let response
  try {
    response = await fetch(`${BASE}${path}${params.toString() ? `?${params}` : ''}`, init)
  } catch {
    throw new ApiError('The server is not reachable. Check that it is running on port 1000.', 0)
  }
  let data = null
  try { data = await response.json() } catch { /* not json */ }
  if (response.status === 401 && saved) onSignedOut()
  if (!response.ok || !data || data.success === false || data.sucess === false) {
    const message = data && typeof data.err === 'string' && data.err ? data.err : `The server could not do that (${response.status}).`
    throw new ApiError(message, response.status)
  }
  return data
}

function formOf(fields, files = [], fileField = 'files') {
  const form = new FormData()
  Object.entries(fields).forEach(([key, value]) => { if (value !== undefined && value !== null && value !== '') form.append(key, value) })
  files.forEach((file) => form.append(fileField, file))
  return form
}
const role = (name) => ({ 'community-role': name })
const justPosts = (items) => (items || []).map((item) => item.postId).filter((post) => post && typeof post === 'object')

export const api = {
  // ---- account
  login: (email, password) => request('POST', '/user/login', { body: { email, password } }),
  // the public demo: which made-up people a visitor can be, and signing in as one of them without a password
  demoInfo: () => request('GET', '/demo'),
  demoLogin: (userId) => request('POST', '/demo/login', { body: { userId } }),
  signup: (fields) => request('POST', '/user/signup', { body: fields }),
  me: () => request('GET', '/user/').then((d) => d.user),
  updateMe: (fields) => request('PATCH', '/user/', { body: fields }).then((d) => d.user),
  uploadPhoto: (kind, file) => request('PATCH', kind === 'cover' ? '/user/cover-image' : '/user/profile-image', { form: formOf({}, [file], 'image') }).then((d) => d.image),
  notifications: () => request('GET', '/user/notifications').then((d) => d.notifications),
  unreadCount: () => request('GET', '/user/notifications', { query: { count: 1 } }).then((d) => d.unread),

  // ---- people
  user: (id) => request('GET', `/user/${id}`).then((d) => d.user),
  follow: (userId) => request('PATCH', '/user/followers', { body: { userId } }),
  followers: (userId) => request('GET', '/followers', { query: { userId } }).then((d) => d.followers),
  following: (userId) => request('GET', '/followes', { query: { userId } }).then((d) => d.followes),
  everyone: () => request('GET', '/users-communities').then((d) => d.users.map((u) => ({ ...u, _id: u.id }))),
  search: (searchQuery) => request('GET', '/search', { query: { searchQuery } }).then((d) => ({
    users: d.results.users.map((u) => ({ ...u, _id: u.id })), communities: d.results.communities,
  })),

  // ---- posts
  // cursors: for every topic the lowest sequence number already on screen
  feed: (cursors, limit = 10) => request('GET', '/get-posts', { query: cursors, headers: { limit: String(limit) } }),
  feedMix: () => request('GET', '/feed-mix'),
  tryPosts: (topic) => request('GET', '/insights/try', { query: { topic } }).then((d) => d.posts),
  insights: (days = 35) => request('GET', '/insights', { query: { days } }),
  post: (postId) => request('GET', '/posts', { query: { postId } }).then((d) => d.post),
  userPosts: (userId) => request('GET', `/posts/get-user-posts/${userId}`).then((d) => d.posts),
  createPost: ({ text, category, files = [], sharedPostId, communityId }) =>
    request('POST', communityId ? '/community/posts' : '/posts', {
      form: formOf({ describtion: text, category, communityId }, files),
      headers: sharedPostId ? { 'shared-post-id': sharedPostId } : {},
    }).then((d) => d.post),
  editPost: (postId, text) => request('PATCH', '/posts', { body: { postId, describtion: text } }).then((d) => d.post),
  deletePost: (postId) => request('DELETE', '/posts', { query: { postId } }),
  like: (postId) => request('PATCH', '/posts/like', { body: { postId } }).then((d) => d.post),
  dislike: (postId) => request('PATCH', '/posts/dislike', { body: { postId } }).then((d) => d.post),
  reactions: (postId) => request('GET', '/posts/likes', { query: { postId } }),

  // ---- comments
  comments: (postId) => request('GET', '/posts/comments', { query: { postId } }).then((d) => d.comments),
  addComment: (postId, content, repliedCommentId) => request('POST', '/comments', { body: { postId, content, repliedCommentId } }).then((d) => d.comment),
  editComment: (commentId, content) => request('PATCH', '/comments', { body: { commentId, content } }).then((d) => d.comment),
  deleteComment: (commentId) => request('DELETE', '/comments', { query: { commentId } }),
  likeComment: (postId, commentId) => request('PATCH', '/comments/likes', { body: { postId, commentId } }).then((d) => d.comment),
  dislikeComment: (postId, commentId) => request('PATCH', '/comments/dislikes', { body: { postId, commentId } }).then((d) => d.comment),

  // ---- direct messages
  conversations: () => request('GET', '/messages/conversations').then((d) => d.conversations),
  thread: (userId, before) => request('GET', `/messages/${userId}`, { query: { before } }),
  sendMessage: (to, text) => request('POST', '/messages', { body: { to, text } }).then((d) => d.message),
  unreadMessages: () => request('GET', '/messages/unread').then((d) => d.unread),

  // ---- communities
  communities: () => request('GET', '/community/list').then((d) => d.communities),
  community: (communityId) => request('GET', '/community', { query: { communityId } }).then((d) => d.community),
  createCommunity: (fields) => request('POST', '/community', { body: { ...fields, adminsId: [] } }).then((d) => d.community),
  communityPosts: (communityId) => request('GET', '/community/get-posts', { query: { communityId } }).then((d) => justPosts(d.posts)),
  pendingPosts: (communityId) => request('GET', '/community/unapproved/get-posts', { query: { communityId } }).then((d) => justPosts(d.posts)),
  approvePost: (communityId, postId) => request('PATCH', '/community/posts', { body: { communityId, postId } }),
  removeCommunityPost: (communityId, postId, as) => request('DELETE', '/community/posts', { query: { communityId, postId }, headers: role(as) }),
  join: (communityId) => request('POST', '/community/members', { body: { communityId } }).then((d) => d.community),
  askToJoin: (communityId) => request('POST', '/community/members/join', { body: { communityId } }).then((d) => d.community),
  cancelAsk: (communityId) => request('DELETE', '/community/members/join', { query: { communityId } }).then((d) => d.community),
  leave: (communityId) => request('DELETE', '/community/members', { query: { communityId } }).then((d) => d.community),
  approveMember: (communityId, joinerId, as) => request('POST', '/community/members/role/join', { body: { communityId, joinerId }, headers: role(as) }).then((d) => d.community),
  declineMember: (communityId, joinerId, as) => request('DELETE', '/community/members/role/join', { query: { communityId, joinerId }, headers: role(as) }).then((d) => d.community),
  removeMember: (communityId, joinerId, as) => request('DELETE', '/community/members/role', { query: { communityId, joinerId }, headers: role(as) }).then((d) => d.community),
  addAdmin: (communityId, userId) => request('POST', '/community/admins', { body: { communityId, adminsId: [userId] } }).then((d) => d.community),
  removeAdmin: (communityId, userId) => request('PATCH', '/community/admins/remove', { body: { communityId, adminsId: [userId] } }).then((d) => d.community),
  resignAdmin: (communityId) => request('DELETE', '/community/admin', { query: { communityId } }).then((d) => d.community),
  togglePublic: (communityId) => request('PATCH', '/community/manager/publicity', { body: { communityId } }).then((d) => d.community),
  toggleApproval: (communityId) => request('PATCH', '/community/manager/post-approval', { body: { communityId } }).then((d) => d.community),
  uploadCommunityCover: (communityId, file) => request('PATCH', '/community/image', { form: formOf({ communityId }, [file], 'image') }).then((d) => d.coverImageName),
  deleteCommunity: (communityId) => request('DELETE', '/community', { query: { communityId } }),
}

// ---- where pictures live
const q = encodeURIComponent
export const urls = {
  avatar: (userId, name) => `${BASE}/user-profile-image/${q(name)}?userId=${userId}`,
  cover: (userId, name) => `${BASE}/user-cover-image/${q(name)}?userId=${userId}`,
  postFile: (postId, name) => `${BASE}/post-file/${q(name)}?postId=${postId}`,
  communityCover: (communityId, name) => `${BASE}/community/image/${q(name)}?communityId=${communityId}`,
}
