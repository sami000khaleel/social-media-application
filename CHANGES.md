# What changed in the backend

The backend is my original code. Every line Claude added or changed has a comment that says **what** changed and **why**, tagged so you can search for it:

| Tag | Meaning | How many |
|---|---|---|
| `[FIX]` | a bug that crashed, hung or gave a wrong result | 91 |
| `[SECURITY]` | a hole that leaked data or let someone do something they should not | 23 |
| `[CHANGED]` | a behaviour change (not a bug) | 64 |
| `[NEW]` | added code | 92 |
| `[AI OFF]` | the AI / Python server code, **commented out, not deleted** | 9 |

Search the whole server folder, for example with `grep -rn "\[SECURITY\]" server` or the search panel of VS Code. Where a line was replaced, the old line is usually kept as a comment right next to it. The original feed code (`sendPosts`, `updateScore`, `calcInterests`) is kept in full as comments.

Removed `console.log` lines that printed debug words (`'asd'`, `'xxxxxxxx'`) or whole users with their password hash are not tagged one by one.

## New files
| File | What |
|---|---|
| `realtime.js` | Socket.IO: live notifications, direct messages, typing, who is online, live interest updates. Replaces the Firebase features. |
| `models/messageSchema.js` | a direct message |
| `controllers/messageRoute.js`, `routes/messageRoute.js` | conversations, messages, unread count (HTTP and socket) |
| `models/feedLogSchema.js` | one row for every page of the feed that was sent, with its whole calculation |
| `controllers/insightsRoute.js` | `GET /api/insights` (the data behind "How my feed works") and `GET /api/feed-mix` (the mix only) |
| `utils/shape.js` | shared helpers: user card fields, public profile, populated post, safe file names |
| `scripts/seed.js`, `seed-content.js`, `seed-images.js` | the demo data |
| `middleware/demoMode.js` | the public demo for recruiters (`DEMO_MODE=true`), see below |
| `../package.json`, `../render.yaml` | one-command setup, build and start from the project folder; the Render blueprint |

## The feed log ("How my feed works")
- `interestsMiddleware.js`: the decision of `calcInterests` moved into `calcMix(interests, now)` and the "shares to whole posts" step into `allocate(results, limit)`, so the feed, the insights page and the seed script all use the same code. Each score point now also saves the `action` that made it.
- `sendPosts` writes a `FeedLog` for every page it sends and announces it over the socket (`feed`).
- The seed script replays the same `calcMix` at each moment in the past, so the 1,400 demo feed pages are exactly what the server would have sent.

## Socket.IO events
Server to client: `notification`, `interests`, `feed`, `message:new`, `message:read`, `typing`, `presence`, `presence:list`.
Client to server: `message:send` (with an answer callback), `message:read`, `typing`.
The socket is opened with `{ auth: { token } }`, and the token is checked the same way as in `verifyToken`.

## The AI feature
All calls to the Python / Flask server on port 5000 are commented out with `[AI OFF]`: post, comment and community classification, `/classify-dialog` and `/classify-text`. The writer of a post now picks its topic. To turn the AI back on, uncomment those blocks (`axios` is still in package.json; `form-data` would need `npm install form-data`).

## The public demo (`DEMO_MODE=true`)
Everything is in `middleware/demoMode.js` and does nothing while `DEMO_MODE` is off (the default).
- `GET /api/demo` lists the demo people (seeded accounts with a `demoStory`). `POST /api/demo/login {userId}` signs in without a password.
- Each sign-in makes a **private copy** of that person (`demoCloneOf` points to the original): same scores, feed pages, follows, communities and pictures. Copies older than 3 hours are deleted together with everything they changed (likes, comment likes, shares, follows, community memberships, notifications). A password sign-in to a demo person (`passwordLogin`, mounted on `/user/login`) also gives a copy, so the originals never change.
- `guard` runs before every `/api` route: a demo account may react (like, dislike, share without own text, follow, join or leave a community) but gets 403 for anything that writes, edits or deletes. Messages are refused in `messageRoute.send` too, because they also go over the socket.
- `autoReset` reloads the seed (`scripts/seed.js --reset` in its own process) when the data is older than `DEMO_RESET_HOURS` or the disk has no `uploaded-files/.seeded-at` marker (a free host that slept starts with an empty disk). The first check runs before the first request; while it runs, `/api/demo` says `preparing` and the sign-in page shows "Getting the demo ready". A scheduled reload waits up to one extra period while a visitor is active.
- New user fields: `demo`, `demoStory`, `demoCloneOf`. `toJSON` only reports `demo: true` while `DEMO_MODE` is on, so the seeded people are normal accounts on your own computer.
- `GET /api/insights/try?topic=` gives up to 3 recent posts of a topic for the **Try it** box.

