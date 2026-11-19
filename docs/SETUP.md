# Setup guide

Everything you need to run Upswing on your own computer and to put it online. Written step by step: no experience needed.

[← Back to the README](../README.md)

- [1. Run it on your computer](#1-run-it-on-your-computer)
- [2. Put it online for recruiters](#2-put-it-online-for-recruiters)
- [3. The public demo](#3-the-public-demo-demo_modetrue)
- [4. Demo data](#4-demo-data)

---

## 1. Run it on your computer

This takes about 10 minutes the first time. You type 4 commands in total.

### What you need

1. **Node.js** (version 20 or newer). Download it from [nodejs.org](https://nodejs.org) (the button that says LTS) and install it like any other program.
2. **A MongoDB database.** The easiest is a free one online at [MongoDB Atlas](https://www.mongodb.com/cloud/atlas/register), and you can use the same one later to publish the app. Follow [Get a free MongoDB database](#step-1-get-a-free-mongodb-database) below.
   *If you already have MongoDB installed on your computer, you can skip Atlas and use `mongodb://127.0.0.1:27017/social-app`.*

### Steps

1. **Get the code.** On GitHub click **Code → Download ZIP** and unzip it, or use `git clone`.
2. **Open a terminal in the project folder** (the folder that has `server` and `client` in it).
   - Windows: open the folder, click the address bar, type `cmd` and press Enter.
   - Mac: right-click the folder in Finder → **Services → New Terminal at Folder**.
3. **Make the settings file.** In the `server` folder, make a copy of `.env.example` and name the copy `.env`. Open it in any text editor and change two lines:
   ```
   DATABASE_URL=   ← paste your MongoDB address here
   JWT_SECRET=     ← type any long random text, for example 40 random letters and numbers
   ```
   Save the file. Leave the other lines as they are.
4. **Install everything** (takes 1 to 3 minutes):
   ```bash
   npm run setup
   ```
5. **Fill the database with the made-up people, posts and reactions:**
   ```bash
   npm run seed
   ```
   It prints a table of the demo accounts with their passwords.
6. **Build and start the app:**
   ```bash
   npm run build
   npm start
   ```
7. Open **http://localhost:1000** in your browser. Under the sign-in form, click one of the four made-up people (Lena, Tobias, Sophie or Jonas): you are signed in with one click and land on the feed. You can also type one of the [demo accounts](#4-demo-data) yourself, for example `lena.hoffmann@example.com` with the password `Copper-Orchard-96`.

To stop the app, press **Ctrl + C** in the terminal. Next time you only need `npm start`.

### Working on the code

Instead of steps 6 and 7, use two terminals so changes show up as soon as you save:

```bash
npm run dev:server     # terminal 1: the API on port 1000, restarts when you change a server file
npm run dev:client     # terminal 2: the web app, open http://localhost:5173
```

### If something goes wrong

| What you see | What to do |
|---|---|
| `JWT_SECRET is missing` or `DATABASE_URL is missing` | The file is not called exactly `.env`, or it is not inside the `server` folder. |
| `could not reach the database` | Check the address in `.env`. On Atlas, check the password in the address and that **Network Access** allows your computer. |
| `npm` is not recognised | Node.js is not installed yet, or the terminal was open before you installed it. Close the terminal and open a new one. |
| `The database already has data` when seeding | Run `npm run seed:reset` instead. It **deletes everything** in that database first. |
| The browser shows "The web app is not built yet" | Run `npm run build`, then `npm start` again. |

---

## 2. Put it online for recruiters

There are two ways. Both are free on [Render](https://render.com) with a free MongoDB Atlas database, and both are described in a file Render reads by itself, so there are no build settings to type.

| | **Way 1: one service** (recommended) | **Way 2: two services** |
|---|---|---|
| What runs | One Node.js server that answers `/api` **and** sends the built React app | The API on one address, the React app as a static site on another |
| Blueprint file | `render.yaml` | `render.two-services.yaml` |
| Values you type | `DATABASE_URL` | `DATABASE_URL`, then `VITE_API_URL` (and optionally `CLIENT_URL`) |
| Addresses | One: `https://upswing.onrender.com` | Two: `https://upswing-web.onrender.com` (share this one) and `https://upswing-api.onrender.com` |
| Good | Simplest. No CORS, one link, the socket and the pages share an address | The front end loads instantly from a CDN and never sleeps; front end and back end can be updated separately |
| Less good | The page waits while the free server wakes up | Two things to set up; the page appears fast, but the data still waits for the API to wake up |

For a portfolio demo, **Way 1** is the easier choice. Way 2 is how bigger teams often run it, so it is good to know.

Steps 1 and 2 are the same for both ways.

### Step 1: Get a free MongoDB database

1. Make a free account on [MongoDB Atlas](https://www.mongodb.com/cloud/atlas/register) and create a **free** cluster (the free tier is enough).
2. **Database Access → Add New Database User.** Choose a username and a password with only letters and numbers (special characters would have to be encoded in the address). Write them down.
3. **Network Access → Add IP Address → Allow access from anywhere** (`0.0.0.0/0`). Render does not have a fixed address, so this is needed.
4. **Connect → Drivers.** Copy the address. It looks like this:
   ```
   mongodb+srv://sami:<password>@cluster0.abcde.mongodb.net/?retryWrites=true&w=majority
   ```
   Put your password in place of `<password>`, and add a database name after `.net/`:
   ```
   mongodb+srv://sami:MyPassword123@cluster0.abcde.mongodb.net/upswing?retryWrites=true&w=majority
   ```
   This full line is your `DATABASE_URL`.

### Step 2: Put the code on GitHub

Push the project to a GitHub repository. Your `server/.env` file is **not** uploaded (it is in `.gitignore`), so your password stays private.

### Step 3a: Way 1, publish as one service

1. Sign in to [Render](https://render.com) with your GitHub account.
2. Click **New → Blueprint** and pick the repository.
3. Render reads `render.yaml` and asks for one value: **DATABASE_URL**. Paste the address from Step 1.
4. Click **Apply** (or **Deploy Blueprint**). The first build takes a few minutes.
5. Open the address Render gives you (something like `https://upswing-xxxx.onrender.com`). You should see the sign-in page with four made-up people under the form.

What happens: `npm run build` installs the server and the client and builds the React app into `client/dist`; `npm start` starts Express, which answers `/api` and `/socket.io` and sends `client/dist` for every other address.

### Step 3b: Way 2, publish as two services

1. In the project folder, delete `render.yaml` and rename `render.two-services.yaml` to `render.yaml`. Push to GitHub.
2. On Render: **New → Blueprint**, pick the repository. Render shows two services, **upswing-api** and **upswing-web**.
3. It asks for **DATABASE_URL** (paste it) and **VITE_API_URL**. You do not know the API's address yet, so type `upswing-api.onrender.com` for now. Click **Apply**.
4. When both are deployed, open **upswing-api** in the Render dashboard and copy its address (top left, like `https://upswing-api-ab12.onrender.com`).
5. Open **upswing-web → Environment**, set **VITE_API_URL** to that address, save, then **Manual Deploy → Deploy latest commit**. The front end has to be built again because Vite writes the address into the files when it builds.
6. Optional, for a bit more safety: open **upswing-api → Environment** and set **CLIENT_URL** to the address of upswing-web. Then only your front end may call the API. Opening the API's own address then sends people to the front end.
7. Share the address of **upswing-web**.

The same works on other hosts: the front end is any static host (Netlify, Vercel, Cloudflare Pages: build command `npm install --include=dev && npm run build`, folder `client`, output `dist`, environment variable `VITE_API_URL`; `client/public/_redirects` already sends every page to `index.html` on Netlify), and the API is any Node.js host with `npm install` and `npm start` in `server`.

You do **not** need to run the seed yourself in either way: the demo fills the database by itself the first time it starts.

### Step 4: Share the link

Put the address on your CV, LinkedIn and GitHub profile, and in the live demo link at the top of the README (the line `[live]: ...` at the bottom of `README.md`).

> **Good to know about the free plan.** The free service goes to sleep when nobody has visited for a while. The next visitor waits up to about a minute while it wakes up, then sees "Getting the made-up people ready" for a few seconds while fresh demo data loads. The page carries on by itself; nobody has to click again. If you want the first load to be fast before an interview, open the link yourself a few minutes earlier.

---

## 3. The public demo (`DEMO_MODE=true`)

`render.yaml` turns this on. On your own computer it is off unless you set `DEMO_MODE=true` in `server/.env`.

- **One click, no password.** The sign-in page shows the normal form first, and under it four made-up people, each with a one-line story ("Was into sport, now into tech", "Reads mostly tech"). One click signs the visitor in and opens the feed.
- **Every visitor gets a private copy** of that person, with the same scores, history and feed pages. Two recruiters looking at the same time never see each other's clicks. A copy and everything it changed are removed after 3 hours. Signing in to a demo account with its password from `SEED-ACCOUNTS.md` also gives a private copy.
- **Reacting works, writing is off.** Likes, dislikes, shares, follows and joining communities work, because those are what move the algorithm. Posting, commenting, messaging, editing and deleting are turned off for demo accounts, on the server and in the interface. A visitor can still create their own normal account.
- **Always "just now".** Every made-up person's activity is stored with the moment the seed ran. When someone signs in as one of them (one click, or with the password, also with demo mode off), all their scores and feed pages are moved forward by the time since then. Something Lena did 5 minutes before the seed ran shows as 5 minutes ago, whether you sign in an hour or a week later. Real accounts are never moved.
- **Fresh data.** The demo story is relative to the day it was made ("the last 7 days"), so all data is **deleted and loaded again** every `DEMO_RESET_HOURS` hours (default 6), and whenever the server starts on a fresh disk. A reload waits while someone is looking around.

> ⚠️ Never turn `DEMO_MODE` on with a database that has real data in it: the reload deletes everything.

---

## 4. Demo data

`npm run seed` creates 28 made-up people with German names (emails end in `@example.com`), about 320 posts with generated pictures, about 690 comments, 6 communities, about 150 chat messages, about 1,400 feed pages and about 4,000 tracked reactions spread over the last 5 weeks, all with realistic timestamps. The reactions are varied like on a real network: a few posts take off while most get a handful of likes, some posts split opinions (dislikes and polite disagreement in the comments), people take likes back, like and dislike comments, share, and join and leave communities. It refuses to run on a database that already has data. `npm run seed:reset` **deletes everything** first.

Every account and password is written to `server/SEED-ACCOUNTS.md`. The passwords are the same on every run. Six accounts each show one behaviour of the algorithm:

| Account | Password | What it shows |
|---|---|---|
| lena.hoffmann@example.com | `Copper-Orchard-96` | Was into sport, now into tech |
| tobias.krause@example.com | `Ember-Otter-80` | Reads mostly tech |
| sophie.wagner@example.com | `Cobalt-Thunder-14` | Two interests at once: films, music and business |
| jonas.weber@example.com | `Copper-Orchard-24` | Loves sport, dislikes politics |
| anna.schneider@example.com | `Copper-Compass-46` | Away for 11 days: scores decay, the feed falls back to an even mix |
| nora.lang@example.com | `Amber-Glacier-88` | Brand new, has not liked anything yet |

---

## 5. Real time and browser notifications

One Socket.IO connection per tab gives you:
- live notifications, with the badge updating as they arrive
- direct messages with a typing indicator, "Seen" and who is online
- the feed mix updating as soon as one of your scores changes, even from another tab

While Upswing is open in a tab that is in the background, new messages, likes, comments and followers show up as **browser notifications**. Turn them on from the prompt on the Messages or Notifications page, or in Settings. When you are looking at the page, a small message inside the page is used instead. These are not push notifications: Upswing has to be open in a tab (closed-tab push would need a service worker and a push service).
