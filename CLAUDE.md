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

## Architecture

This is a **React 18 + Vite 5 + Tailwind CSS 3** SPA deployed to Vercel. It is **fully client-side** — all data lives in `localStorage`, there is no API.

### Storage
Two keys in `localStorage`:
- `lecture-tracker-v1` — array of course objects (each with nested `sessions[]`)
- `lecture-tracker-todos-v1` — array of todo objects

A course object looks like:
```js
{ id, name, totalWeeks, weeklyLectures, weeklyTutorials, sessions, total, watched, createdAt }
```
A session object (nested inside `course.sessions[]`):
```js
{ id, courseId, week, type: 'lecture'|'tutorial', number, watched }
```
Session `number` is **continuous across all weeks** (not reset per week). `course.watched` is a derived count kept in sync in `handleSessionToggle`.

### Navigation & State (App.jsx)
`App.jsx` is the single source of truth. Key state:
- `courses` / `todos` — persisted to localStorage via `useEffect`
- `selectedCourseId` — drives course detail view
- `weekFilter` — `'all'` | `'remaining'` | `<number>` — lifted to App so the bottom nav can control it
- `view` — `'dashboard'` | `'todos'` — controls which top-level page renders

Bottom nav has three tabs: **ראשי** (home/dashboard), **+** (opens CourseWizard modal), **משימות** (todos page).

### Component Map
| File | Role |
|------|------|
| `App.jsx` | State, persistence, routing, `BottomNav` |
| `Dashboard.jsx` | Main view: global stats, `WeeklyProgress`, `WeekPicker`, `TodoPanel`, course cards or filtered session list |
| `CourseDetail.jsx` | Per-course view: progress card, week/type filters, sessions grouped by week |
| `TodosPage.jsx` | Dedicated todos page with stats, add form, status/course filters |
| `TodoPanel.jsx` | Collapsible inline task center embedded in Dashboard, smart-filtered by `weekFilter` |
| `CourseCard.jsx` | Card in the dashboard course grid |
| `CourseWizard.jsx` | Multi-step modal to create a new course |

### RTL / Scrollbar notes
- The entire app is `direction: rtl` (set globally in `index.css`).
- In RTL mode, `scrollLeft` is **0 at the right (start)** and goes **negative** as you scroll left. The `WeekPicker` scrollbar in `Dashboard.jsx` accounts for this: `const scrolled = -el.scrollLeft`.

### Deployment
`vercel.json` at the repo root configures Vercel to build from `frontend/` and rewrite all routes to `index.html` for SPA navigation.