## One service
`server.js` serves the built React app from `client/dist` (every page that is not `/api` or `/socket.io` gets `index.html`), so the whole project is one Node.js service. It stops with a clear message when `JWT_SECRET` or `DATABASE_URL` is missing, says what to check when the database cannot be reached, and answers `/` with what to do when the web app has not been built yet.

## Pages of 30 and random surprises
- `interestsMiddleware.js`: `PAGE_SIZE = 30` (was 10; `limit` header, at most 50). `makeRoom` takes 1 post in 10 from the biggest topic when some topics got nothing, and `pickSurprises` gives each of those posts to one of the empty topics **at random**. Before, a 100% politics mix could only ever send politics, so the user could never react to anything else and the feed could never change.
- `postsRoute.sendPosts` uses `planPage` + `pickSurprises`, logs those posts with the reason `surprise`, and returns `surprises`. `/api/feed-mix` and `/api/insights` return how many surprises the next page will have (not their topics: those are only picked when the page is sent).
- `feedLogSchema`: `exploreNumber` per topic, reason `'surprise'`.
- The seed builds pages of 30 the same way (with its own seeded random numbers, so every run is the same) and has 24 more posts per topic (42 each), so a page of 30 does not run out.

## Two deployments (optional)
- `CLIENT_URL` (optional): limits CORS for the API and the socket to the front end's address, and sends visitors of the API's address to it.
- The client reads `VITE_API_URL` at build time (`client/src/api.js`); empty means "same address", which is the one-service setup and development.
- `render.two-services.yaml`: the API as a Node.js service and the front end as a static site with a rewrite to `index.html`.

## Half week, half session
- `calcMix` (interestsMiddleware.js) now makes two calculations: the **week** half (last 7 days) and the **session** half (last 30 minutes, was 5 minutes and only used when something happened in it). Each half gets 15 of the 30 posts (`planPage`). A session with nothing climbing follows the week (`followsWeek`); a week with nothing climbing is split evenly between the topics with a score of 0 or more.
- A falling topic never gets posts: the share already used only rising topics (the original used every slope, so a negative one still got posts through `.limit(negative)`), and now surprises also skip falling and disliked topics (`canSurprise`, rounded to whole points so the slow daily decay inside 30 minutes does not count as a fall).
- Feed logs keep both halves (`halves`), and each post has its reason: `week`, `session`, `surprise` or `filler`. `/api/get-posts`, `/api/feed-mix` and `/api/insights` return `halves`, and `mixHistory` counts the reasons.
- The seed builds pages the same way and stops 40 minutes before it runs (longer than a session), so a new sign-in starts with an empty session.

## Activity moved to the moment of sign-in
- New user field `demoTimeAt`: the moment a made-up person's data is "as of" (the seed sets it). `demoMode.freshen` moves every score point and feed page forward by the time since then and sets it to now. It runs for the private copy on a one-click demo sign-in, and on a password sign-in of a made-up person when demo mode is off. Real accounts are never moved.

## One-click sign-in for the seeded people (demo mode off)
- With demo mode off, the sign-in page always shows four made-up people under the form (`client/src/seedAccounts.js`: Lena, Tobias, Sophie, Jonas with their made-up passwords). One click signs in with the password and opens "How my feed works". `GET /api/demo` finds them by email and adds their pictures; if the database has no seed, a click says to run `npm run seed`.
- The sign-in page fits on one screen without scrolling, from a 375 x 667 phone to a 1920 x 1080 screen, with and without demo mode.

