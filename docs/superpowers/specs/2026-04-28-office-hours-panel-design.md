# Office Hours Panel — Design

**Date:** 2026-04-28
**Branch suggestion:** `feat/office-hours-panel`
**Status:** Ready for implementation plan

## Problem

The Registrar and Accounting (Finance) dashboards currently embed an editable
office-hours card (the `OfficeHoursBanner` in staff mode): set Open/Close time,
post a Temporary closure, etc. Two issues:

1. Editing controls live on the *dashboard* — they should be a dedicated
   panel/page so the dashboard stays focused on feedback metrics.
2. The current schema only supports **one** Open/Close pair (Mon–Fri implied)
   and **one** active temporary closure (overwriting it loses the previous
   one). Staff want:
   - Per-day hours (e.g. Sat 8 AM – 12 PM, Sun closed).
   - A history of past temporary closures, plus the ability to schedule
     closures into the future and cancel active/upcoming ones.

## Scope

**In scope**
- Move office-hours management to a dedicated page in both Registrar and
  Accounting portals.
- Per-day weekly schedule (Sun–Sat, each day either open with hours or marked
  Closed).
- Closure timeline: Active / Upcoming / Past.
- Read-only status pill on the dashboard linking to the new page.

**Out of scope**
- Recurring/holiday closures (e.g. "every Dec 25"). Holidays must be set as
  one-off closures each year.
- Academic-calendar imports.
- Per-day overrides beyond the weekly pattern (handled via temporary closures).

## Architecture

### Routing & navigation

- New routes:
  - `/registrar/office-hours` → `<OfficeHoursPage office="Registrar Office" />`
  - `/accounting/office-hours` → `<OfficeHoursPage office="Finance Office" />`
- New sidebar item **"Office Hours"** between Dashboard and Feedback in both
  Registrar and Accounting sidebars (icon: `Clock` from lucide-react).
- Backend authorization stays role-based: registrar role can only edit
  `Registrar Office`, accounting role can only edit `Finance Office`.

### Migration plan

A single new SQL migration `016_office_hours_v2.sql`:

1. Create `office_hours_schedule` (per-weekday rows).
2. Create `office_hours_closures` (history table).
3. Backfill schedule from existing `office_hours.open_hour`/`close_hour`:
   Mon–Fri use the existing hours, Sat/Sun get `is_closed = TRUE`.
4. Backfill any active row from `office_hours.closure_reason` /
   `office_hours.closed_until` into `office_hours_closures`.
5. Drop deprecated columns from `office_hours`: `open_hour`, `close_hour`,
   `is_open`, `closure_reason`, `closed_until`.

After migration, `office_hours` keeps only `id`, `department`, `updated_at`.

## Data Model

### `office_hours_schedule` (new)

Per-day weekly schedule. Exactly 7 rows per office (one per weekday).

```sql
CREATE TABLE office_hours_schedule (
  id              SERIAL PRIMARY KEY,
  office_hours_id INT      NOT NULL REFERENCES office_hours(id) ON DELETE CASCADE,
  weekday         SMALLINT NOT NULL CHECK (weekday BETWEEN 0 AND 6), -- 0=Sun, 1=Mon, … 6=Sat
  open_hour       SMALLINT NOT NULL CHECK (open_hour  BETWEEN 0 AND 23),
  close_hour      SMALLINT NOT NULL CHECK (close_hour BETWEEN 1 AND 24),
  is_closed       BOOLEAN  NOT NULL DEFAULT FALSE,
  CHECK (is_closed = TRUE OR open_hour < close_hour),
  UNIQUE (office_hours_id, weekday)
);
```

When `is_closed = TRUE`, the hour values are ignored by the read path. The
table-level CHECK keeps stored data sane while still allowing default values
in closed rows.

### `office_hours_closures` (new)

```sql
CREATE TABLE office_hours_closures (
  id              SERIAL PRIMARY KEY,
  office_hours_id INT          NOT NULL REFERENCES office_hours(id) ON DELETE CASCADE,
  start_at        TIMESTAMPTZ  NOT NULL,
  end_at          TIMESTAMPTZ  NOT NULL,
  reason          TEXT,
  cancelled_at    TIMESTAMPTZ,
  created_by_id   INT REFERENCES users(id),
  created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  CHECK (end_at > start_at),
  CHECK (cancelled_at IS NULL OR cancelled_at >= start_at)
);
CREATE INDEX office_hours_closures_office_idx
  ON office_hours_closures (office_hours_id, start_at DESC);
```

Closure status is **computed**, not stored:

| Status     | Condition                                           |
| ---------- | --------------------------------------------------- |
| Active     | `now BETWEEN start_at AND end_at AND cancelled_at IS NULL` |
| Upcoming   | `now < start_at AND cancelled_at IS NULL`           |
| Past       | `now > end_at OR cancelled_at IS NOT NULL`          |

### Open/Closed precedence (replaces existing `buildStatus`)

