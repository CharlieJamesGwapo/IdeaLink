# Group A — Bug Cleanup Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix four April-21 bugs in IdeaLink: homepage announcement placement, slow registrar/accounting eye-icon, delayed/sluggish user announcement notifications, and silently-failing email delivery.

**Architecture:** Frontend changes follow existing React/TS patterns (hooks, optimistic state, `sonner` toasts). Backend adds one new Postgres table (`email_logs`) plus one additive endpoint (`GET /api/admin/email-logs`); the mailer grows an audit-writing wrapper and starts propagating errors instead of swallowing them. The homepage reorder is a pure JSX move.

**Tech Stack:** React 18 + TypeScript + Vite + react-router-dom v6 + Tailwind + sonner (frontend). Go 1.21 + Gin + database/sql + Postgres (backend). SMTP via `net/smtp` + TLS.

**Spec:** `docs/superpowers/specs/2026-04-25-group-a-bug-cleanup-design.md` (commit `11b9a44`).

**Verification convention:** This project verifies UI work manually in the browser. Where Go unit tests add real safety (mailer audit, repo logic), include them. Do not add React Testing Library infrastructure — none exists today.

**Correction to spec:** Spec item B2 #3 ("remove redundant second `MarkAsRead()` call in `suggestion_service.go:132,135`") was based on an incorrect reading. The two `MarkAsRead` calls are on different branches of an if-statement (early-return for already-reviewed vs. post-update), so each call path runs it exactly once. **Task 3 omits this step.**

---

## Implementation order

1. **Task 1 — B3** Homepage announcement placement (smallest, most visible win)
2. **Task 2 — B2** Optimistic eye-icon on Registrar + Accounting
3. **Task 3 — B1.1** Extract `useGlobalPoll` hook + refactor `NotificationBell`
4. **Task 4 — B1.2** Announcement polling + optimistic mark-seen + stale-check
5. **Task 5 — F4.1** Migration 013: `email_logs` table
6. **Task 6 — F4.2** `EmailLogRepo`
7. **Task 7 — F4.3** Wrap mailer with audit + remove swallow
8. **Task 8 — F4.4** Propagate password-reset failure to HTTP (501/502)
9. **Task 9 — F4.5** Frontend: `ForgotPasswordPage` honest about failures
10. **Task 10 — F4.6** Backend: `GET /api/admin/email-logs`
11. **Task 11 — F4.7** Frontend: `AdminEmailLogs` page + route + dashboard link

Each task ends with a commit. Tasks are independent — a failure in one does not block the others.

---

## File Structure

**Created files:**

| Path | Responsibility |
|---|---|
| `backend/internal/migrations/013_email_logs.sql` | Postgres DDL for the new audit table |
| `backend/internal/repository/email_log_repo.go` | SQL access for `email_logs` (Record, List) |
| `backend/internal/services/mail/audit.go` | Audit wrapper around `Sender`; writes to `email_logs` |
| `backend/internal/services/mail/mail_test.go` | Unit tests for the audit wrapper |
| `frontend/src/hooks/useGlobalPoll.ts` | Shared 30s tick hook for frontend pollers |
| `frontend/src/api/adminEmailLogs.ts` | Axios client for the email-logs API |
| `frontend/src/pages/admin/AdminEmailLogs.tsx` | Admin page rendering the logs table |

**Modified files:**

| Path | Change |
|---|---|
| `backend/internal/migrations/migrations.go` | Register `EmailLogsSQL` embed var |
| `backend/internal/config/db.go` | Run the new migration on boot |
| `backend/internal/services/interfaces.go` | Add `Mailer` interface if missing; add `EmailLogRecorder` |
| `backend/internal/services/auth_service.go:290-292` | Return mailer error; distinguish `ErrNotConfigured` |
| `backend/internal/services/user_provisioning.go:147-154` | Call audit-wrapped mailer (error semantics unchanged) |
| `backend/internal/handlers/auth.go:175-187` | Map `ErrNotConfigured`→501, real send failure→502 |
| `backend/internal/handlers/admin_email_logs.go` (new handler) | GET /api/admin/email-logs |
| `backend/cmd/main.go` | Wire repo + handler + route; build audit-wrapped mailer |
| `frontend/src/components/shared/NotificationBell.tsx:15-40` | Replace local `setInterval` with `useGlobalPoll` |
| `frontend/src/hooks/useAnnouncements.ts` | Add poll tick + `lastFetchedAt` + `ensureFresh()` helper |
| `frontend/src/hooks/useAnnouncementUnread.ts` | Replace hand-rolled timer with `useGlobalPoll`; toast on mark-seen failure |
| `frontend/src/pages/user/AnnouncementsPage.tsx` | Call `ensureFresh()` before rendering the list |
| `frontend/src/api/announcements.ts` | No functional change (verify exports unchanged) |
| `frontend/src/pages/public/ForgotPasswordPage.tsx:13-29` | Toast on 502 with the spec's failure copy |
| `frontend/src/pages/registrar/RegistrarSuggestions.tsx:63-71` | Optimistic update + toast on failure |
| `frontend/src/pages/accounting/AccountingSuggestions.tsx:62-71` | Same optimistic pattern |
| `frontend/src/pages/public/HomePage.tsx:385-418, 420-484` | Move Announcements `<section>` to right after Hero |
| `frontend/src/router.tsx:21-25` | Add `AdminEmailLogs` lazy import + route |
| `frontend/src/pages/admin/AdminDashboard.tsx:274-290` | Add "Email Logs" link to the Quick Actions grid |

---

## Task 1: B3 — Move Announcements section on homepage

**Files:**
- Modify: `frontend/src/pages/public/HomePage.tsx` (section at lines 385-418 is moved to sit right after the Hero section that closes at line 248)

- [ ] **Step 1: Open HomePage.tsx and locate the three landmarks**

Run: `grep -n "ANNOUNCEMENTS\|TESTIMONIALS\|scroll-mt-28 py-20 bg-ascb-navy-dark\|Scroll indicator\|ABOUT IDEALINK" frontend/src/pages/public/HomePage.tsx`

Expected: Hero ends around line 248 (right after `{/* Scroll indicator */}` closing `</section>`). Announcements comment `{/* ─── ANNOUNCEMENTS ─── */}` near line 385. About section starts near line 250 with `{/* ─── ABOUT IDEALINK (the system) ─── */}`.

- [ ] **Step 2: Cut the Announcements section (lines ~385-418) — the entire `{/* ─── ANNOUNCEMENTS ─── */}` comment + `<section>...</section>` block**

Before:
```tsx
      {/* Scroll indicator */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 ... animate-bounce" />
      ...
      </section>

      {/* ─── ABOUT IDEALINK (the system) ─── */}
      <section id="about" ...>
        ...
      </section>
      ...
      {/* ─── ANNOUNCEMENTS ─── */}
      <section id="announcements" ref={announcementsRef.ref} className={`scroll-mt-28 py-20 bg-ascb-navy-dark ...`}>
        ... (full block, ~33 lines)
      </section>

      {/* ─── TESTIMONIALS ─── */}
```

After (Announcements moved up, About unchanged below it):
```tsx
      ...
      </section>  {/* close of Hero */}

      {/* ─── ANNOUNCEMENTS ─── */}
      <section id="announcements" ref={announcementsRef.ref} className={`scroll-mt-28 py-20 bg-ascb-navy-dark ...`}>
        ... (full block, ~33 lines)
      </section>

      {/* ─── ABOUT IDEALINK (the system) ─── */}
      <section id="about" ...>
        ...
      </section>
      ...
      {/* ─── TESTIMONIALS ─── */}
```

Use Read with offset=240 limit=10 to confirm the Hero closing `</section>` line, then use Edit to:
1. First Edit: delete the `{/* ─── ANNOUNCEMENTS ─── */}` block (comment + `<section>...</section>`) from its current location.
2. Second Edit: insert the same block immediately after the Hero's closing `</section>` on line ~248, before `{/* ─── ABOUT IDEALINK (the system) ─── */}`.

- [ ] **Step 3: Type check the frontend**

Run: `cd frontend && npm run build`

Expected: Build succeeds with no TS errors. If you see "announcementsRef is not defined" or similar, the ref hook is still declared higher up in the component — it is not moving, only its JSX use is.