## Sign-in page, Home strip and shorter explanations (front end)
- The sign-in page fits on one screen (checked from a 1280 x 600 window up). The form comes first; under it, four made-up people sign in with one click: with their password when demo mode is off, as a private copy when it is on. The big "Open the demo" panel is gone.
- The left side says what the app is (posts, communities, chat), with the feed that explains itself as the one card that stands out, and a small moving picture of the "Right now" row turning to sport.
- After signing in, everyone lands on the feed. Above it, a slim strip ("Why these posts?") with the next 30 posts as tiles and a "How it works" button opens the explanation.
- The explanations are shorter and plainer: "Right now" instead of "This session", "grew" and "shrinking" instead of "climbed" and "falling", one short sentence per row.
- Server: `GET /api/demo` finds the four people by their made-up email (also in a database seeded by an older version) and returns their email in demo mode too.
- The explanation page is shorter: no big charts. "How it works" is one small diagram (three boxes with arrows), "Your topics" is one row per topic with a tiny 7-day line, and the maths and the page history are folded away (click to open). The two line charts, the day-by-day chart and the activity grid are gone.

## New made-up data and a sign-in loader
- `scripts/seed-content.js`: every made-up person has a German name now. The six people with a story keep their place in the list, so their passwords stay the same (Tobias Krause, Sophie Wagner and Anna Schneider take the places of the three renamed ones).
- `scripts/seed.js`: more varied reactions. Every post has an appeal (most are ordinary, a few take off) and some split opinions; people without a story also care a little about other topics; there are dislikes, likes taken back, polite disagreeing comments, likes and dislikes on comments, more shares, and people leaving communities.
- `middleware/demoMode.js`: the one-click demo sign-in also takes the made-up email, so the sign-in page shows its four people at once and can take a click before the server has answered.
- Front end: a loader covers the wait while signing in (the person's picture in a turning ring, what is happening, and after a few seconds that a free server can take up to a minute to wake up).

## Interactions spread 100% evenly (seed rewritten) and pictures that never go missing
- `scripts/seed.js`, how people pick and react to posts, rewritten:
  - **Every post gets exactly the same reactions**: 6 likes, 2 comments, 1 reply, 1 dislike (`EACH_POST`), in the feed and in communities. So every topic gets exactly the same too. Before, a few popular posts took most of the reactions and some got none ("appeal" is commented out).
  - How: in their sessions the people without a story always take one of the posts with the fewest reactions, and give it at most 3 likes, 1 comment, 1 reply and 1 dislike (`IN_SESSION`), so the story people find room on new posts. About a day after a post went up, a top-up (`fill`) brings it to exactly `EACH_POST`.
  - **Every comment gets exactly 2 reactions** (`EACH_COMMENT`), always on the comment with the least so far. A disagreeing comment gets one like and one dislike.
  - **Followers, shares and posts are even too**: everybody has 7 followers (`FOLLOWERS`), every topic has 6 shares, everybody writes 7 to 12 posts, and each topic's posts come evenly over the five weeks, in the hours people are online.
  - **People react to every topic**: the 22 people without a story spread their reactions over all five (favourite topic about 30%, before 70 to 80%). The four story people keep a favourite in front (about half), see new posts of their favourite topic within a few hours (`look`), and like most posts of their second topic, so their feed shows their story with a bit of something else. Checked for all 24 hours of the day the seed can run at.
  - Communities get ten founding members in their first days, so their posts can get the same reactions.
  - Nobody writes about a topic they dislike (Jonas never posts about politics).
- `scripts/seed-content.js`: 16 comments per topic (was 8), 25 replies (was 15), 12 polite disagreements (was 6).
- **Pictures on a free host** (`ENOENT: no such file or directory` on Render): Render wipes its disk when the service sleeps or redeploys, but the database on Atlas keeps the file names. Now every seed picture is drawn from its own file name (`seed-images.js` `fromName`), and the four picture routes go through `utils/sendUpload.js`: a file on the disk is sent as before, a missing seed picture is drawn again, exactly the same, and anything else missing is a clean 404 instead of an error in the log. This also works for the names already in your Atlas database, without reseeding.
