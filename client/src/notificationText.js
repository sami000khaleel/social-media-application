// What each notification of the server means in words: [text, icon, where it leads]
const post = (n) => `/post/${n.subject.id}`
const community = (n) => `/c/${n.subject.id}`
export const ABOUT = {
  likePost: ['liked your post', 'heart', post],
  createComment: ['commented on your post', 'message', post],
  replyComment: ['replied to your comment', 'reply', post],
  likeComment: ['liked your comment', 'heart', post],
  sharedPost: ['shared your post', 'share', post],
  followUser: ['started following you', 'user', (n) => `/u/${n.subject.id}`],
  membershipRequest: ['asked to join your community', 'users', community],
  addedAdmin: ['made you an admin', 'shield', community],
  removeAdmin: ['removed you as an admin', 'shield', community],
  approvePost: ['approved your post', 'check', community],
  removePost: ['removed your post from a community', 'trash', community],
  newManager: ['made you the manager', 'shield', community],
  memberJoin: ['You joined a community', 'users', community],
  adminOut: ['You are no longer an admin', 'shield', community],
  createPost: ['You published a post', 'edit', post],
  updatePost: ['You edited a post', 'edit', post],
  deletePost: ['You deleted a post', 'trash', null],
  updatePorfile: ['You updated your profile', 'user', () => '/settings'],
}
