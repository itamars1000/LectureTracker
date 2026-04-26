# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

All work happens inside `frontend/`. There is no backend.

```bash
# Install dependencies
npm install --prefix frontend

# Start dev server (port 5173)
npm run dev --prefix frontend

# Production build (output: frontend/dist/)
npm run build --prefix frontend
```

There are no tests or linters configured.

## Local environment setup

Before the dev server will start, copy `frontend/.env.example` to `frontend/.env.local` and fill in the Supabase credentials:

```
VITE_SUPABASE_URL=https://<project-ref>.supabase.co
VITE_SUPABASE_ANON_KEY=<anon-key>
```

The app throws at startup if either variable is missing (`frontend/src/lib/supabase.js`).

## Architecture

**React 18 + Vite 5 + Tailwind CSS 3** SPA deployed to Vercel. All data lives in **Supabase** (PostgreSQL + Auth) — there is no localStorage persistence and no backend process.

### Auth (Google OAuth via Supabase)

- `frontend/src/lib/supabase.js` — single Supabase client, shared across the app.
- Google OAuth is initiated with `supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: window.location.origin } })`. The dynamic `redirectTo` covers both localhost:5173 and the production Vercel URL (both must be listed in Supabase → Authentication → URL Configuration).
- `App.jsx` bootstraps auth with `supabase.auth.getSession()` and listens for changes via `onAuthStateChange`.
- `session` state has three values: `undefined` (still loading) → spinner; `null` (logged out) → `LoginPage`; session object (logged in) → full app.

### Supabase tables & data shape

Three tables, all with `user_id` and Row Level Security (RLS) policies enforcing `auth.uid() = user_id`.

| Table | Key columns |
|-------|-------------|
| `courses` | `id` (uuid PK), `user_id`, `name`, `total_weeks`, `weekly_lectures`, `weekly_tutorials`, `created_at` |
| `sessions` | `id` (uuid PK), `user_id`, `course_id` (FK → courses, ON DELETE CASCADE), `week`, `type` (`lecture`\|`tutorial`), `number`, `watched` |
| `todos` | `id` (uuid PK), `user_id`, `description`, `linked_course_id` (nullable FK), `linked_week`, `done`, `created_at` |

DB columns are **snake_case**; the app re-maps them to **camelCase** inside `loadData()` in `App.jsx` before setting state. All IDs are UUIDs (never integers).

### In-memory data shape (post-assembly)

`courses` state holds an array of assembled objects — sessions are **nested**, not stored separately:

```js
// course object
{ id, name, totalWeeks, weeklyLectures, weeklyTutorials, createdAt, sessions[], total, watched }

// session object (inside course.sessions[])
{ id, courseId, week, type: 'lecture'|'tutorial', number, watched }
```

`course.watched` is a derived count recomputed whenever sessions change. Session `number` is **continuous across all weeks** (not reset per week).

### State & navigation (App.jsx)

`App.jsx` is the single source of truth. Key state:

- `session` — auth session (undefined/null/object)
- `courses` / `todos` — fetched from Supabase on login, cleared on logout
- `selectedCourseId` — drives course detail view
- `weekFilter` — `'all'` | `'remaining'` | `<number>` — lifted to App so the bottom nav can control it
- `view` — `'dashboard'` | `'todos'`

Bottom nav: **ראשי** (home), **+** (CourseWizard modal), **משימות** (todos page).

### Optimistic updates

Every CRUD handler in `App.jsx` follows this pattern:
1. Update React state immediately (UI feels instant).
2. Send the Supabase mutation.
3. On error: revert state (or call `loadData()` to re-fetch truth from DB).

### Component map

| File | Role |
|------|------|
| `App.jsx` | Auth, state, all CRUD handlers, `BottomNav` |
| `LoginPage.jsx` | Google sign-in screen (shown when `session === null`) |
| `Dashboard.jsx` | Global stats, `WeeklyProgress`, `WeekPicker`, `TodoPanel`, course grid or filtered session list |
| `CourseDetail.jsx` | Per-course view: progress card, week/type filters, sessions grouped by week |
| `TodosPage.jsx` | Dedicated todos page with stats, add form, status/course filters |
| `TodoPanel.jsx` | Collapsible inline task center embedded in Dashboard, smart-filtered by `weekFilter` |
| `CourseCard.jsx` | Card in the dashboard course grid |
| `CourseWizard.jsx` | Multi-step modal to create a new course |

### RTL / Scrollbar notes

- The entire app is `direction: rtl` (set globally in `index.css`).
- In RTL mode, `scrollLeft` is **0 at the right (start)** and goes **negative** as you scroll left. The `WeekPicker` scrollbar in `Dashboard.jsx` accounts for this: `const scrolled = -el.scrollLeft`.

### Deployment

`vercel.json` at the repo root configures Vercel to build from `frontend/` and rewrite all routes to `index.html` for SPA navigation. Vercel environment variables (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`) must be set in the Vercel project settings.
