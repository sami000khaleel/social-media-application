# Social Media Platform — Backend API

> A production-style Node.js/Express REST API for a social media platform featuring posts, threaded comments, role-based communities, and an AI-powered personalized recommendation engine.

[![Node.js](https://img.shields.io/badge/Node.js-v16%2B-339933?logo=node.js&logoColor=white)](https://nodejs.org)
[![Express](https://img.shields.io/badge/Express-4.18-000000?logo=express&logoColor=white)](https://expressjs.com)
[![MongoDB](https://img.shields.io/badge/MongoDB-Mongoose%206-47A248?logo=mongodb&logoColor=white)](https://www.mongodb.com)
[![JWT](https://img.shields.io/badge/Auth-JWT-black?logo=jsonwebtokens)](https://jwt.io)
[![License](https://img.shields.io/badge/license-ISC-blue)](./LICENSE)

---

## 📖 Table of Contents

- [Overview](#-overview)
- [Key Highlights](#-key-highlights)
- [Tech Stack](#-tech-stack)
- [Architecture](#-architecture)
- [Project Structure](#-project-structure)
- [Features](#-features)
- [The Recommendation Engine](#-the-recommendation-engine)
- [API Overview](#-api-overview)
- [Getting Started](#-getting-started)
- [Environment Variables](#-environment-variables)
- [Security](#-security)
- [Roadmap](#-roadmap)
- [About Me](#-about-me)

---

## 🎯 Overview

This is a **full-featured backend** for a social media platform. It goes far beyond a typical CRUD tutorial project — it implements:

- **A real recommendation algorithm** based on interest scoring with time-decay and derivative-based probability distribution
- **Cascading data integrity** across deeply-related documents (posts → comments → replies → users → communities → shares)
- **Role-based access control** (manager / admin / member) for community management
- **AI integration** for content classification (text & image) and comment sentiment

The project was built as a portfolio piece while preparing for the German job market through the **Chancenkarte (Opportunity Card) visa**.

---

## 🔥 Key Highlights

| | |
|---|---|
| 🧠 **Recommendation engine** | Interest scores with time decay, linear interpolation, and derivative-based weighting per category |
| 🏘 **Community system** | Public/private communities, manager + admin roles, post approval workflow, membership waitlists |
| 🗑 **Cascading deletes** | Deleting a post safely removes its comments, replies, likes, shares, files, and user references |
| 🔐 **JWT authentication** | Access-token auth with bcrypt password hashing and per-route authorization middleware |
| 🤖 **AI-powered classification** | Posts auto-categorized via external AI service (text and image), comments sentiment-scored |
| 📁 **File uploads** | Image uploads with metadata (style, cropping) for posts, profiles, and community covers |
| 🔔 **Event-driven notifications** | Likes, comments, follows, and community activity generate user notifications |

---

## 🛠 Tech Stack

| Layer | Technology |
|-------|-----------|
| **Runtime** | Node.js |
| **Framework** | Express.js |
| **Database** | MongoDB + Mongoose ODM |
| **Authentication** | JWT (`jsonwebtoken`) + `bcrypt` |
| **File Uploads** | Multer |
| **HTTP Client** | Axios (AI service integration) |
| **Math / Algorithms** | `mathjs`, `numeric` |
| **Real-time (planned)** | Socket.io |
| **Tooling** | Nodemon, dotenv |

---

## 🏗 Architecture

The codebase follows a clean **three-layer pipeline** pattern:

```
HTTP Request
    │
    ▼
┌───────────────────────────────────────────────────────┐
│  ROUTES        Declare endpoints, chain middleware    │
└───────────────────────────────────────────────────────┘
    │
    ▼
┌───────────────────────────────────────────────────────┐
│  MIDDLEWARE    Two categories, one purpose:           │
│    • Validation / Authorization (auth, ownership)     │
│    • Side-Effect Handlers (keep related docs in sync) │
└───────────────────────────────────────────────────────┘
    │
    ▼
┌───────────────────────────────────────────────────────┐
│  CONTROLLERS   Produce the final HTTP response        │
└───────────────────────────────────────────────────────┘
```

### Why this pattern?

Real social media operations are **compound** — deleting a post isn't just a `DELETE` query. It requires:

1. Verify the requester is the author *(auth middleware)*
2. Remove the post from the publisher's record *(user side-effect)*
3. Recursively delete all comments and replies *(comment side-effect)*
4. Remove comment references from every commenter's profile *(user side-effect)*
5. Remove likes from every user who liked the post *(user side-effect)*
6. Mark shares of this post as removed *(post side-effect)*
7. Remove the post from the community it belonged to *(community side-effect)*
8. Delete uploaded files from disk *(file side-effect)*
9. Return the deleted post *(controller)*

That entire chain is expressed as a **readable middleware pipeline** in `routes/postsRoute.js`:

```js
router.delete('/', auth.verifyToken,
  postMiddleware.verifyPostAuthor,
  postMiddleware.getPostsList,
  communityMiddleware.removePostsList,
  postMiddleware.getComments,
  commentMiddleware.deleteComments,
  userModelSideEffectHandler.removeLikes,
  userModelSideEffectHandler.removeComments,
  userModelSideEffectHandler.removePosts,
  userModelSideEffectHandler.removeLikedPosts,
  postModelSideEffectHandler.removePostsFromOgShares,
  postModelSideEffectHandler.removePostsFromShares,
  postModelSideEffectHandler.deleteFiles,
  postMiddleware.deletePosts,
  postController.sendPost
);
```

---

## 📁 Project Structure

```
├── controllers/           # Final HTTP response handlers
│   ├── userRoute.js
│   ├── postsRoute.js
│   ├── commentsRoute.js
│   ├── communityRoute.js
│   └── notificationRoute.js
│
├── middleware/            # Validation, auth, side effects
│   ├── authentication.js
│   ├── postMiddleware.js
│   ├── postModelSideEffecthandler.js
│   ├── userMiddleware.js
│   ├── userModelSideEffectHandler.js
│   ├── commentMiddleware.js
│   ├── commentModelSideEffectHandler.js
│   ├── communityMiddleware.js
│   └── interestsMiddleware.js   ← recommendation engine
│
├── models/                # Mongoose schemas
│   ├── userSchema.js
│   ├── postSchema.js
│   ├── commentSchema.js
│   ├── communitySchema.js
│   └── notificationSchema.js
│
├── routes/                # Express route definitions
│   ├── rootRoute.js
│   ├── userRoute.js
│   ├── postsRoute.js
│   ├── commentsRoute.js
│   └── communityRoute.js
│
├── uploaded-files/        # Runtime uploads (gitignored)
├── server.js              # App entry point
├── .env.example
└── package.json
```

---

## ✨ Features

### 👤 Users
- Sign up & login with JWT + bcrypt
- Profile and cover image uploads with style metadata
- Follow / unfollow with block checks
- Block / unblock users and communities
- Personalized interest profile across 5 categories

### 📝 Posts
- Create, update, delete posts with image attachments
- Like / dislike reactions
- Share / re-share posts (with reference tracking)
- Community posts with manager/admin approval workflow
- AI-based content classification (text → category, image → category)
- Personalized feed with sequential pagination per category

### 💬 Comments
- Threaded comments with unlimited nesting
- Recursive tree deletion
- Like / dislike reactions with score updates
- AI-based sentiment detection (`badComment` flag)
- Auto-moderation: posts flagged when ≥50% of comments are bad

### 🏘 Communities
- Public and private communities
- Manager + multiple admins + members
- Post approval toggle per community
- Membership requests with waitlist
- Block/unblock users per community
- Cover image management

### 🔔 Notifications
- Event-driven: likes, comments, replies, shares, follows, community actions
- Mark-as-read on retrieval
- Force-fetch mode for admin/debug

---

## 🧠 The Recommendation Engine

Located in `middleware/interestsMiddleware.js`, this is the most technically interesting part of the project.

### How it works

Every user has an **interest profile** across categories (business, tech, entertainment, sport, politics). Each interaction adjusts their score:

```js
const actionsScores = {
  createPost: 15,  sharePost: 20,  likePost: 3,
  positiveComment: 5,  negativeComment: -5,
  joinCommunity: 22,  leaveCommunity: -14,
  deletePost: -6,  dislikePost: -4,
  // ... 30+ actions
};
```

Scores are stored with timestamps. When the feed is requested:

1. **Time decay** — scores drift toward zero over days (`calcNewLast`)
2. **Linear interpolation** — compute the score at any past moment between recorded points (`calcPoint` via `findValue`)
3. **Derivative calculation** — estimate the rate of change per category over the last 5 minutes
4. **Probability distribution** — normalize all derivatives to sum to 1
5. **Feed composition** — request `limit × probability` posts from each category

```js
// Simplified excerpt from calcInterests
const derivative = (newLastPoint.score - pointI.yi) /
                   (newLastPoint.date.getTime() - pointI.xi) * 1000;

derivatives.push({ value: derivative, interest });

// ...normalize
let totalSum = derivatives.reduce((sum, obj) => sum + obj.value, 0);
derivatives.forEach(obj => obj.probability = (obj.value / totalSum).toFixed(1));
```

The result is a **dynamic feed** that reacts to what the user actually engages with, weighted by *how recently and how strongly* they engaged.

---

## 🔌 API Overview

| Prefix | Purpose |
|--------|---------|
| `/api` | Feed, search, AI classification, file serving |
| `/api/user` | Auth, profile, follows, blocks, notifications |
| `/api/posts` | Posts, likes, shares, comments |
| `/api/comments` | Comment CRUD & reactions |
| `/api/community` | Communities, members, roles, images |

**Authentication**: All protected routes require `Authorization: Bearer <token>`.

### Example endpoints

<details>
<summary><b>Authentication</b></summary>

```http
POST   /api/user/signup                 # Register
GET    /api/user/login?email=...        # Login (password in header)
GET    /api/user                        # Get current user
PATCH  /api/user                        # Update profile
PATCH  /api/user/profile-image          # Upload profile picture
PATCH  /api/user/cover-image            # Upload cover picture
PATCH  /api/user/followers              # Follow / unfollow
PATCH  /api/user/block                  # Block / unblock user
```
</details>

<details>
<summary><b>Posts & Feed</b></summary>

```http
GET    /api/get-posts                   # Personalized feed
POST   /api/posts                       # Create post
GET    /api/posts?postId=...            # Get one post
PATCH  /api/posts                       # Update description
PATCH  /api/posts/like                  # Like / unlike
PATCH  /api/posts/dislike               # Dislike / undislike
DELETE /api/posts?postId=...            # Cascade delete
GET    /api/posts/comments              # Get comments tree
```
</details>

<details>
<summary><b>Communities</b></summary>

```http
POST   /api/community                    # Create
GET    /api/community?communityId=...    # Get details
POST   /api/community/members            # Join public
POST   /api/community/members/join       # Request to join private
PATCH  /api/community/admins             # Add admins
PATCH  /api/community/manager            # Switch manager
PATCH  /api/community/manager/publicity  # Toggle public/private
PATCH  /api/community/posts/approve      # Approve pending post
```
</details>

---

## 🚀 Getting Started

### Prerequisites

- **Node.js** v16 or newer
- **MongoDB** (local instance or MongoDB Atlas)
- **AI classification service** running on `http://127.0.0.1:5000` — used for automatic post categorization and comment sentiment analysis

### Installation

```bash
git clone https://github.com/<your-username>/social-media-backend.git
cd social-media-backend
npm install
```

### Run

```bash
# Development (with auto-reload)
npm start

# Production
node server.js
```

The API will be available at `http://localhost:1000`.

---

## 🔐 Environment Variables

Create a `.env` file in the project root:

```env
DATABASE_URL=mongodb://localhost:27017/socialmedia
JWT_SECRET=change_me_to_a_long_random_string
PORT=1000
AI_SERVICE_URL=http://127.0.0.1:5000
```

---

## 🔒 Security

This project intentionally implements several security best practices:

- **Passwords** hashed with bcrypt (10 rounds) — never stored in plaintext
- **JWT-based sessions** with a configurable secret
- **Authorization middleware** verifies ownership before any mutation
- **Role checks** for every community action
- **Blocked-user checks** before follow operations
- **Input sanitization** on profile updates (email regex validation)

> ⚠️ This is a learning project. For production, additional hardening is required — see [Roadmap](#-roadmap).

---

## 🗺 Roadmap

- [ ] **Automated tests** — Jest + Supertest for controllers and the recommendation engine
- [ ] **Request validation** — Joi or Zod schemas on every endpoint
- [ ] **Global error handling** — `AppError` class + centralized error middleware
- [ ] **Rate limiting** — `express-rate-limit` on auth endpoints
- [ ] **Security headers** — Helmet
- [ ] **CORS whitelist** — replace wildcard origin
- [ ] **TypeScript migration** — better type safety across models and middleware
- [ ] **Dockerization** — `Dockerfile` + `docker-compose` for one-command startup
- [ ] **API documentation** — Swagger / OpenAPI
- [ ] **Real-time updates** — activate Socket.io for live notifications
- [ ] **MongoDB transactions** — atomic multi-document operations for cascading deletes

---

## 👨‍💻 About Me

I'm a **junior web developer based in Germany**, actively looking for a full-time backend or full-stack role.

I'm here through the **Chancenkarte (Opportunity Card) visa** and excited to join a team where I can grow, ship real features, and learn from experienced engineers.

**What I bring:**
- Hands-on experience building non-trivial backend systems (not just tutorials)
- Comfort with MongoDB data modeling, authentication, and middleware architecture
- Curiosity for algorithms and clean code structure
- A strong drive to learn German engineering culture and best practices

**Let's connect:**

- 📧 Email: [sami000khaleel@gmail.com]
- 💼 LinkedIn: [linkedin.com/in/your-handle]
- 🐙 GitHub: [https://github.com/sami000khalee]

If you're hiring junior developers, know of an opportunity, or just want to give feedback on this project — I'd love to hear from you.

---

## 📄 License

This project is licensed under the **ISC License**.

---

⭐ **If this project helped you or caught your interest, a star is always appreciated.**
