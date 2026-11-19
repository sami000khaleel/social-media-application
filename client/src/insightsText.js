// Plain words for everything the feed algorithm does.
import { topicLabel } from './lib.js'

// what each scored action means, as a short sentence
export const ACTION_WORDS = {
  likePost: 'Liked a post',
  unlikePost: 'Took back a like',
  dislikePost: 'Disliked a post',
  undislikePost: 'Took back a dislike',
  positiveComment: 'Wrote a comment',
  negativeComment: 'Wrote a negative comment',
  viewComments: 'Read the comments',
  likePositiveComment: 'Liked a comment',
  likeNegativeComment: 'Liked a negative comment',
  unlikePositiveComment: 'Took back a comment like',
  unlikeNegativeComment: 'Took back a comment like',
  dislikePositiveComment: 'Disliked a comment',
  dislikeNegativeComment: 'Disliked a negative comment',
  undislikePositiveComment: 'Took back a comment dislike',
  undislikeNegativeComment: 'Took back a comment dislike',
  deletePositiveComment: 'Deleted a comment',
  deleteNegativeComment: 'Deleted a comment',
  sharePost: 'Shared a post',
  createPost: 'Wrote a post',
  deletePost: 'Deleted a post',
  joinCommunity: 'Joined a community',
  leaveCommunity: 'Left a community',
  viewCommunity: 'Visited a community',
  createCommunity: 'Started a community',
  deleteCommunity: 'Deleted a community',
  messages: 'Chatted about it',
  seePostWithDuration1: 'Read a post',
  seePostWithDuration2: 'Read a post',
  seePostWithDuration3: 'Read a post',
}
export const actionWords = (action) => ACTION_WORDS[action] || 'Did something'

// the two halves of every page: half of the posts follow the last 7 days, half follow this session
// (the session half is called "Right now" on screen: plainer than "session")
export const HALF = {
  week: { title: 'Your week', short: 'last 7 days', long: 'what you did in the last 7 days', then: '7 days ago', window: 7 * 864e5 },
  session: { title: 'Right now', short: 'last 30 minutes', long: 'what you did in the last 30 minutes', then: '30 min ago', window: 30 * 60e3 },
}
// what decided a whole page (FeedLog.basis); the old names stay for pages made before the split
export const BASIS = {
  split: { short: 'Week + right now', long: 'half your week, half right now' },
  week: { short: 'Your week', long: 'your week (nothing new right now)' },
  even: { short: 'Even split', long: 'nothing yet, so every topic got the same' },
  trend: { short: 'Last 7 days', long: 'what you did in the last 7 days' },
  momentum: { short: 'Last 5 minutes', long: 'what you did in the last 5 minutes' },
}
export const basisOf = (key) => BASIS[key] || BASIS.week
// rounded first, so a tiny change (−0.02) shows as 0, not as −0
export const signed = (n) => {
  // a small climb keeps one decimal (+0.4), so a topic that climbed a little does not read "0" next to its share
  const r = Math.abs(n) < 1 ? Math.round(n * 10) / 10 : Math.round(n)
  return `${r > 0 ? '+' : r < 0 ? '−' : ''}${Math.abs(r)}`
}

// a list of topics in words: "Tech, Sport and Business"
export function topicsInWords(keys) {
  const names = keys.map(topicLabel)
  return names.length <= 1 ? names.join('') : `${names.slice(0, -1).join(', ')} and ${names.at(-1)}`
}

// One sentence for one half of a page. half: { key, basis, results }
export function explainHalf(half) {
  const rising = half.results.filter((r) => r.weight > 0).sort((a, b) => b.probability - a.probability)
  const top = rising[0]
  const name = top && topicLabel(top.interest)
  if (half.key === 'session') {
    if (half.basis === 'followsWeek' || !top) return 'Nothing new in the last 30 minutes, so this row copies your week.'
    return rising.length === 1
      ? `${name} grew in the last 30 minutes, so this row is all ${name}.`
      : `${name} grew the most in the last 30 minutes, so it gets the most here.`
  }
  if (half.basis === 'even' || !top) return 'Nothing grew this week, so every topic gets the same.'
  return rising.length === 1
    ? `Only ${name} grew this week, so this row is all ${name}.`
    : `${name} grew the most this week, so it gets the most here.`
}

// the note under the summary: a topic with a high score that gets nothing because it is falling
export function fallingNote(halves) {
  const week = halves.find((h) => h.key === 'week')
  const top = week.results.filter((r) => r.weight > 0).sort((a, b) => b.score - a.score)[0]
  // only a topic that gets nothing at all (the session half may still give it posts)
  const posts = (key) => halves.reduce((sum, h) => sum + (h.results.find((r) => r.interest === key)?.postsNumber || 0), 0)
  const big = week.results.filter((r) => r.weight === 0 && r.score > 20 && !posts(r.interest)).sort((a, b) => b.score - a.score)[0]
  if (!big || (top && big.score < top.score * 0.5)) return ''
  return `${topicLabel(big.interest)} has ${Math.round(big.score)} points but is ${big.score < big.scoreThen ? 'shrinking' : 'not growing'}, so it gets nothing. Your feed follows where you are heading, not where you have been.`
}