Evaluated in Asia/Manila time:

1. **Active closure exists** → CLOSED, surface closure reason and `end_at`.
2. **Today's schedule row has `is_closed = TRUE`** → CLOSED ("Office is closed today").
3. **Now within today's `open_hour`..`close_hour`** → OPEN.
4. Otherwise → CLOSED ("Outside office hours").

## API Endpoints

All endpoints below operate on a `:dept` path parameter that must equal either
`Registrar Office` or `Finance Office` (URL-encoded). Existing role-based
authorization is preserved.

### `GET /api/office-hours/:dept` — public

Used by the public-facing banner, the dashboard status pill, and the new page.

Response:
```jsonc
{
  "department": "Registrar Office",
  "is_open": false,
  "status_message": "Office is closed for the weekend",
  "schedule": [
    { "weekday": 0, "is_closed": true,  "open_hour": 0, "close_hour": 0 },
    { "weekday": 1, "is_closed": false, "open_hour": 7, "close_hour": 16 },
    // … 7 entries total, ordered weekday 0..6 (Sun..Sat)
  ],
  "active_closure":   null,
  "upcoming_closures": [],
  "updated_at": "2026-04-28T01:23:45Z"
}
```

`active_closure` may be a closure object with `{id, start_at, end_at, reason}`
or `null`. `upcoming_closures` is an array of the same shape.

### `PUT /api/office-hours/:dept/schedule` — staff

Replaces the schedule-edit half of the old `POST /api/office-hours/:dept`.

Request:
```jsonc
{
  "schedule": [
    { "weekday": 0, "is_closed": true,  "open_hour": 0, "close_hour": 0 },
    // … exactly 7 entries, one per weekday 0..6
  ]
}
```

Validation:
- Exactly 7 entries.
- All weekdays 0–6 present, no duplicates.
- For each non-closed row: `0 <= open_hour < close_hour <= 24`.

Returns the full `GET` payload.

### `GET /api/office-hours/:dept/closures` — staff

Query params:
- `status`: `active` | `upcoming` | `past` | `all` (default `all`).
- `limit`: 1–100, default 50.
- `offset`: non-negative, default 0 (for "Show more" pagination on Past).

Returns:
```jsonc
{ "closures": [ /* closure objects ordered by start_at DESC */ ] }
```

### `POST /api/office-hours/:dept/closures` — staff

Request:
```jsonc
{
  "start_at": "2026-04-29T00:00:00+08:00",
  "end_at":   "2026-04-30T17:00:00+08:00",
  "reason":   "Power outage"
}
```

Validation:
- `end_at > start_at`.
- `end_at` is in the future (creating a closure entirely in the past is rejected).
- `reason` optional, max 500 chars.
- No overlap with any non-cancelled closure on the same office (409).

Returns the created closure (201).

### `DELETE /api/office-hours/:dept/closures/:id` — staff

Cancels an active or upcoming closure by setting `cancelled_at = NOW()`.

- 200 with the updated closure on success.
- 200 if already cancelled — idempotent, returns the existing record unchanged.
- 404 if closure not found or belongs to a different office.
- 409 if the closure is already past (its `end_at` is in the past) — past
  closures cannot be retroactively cancelled.

### Removed

- `POST /api/office-hours/:dept` is removed. Its responsibilities split into
  `PUT .../schedule` and `POST .../closures`.

## Frontend UI

### `OfficeHoursPage` — single shared component

Same component is mounted at `/registrar/office-hours` and
`/accounting/office-hours` with `office` prop selecting the department. Layout
is one scrollable column, `max-w-3xl mx-auto`, three cards.

**Header bar** — page title "Office Hours" plus a live status pill (OPEN /
CLOSED + reason).

**Card 1 — Weekly Schedule**
- 7-row grid, visually ordered **Mon → Sun** (data still uses weekday 0–6).
- Each row: day label · `Open at <select>` · `Closes at <select>` ·
  `Closed` toggle.
- When the toggle is on, the two time selects are disabled and greyed.
- Single **Save schedule** button (bottom right), disabled until dirty.
- Inline red helper text under any row where `open >= close`.

**Card 2 — Schedule a Temporary Closure**
- Inputs: **From** `<input type="datetime-local">`, **To** `<input
  type="datetime-local">`, **Reason** textarea (optional, 500-char cap).
- **From** defaults to today 00:00 (Asia/Manila), **To** defaults to today
  23:59 — common "close for today" path is one tap.
- **Schedule closure** button. Errors surfaced via `toast.error`
  (overlap, end-before-start, end in past, etc.).

**Card 3 — Closures Timeline**
Three sub-sections, only rendered when non-empty:
- **Active** — at most 1 row, with a "Happening now" pill. Shows
  `start_at` → `end_at`, reason, and a red **Cancel closure** button.
- **Upcoming** — list of upcoming closures, each with a **Cancel** button.
- **Past** — list, paginated 20 at a time with a "Show more" button. No
  actions; cancelled closures show a small "cancelled" tag.

