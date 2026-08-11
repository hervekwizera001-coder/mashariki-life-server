# Mashariki Life — Backend API + Admin Dashboard

A Node.js/Express backend built for the `east-africa-nexus` (Mashariki Life) frontend.
It ships with:

- **Public REST API** serving all the content that's currently hardcoded in `src/lib/content.ts`
  (companies, divisions, news, jobs, team, partners, timeline, stats, product categories, solution sectors)
- **Contact form endpoint** (`POST /api/contact`) so the Contact page can actually deliver messages
- **Careers application endpoint** (`POST /api/careers/:slug/apply`) with resume upload (PDF/DOC/DOCX)
- **Admin dashboard** at `/admin` — login-protected UI to edit every piece of site content and view
  contact messages / job applications
- **SQLite database** (zero setup, single file, no external DB server needed)

---

## 1. Run it locally

Requires Node.js 18+.

```bash
cd server
npm install
npm run seed      # creates data.sqlite and loads it with your current site content + a default admin user
npm start         # starts the API on http://localhost:4000
```

You'll see:

```
Mashariki Life API running on http://localhost:4000
Admin dashboard: http://localhost:4000/admin
```

**Default admin login:** `admin` / `ChangeMe123!` — change this immediately (see below).

Copy `.env.example` to `.env` and adjust as needed:

```
PORT=4000
JWT_SECRET=change-this-to-a-long-random-string     # required — use a long random value in production
FRONTEND_ORIGIN=http://localhost:3000,http://localhost:5173   # your frontend dev/prod URLs, comma-separated
ADMIN_USERNAME=admin
ADMIN_PASSWORD=ChangeMe123!
```

`ADMIN_USERNAME`/`ADMIN_PASSWORD` only take effect the **first** time you run `npm run seed`
(when the `admin_users` table is empty). To change the password later, log into `/admin` →
Settings → Change password.

---

## 2. Connect the frontend

Your frontend currently reads static arrays from `src/lib/content.ts`. You have two options:

### Option A — Quick win: wire up just the forms (recommended first step)

Leave `content.ts` as-is (it's fast and needs no network round-trip), but make the **Contact** and
**Careers** pages actually submit to the server, since right now they only fake success locally.

In `src/routes/contact.tsx`, replace the fake submit handler:

```tsx
const API_URL = import.meta.env.VITE_API_URL || "http://localhost:4000";

async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
  e.preventDefault();
  const form = new FormData(e.currentTarget);
  const res = await fetch(`${API_URL}/api/contact`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name: form.get("name"),
      email: form.get("email"),
      company: form.get("company"),
      phone: form.get("phone"),
      enquiryType: form.get("enquiryType"),
      message: form.get("message"),
    }),
  });
  if (res.ok) setSent(true);
}
```

(Give the `<form>` and its fields `name` attributes matching the keys above — currently the fields
aren't named consistently, so add `name="message"` etc. where missing.)

For job applications on the Careers page, POST a `multipart/form-data` request (so the resume file
comes through) to `POST /api/careers/:slug/apply` with fields `name`, `email`, `phone`,
`coverLetter`, and a file field named `resume`.

Add `VITE_API_URL=http://localhost:4000` to a `.env` file in the frontend project root, and the
production URL once deployed (e.g. `VITE_API_URL=https://api.yourdomain.com`).

### Option B — Full dynamic content (so the Admin Dashboard actually controls the site)

Replace the static arrays in `content.ts` with fetches to the API, e.g.:

```ts
// src/lib/api.ts
const API_URL = import.meta.env.VITE_API_URL || "http://localhost:4000";

export async function getNews() {
  const res = await fetch(`${API_URL}/api/news`);
  return res.json();
}
export async function getJobs() {
  const res = await fetch(`${API_URL}/api/jobs`);
  return res.json();
}
// ...same pattern for /api/companies, /api/divisions, /api/team,
// /api/partners, /api/timeline, /api/stats, /api/solution-sectors,
// /api/product-categories
```

Then in each route (e.g. `src/routes/news.tsx`), use a TanStack Query loader or `useEffect` to call
these instead of importing from `content.ts`. This is the option that makes the Admin Dashboard
meaningful — anything you edit there will show up on the live site without a code deploy.

Full public API reference:

| Method | Path | Returns |
|---|---|---|
| GET | `/api/stats` | homepage stat counters |
| GET | `/api/divisions` | business divisions |
| GET | `/api/companies` | group companies |
| GET | `/api/companies/:slug` | one company |
| GET | `/api/solution-sectors` | sectors served |
| GET | `/api/product-categories` | product category names |
| GET | `/api/team` | team members |
| GET | `/api/news` | news list |
| GET | `/api/news/:slug` | one article |
| GET | `/api/jobs` | open jobs |
| GET | `/api/jobs/:slug` | one job |
| GET | `/api/partners` | partner brand names |
| GET | `/api/timeline` | company timeline |
| POST | `/api/contact` | submit contact form |
| POST | `/api/careers/:slug/apply` | submit job application (multipart, field `resume`) |

---

## 3. Using the Admin Dashboard

Visit **`http://localhost:4000/admin`** (or `https://your-api-domain/admin` once deployed).

- Log in with the admin credentials from `.env` / seed step
- **Content** section: add/edit/delete Companies, Divisions, Solution Sectors, Product Categories,
  Team, News, Jobs, Partners, Timeline, Stats
- **Inbox**: read contact form messages and job applications (with resume download links), mark as
  read, or delete
- **Settings**: change the admin password

The dashboard talks to `/api/admin/*`, protected by a JWT bearer token issued at login (stored in
the browser's localStorage, expires after 12 hours).

> Note: editing content here only changes what the *API* returns. It will only appear on your live
> site once the frontend is wired to fetch from the API (see Option B above). If you're only using
> Option A, the dashboard is still useful for triaging contact messages and applications.

---

## 4. Deployment notes

- The API is a standard Express app — deploy it anywhere that runs Node (Render, Railway, Fly.io,
  a VPS, etc.). It uses SQLite (a single `data.sqlite` file), so make sure your host has a
  **persistent disk** — don't deploy to a purely ephemeral filesystem (e.g. some serverless
  platforms) or your data will vanish on redeploy.
- Set real environment variables in production: a strong random `JWT_SECRET`, your real
  `FRONTEND_ORIGIN` (your deployed site's URL, for CORS), and a strong `ADMIN_PASSWORD` before the
  first seed.
- Put the API behind HTTPS (via your host or a reverse proxy like Nginx/Caddy) — the JWT token is a
  bearer credential and shouldn't travel over plain HTTP in production.
- Uploaded resumes are stored under `uploads/resumes/` and served statically at `/uploads/resumes/…`.
  Back this directory up along with `data.sqlite`.
- If you deploy the frontend and API on different domains, double check `FRONTEND_ORIGIN` in `.env`
  includes the exact deployed frontend origin, or the browser will block the requests via CORS.

---

## 5. Project structure

```
server/
├── index.js              # Express app entrypoint
├── db/
│   ├── index.js          # SQLite connection + schema (auto-created on boot)
│   └── seed.js            # loads your existing content.ts data + default admin user
├── middleware/
│   └── auth.js            # JWT verification for /api/admin/*
├── routes/
│   ├── public.js          # read-only content endpoints
│   ├── submissions.js     # contact form + job applications
│   └── admin.js            # login + CRUD for all content types
├── public/admin/          # the admin dashboard (plain HTML/CSS/JS, no build step)
├── uploads/resumes/       # uploaded resume files
└── data.sqlite            # the database (created after `npm run seed`)
```