- [ ] **Step 4: Visual verification in the browser**

Run:
```bash
cd frontend && npm run dev
```
Open `http://localhost:5173/` (or whichever port Vite prints). Confirm section order top-to-bottom:
1. Hero (headline + "Scroll" indicator)
2. **Announcements** (orange "Latest Updates" badge)
3. About IdeaLink
4. Our Foundation / Philosophy / Vision / Mission
5. Core Values (`#values`)
6. Institutional Goals (`#goals`)
7. How It Works (`#how-it-works`)
8. Testimonials (`#testimonials`)

Click the header anchors: `#announcements` must scroll to the repositioned section; `#values`, `#goals`, `#how-it-works`, `#testimonials` must still highlight correctly as you scroll past them. (Scrollspy reads DOM order — order-agnostic — so it should Just Work.)

- [ ] **Step 5: Commit**

```bash
git add frontend/src/pages/public/HomePage.tsx
git commit -m "$(cat <<'EOF'
feat(home): move announcements above fold, right after hero

Announcements are time-sensitive ("we're closed today") and were buried
six sections deep. Now they render immediately after the hero so users
see them without scrolling through About / Foundation / Values / Goals.

Part of Group A bug cleanup (B3). Spec: docs/superpowers/specs/2026-04-25-group-a-bug-cleanup-design.md
EOF
)"
```

---

## Task 2: B2 — Optimistic eye-icon on Registrar + Accounting

**Files:**
- Modify: `frontend/src/pages/registrar/RegistrarSuggestions.tsx:63-71`
- Modify: `frontend/src/pages/accounting/AccountingSuggestions.tsx:62-71`

The two pages are near-identical copies of the same `handleOpen` pattern. Both await the API before updating local state. We invert the order: flip local state first, fire the API in the background, revert + toast on failure.

- [ ] **Step 1: Update Registrar's `handleOpen` to optimistic**

File: `frontend/src/pages/registrar/RegistrarSuggestions.tsx`

Replace lines 62-72:

```tsx
  // Auto-mark as Reviewed when staff opens the feedback detail.
  const handleOpen = async (id: number) => {
    const target = suggestions.find(s => s.id === id)
    if (!target || target.status === 'Reviewed') return
    try {
      await markSuggestionReviewed(id)
      setSuggestions(prev => prev.map(s => s.id === id ? { ...s, status: 'Reviewed', is_read: true } : s))
    } catch {
      // Silent — opening should never block reading the content.
    }
  }
```

with:

```tsx
  // Auto-mark as Reviewed when staff opens the feedback detail.
  // Flip local state FIRST so the UI is instant; the API call runs in the
  // background. On failure, revert + toast so the row doesn't lie.
  const handleOpen = async (id: number) => {
    const target = suggestions.find(s => s.id === id)
    if (!target || target.status === 'Reviewed') return
    const prevStatus = target.status
    const prevIsRead = target.is_read
    setSuggestions(prev => prev.map(s => s.id === id ? { ...s, status: 'Reviewed', is_read: true } : s))
    try {
      await markSuggestionReviewed(id)
    } catch {
      setSuggestions(prev => prev.map(s => s.id === id ? { ...s, status: prevStatus, is_read: prevIsRead } : s))
      toast.error('Couldn\'t mark as reviewed')
    }
  }
```

- [ ] **Step 2: Apply the same change to AccountingSuggestions**

File: `frontend/src/pages/accounting/AccountingSuggestions.tsx`

Replace lines 62-71:

```tsx
  const handleOpen = async (id: number) => {
    const target = suggestions.find(s => s.id === id)
    if (!target || target.status === 'Reviewed') return
    try {
      await markSuggestionReviewed(id)
      setSuggestions(prev => prev.map(s => s.id === id ? { ...s, status: 'Reviewed', is_read: true } : s))
    } catch {
      // Silent
    }
  }
```

with:

```tsx
  const handleOpen = async (id: number) => {
    const target = suggestions.find(s => s.id === id)
    if (!target || target.status === 'Reviewed') return
    const prevStatus = target.status
    const prevIsRead = target.is_read
    setSuggestions(prev => prev.map(s => s.id === id ? { ...s, status: 'Reviewed', is_read: true } : s))
    try {
      await markSuggestionReviewed(id)
    } catch {
      setSuggestions(prev => prev.map(s => s.id === id ? { ...s, status: prevStatus, is_read: prevIsRead } : s))
      toast.error('Couldn\'t mark as reviewed')
    }
  }
```

- [ ] **Step 3: Type check**

Run: `cd frontend && npm run build`
Expected: build passes with no TS errors.

- [ ] **Step 4: Manual browser verification (Registrar)**

Start backend + frontend dev servers. Log in as a registrar (or use seed data). Go to `/registrar/suggestions`. Click the eye icon on an unreviewed row.

Expected:
- Row's status pill flips to "Reviewed" immediately — no visible delay.
- The detail modal opens at the same instant.
- Server logs show one `POST /api/suggestions/:id/read`.

- [ ] **Step 5: Manual browser verification (Accounting)**

Log in as an accounting user. Go to `/accounting/suggestions`. Click the eye icon on an unreviewed row. Expected: same instant-flip behavior.

- [ ] **Step 6: Simulate API failure (optional but recommended)**

In DevTools → Network, right-click the `mark-reviewed` request → Block request URL. Reload, click the eye icon on another unreviewed row.

Expected:
- Row briefly flips to "Reviewed", then reverts.
- Toast appears: `"Couldn't mark as reviewed"`.
- Detail modal stays open.

Unblock the URL when done.

- [ ] **Step 7: Commit**

```bash
git add frontend/src/pages/registrar/RegistrarSuggestions.tsx \
  frontend/src/pages/accounting/AccountingSuggestions.tsx
git commit -m "$(cat <<'EOF'
fix(suggestions): make eye-icon feel instant via optimistic update

Registrar and Accounting both awaited the mark-reviewed roundtrip
before flipping the row, making the click feel frozen on slow links.
Now the row flips locally first, API fires in background, on failure
we revert + show a toast.

Part of Group A bug cleanup (B2).
EOF
)"
```

---

## Task 3: B1.1 — Extract `useGlobalPoll` hook

**Files:**
- Create: `frontend/src/hooks/useGlobalPoll.ts`
- Modify: `frontend/src/components/shared/NotificationBell.tsx:15-40`

Refactor the existing 30s poll timer out of `NotificationBell` into a reusable hook so the next task (announcement polling) can subscribe to the same tick instead of spawning a second timer.

- [ ] **Step 1: Create the hook**

File: `frontend/src/hooks/useGlobalPoll.ts`

```ts
import { useEffect, useRef } from 'react'

/**
 * Subscribe to a shared 30s tick. The callback runs once on subscribe and
 * every 30 seconds thereafter while the component is mounted. `enabled=false`
 * pauses the subscription without unmounting the caller.
 *
 * Why a hook instead of a module-level timer: each subscriber decides
 * independently whether to fetch (based on its own auth/role), and React
 * cleanup tears down the interval when the last subscriber unmounts.
 */
const POLL_INTERVAL_MS = 30_000

export function useGlobalPoll(callback: () => void, enabled: boolean = true) {
  const savedCallback = useRef(callback)

  useEffect(() => {
    savedCallback.current = callback
  }, [callback])

  useEffect(() => {
    if (!enabled) return
    // Fire once immediately so the subscriber has data without waiting 30s.
    savedCallback.current()
    const id = setInterval(() => savedCallback.current(), POLL_INTERVAL_MS)
    return () => clearInterval(id)
  }, [enabled])
}
```

- [ ] **Step 2: Refactor NotificationBell to use it**

File: `frontend/src/components/shared/NotificationBell.tsx`

Replace lines 1-40 (imports + the two `useEffect`s):