### `OfficeStatusPill` — dashboard widget (new)

Replaces the existing staff-mode `OfficeHoursBanner` card on both dashboards:

```
●  Office is OPEN · Mon–Fri 7:00 AM – 4:00 PM             Manage →
```

- Green dot when `is_open`, red dot when closed.
- Subtext is one of:
  - Today's hours when on schedule and open.
  - Closure reason when an active closure is in effect.
  - "Closed today" when today's schedule row is `is_closed`.
  - "Outside office hours" otherwise.
- "Manage →" links to `/registrar/office-hours` or `/accounting/office-hours`
  based on role.

### `OfficeHoursBanner` — public banner (refactor)

Keep the public-facing strip shown on user pages. Remove staff edit mode
entirely; staff editing now lives on `OfficeHoursPage`. The banner consumes
the same `GET /api/office-hours/:dept` payload, just renders read-only.

### Sidebar navigation

Add a single new item in both Registrar and Accounting sidebars between
Dashboard and Feedback:

```
⏱  Office Hours
```

Active styling matches existing items.

## Computation logic (backend)

`buildStatus` in `handlers/office_hours.go` is replaced. The new function
takes the `office_hours` row, its 7 schedule rows, and the most recent active
closure (if any), and returns the computed `is_open` + `status_message`. All
time math is done in Asia/Manila.

Status messages used by the API:

| Case                                | `status_message`                                          |
| ----------------------------------- | --------------------------------------------------------- |
| Active closure                      | `Closed: <reason>` (or `Temporarily closed` if no reason) |
| Today's schedule `is_closed = TRUE` | `Office is closed today`                                  |
| On schedule, currently open         | `Open today, <open_hour> – <close_hour>`                  |
| Off schedule                        | `Outside office hours`                                    |

## Error handling

- All staff endpoints return 400 with `{"error": "<message>"}` for validation
  failures.
- 403 on cross-office writes (e.g. registrar trying to edit Finance Office).
- 409 on closure overlap and on cancelling an already-past/cancelled closure.
- Frontend handles errors via `toast.error`; the page does not crash.

## Testing

### Backend
- Unit tests for the new status computation:
  - Active closure beats schedule.
  - Today closed beats time-of-day check.
  - On-schedule open vs. off-schedule closed.
  - Asia/Manila timezone correctness around midnight and DST-free behaviour.
- Repo tests for schedule (`PUT` round-trip, validation rejection).
- Repo tests for closures (insert, overlap rejection, cancel idempotency,
  list filters by `status`).
- Handler tests for authorization (registrar cannot edit Finance Office and
  vice versa).

### Frontend
- `OfficeHoursPage` renders schedule from a mocked API response.
- Schedule dirty-tracking: Save button disabled until a field changes.
- Closure form: validation errors surface via toast; success clears the form.
- Cancel closure flow: optimistic UI then refetch.

## Files touched (rough)

**Backend (new)**
- `internal/migrations/016_office_hours_v2.sql`
- `internal/repository/office_hours_closures_repo.go`
- `internal/handlers/office_hours_closures.go`

**Backend (refactor)**
- `internal/models/office_hours.go` — add `Schedule`, `Closure`, response types.
- `internal/repository/office_hours_repo.go` — schedule CRUD; remove old
  hour/closure code.
- `internal/handlers/office_hours.go` — replace `buildStatus`, replace
  schedule edit handler.
- `cmd/main.go` — register new routes; remove old `POST /api/office-hours/:dept`.

**Frontend (new)**
- `src/pages/shared/OfficeHoursPage.tsx`
- `src/components/shared/OfficeStatusPill.tsx`

**Frontend (refactor)**
- `src/api/officeHours.ts` — schedule + closures clients.
- `src/components/shared/OfficeHoursBanner.tsx` — drop staff edit mode.
- `src/pages/registrar/RegistrarDashboard.tsx`,
  `src/pages/accounting/AccountingDashboard.tsx` — replace banner with
  `OfficeStatusPill`.
- Sidebar components for both portals — add Office Hours item.
- Router config — register `/registrar/office-hours` and
  `/accounting/office-hours`.

## Risks & mitigations

- **Schedule migration regression.** Existing offices currently render Mon–Fri
  hours; backfill must produce identical observable behaviour for the public
  banner. Mitigation: test that `GET /api/office-hours/:dept` returns the
  same `is_open` value before and after migration for representative weekday
  and weekend timestamps.
- **Closure overlap edge cases.** Two closures touching at the same instant
  (one ends 12:00, next starts 12:00) should be allowed. Overlap check uses
  half-open intervals: reject when `new.start_at < existing.end_at AND
  new.end_at > existing.start_at`.
- **Per-day hours UI complexity.** The 7-row form is the most complex part of
  the page. Keep the inputs to the same `<select>` time pickers already in
  use for the current `open_hour`/`close_hour` so users don't relearn the
  control.