```tsx
import { useState, useRef, useEffect, useCallback } from 'react'
import { Bell } from 'lucide-react'
import { getUnreadCount } from '../../api/notifications'
import { useAuth } from '../../hooks/useAuth'
import { useGlobalPoll } from '../../hooks/useGlobalPoll'

interface Props {
  onClick?: () => void
}

export function NotificationBell({ onClick }: Props) {
  const { role } = useAuth()
  const [count, setCount] = useState(0)
  const mountedRef = useRef(true)

  useEffect(() => {
    mountedRef.current = true
    return () => { mountedRef.current = false }
  }, [])

  const fetch = useCallback(async () => {
    try {
      const res = await getUnreadCount()
      if (mountedRef.current) setCount(res.data.count)
    } catch {
      // silently ignore — bell just shows no badge
    }
  }, [])

  useGlobalPoll(fetch, Boolean(role) && role !== 'user')
```

The rest of the component (lines 42 onward — the `if (!role || role === 'user') return null` and the JSX) stays unchanged.

- [ ] **Step 3: Type check**

Run: `cd frontend && npm run build`
Expected: build passes. If you see `'useEffect' is declared but never read`, remove the stale import — the new version already uses it for the `mountedRef` effect.

- [ ] **Step 4: Manual browser verification**

Log in as admin. Open DevTools → Network tab and filter by `unread-count`. Watch for the XHR:
- One fires on page load.
- A second fires ~30s later.
- A third fires ~30s after that.

Expected: steady 30s cadence, no double-fires (which would indicate two timers running).

- [ ] **Step 5: Commit**

```bash
git add frontend/src/hooks/useGlobalPoll.ts \
  frontend/src/components/shared/NotificationBell.tsx
git commit -m "$(cat <<'EOF'
refactor(notifs): extract 30s poll tick into useGlobalPoll hook

Pulls the setInterval out of NotificationBell so the upcoming
announcement-polling fix can subscribe to the same tick instead of
spawning a second timer. No behavior change — bell still refreshes
every 30s.

Part of Group A bug cleanup (B1 prep).
EOF
)"
```

---

## Task 4: B1.2 — Announcement polling, mark-seen toast, stale-check

**Files:**
- Modify: `frontend/src/hooks/useAnnouncementUnread.ts` (swap hand-rolled timer for `useGlobalPoll`; toast on mark-seen failure)
- Modify: `frontend/src/hooks/useAnnouncements.ts` (add polling + `lastFetchedAt` + `ensureFresh()`)
- Modify: `frontend/src/pages/user/AnnouncementsPage.tsx` (call `ensureFresh()` on mount before the list renders)

**Important context the plan-writer discovered**: mark-seen and unread-count already live in a **separate** hook (`useAnnouncementUnread.ts`) with its own 30s `pollTimer` / `pollOwners` ref-count. `clear()` is already optimistic (sets count to 0 before firing the POST). So the spec's "optimistic mark-seen" is already in place — the actual fixes needed are:

1. Simplify `useAnnouncementUnread` by subscribing to `useGlobalPoll` instead of its own timer (removes duplicate poll infrastructure).
2. Add a toast when mark-seen fails (currently silent — the user is the one reporting the bug, so we want them to see *something* when it breaks).
3. Add list polling to `useAnnouncements` so a newly-published announcement appears without manual refresh.
4. Add `ensureFresh()` + call it on `AnnouncementsPage` mount so the first click always gets up-to-date data (kills "click twice").

- [ ] **Step 1: Refactor `useAnnouncementUnread` to use `useGlobalPoll`**

File: `frontend/src/hooks/useAnnouncementUnread.ts`

Replace the entire file with:

```ts
import { useCallback, useRef } from 'react'
import { toast } from 'sonner'
import { getUnreadAnnouncementCount, markAnnouncementsSeen } from '../api/announcements'
import { useAuth } from './useAuth'
import { useGlobalPoll } from './useGlobalPoll'
import { createSharedState } from './createSharedState'

// Shared across all components so the Header badge clears the moment
// AnnouncementsPage calls clear() — otherwise both would have independent
// local state and the badge would linger until the next poll.
const countStore = createSharedState(0)

// Polls /api/announcements/unread-count while the user is signed in.
// Also exposes a `clear()` that hits /mark-seen and zeros the shared count,
// used when the user opens the announcements page.
export function useAnnouncementUnread() {
  const { role } = useAuth()
  const count = countStore.useValue()
  const roleRef = useRef(role)
  roleRef.current = role

  const fetchCount = useCallback(async () => {
    // Backend returns 0 for non-'user' roles; skip the request entirely.
    if (roleRef.current !== 'user') { countStore.set(0); return }
    try {
      const res = await getUnreadAnnouncementCount()
      countStore.set(res.data?.count ?? 0)
    } catch {
      // Silent: background poll shouldn't noise up the UI
    }
  }, [])

  // Only subscribe to the poll when we actually have a user role.
  useGlobalPoll(fetchCount, role === 'user')

  const clear = useCallback(async () => {
    // Zero immediately so every instance of the badge updates in this tick,
    // then confirm with the server. On failure, the next poll resyncs, but
    // we toast so the user sees SOMETHING — the original bug report said
    // "badge takes long to clear", which turns out to have been masked by
    // a silent failure path.
    const prev = countStore.get()
    countStore.set(0)
    try {
      await markAnnouncementsSeen()
    } catch {
      countStore.set(prev)
      toast.error('Couldn\'t mark announcements as seen, will retry')
    }
  }, [])

  return { count, clear, refetch: fetchCount }
}
```

Note: `countStore.get()` is already exposed by `createSharedState.ts` (verified by the plan-writer). No changes needed to the shared-state primitive.

- [ ] **Step 2: Add polling + `ensureFresh` to `useAnnouncements`**

File: `frontend/src/hooks/useAnnouncements.ts`

Replace the entire file with:

```ts
import { useCallback, useEffect, useRef, useState } from 'react'
import { getAnnouncements } from '../api/announcements'
import { useGlobalPoll } from './useGlobalPoll'
import type { Announcement } from '../types'

const STALE_MS = 10_000

export function useAnnouncements() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const mountedRef = useRef(true)
  const lastFetchedAtRef = useRef(0)

  useEffect(() => {
    mountedRef.current = true
    return () => { mountedRef.current = false }
  }, [])

  const fetchNow = useCallback(async () => {
    try {
      const res = await getAnnouncements()
      if (!mountedRef.current) return
      setAnnouncements(Array.isArray(res.data) ? res.data : [])
      setError(null)
      lastFetchedAtRef.current = Date.now()
    } catch {
      if (mountedRef.current) setError('Failed to load announcements')
    } finally {
      if (mountedRef.current) setIsLoading(false)
    }
  }, [])

  // 30s poll — shared timer across the app. The public HomePage and the
  // user AnnouncementsPage both benefit; admin views already call refetch
  // after mutations, so the extra tick is just freshness insurance.
  useGlobalPoll(fetchNow)

  // Consumers call this when they need the list to be fresh RIGHT NOW
  // (e.g., AnnouncementsPage on mount). Returns immediately if the last
  // fetch was recent enough to trust.
  const ensureFresh = useCallback(async () => {
    if (Date.now() - lastFetchedAtRef.current > STALE_MS) {
      await fetchNow()
    }
  }, [fetchNow])

  return { announcements, isLoading, error, refetch: fetchNow, ensureFresh }
}
```

This shape keeps the existing `{ announcements, isLoading, error, refetch }` contract intact (all three consumers — `HomePage`, `AdminAnnouncements`, `AnnouncementsPage` — stay valid) and adds one optional field `ensureFresh`.

- [ ] **Step 3: Call `ensureFresh()` on AnnouncementsPage mount**

File: `frontend/src/pages/user/AnnouncementsPage.tsx`

Replace lines 8-14:

```tsx
export function AnnouncementsPage() {
  const { announcements, isLoading, error, refetch } = useAnnouncements()
  const { clear } = useAnnouncementUnread()
  const [search, setSearch] = useState('')

  // Mark announcements as seen once the user lands on this page.
  useEffect(() => { clear() }, [clear])
```

with:

```tsx
export function AnnouncementsPage() {
  const { announcements, isLoading, error, refetch, ensureFresh } = useAnnouncements()
  const { clear } = useAnnouncementUnread()
  const [search, setSearch] = useState('')

  // On mount: refresh the list if it's stale (kills "click twice before
  // the announcement shows"), then mark as seen.
  useEffect(() => {
    ensureFresh().finally(() => clear())
  }, [ensureFresh, clear])
```

- [ ] **Step 4: Type check**

Run: `cd frontend && npm run build`

Expected: build succeeds. If it complains that `createSharedState` has no `get`, handle per the note in Step 1 above.

- [ ] **Step 5: Manual verification — list polling**

Log in as a user in one browser tab. Open DevTools → Network → filter `announcements`. Publish a new announcement from a second (admin) tab. Return to the user tab and wait up to 30s.

Expected: a fresh `GET /api/announcements` fires within 30s, and the list on HomePage / AnnouncementsPage shows the new item without refreshing the page. The badge also bumps (that's the separate unread hook ticking).

- [ ] **Step 6: Manual verification — ensureFresh kills "click twice"**

From the HomePage as a user, click the announcements anchor / the bell to navigate to `/user/announcements`. Let the page sit for >10s. Navigate away and back (or use another interaction that remounts the page).

Expected: the list shows content on the first render every time — no visible "empty then populate" flicker on the first visit after a stale interval.

- [ ] **Step 7: Manual verification — toast on mark-seen failure**

Open DevTools → Network → right-click any `mark-seen` POST once it fires, choose "Block request URL". Navigate to `/user/announcements`.

Expected: badge flips to 0 briefly, then rolls back. Toast appears: `"Couldn't mark announcements as seen, will retry"`.

Unblock the URL when done.

- [ ] **Step 8: Commit**

```bash
git add frontend/src/hooks/useAnnouncementUnread.ts \
  frontend/src/hooks/useAnnouncements.ts \
  frontend/src/pages/user/AnnouncementsPage.tsx
git commit -m "$(cat <<'EOF'
fix(notifs): list polling + mark-seen toast + stale refetch

Addresses the April-21 bug report on user-side announcement
notifications:
- useAnnouncements now polls via useGlobalPoll so newly-published
  items appear within 30s without a manual refresh
- useAnnouncementUnread swaps its hand-rolled pollTimer/pollOwners
  ref-count for useGlobalPoll (same behavior, less code)
- mark-seen failure now rolls back + toasts instead of being silent
- AnnouncementsPage calls ensureFresh() on mount, killing the
  "click twice before the content appears" symptom

Part of Group A bug cleanup (B1).
EOF
)"
```

---

## Task 5: F4.1 — Migration 013 `email_logs`

**Files:**
- Create: `backend/internal/migrations/013_email_logs.sql`
- Modify: `backend/internal/migrations/migrations.go`
- Modify: `backend/internal/config/db.go`

- [ ] **Step 1: Write the SQL migration**

File: `backend/internal/migrations/013_email_logs.sql`

```sql
-- 013_email_logs.sql
-- Persistent audit of every email send attempt. Lets operators diagnose
-- delivery failures without grepping logs that die on restart.

CREATE TABLE IF NOT EXISTS email_logs (
    id          BIGSERIAL PRIMARY KEY,
    to_address  TEXT NOT NULL,
    kind        TEXT NOT NULL,
    status      TEXT NOT NULL,
    error_msg   TEXT,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS email_logs_created_at_idx
    ON email_logs (created_at DESC);
```

- [ ] **Step 2: Register the embed var**

File: `backend/internal/migrations/migrations.go`

Append after the `SuggestionAttachmentsSQL` declaration:

```go
//go:embed 013_email_logs.sql
var EmailLogsSQL string
```

- [ ] **Step 3: Run the migration on startup**

File: `backend/internal/config/db.go`

Find the block that runs `migrations.SuggestionAttachmentsSQL` (the last existing migration). Immediately after its `if _, err := db.Exec(migrations.SuggestionAttachmentsSQL); err != nil { log.Fatalf(...) }`, add:

```go
	if _, err := db.Exec(migrations.EmailLogsSQL); err != nil {
		log.Fatalf("failed to run email_logs migration: %v", err)
	}
```

- [ ] **Step 4: Build + start the backend locally**

Run:
```bash
cd backend && go build ./... && go run cmd/main.go
```

Expected: server starts with no migration error. Kill the server with Ctrl-C.

- [ ] **Step 5: Verify the table exists**

Run:
```bash
psql "$DATABASE_URL" -c "\d email_logs"
```

Expected output shows the 5 columns and the `email_logs_created_at_idx` index. If `psql` isn't available, any query tool against `DATABASE_URL` works; or rely on the build-passes + no-fatal-log check from Step 4.

- [ ] **Step 6: Commit**

```bash
git add backend/internal/migrations/013_email_logs.sql \
  backend/internal/migrations/migrations.go \
  backend/internal/config/db.go
git commit -m "$(cat <<'EOF'
feat(db): add email_logs audit table (migration 013)

Persistent row per email send attempt — lets admins see delivery
status without SSHing into Render and grepping logs that die on
restart. Additive only; no existing column changes.

Part of Group A bug cleanup (F4.1).
EOF
)"
```

---

## Task 6: F4.2 — `EmailLogRepo`

**Files:**
- Create: `backend/internal/repository/email_log_repo.go`

- [ ] **Step 1: Write the repo**

File: `backend/internal/repository/email_log_repo.go`

```go
// backend/internal/repository/email_log_repo.go
package repository

import (
	"database/sql"
	"time"
)

type EmailLog struct {
	ID        int64     `json:"id"`
	To        string    `json:"to"`
	Kind      string    `json:"kind"`
	Status    string    `json:"status"`
	ErrorMsg  *string   `json:"error_msg"`
	CreatedAt time.Time `json:"created_at"`
}

type EmailLogRepo struct {
	db *sql.DB
}

func NewEmailLogRepo(db *sql.DB) *EmailLogRepo {
	return &EmailLogRepo{db: db}
}

// Record writes a single attempt. errMsg should be empty when status='sent'.
// Callers use log-and-continue on errors from Record — auditing must never
// block the original send operation.
func (r *EmailLogRepo) Record(to, kind, status, errMsg string) error {
	var nullableErr interface{}
	if errMsg != "" {
		nullableErr = errMsg
	}
	_, err := r.db.Exec(
		`INSERT INTO email_logs (to_address, kind, status, error_msg)
		 VALUES ($1, $2, $3, $4)`,
		to, kind, status, nullableErr,
	)
	return err
}

// List returns rows in reverse-chronological order. Filters are optional:
// pass empty string to skip the kind / status filter.
func (r *EmailLogRepo) List(kind, status string, limit, offset int) ([]*EmailLog, error) {
	if limit <= 0 || limit > 200 {
		limit = 50
	}
	if offset < 0 {
		offset = 0
	}
	rows, err := r.db.Query(
		`SELECT id, to_address, kind, status, error_msg, created_at
		 FROM email_logs
		 WHERE ($1 = '' OR kind = $1)
		   AND ($2 = '' OR status = $2)
		 ORDER BY created_at DESC
		 LIMIT $3 OFFSET $4`,
		kind, status, limit, offset,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	out := make([]*EmailLog, 0)
	for rows.Next() {
		var row EmailLog
		var errMsg sql.NullString
		if err := rows.Scan(&row.ID, &row.To, &row.Kind, &row.Status, &errMsg, &row.CreatedAt); err != nil {
			return nil, err
		}
		if errMsg.Valid {
			s := errMsg.String
			row.ErrorMsg = &s
		}
		out = append(out, &row)
	}
	return out, rows.Err()
}
```

- [ ] **Step 2: Build**

Run: `cd backend && go build ./...`
Expected: build succeeds.

- [ ] **Step 3: Commit**

```bash
git add backend/internal/repository/email_log_repo.go
git commit -m "$(cat <<'EOF'
feat(repo): EmailLogRepo — record/list email attempts

Provides Record (single-insert, nullable error_msg) and List (filtered,
paginated, reverse-chronological) for the email_logs audit table.

Part of Group A bug cleanup (F4.2).
EOF
)"
```

---

## Task 7: F4.3 — Wrap mailer with audit + remove swallow

**Files:**
- Create: `backend/internal/services/mail/audit.go`
- Create: `backend/internal/services/mail/mail_test.go`

This task introduces an audit-wrapping `Sender` that:
1. Calls the underlying `mail.Sender` methods.
2. Records every attempt in `email_logs` (`sent` / `skipped` / `failed`).
3. Propagates the underlying error unchanged to the caller.

We leave `mail.Sender` itself untouched — add the wrapper as a new type in the same package so callers can depend on either for tests.

- [ ] **Step 1: Define the audit recorder interface + wrapper**

File: `backend/internal/services/mail/audit.go`

```go
// backend/internal/services/mail/audit.go
package mail

import (
	"errors"
	"log"
)

// Recorder is the minimal surface AuditingSender needs from the email_logs
// repository. Defined here so the mail package doesn't import repository.
type Recorder interface {
	Record(to, kind, status, errMsg string) error
}

// AuditingSender wraps a *Sender and writes one email_logs row per attempt.
// Record failures are log-and-continue — never block the original send.
type AuditingSender struct {
	inner    *Sender
	recorder Recorder
	allowNoop bool
}

// NewAuditingSender builds the wrapper. allowNoop converts ErrNotConfigured
// into a nil error return (for dev boxes without SMTP set up).
func NewAuditingSender(inner *Sender, recorder Recorder, allowNoop bool) *AuditingSender {
	return &AuditingSender{inner: inner, recorder: recorder, allowNoop: allowNoop}
}

func (a *AuditingSender) SendPasswordReset(to, resetLink string) error {
	err := a.inner.SendPasswordReset(to, resetLink)
	a.audit(to, "password_reset", err)
	return a.mapErr(err)
}

func (a *AuditingSender) SendNewUserCredentials(to, fullname, rawPassword, loginURL string) error {
	err := a.inner.SendNewUserCredentials(to, fullname, rawPassword, loginURL)
	a.audit(to, "provisioning", err)
	return a.mapErr(err)
}

// audit resolves the status string and writes a row. Record errors are logged
// and ignored so auditing never breaks the caller's flow.
func (a *AuditingSender) audit(to, kind string, err error) {
	status, errMsg := resolveStatus(err)
	if rErr := a.recorder.Record(to, kind, status, errMsg); rErr != nil {
		log.Printf("[mail audit] failed to record %s/%s for %s: %v", kind, status, to, rErr)
	}
}

// mapErr converts ErrNotConfigured to nil when allowNoop is set; otherwise
// every error passes through unchanged.
func (a *AuditingSender) mapErr(err error) error {
	if err == nil {
		return nil
	}
	if a.allowNoop && errors.Is(err, ErrNotConfigured) {
		return nil
	}
	return err
}

func resolveStatus(err error) (status string, errMsg string) {
	if err == nil {
		return "sent", ""
	}
	if errors.Is(err, ErrNotConfigured) {
		return "skipped", err.Error()
	}
	return "failed", err.Error()
}
```

- [ ] **Step 2: Write unit tests for the wrapper**

File: `backend/internal/services/mail/mail_test.go`

```go
// backend/internal/services/mail/mail_test.go
package mail

import (
	"errors"
	"testing"
)

type fakeRecorder struct {
	calls []recordCall
	err   error
}

type recordCall struct {
	to, kind, status, errMsg string
}

func (f *fakeRecorder) Record(to, kind, status, errMsg string) error {
	f.calls = append(f.calls, recordCall{to, kind, status, errMsg})
	return f.err
}

func TestResolveStatus(t *testing.T) {
	cases := []struct {
		name       string
		err        error
		wantStatus string
		wantMsg    string
	}{
		{"nil is sent", nil, "sent", ""},
		{"ErrNotConfigured is skipped", ErrNotConfigured, "skipped", ErrNotConfigured.Error()},
		{"wrapped ErrNotConfigured is skipped", errors.New("wrap: " + ErrNotConfigured.Error()), "failed", "wrap: " + ErrNotConfigured.Error()},
		{"other errors are failed", errors.New("boom"), "failed", "boom"},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			gotStatus, gotMsg := resolveStatus(tc.err)
			if gotStatus != tc.wantStatus {
				t.Fatalf("status: got %q, want %q", gotStatus, tc.wantStatus)
			}
			if gotMsg != tc.wantMsg {
				t.Fatalf("msg: got %q, want %q", gotMsg, tc.wantMsg)
			}
		})
	}
}

func TestAuditingSender_mapErr(t *testing.T) {
	t.Run("allowNoop converts ErrNotConfigured to nil", func(t *testing.T) {
		a := &AuditingSender{allowNoop: true}
		if err := a.mapErr(ErrNotConfigured); err != nil {
			t.Fatalf("want nil, got %v", err)
		}
	})
	t.Run("default surfaces ErrNotConfigured", func(t *testing.T) {
		a := &AuditingSender{allowNoop: false}
		if err := a.mapErr(ErrNotConfigured); !errors.Is(err, ErrNotConfigured) {
			t.Fatalf("want ErrNotConfigured, got %v", err)
		}
	})
	t.Run("other errors pass through", func(t *testing.T) {
		a := &AuditingSender{allowNoop: true}
		want := errors.New("smtp down")
		if err := a.mapErr(want); err != want {
			t.Fatalf("want %v, got %v", want, err)
		}
	})
}

func TestAuditingSender_audit_neverBlocksOnRecorderError(t *testing.T) {
	rec := &fakeRecorder{err: errors.New("db down")}
	a := &AuditingSender{recorder: rec}
	// audit is pkg-private; call directly — success doesn't panic even though
	// the recorder is failing.
	a.audit("user@example.com", "password_reset", nil)
	if len(rec.calls) != 1 {
		t.Fatalf("recorder not called: %+v", rec.calls)
	}
	if got := rec.calls[0]; got.status != "sent" || got.errMsg != "" {
		t.Fatalf("unexpected call: %+v", got)
	}
}
```

- [ ] **Step 3: Run the tests**

Run: `cd backend && go test ./internal/services/mail/...`
Expected: all tests pass.

- [ ] **Step 4: Build the whole tree to confirm no broken callers**

Run: `cd backend && go build ./...`
Expected: build succeeds. If the build fails because `authSvc` or `provisioningSvc` depend on a concrete `*mail.Sender`, Task 8 addresses that — keep going.

- [ ] **Step 5: Commit**

```bash
git add backend/internal/services/mail/audit.go \
  backend/internal/services/mail/mail_test.go
git commit -m "$(cat <<'EOF'
feat(mail): AuditingSender wraps every send with an email_logs row

New type in the mail package that composes a *Sender + a Recorder.
Each SendPasswordReset / SendNewUserCredentials call now writes one
row (sent/skipped/failed) and propagates the underlying error
unchanged. MAIL_ALLOW_NOOP dev-only toggle converts ErrNotConfigured
to nil.

Part of Group A bug cleanup (F4.3).
EOF
)"
```

---

## Task 8: F4.4 — Propagate password-reset failure to HTTP (501/502)

**Files:**
- Modify: `backend/internal/services/interfaces.go` (add/confirm `Mailer` interface if not present)
- Modify: `backend/internal/services/auth_service.go:260-294` (the `RequestPasswordReset` swallow site)
- Modify: `backend/internal/handlers/auth.go:175-187` (the `ForgotPassword` handler)
- Modify: `backend/cmd/main.go` (wire `EmailLogRepo` + build `AuditingSender` + feed to services)

The mailer dependency in `AuthService` and `UserProvisioningService` is typed as `*mail.Sender` today. Switch to an interface so the `AuditingSender` is a drop-in replacement.

- [ ] **Step 1: Inspect current mailer dependency type**

Run: `grep -n "mailer\|Mailer\|mail.Sender" backend/internal/services/*.go`

Expected: `auth_service.go` and `user_provisioning.go` each hold a `*mail.Sender` field. We want them to hold an interface instead.

- [ ] **Step 2: Add a Mailer interface**

File: `backend/internal/services/interfaces.go`

Add near the other service-side interfaces (or at the bottom if there's no matching section):

```go
// Mailer is the minimal interface the auth and provisioning services need
// from the email subsystem. *mail.Sender and *mail.AuditingSender both
// satisfy it. Kept here (not in package mail) so package mail stays free of
// application-level concerns.
type Mailer interface {
	SendPasswordReset(to, resetLink string) error
	SendNewUserCredentials(to, fullname, rawPassword, loginURL string) error
}
```

- [ ] **Step 3: Change AuthService to hold a Mailer**

File: `backend/internal/services/auth_service.go`

Find the struct field declaration (near the top — something like `mailer *mail.Sender`). Change its type to `Mailer`:

```go
mailer Mailer
```

Find the constructor (`NewAuthService`). Change the parameter type from `*mail.Sender` to `Mailer`:

```go
func NewAuthService(userRepo repository.UserRepository, resetRepo repository.PasswordResetRepo, mailer Mailer, jwtSecret, frontendURL string) *AuthService {
```

(Exact signature may differ — keep the existing parameter order, just change the mailer's type.)

- [ ] **Step 4: Change UserProvisioningService to hold a Mailer**

File: `backend/internal/services/user_provisioning.go`

Same change as Step 3: field type `Mailer` and constructor param type `Mailer`.

- [ ] **Step 5: Stop swallowing the reset-mail error**

File: `backend/internal/services/auth_service.go:289-293`

Replace:

```go
	if err := s.mailer.SendPasswordReset(user.Email, link); err != nil {
		fmt.Printf("[auth] password-reset mail send failed for %s: %v\n", user.Email, err)
	}
	return nil
```

with:

```go
	if err := s.mailer.SendPasswordReset(user.Email, link); err != nil {
		// Token persisted — user can retry. Caller (HTTP handler) decides
		// how to translate this (501 vs 502). See handlers/auth.go.
		return err
	}
	return nil
```

If `fmt` is now unused in this file, remove the import. (Run `go build ./...` to find out.)

- [ ] **Step 6: Map `ErrNotConfigured` to 501 and other errors to 502 in the handler**

File: `backend/internal/handlers/auth.go:175-187`

Replace:

```go
func (h *AuthHandler) ForgotPassword(c *gin.Context) {
	var input forgotPasswordInput
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	err := h.svc.RequestPasswordReset(input.Email)
	if errors.Is(err, services.ErrRateLimited) {
		c.JSON(http.StatusTooManyRequests, gin.H{"error": "too many requests, please try again later"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "If that email exists, a reset link was sent."})
}
```

with:

```go
func (h *AuthHandler) ForgotPassword(c *gin.Context) {
	var input forgotPasswordInput
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	err := h.svc.RequestPasswordReset(input.Email)
	switch {
	case err == nil:
		c.JSON(http.StatusOK, gin.H{"message": "If that email exists, a reset link was sent."})
	case errors.Is(err, services.ErrRateLimited):
		c.JSON(http.StatusTooManyRequests, gin.H{"error": "too many requests, please try again later"})
	case errors.Is(err, mail.ErrNotConfigured):
		c.JSON(http.StatusNotImplemented, gin.H{"error": "email is not configured on this server"})
	default:
		c.JSON(http.StatusBadGateway, gin.H{"error": "email delivery failed"})
	}
}
```

Add the `mail` import at the top of `handlers/auth.go` if it's not already there:

```go
	"idealink/internal/services/mail"
```

- [ ] **Step 7: Wire EmailLogRepo + AuditingSender in main.go**

File: `backend/cmd/main.go`

After the existing repository block (around line 31, after `attachmentRepo`) add:

```go
	emailLogRepo := repository.NewEmailLogRepo(db)
```

Replace the existing mailer construction (lines 34-40):

```go
	mailer := mail.NewSender(mail.Config{
		Host: cfg.SMTPHost,
		Port: cfg.SMTPPort,
		User: cfg.SMTPUser,
		Pass: cfg.SMTPPass,
		From: cfg.SMTPFrom,
	})
```

with:

```go
	rawMailer := mail.NewSender(mail.Config{
		Host: cfg.SMTPHost,
		Port: cfg.SMTPPort,
		User: cfg.SMTPUser,
		Pass: cfg.SMTPPass,
		From: cfg.SMTPFrom,
	})
	mailer := mail.NewAuditingSender(rawMailer, emailLogRepo, cfg.MailAllowNoop)
```

- [ ] **Step 8: Add `MailAllowNoop` to config**

File: `backend/internal/config/config.go`

Add the field to the `Config` struct after `SMTPFrom`:

Before:
```go
type Config struct {
	DatabaseURL string
	JWTSecret   string
	Port        string
	FrontendURL string

	SMTPHost string
	SMTPPort string
	SMTPUser string
	SMTPPass string
	SMTPFrom string
}
```

After:
```go
type Config struct {
	DatabaseURL string
	JWTSecret   string
	Port        string
	FrontendURL string

	SMTPHost string
	SMTPPort string
	SMTPUser string
	SMTPPass string
	SMTPFrom string

	MailAllowNoop bool
}
```

In `Load()`, add one line inside the returned struct literal after `SMTPFrom: os.Getenv("SMTP_FROM"),`:

Before:
```go
	return &Config{
		DatabaseURL: databaseURL,
		JWTSecret:   jwtSecret,
		Port:        getOr("PORT", "8080"),
		FrontendURL: getOr("FRONTEND_URL", "http://localhost:5173"),
		SMTPHost:    os.Getenv("SMTP_HOST"),
		SMTPPort:    getOr("SMTP_PORT", "587"),
		SMTPUser:    os.Getenv("SMTP_USER"),
		SMTPPass:    os.Getenv("SMTP_PASS"),
		SMTPFrom:    os.Getenv("SMTP_FROM"),
	}, nil
```

After:
```go
	return &Config{
		DatabaseURL: databaseURL,
		JWTSecret:   jwtSecret,
		Port:        getOr("PORT", "8080"),
		FrontendURL: getOr("FRONTEND_URL", "http://localhost:5173"),
		SMTPHost:    os.Getenv("SMTP_HOST"),
		SMTPPort:    getOr("SMTP_PORT", "587"),
		SMTPUser:    os.Getenv("SMTP_USER"),
		SMTPPass:    os.Getenv("SMTP_PASS"),
		SMTPFrom:    os.Getenv("SMTP_FROM"),

		MailAllowNoop: os.Getenv("MAIL_ALLOW_NOOP") == "true",
	}, nil
```

- [ ] **Step 9: Build everything**

Run: `cd backend && go build ./...`
Expected: build succeeds. Any compile errors likely come from the `mail.Sender` → `Mailer` interface change — any other call site that expected the concrete type must also accept the interface or receive the `AuditingSender` directly. Fix inline.

- [ ] **Step 10: Run existing tests**

Run: `cd backend && go test ./...`
Expected: existing tests pass. If `auth_service_test.go` constructs `AuthService` with a real `*mail.Sender`, it will still compile (concrete satisfies interface). If it uses a mock, the mock must expose both interface methods.

- [ ] **Step 11: Manual verification — SMTP misconfigured**

Stop the backend. Unset SMTP env:
```bash
unset SMTP_HOST
```
Restart backend. In the frontend, submit a password reset for a real account.

Expected:
- HTTP response: 501 (check DevTools Network).
- `email_logs` has a new row with `status='skipped'`, `error_msg='mail: SMTP_HOST not configured'`.

Verify with:
```bash
psql "$DATABASE_URL" -c "SELECT * FROM email_logs ORDER BY created_at DESC LIMIT 3"
```

- [ ] **Step 12: Manual verification — SMTP unreachable**

Set SMTP env vars pointing at a host that doesn't accept connections, e.g.:
```bash
export SMTP_HOST=127.0.0.1 SMTP_PORT=2525 SMTP_USER=x SMTP_PASS=x SMTP_FROM=x@example.com
```
Restart. Submit a reset.

Expected:
- HTTP 502.
- `email_logs` row with `status='failed'`, `error_msg` containing the dial failure.

- [ ] **Step 13: Commit**

```bash
git add backend/internal/services/interfaces.go \
  backend/internal/services/auth_service.go \
  backend/internal/services/user_provisioning.go \
  backend/internal/handlers/auth.go \
  backend/internal/config/config.go \
  backend/cmd/main.go
git commit -m "$(cat <<'EOF'
fix(mail): stop swallowing password-reset failures; 501/502 surface

RequestPasswordReset used to fmt.Printf on mailer failure and return
nil. Now the error propagates and the HTTP handler maps it:
- 501 for ErrNotConfigured (SMTP env vars missing)
- 502 for real delivery failures

Wires AuditingSender into main.go so every attempt writes an
email_logs row. MAIL_ALLOW_NOOP=true converts 501 into 200 for dev.

Part of Group A bug cleanup (F4.4).
EOF
)"
```

---

## Task 9: F4.5 — Frontend: `ForgotPasswordPage` honest about failures

**Files:**
- Modify: `frontend/src/pages/public/ForgotPasswordPage.tsx:13-29`

- [ ] **Step 1: Update the submit handler**

File: `frontend/src/pages/public/ForgotPasswordPage.tsx`

Replace lines 13-29:

```tsx
  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!email.trim()) { toast.error('Please enter your email'); return }
    setIsLoading(true)
    try {
      await forgotPassword(email)
      setSent(true)
    } catch (err) {
      if (axios.isAxiosError(err) && err.response?.status === 429) {
        toast.error('Too many requests. Please try again later.')
      } else {
        toast.error('Something went wrong. Please try again.')
      }
    } finally {
      setIsLoading(false)
    }
  }
```

with:

```tsx
  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!email.trim()) { toast.error('Please enter your email'); return }
    setIsLoading(true)
    try {
      await forgotPassword(email)
      setSent(true)
    } catch (err) {
      if (axios.isAxiosError(err)) {
        const status = err.response?.status
        if (status === 429) {
          toast.error('Too many requests. Please try again later.')
        } else if (status === 501) {
          toast.error('Email isn\'t set up on the server yet. Please contact the administrator.')
        } else if (status === 502) {
          toast.error('We couldn\'t send the reset email. Please try again in a minute, or contact the administrator.')
        } else {
          toast.error('Something went wrong. Please try again.')
        }
      } else {
        toast.error('Something went wrong. Please try again.')
      }
    } finally {
      setIsLoading(false)
    }
  }
```

- [ ] **Step 2: Type check**

Run: `cd frontend && npm run build`
Expected: build succeeds.

- [ ] **Step 3: Manual verification — 502 path**

With SMTP pointed at an unreachable host (Task 8 Step 12 setup), reload the forgot-password page and submit a real email.

Expected: toast appears with the full spec copy: `"We couldn't send the reset email. Please try again in a minute, or contact the administrator."` The "Check your email" success screen does NOT appear.

- [ ] **Step 4: Manual verification — 501 path**

Unset SMTP_HOST and restart backend. Submit a reset.

Expected: toast appears: `"Email isn't set up on the server yet. Please contact the administrator."`

- [ ] **Step 5: Manual verification — 200 path (regression)**

Restore valid SMTP env. Restart backend. Submit a reset.

Expected: success screen shows ("Check your email"). Inbox receives the reset link.

- [ ] **Step 6: Commit**

```bash
git add frontend/src/pages/public/ForgotPasswordPage.tsx
git commit -m "$(cat <<'EOF'
fix(auth): ForgotPassword shows real errors instead of fake success

Backend now returns 501 when SMTP is unconfigured and 502 when
delivery fails. The page used to swallow both into a generic "check
your email" screen. Now it surfaces a toast per case.

Part of Group A bug cleanup (F4.5).
EOF
)"
```

---

## Task 10: F4.6 — Backend: `GET /api/admin/email-logs`

**Files:**
- Create: `backend/internal/handlers/admin_email_logs.go`
- Modify: `backend/cmd/main.go` (register the route in the admin group)

- [ ] **Step 1: Write the handler**

File: `backend/internal/handlers/admin_email_logs.go`

```go
// backend/internal/handlers/admin_email_logs.go
package handlers

import (
	"net/http"
	"strconv"

	"idealink/internal/repository"

	"github.com/gin-gonic/gin"
)

type AdminEmailLogsHandler struct {
	repo *repository.EmailLogRepo
}

func NewAdminEmailLogsHandler(repo *repository.EmailLogRepo) *AdminEmailLogsHandler {
	return &AdminEmailLogsHandler{repo: repo}
}

// List returns the most recent email_logs rows. Query params:
//   limit  (default 50, max 200)
//   offset (default 0)
//   kind   (optional: password_reset | provisioning | announcement)
//   status (optional: sent | failed | skipped)
func (h *AdminEmailLogsHandler) List(c *gin.Context) {
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "50"))
	offset, _ := strconv.Atoi(c.DefaultQuery("offset", "0"))
	kind := c.Query("kind")
	status := c.Query("status")

	rows, err := h.repo.List(kind, status, limit, offset)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, rows)
}
```

- [ ] **Step 2: Register the route**

File: `backend/cmd/main.go`

In the `admin` group (around line 86-94 in the current file), add the handler instantiation above and the route below. Full context of the edit:

Add after the existing handler instantiations (around line 55):

```go
	adminEmailLogsH := handlers.NewAdminEmailLogsHandler(emailLogRepo)
```

Add inside the `admin` route group (currently ends with `admin.GET("/admin/analytics", adminH.Analytics)`):

```go
			admin.GET("/admin/email-logs", adminEmailLogsH.List)
```

- [ ] **Step 3: Build**

Run: `cd backend && go build ./...`
Expected: build succeeds.

- [ ] **Step 4: Manual verification**

Start the backend. Log in as admin via the frontend so you have a valid cookie. Then in the same browser, open `http://localhost:8080/api/admin/email-logs` (or whichever backend port). Alternatively with curl using the cookie:

```bash
curl -s -b "idealink_auth=<paste-cookie-from-devtools>" \
  http://localhost:8080/api/admin/email-logs | jq .
```

Expected: JSON array with the most recent `email_logs` rows (the ones created by Task 8 verification steps). Each row has `id, to, kind, status, error_msg, created_at`.

Test filter params:
```bash
curl ... "http://localhost:8080/api/admin/email-logs?status=failed"
curl ... "http://localhost:8080/api/admin/email-logs?kind=password_reset&limit=10"
```

- [ ] **Step 5: Commit**

```bash
git add backend/internal/handlers/admin_email_logs.go backend/cmd/main.go
git commit -m "$(cat <<'EOF'
feat(admin): GET /api/admin/email-logs — paginated audit view

Exposes the email_logs table through an admin-only endpoint so
operators can diagnose delivery issues without a database shell.
Supports limit/offset/kind/status filters.

Part of Group A bug cleanup (F4.6).
EOF
)"
```

---

## Task 11: F4.7 — Frontend: AdminEmailLogs page + route + dashboard link

**Files:**
- Create: `frontend/src/api/adminEmailLogs.ts`
- Create: `frontend/src/pages/admin/AdminEmailLogs.tsx`
- Modify: `frontend/src/router.tsx:21-25` (add lazy import + route)
- Modify: `frontend/src/pages/admin/AdminDashboard.tsx:274-290` (add "Email Logs" to Quick Actions)

- [ ] **Step 1: Write the API client**

File: `frontend/src/api/adminEmailLogs.ts`

```ts
import client from './client'

export interface EmailLog {
  id: number
  to: string
  kind: 'password_reset' | 'provisioning' | 'announcement' | string
  status: 'sent' | 'failed' | 'skipped' | string
  error_msg: string | null
  created_at: string
}

export interface EmailLogFilters {
  kind?: string
  status?: string
  limit?: number
  offset?: number
}

export const getEmailLogs = (filters: EmailLogFilters = {}) => {
  const params = new URLSearchParams()
  if (filters.kind)   params.set('kind', filters.kind)
  if (filters.status) params.set('status', filters.status)
  if (filters.limit !== undefined)  params.set('limit', String(filters.limit))
  if (filters.offset !== undefined) params.set('offset', String(filters.offset))
  const qs = params.toString()
  return client.get<EmailLog[]>(`/api/admin/email-logs${qs ? `?${qs}` : ''}`)
}
```

- [ ] **Step 2: Write the page component**

File: `frontend/src/pages/admin/AdminEmailLogs.tsx`

```tsx
import { useEffect, useState } from 'react'
import { Mail, RefreshCw } from 'lucide-react'
import { Skeleton } from '../../components/ui/Skeleton'
import { getEmailLogs, type EmailLog } from '../../api/adminEmailLogs'

type KindFilter = '' | 'password_reset' | 'provisioning' | 'announcement'
type StatusFilter = '' | 'sent' | 'failed' | 'skipped'

const PAGE_SIZE = 50

export function AdminEmailLogs() {
  const [rows, setRows] = useState<EmailLog[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [kind, setKind] = useState<KindFilter>('')
  const [status, setStatus] = useState<StatusFilter>('')
  const [page, setPage] = useState(0)

  const load = () => {
    setIsLoading(true)
    setError(null)
    getEmailLogs({
      kind: kind || undefined,
      status: status || undefined,
      limit: PAGE_SIZE,
      offset: page * PAGE_SIZE,
    })
      .then(res => setRows(res.data ?? []))
      .catch(() => setError('Failed to load logs'))
      .finally(() => setIsLoading(false))
  }

  useEffect(() => { load() }, [kind, status, page])

  return (
    <div className="animate-fade-in space-y-5 pb-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="w-1 h-8 bg-ascb-orange rounded-full" />
            <h1 className="text-2xl font-bold text-white font-display">Email Logs</h1>
          </div>
          <p className="text-gray-500 text-sm font-ui ml-3">
            Every email send attempt, newest first.
          </p>
        </div>
        <button
          onClick={load}
          className="flex items-center gap-2 px-4 py-2 bg-ascb-orange/10 hover:bg-ascb-orange/20 text-ascb-orange border border-ascb-orange/30 rounded-xl text-sm font-medium transition-all font-ui"
        >
          <RefreshCw size={15} /> Refresh
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        <select
          value={kind}
          onChange={e => { setKind(e.target.value as KindFilter); setPage(0) }}
          className="rounded-xl border border-white/15 px-3 py-2 text-white text-sm font-ui bg-ascb-navy/80"
        >
          <option value="">All kinds</option>
          <option value="password_reset">Password reset</option>
          <option value="provisioning">Provisioning</option>
          <option value="announcement">Announcement</option>
        </select>
        <select
          value={status}
          onChange={e => { setStatus(e.target.value as StatusFilter); setPage(0) }}
          className="rounded-xl border border-white/15 px-3 py-2 text-white text-sm font-ui bg-ascb-navy/80"
        >
          <option value="">All statuses</option>
          <option value="sent">Sent</option>
          <option value="failed">Failed</option>
          <option value="skipped">Skipped</option>
        </select>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/25 text-red-300 text-sm font-ui">
          {error}
        </div>
      )}

      {isLoading ? (
        <div className="space-y-2">
          {[...Array(8)].map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
        </div>
      ) : rows.length === 0 ? (
        <div className="text-center py-20 glass rounded-2xl">
          <Mail size={36} className="text-gray-600 mx-auto mb-3" />
          <p className="text-gray-400 font-medium font-ui">No email logs</p>
          <p className="text-gray-600 text-sm mt-1 font-ui">
            {kind || status ? 'Try a different filter.' : 'Attempts will show up here as the app sends mail.'}
          </p>
        </div>
      ) : (
        <div className="bg-ascb-navy rounded-2xl border border-ascb-navy-mid overflow-hidden">
          <table className="w-full text-sm">
            <thead className="border-b border-ascb-navy-mid bg-ascb-navy-dark">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">When</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">To</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Kind</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Error</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(row => (
                <tr
                  key={row.id}
                  className={row.status === 'failed' ? 'bg-red-500/5' : undefined}
                >
                  <td className="px-4 py-3 text-gray-400 font-ui whitespace-nowrap">
                    {new Date(row.created_at).toLocaleString()}
                  </td>
                  <td className="px-4 py-3 text-white font-ui break-all">{row.to}</td>
                  <td className="px-4 py-3 text-gray-300 font-ui whitespace-nowrap">{row.kind}</td>
                  <td className="px-4 py-3 font-ui whitespace-nowrap">
                    <span
                      className={
                        row.status === 'sent'    ? 'text-green-300' :
                        row.status === 'failed'  ? 'text-red-300'   :
                        row.status === 'skipped' ? 'text-yellow-300' : 'text-gray-300'
                      }
                    >
                      {row.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-400 font-ui text-xs max-w-md break-all">
                    {row.error_msg ?? '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="flex items-center justify-between px-4 py-2 border-t border-ascb-navy-mid/70">
            <p className="text-xs text-gray-500 font-ui">
              Page {page + 1} · {rows.length} row{rows.length === 1 ? '' : 's'}
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setPage(p => Math.max(0, p - 1))}
                disabled={page === 0}
                className="px-3 py-1.5 rounded-lg border border-white/10 text-gray-400 hover:text-white hover:border-ascb-orange/50 disabled:opacity-30 text-xs font-ui"
              >
                Prev
              </button>
              <button
                onClick={() => setPage(p => p + 1)}
                disabled={rows.length < PAGE_SIZE}
                className="px-3 py-1.5 rounded-lg border border-white/10 text-gray-400 hover:text-white hover:border-ascb-orange/50 disabled:opacity-30 text-xs font-ui"
              >
                Next
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 3: Register the route**

File: `frontend/src/router.tsx`

After line 25 (after `AdminUsers` lazy declaration) insert:

```tsx
const AdminEmailLogs     = lazy(() => import('./pages/admin/AdminEmailLogs').then(m => ({ default: m.AdminEmailLogs })))
```

Inside the `role="admin"` route block (around line 194-201 in the current router), add after the `AdminUsers` route:

```tsx
            <Route path="/admin/email-logs"   element={<AdminEmailLogs />} />
```

- [ ] **Step 4: Add the dashboard link**

File: `frontend/src/pages/admin/AdminDashboard.tsx`

Find the Quick Actions grid (around line 274-290) — the three-item array inside the `{ href: '/admin/suggestions' ... }` list. Add a fourth item:

```tsx
            { href: '/admin/email-logs', label: 'Email Logs', icon: <Mail size={15} /> },
```

Add `Mail` to the `lucide-react` import at the top of the file:

Before:
```tsx
import { Users, MessageSquare, TrendingUp, Bell, ArrowUpRight, Download } from 'lucide-react'
```

After:
```tsx
import { Users, MessageSquare, TrendingUp, Bell, ArrowUpRight, Download, Mail } from 'lucide-react'
```

Also change the grid from `sm:grid-cols-3` to `sm:grid-cols-4` so the new card fits cleanly:

```tsx
        <div className="grid sm:grid-cols-4 gap-3">
```

- [ ] **Step 5: Type check + build**

Run: `cd frontend && npm run build`
Expected: build succeeds.

- [ ] **Step 6: Manual verification**

Log in as admin. Go to `/admin/dashboard`. Click the new "Email Logs" card in Quick Actions.

Expected:
- Route lands on `/admin/email-logs`.
- Table shows the rows created by earlier tasks' verification steps.
- Failed rows (status = failed) are tinted red.
- Filter dropdowns narrow the result set.
- Pager advances when there are more than 50 rows.

Trigger one more reset request, refresh the page, confirm the new row appears at the top.

- [ ] **Step 7: Commit**

```bash
git add frontend/src/api/adminEmailLogs.ts \
  frontend/src/pages/admin/AdminEmailLogs.tsx \
  frontend/src/router.tsx \
  frontend/src/pages/admin/AdminDashboard.tsx
git commit -m "$(cat <<'EOF'
feat(admin): email logs page — /admin/email-logs

Paginated table over the email_logs audit, with kind/status filters
and red highlight on failed rows. Linked from the Quick Actions grid
on the admin dashboard.

Part of Group A bug cleanup (F4.7).
EOF
)"
```

---

## Final acceptance

When all 11 tasks are committed, run through the spec's verification section top-to-bottom:

- **F4 — SMTP misconfigured** → password reset returns 501, `email_logs` row `skipped`, frontend toasts the 501 copy.
- **F4 — SMTP valid** → password reset returns 200, `email_logs` row `sent`, inbox receives link, frontend shows success screen.
- **F4 — SMTP unreachable** → password reset returns 502, `email_logs` row `failed`, frontend toasts the 502 copy.
- **F4 — Admin panel** → `/admin/email-logs` lists the attempts, newest first.
- **B1** — publish an announcement → appears within 30s without refresh; badge clears instantly on click; detail renders on first click.
- **B2** — eye icon on registrar and accounting flips rows instantly; simulated failure reverts + toasts.
- **B3** — homepage shows Announcements directly below Hero; anchors work.

Push the branch (or a PR against main). Each task's commit is independently revertable if a regression appears later.
