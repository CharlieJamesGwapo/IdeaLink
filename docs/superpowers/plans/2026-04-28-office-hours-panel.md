# Office Hours Panel Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move office-hours management out of the Registrar/Accounting dashboards into a dedicated `/registrar/office-hours` and `/accounting/office-hours` page with per-day weekly hours and a closure history (active / upcoming / past).

**Architecture:**
- Backend: one new migration (`016_office_hours_v2.sql`) creates `office_hours_schedule` (per-weekday rows) and `office_hours_closures` (history), backfills from the legacy single-pair columns, then drops them. Status (`is_open`, `status_message`) is computed at read time from the schedule + active closure. New endpoints: `PUT /api/office-hours/:dept/schedule`, `GET|POST /api/office-hours/:dept/closures`, `DELETE /api/office-hours/:dept/closures/:id`. The old `POST /api/office-hours/:dept` is removed; `GET /api/office-hours/:dept` keeps its path but returns the new shape.
- Frontend: a single shared `OfficeHoursPage` component is mounted at the registrar and accounting routes; the dashboard editor in `StaffDashboard.tsx` is replaced with a slim read-only `OfficeStatusPill` that links to the new page. The public `OfficeHoursBanner` (on `SubmitPage`) is updated to consume the new schedule shape and render today's hours.
- No new third-party deps. Time math stays in Asia/Manila using `time.LoadLocation("Asia/Manila")` (with the same `FixedZone` fallback already in `handlers/office_hours.go`).

**Tech Stack:** Go 1.21+, Gin, PostgreSQL, `lib/pq`; React 18 + TypeScript + axios + react-router-dom + sonner toasts + lucide-react.

**Spec:** [`docs/superpowers/specs/2026-04-28-office-hours-panel-design.md`](../specs/2026-04-28-office-hours-panel-design.md)

---

## File Map

**Backend (new):**
- `backend/internal/migrations/016_office_hours_v2.sql` — schedule + closures tables, backfill, drop legacy columns.
- `backend/internal/repository/office_hours_closures_repo.go` — closures CRUD.
- `backend/internal/handlers/office_hours_closures.go` — POST/GET/DELETE handlers.
- `backend/internal/handlers/office_hours_test.go` — status-computation unit tests.
- `backend/internal/handlers/office_hours_closures_test.go` — closure handler tests.

**Backend (modified):**
- `backend/internal/migrations/migrations.go` — embed `016_office_hours_v2.sql`.
- `backend/internal/config/db.go` — execute migration after `ServicesSQL`.
- `backend/internal/models/office_hours.go` — replace `OpenHour`/`CloseHour` with `Schedule []DaySchedule`; add `Closure`, `OfficeHoursStatus` (new shape).
- `backend/internal/repository/interfaces.go` — extend `OfficeHoursRepository`; add `OfficeHoursClosuresRepository`.
- `backend/internal/repository/office_hours_repo.go` — replace single-pair logic with `GetSchedule`/`ReplaceSchedule`.
- `backend/internal/handlers/office_hours.go` — replace `buildStatus` with schedule-aware `computeStatus`; replace the old `Set` handler with a `PutSchedule` handler.
- `backend/cmd/main.go` — wire closure repo/handler; register new routes; remove old `POST /api/office-hours/:dept`.

**Frontend (new):**
- `frontend/src/pages/shared/OfficeHoursPage.tsx` — the new manage page (used by both portals).
- `frontend/src/components/shared/OfficeStatusPill.tsx` — read-only dashboard widget.

**Frontend (modified):**
- `frontend/src/types.ts` — replace `OfficeHoursStatus` with the new shape; add `DaySchedule`, `Closure`.
- `frontend/src/api/officeHours.ts` — schedule + closures clients (drop `setOfficeHours`).
- `frontend/src/components/shared/OfficeHoursBanner.tsx` — read today's hours from `schedule` instead of single `open_hour`/`close_hour`.
- `frontend/src/components/shared/StaffDashboard.tsx` — remove the office-hours editor block (lines ~191–~280); render `<OfficeStatusPill office={dept} />` in its place.
- `frontend/src/components/layout/Sidebar.tsx` — add Office Hours nav entry for `registrar` and `accounting` roles.
- `frontend/src/router.tsx` — register `/registrar/office-hours` and `/accounting/office-hours`.

---

## Conventions

- **Run from the repo root** (`/Users/a1234/IdeaLink`) unless otherwise specified.
- **Backend:** `cd backend && go test ./...` and `cd backend && go build ./...`.
- **Frontend:** `cd frontend && npx tsc --noEmit`, `cd frontend && npx vitest run`, and `cd frontend && npm run build` (the **strict** build that catches missing properties).
- **Commit after each task** with a short imperative subject.
- **Plan-confidence checkpoint:** Always run `npm run build` (not just `tsc --noEmit`) when the change touches the `OfficeHoursStatus` type — every consumer (`OfficeHoursBanner`, `StaffDashboard`, `OfficeHoursPage`, `OfficeStatusPill`) reads it.
- **Time math:** use `time.LoadLocation("Asia/Manila")` with the existing `FixedZone("Asia/Manila", 8*60*60)` fallback. Never call `time.Now()` directly inside computation functions — accept a `now time.Time` parameter so unit tests can pin the clock.
- **DB conflicts on staging:** the public read endpoint already inlines its parameter via `pq.QuoteLiteral` to dodge Render's pgbouncer issue. Preserve that for the new `GET /api/office-hours/:dept` read.

---

## Section 1 — Migration & Models

### Task 1: Add migration 016 (schedule + closures + backfill) and wire it

**Files:**
- Create: `backend/internal/migrations/016_office_hours_v2.sql`
- Modify: `backend/internal/migrations/migrations.go`
- Modify: `backend/internal/config/db.go`

- [ ] **Step 1: Create the migration**

Path: `backend/internal/migrations/016_office_hours_v2.sql`

```sql
-- 016_office_hours_v2.sql
-- Replace the single open_hour/close_hour pair on office_hours with a per-day
-- weekly schedule, and replace the single closure_reason/closed_until pair
-- with a history table.

-- 1. Per-weekday schedule (7 rows per office).
CREATE TABLE IF NOT EXISTS office_hours_schedule (
  id              SERIAL PRIMARY KEY,
  office_hours_id INT      NOT NULL REFERENCES office_hours(id) ON DELETE CASCADE,
  weekday         SMALLINT NOT NULL CHECK (weekday BETWEEN 0 AND 6), -- 0=Sun..6=Sat
  open_hour       SMALLINT NOT NULL CHECK (open_hour  BETWEEN 0 AND 23),
  close_hour      SMALLINT NOT NULL CHECK (close_hour BETWEEN 1 AND 24),
  is_closed       BOOLEAN  NOT NULL DEFAULT FALSE,
  CONSTRAINT office_hours_schedule_open_lt_close CHECK (is_closed = TRUE OR open_hour < close_hour),
  UNIQUE (office_hours_id, weekday)
);

-- 2. Backfill: 7 rows per office. Mon-Fri use the existing hours; Sat/Sun closed.
INSERT INTO office_hours_schedule (office_hours_id, weekday, open_hour, close_hour, is_closed)
SELECT oh.id, w.weekday,
       CASE WHEN w.weekday BETWEEN 1 AND 5 THEN oh.open_hour  ELSE 8  END AS open_hour,
       CASE WHEN w.weekday BETWEEN 1 AND 5 THEN oh.close_hour ELSE 17 END AS close_hour,
       w.weekday NOT BETWEEN 1 AND 5                                   AS is_closed
FROM office_hours oh
CROSS JOIN (VALUES (0),(1),(2),(3),(4),(5),(6)) AS w(weekday)
ON CONFLICT (office_hours_id, weekday) DO NOTHING;

-- 3. Closure history table.
CREATE TABLE IF NOT EXISTS office_hours_closures (
  id              SERIAL PRIMARY KEY,
  office_hours_id INT          NOT NULL REFERENCES office_hours(id) ON DELETE CASCADE,
  start_at        TIMESTAMPTZ  NOT NULL,
  end_at          TIMESTAMPTZ  NOT NULL,
  reason          TEXT,
  cancelled_at    TIMESTAMPTZ,
  created_by_id   INT REFERENCES users(id),
  created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  CONSTRAINT office_hours_closures_end_after_start CHECK (end_at > start_at),
  CONSTRAINT office_hours_closures_cancelled_sane  CHECK (cancelled_at IS NULL OR cancelled_at >= start_at)
);

CREATE INDEX IF NOT EXISTS office_hours_closures_office_idx
  ON office_hours_closures (office_hours_id, start_at DESC);

-- 4. Backfill any active closure from the legacy columns.
INSERT INTO office_hours_closures (office_hours_id, start_at, end_at, reason)
SELECT id, COALESCE(updated_at, NOW()), closed_until, closure_reason
FROM office_hours
WHERE closed_until IS NOT NULL AND closed_until > NOW();

-- 5. Drop deprecated columns from office_hours.
ALTER TABLE office_hours DROP COLUMN IF EXISTS open_hour;
ALTER TABLE office_hours DROP COLUMN IF EXISTS close_hour;
ALTER TABLE office_hours DROP COLUMN IF EXISTS is_open;
ALTER TABLE office_hours DROP COLUMN IF EXISTS closure_reason;
ALTER TABLE office_hours DROP COLUMN IF EXISTS closed_until;
```

- [ ] **Step 2: Embed in migrations.go**

In `backend/internal/migrations/migrations.go`, append after the `ServicesSQL` block:

```go
//go:embed 016_office_hours_v2.sql
var OfficeHoursV2SQL string
```

- [ ] **Step 3: Wire into db.go**

In `backend/internal/config/db.go`, find the `ServicesSQL` block:

```go
if _, err := db.Exec(migrations.ServicesSQL); err != nil {
    log.Fatalf("failed to run services migration: %v", err)
}
```

Add immediately after it (before the final `log.Println("Migrations applied")`):

```go
if _, err := db.Exec(migrations.OfficeHoursV2SQL); err != nil {
    log.Fatalf("failed to run office_hours_v2 migration: %v", err)
}
```

- [ ] **Step 4: Verify build**

```bash
cd backend && go build ./...
```

Expected: clean build. (Build will succeed even though `OfficeHours` model still references the dropped columns — that's fixed in Task 2.)

> ⚠️ **Don't run the backend yet.** Starting it before Task 2 will succeed at build but fail at the first read because the SQL columns are gone. Tasks 1–2 must land together.

- [ ] **Step 5: Commit**

```bash
git add backend/internal/migrations/016_office_hours_v2.sql \
        backend/internal/migrations/migrations.go \
        backend/internal/config/db.go
git commit -m "feat(db): migration 016 — per-day schedule + closure history"
```

---

### Task 2: Refactor `OfficeHours` model + add `DaySchedule`/`Closure` types

**Files:**
- Modify: `backend/internal/models/office_hours.go`

- [ ] **Step 1: Replace the file contents**

Path: `backend/internal/models/office_hours.go`

```go
package models

import "time"

// OfficeHours is the parent row per department. Hours and closures live in
// their child tables (office_hours_schedule, office_hours_closures); this
// row only carries metadata.
type OfficeHours struct {
	ID         int       `json:"id"`
	Department string    `json:"department"`
	UpdatedAt  time.Time `json:"updated_at"`
}

// DaySchedule is one row of office_hours_schedule. Weekday uses Go's
// time.Weekday convention: 0=Sunday..6=Saturday. When IsClosed is true,
// the hour fields are ignored by readers.
type DaySchedule struct {
	Weekday   int  `json:"weekday"`
	OpenHour  int  `json:"open_hour"`
	CloseHour int  `json:"close_hour"`
	IsClosed  bool `json:"is_closed"`
}

// Closure is one row of office_hours_closures. Status (active/upcoming/past)
// is computed by callers — never stored. OfficeHoursID is exposed to Go code
// for ownership checks but hidden from the JSON response.
type Closure struct {
	ID            int        `json:"id"`
	OfficeHoursID int        `json:"-"`
	StartAt       time.Time  `json:"start_at"`
	EndAt         time.Time  `json:"end_at"`
	Reason        *string    `json:"reason,omitempty"`
	CancelledAt   *time.Time `json:"cancelled_at,omitempty"`
	CreatedByID   *int       `json:"created_by_id,omitempty"`
	CreatedAt     time.Time  `json:"created_at"`
}

// OfficeHoursStatus is the response shape for GET /api/office-hours/:dept.
// is_open and status_message are computed from schedule + active_closure.
type OfficeHoursStatus struct {
	Department        string         `json:"department"`
	IsOpen            bool           `json:"is_open"`
	StatusMessage     string         `json:"status_message"`
	Schedule          []DaySchedule  `json:"schedule"`
	ActiveClosure     *Closure       `json:"active_closure"`
	UpcomingClosures  []Closure      `json:"upcoming_closures"`
	UpdatedAt         time.Time      `json:"updated_at"`
}

// PutScheduleInput drives PUT /api/office-hours/:dept/schedule. Must contain
// exactly 7 entries, one per weekday 0..6.
type PutScheduleInput struct {
	Schedule []DaySchedule `json:"schedule" binding:"required"`
}

// CreateClosureInput drives POST /api/office-hours/:dept/closures.
type CreateClosureInput struct {
	StartAt string  `json:"start_at" binding:"required"` // RFC3339 or "YYYY-MM-DDTHH:MM"
	EndAt   string  `json:"end_at"   binding:"required"`
	Reason  *string `json:"reason"`
}
```

- [ ] **Step 2: Verify build**

```bash
cd backend && go build ./...
```

Expected: build fails. The legacy `OpenHour`/`CloseHour`/`IsOpen`/`ClosureReason`/`ClosedUntil` fields and `SetOfficeHoursInput` are gone, so `repository/office_hours_repo.go` and `handlers/office_hours.go` no longer compile. **This is fine — Task 3 and Task 5 fix them.** Proceed.

- [ ] **Step 3: Commit**

```bash
git add backend/internal/models/office_hours.go
git commit -m "feat(models): OfficeHours simplified + DaySchedule/Closure/Status"
```

---

## Section 2 — Repositories

### Task 3: Refactor `OfficeHoursRepo` to use the schedule child table

**Files:**
- Modify: `backend/internal/repository/interfaces.go`
- Modify: `backend/internal/repository/office_hours_repo.go`

- [ ] **Step 1: Update the interface**

In `backend/internal/repository/interfaces.go`, replace the existing `OfficeHoursRepository` block:

```go
type OfficeHoursRepository interface {
	GetByDepartment(department string) (*models.OfficeHours, error)
	Update(department string, input models.SetOfficeHoursInput) (*models.OfficeHours, error)
}
```

with:

```go
type OfficeHoursRepository interface {
	// EnsureRow returns the office_hours row for a department, creating it on
	// first call and seeding 7 default schedule rows (Mon-Fri 8-17, Sat/Sun closed).
	EnsureRow(department string) (*models.OfficeHours, error)
	GetByDepartment(department string) (*models.OfficeHours, error)
	GetSchedule(officeHoursID int) ([]models.DaySchedule, error)
	ReplaceSchedule(officeHoursID int, schedule []models.DaySchedule) error
}
```

- [ ] **Step 2: Replace the repo file contents**

Path: `backend/internal/repository/office_hours_repo.go`

```go
package repository

import (
	"database/sql"
	"fmt"

	"github.com/lib/pq"

	"idealink/internal/models"
)

type OfficeHoursRepo struct {
	db *sql.DB
}

func NewOfficeHoursRepo(db *sql.DB) *OfficeHoursRepo {
	return &OfficeHoursRepo{db: db}
}

// EnsureRow returns the office_hours row for a department, creating it
// (and seeding 7 schedule rows) on first call. Idempotent.
func (r *OfficeHoursRepo) EnsureRow(department string) (*models.OfficeHours, error) {
	if _, err := r.db.Exec(
		`INSERT INTO office_hours (department) VALUES ($1) ON CONFLICT (department) DO NOTHING`,
		department,
	); err != nil {
		return nil, err
	}

	// Seed schedule (idempotent — UNIQUE (office_hours_id, weekday) protects us).
	if _, err := r.db.Exec(
		`INSERT INTO office_hours_schedule (office_hours_id, weekday, open_hour, close_hour, is_closed)
		 SELECT oh.id, w.weekday,
		        CASE WHEN w.weekday BETWEEN 1 AND 5 THEN 8  ELSE 0 END,
		        CASE WHEN w.weekday BETWEEN 1 AND 5 THEN 17 ELSE 1 END,
		        w.weekday NOT BETWEEN 1 AND 5
		 FROM office_hours oh
		 CROSS JOIN (VALUES (0),(1),(2),(3),(4),(5),(6)) AS w(weekday)
		 WHERE oh.department = $1
		 ON CONFLICT (office_hours_id, weekday) DO NOTHING`,
		department,
	); err != nil {
		return nil, err
	}

	return r.GetByDepartment(department)
}

// GetByDepartment uses an inlined literal to dodge Render's pgbouncer
// "unnamed prepared statement" issue on simple-protocol reads from the
// public homepage. See repository/suggestion_repo.go for the same pattern.
func (r *OfficeHoursRepo) GetByDepartment(department string) (*models.OfficeHours, error) {
	var oh models.OfficeHours
	query := fmt.Sprintf(
		`SELECT id, department, updated_at FROM office_hours WHERE department = %s`,
		pq.QuoteLiteral(department),
	)
	err := r.db.QueryRow(query).Scan(&oh.ID, &oh.Department, &oh.UpdatedAt)
	if err == sql.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	return &oh, nil
}

func (r *OfficeHoursRepo) GetSchedule(officeHoursID int) ([]models.DaySchedule, error) {
	rows, err := r.db.Query(
		`SELECT weekday, open_hour, close_hour, is_closed
		 FROM office_hours_schedule
		 WHERE office_hours_id = $1
		 ORDER BY weekday ASC`,
		officeHoursID,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := make([]models.DaySchedule, 0, 7)
	for rows.Next() {
		var d models.DaySchedule
		if err := rows.Scan(&d.Weekday, &d.OpenHour, &d.CloseHour, &d.IsClosed); err != nil {
			return nil, err
		}
		out = append(out, d)
	}
	return out, rows.Err()
}

// ReplaceSchedule writes exactly 7 rows for the office. Validation (7 entries,
// no dup weekdays, open<close when not closed) is the caller's job — the SQL
// CHECK constraints will reject violations as a backstop.
func (r *OfficeHoursRepo) ReplaceSchedule(officeHoursID int, schedule []models.DaySchedule) error {
	tx, err := r.db.Begin()
	if err != nil {
		return err
	}
	defer func() { _ = tx.Rollback() }()

	for _, d := range schedule {
		// Defensive defaults so closed rows still satisfy the table CHECK.
		open, close := d.OpenHour, d.CloseHour
		if d.IsClosed {
			open, close = 0, 1
		}
		if _, err := tx.Exec(
			`INSERT INTO office_hours_schedule (office_hours_id, weekday, open_hour, close_hour, is_closed)
			 VALUES ($1, $2, $3, $4, $5)
			 ON CONFLICT (office_hours_id, weekday)
			 DO UPDATE SET open_hour = EXCLUDED.open_hour,
			               close_hour = EXCLUDED.close_hour,
			               is_closed = EXCLUDED.is_closed`,
			officeHoursID, d.Weekday, open, close, d.IsClosed,
		); err != nil {
			return err
		}
	}

	if _, err := tx.Exec(
		`UPDATE office_hours SET updated_at = NOW() WHERE id = $1`,
		officeHoursID,
	); err != nil {
		return err
	}

	return tx.Commit()
}
```

- [ ] **Step 3: Verify build**

```bash
cd backend && go build ./...
```

Expected: build still fails — `handlers/office_hours.go` and `cmd/main.go` still use the old API. Tasks 5 and 11 will fix that.

- [ ] **Step 4: Commit**

```bash
git add backend/internal/repository/interfaces.go \
        backend/internal/repository/office_hours_repo.go
git commit -m "feat(repo): OfficeHoursRepo — EnsureRow + Get/ReplaceSchedule"
```

---

### Task 4: Add `OfficeHoursClosuresRepo` (TDD — overlap rejection + cancel idempotency)

**Files:**
- Modify: `backend/internal/repository/interfaces.go`
- Create: `backend/internal/repository/office_hours_closures_repo.go`

- [ ] **Step 1: Add the interface**

In `backend/internal/repository/interfaces.go`, append after `OfficeHoursRepository`:

```go
type ClosureStatus string

const (
	ClosureStatusActive   ClosureStatus = "active"
	ClosureStatusUpcoming ClosureStatus = "upcoming"
	ClosureStatusPast     ClosureStatus = "past"
	ClosureStatusAll      ClosureStatus = "all"
)

type OfficeHoursClosuresRepository interface {
	Create(officeHoursID int, startAt, endAt time.Time, reason *string, createdByID *int) (*models.Closure, error)
	List(officeHoursID int, status ClosureStatus, limit, offset int) ([]models.Closure, error)
	GetActive(officeHoursID int, now time.Time) (*models.Closure, error)
	GetUpcoming(officeHoursID int, now time.Time) ([]models.Closure, error)
	FindByID(id int) (*models.Closure, error)
	Cancel(id int, now time.Time) (*models.Closure, error)
}

// ErrClosureOverlap is returned by Create when the new range collides with
// any non-cancelled closure on the same office (half-open intervals: end_at
// touching another row's start_at is allowed).
var ErrClosureOverlap = errors.New("closure overlaps with an existing closure")
// ErrClosurePast is returned by Cancel when the closure has already ended.
var ErrClosurePast = errors.New("closure is already past")
```

> Note: `errors` and `time` need to be imported in `interfaces.go`. If not already present, add them at the top.

- [ ] **Step 2: Write the repo (no tests yet — table-level CHECKs cover most invariants; we write a small handler test in Task 8)**

Path: `backend/internal/repository/office_hours_closures_repo.go`

```go
package repository

import (
	"database/sql"
	"errors"
	"time"

	"idealink/internal/models"
)

type OfficeHoursClosuresRepo struct {
	db *sql.DB
}

func NewOfficeHoursClosuresRepo(db *sql.DB) *OfficeHoursClosuresRepo {
	return &OfficeHoursClosuresRepo{db: db}
}

const selectClosure = `
	SELECT id, office_hours_id, start_at, end_at, reason, cancelled_at, created_by_id, created_at
	FROM office_hours_closures `

func scanClosure(row interface {
	Scan(...interface{}) error
}) (*models.Closure, error) {
	var c models.Closure
	var reason sql.NullString
	var cancelled sql.NullTime
	var createdBy sql.NullInt64
	if err := row.Scan(&c.ID, &c.OfficeHoursID, &c.StartAt, &c.EndAt, &reason, &cancelled, &createdBy, &c.CreatedAt); err != nil {
		return nil, err
	}
	if reason.Valid {
		s := reason.String
		c.Reason = &s
	}
	if cancelled.Valid {
		t := cancelled.Time
		c.CancelledAt = &t
	}
	if createdBy.Valid {
		i := int(createdBy.Int64)
		c.CreatedByID = &i
	}
	return &c, nil
}

func (r *OfficeHoursClosuresRepo) Create(officeHoursID int, startAt, endAt time.Time, reason *string, createdByID *int) (*models.Closure, error) {
	// Half-open overlap check: reject when [startAt, endAt) intersects any
	// non-cancelled existing closure. Equal end/start is allowed.
	var conflictID int
	err := r.db.QueryRow(
		`SELECT id FROM office_hours_closures
		 WHERE office_hours_id = $1
		   AND cancelled_at IS NULL
		   AND start_at < $3
		   AND end_at   > $2
		 LIMIT 1`,
		officeHoursID, startAt, endAt,
	).Scan(&conflictID)
	if err == nil {
		return nil, ErrClosureOverlap
	}
	if err != sql.ErrNoRows {
		return nil, err
	}

	row := r.db.QueryRow(
		`INSERT INTO office_hours_closures (office_hours_id, start_at, end_at, reason, created_by_id)
		 VALUES ($1, $2, $3, $4, $5)
		 RETURNING id, office_hours_id, start_at, end_at, reason, cancelled_at, created_by_id, created_at`,
		officeHoursID, startAt, endAt, reason, createdByID,
	)
	return scanClosure(row)
}

func (r *OfficeHoursClosuresRepo) List(officeHoursID int, status ClosureStatus, limit, offset int) ([]models.Closure, error) {
	q := selectClosure + `WHERE office_hours_id = $1`
	args := []interface{}{officeHoursID}
	now := time.Now()
	switch status {
	case ClosureStatusActive:
		q += ` AND cancelled_at IS NULL AND start_at <= $2 AND end_at > $2`
		args = append(args, now)
	case ClosureStatusUpcoming:
		q += ` AND cancelled_at IS NULL AND start_at > $2`
		args = append(args, now)
	case ClosureStatusPast:
		q += ` AND (end_at <= $2 OR cancelled_at IS NOT NULL)`
		args = append(args, now)
	case ClosureStatusAll, "":
		// no extra filter
	}
	q += ` ORDER BY start_at DESC LIMIT $` + itoa(len(args)+1) + ` OFFSET $` + itoa(len(args)+2)
	args = append(args, limit, offset)

	rows, err := r.db.Query(q, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := make([]models.Closure, 0)
	for rows.Next() {
		c, err := scanClosure(rows)
		if err != nil {
			return nil, err
		}
		out = append(out, *c)
	}
	return out, rows.Err()
}

// itoa avoids the `strconv` import for a single use.
func itoa(n int) string {
	if n == 0 {
		return "0"
	}
	var b [10]byte
	i := len(b)
	for n > 0 {
		i--
		b[i] = byte('0' + n%10)
		n /= 10
	}
	return string(b[i:])
}

func (r *OfficeHoursClosuresRepo) GetActive(officeHoursID int, now time.Time) (*models.Closure, error) {
	row := r.db.QueryRow(
		selectClosure+`WHERE office_hours_id = $1
		 AND cancelled_at IS NULL
		 AND start_at <= $2 AND end_at > $2
		 ORDER BY start_at DESC
		 LIMIT 1`,
		officeHoursID, now,
	)
	c, err := scanClosure(row)
	if err == sql.ErrNoRows {
		return nil, nil
	}
	return c, err
}

func (r *OfficeHoursClosuresRepo) GetUpcoming(officeHoursID int, now time.Time) ([]models.Closure, error) {
	rows, err := r.db.Query(
		selectClosure+`WHERE office_hours_id = $1
		 AND cancelled_at IS NULL
		 AND start_at > $2
		 ORDER BY start_at ASC`,
		officeHoursID, now,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := make([]models.Closure, 0)
	for rows.Next() {
		c, err := scanClosure(rows)
		if err != nil {
			return nil, err
		}
		out = append(out, *c)
	}
	return out, rows.Err()
}

func (r *OfficeHoursClosuresRepo) FindByID(id int) (*models.Closure, error) {
	row := r.db.QueryRow(selectClosure+`WHERE id = $1`, id)
	c, err := scanClosure(row)
	if err == sql.ErrNoRows {
		return nil, nil
	}
	return c, err
}

// Cancel sets cancelled_at = now. Idempotent: cancelling an already-cancelled
// closure returns it unchanged. Returns ErrClosurePast if end_at is already
// in the past (and the closure isn't already cancelled).
func (r *OfficeHoursClosuresRepo) Cancel(id int, now time.Time) (*models.Closure, error) {
	c, err := r.FindByID(id)
	if err != nil {
		return nil, err
	}
	if c == nil {
		return nil, sql.ErrNoRows
	}
	if c.CancelledAt != nil {
		return c, nil
	}
	if c.EndAt.Before(now) || c.EndAt.Equal(now) {
		return nil, ErrClosurePast
	}
	row := r.db.QueryRow(
		`UPDATE office_hours_closures SET cancelled_at = $1 WHERE id = $2
		 RETURNING id, office_hours_id, start_at, end_at, reason, cancelled_at, created_by_id, created_at`,
		now, id,
	)
	return scanClosure(row)
}

// ensure errors import is used even if no other file pulls it in this package.
var _ = errors.New
```

- [ ] **Step 3: Verify build**

```bash
cd backend && go build ./...
```

Expected: still fails on `handlers/office_hours.go` and `cmd/main.go` (Tasks 5, 11 fix). The new repo file itself should compile.

- [ ] **Step 4: Commit**

```bash
git add backend/internal/repository/interfaces.go \
        backend/internal/repository/office_hours_closures_repo.go
git commit -m "feat(repo): OfficeHoursClosuresRepo with overlap rejection + idempotent Cancel"
```

---

## Section 3 — Status Computation

### Task 5: New `computeStatus` (TDD)

**Files:**
- Create: `backend/internal/handlers/office_hours_test.go`
- Modify: `backend/internal/handlers/office_hours.go` (replace `buildStatus`)

- [ ] **Step 1: Write the failing test**

Path: `backend/internal/handlers/office_hours_test.go`

```go
package handlers

import (
	"testing"
	"time"

	"idealink/internal/models"
)

// schedule helper: Mon-Fri 8..17, Sat/Sun closed.
func standardSchedule() []models.DaySchedule {
	out := make([]models.DaySchedule, 7)
	for i := 0; i < 7; i++ {
		closed := i == 0 || i == 6
		out[i] = models.DaySchedule{
			Weekday: i, OpenHour: 8, CloseHour: 17, IsClosed: closed,
		}
	}
	return out
}

func mustTime(t *testing.T, s string) time.Time {
	t.Helper()
	loc, _ := time.LoadLocation("Asia/Manila")
	if loc == nil {
		loc = time.FixedZone("Asia/Manila", 8*60*60)
	}
	tt, err := time.ParseInLocation("2006-01-02 15:04", s, loc)
	if err != nil {
		t.Fatalf("parse: %v", err)
	}
	return tt
}

func TestComputeStatus_OnSchedule_Open(t *testing.T) {
	now := mustTime(t, "2026-04-28 09:30") // Tuesday, 9:30 AM
	got := computeStatus(now, standardSchedule(), nil)
	if !got.IsOpen {
		t.Fatalf("expected open, got %+v", got)
	}
}

func TestComputeStatus_OnSchedule_BeforeOpen_Closed(t *testing.T) {
	now := mustTime(t, "2026-04-28 07:59") // Tuesday, 1 min before open
	got := computeStatus(now, standardSchedule(), nil)
	if got.IsOpen {
		t.Fatalf("expected closed, got %+v", got)
	}
	if got.StatusMessage == "" {
		t.Fatalf("expected status_message")
	}
}

func TestComputeStatus_TodayClosed_Beats_TimeOfDay(t *testing.T) {
	now := mustTime(t, "2026-04-26 12:00") // Sunday, noon
	got := computeStatus(now, standardSchedule(), nil)
	if got.IsOpen {
		t.Fatalf("expected closed, got %+v", got)
	}
	if got.StatusMessage != "Office is closed today" {
		t.Fatalf("unexpected message: %q", got.StatusMessage)
	}
}

func TestComputeStatus_ActiveClosure_Beats_Schedule(t *testing.T) {
	now := mustTime(t, "2026-04-28 09:30") // Tuesday, would be open
	reason := "Power outage"
	closure := &models.Closure{
		ID:      1,
		StartAt: mustTime(t, "2026-04-28 00:00"),
		EndAt:   mustTime(t, "2026-04-29 00:00"),
		Reason:  &reason,
	}
	got := computeStatus(now, standardSchedule(), closure)
	if got.IsOpen {
		t.Fatalf("expected closed (active closure), got %+v", got)
	}
	if got.StatusMessage != "Closed: Power outage" {
		t.Fatalf("unexpected message: %q", got.StatusMessage)
	}
}

func TestComputeStatus_AfterClose_Closed(t *testing.T) {
	now := mustTime(t, "2026-04-28 17:00") // Tuesday, 5:00 PM (close hour)
	got := computeStatus(now, standardSchedule(), nil)
	if got.IsOpen {
		t.Fatalf("expected closed at 17:00 (close-hour boundary is exclusive)")
	}
}
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd backend && go test ./internal/handlers/ -run TestComputeStatus -v
```

Expected: FAIL — `undefined: computeStatus`.

- [ ] **Step 3: Replace `buildStatus` with `computeStatus`**

In `backend/internal/handlers/office_hours.go`, replace the **entire file contents** with:

```go
package handlers

import (
	"database/sql"
	"errors"
	"fmt"
	"net/http"
	"time"

	"idealink/internal/middleware"
	"idealink/internal/models"
	"idealink/internal/repository"

	"github.com/gin-gonic/gin"
)

type OfficeHoursHandler struct {
	hoursRepo    repository.OfficeHoursRepository
	closuresRepo repository.OfficeHoursClosuresRepository
}

func NewOfficeHoursHandler(hours repository.OfficeHoursRepository, closures repository.OfficeHoursClosuresRepository) *OfficeHoursHandler {
	return &OfficeHoursHandler{hoursRepo: hours, closuresRepo: closures}
}

// GET /api/office-hours/:dept — public read.
func (h *OfficeHoursHandler) Get(c *gin.Context) {
	dept := c.Param("dept")
	oh, err := h.hoursRepo.GetByDepartment(dept)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	if oh == nil {
		// Auto-provision the parent row + default schedule on first read.
		var ensureErr error
		oh, ensureErr = h.hoursRepo.EnsureRow(dept)
		if ensureErr != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": ensureErr.Error()})
			return
		}
	}
	now := time.Now().In(manilaLocation())
	status, err := h.buildPayload(oh, now)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, status)
}

// PUT /api/office-hours/:dept/schedule — staff. Replaces the 7-day schedule.
func (h *OfficeHoursHandler) PutSchedule(c *gin.Context) {
	dept := c.Param("dept")
	if !authorizeDept(c, dept) {
		c.JSON(http.StatusForbidden, gin.H{"error": "cross-office edit is not allowed"})
		return
	}

	var input models.PutScheduleInput
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	if err := validateSchedule(input.Schedule); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	oh, err := h.hoursRepo.EnsureRow(dept)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	if err := h.hoursRepo.ReplaceSchedule(oh.ID, input.Schedule); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	// Re-fetch to pick up the new updated_at.
	oh, _ = h.hoursRepo.GetByDepartment(dept)
	now := time.Now().In(manilaLocation())
	status, err := h.buildPayload(oh, now)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, status)
}

// validateSchedule enforces: exactly 7 entries, weekdays 0..6 each once,
// hours in range, open<close when not closed.
func validateSchedule(s []models.DaySchedule) error {
	if len(s) != 7 {
		return errors.New("schedule must contain exactly 7 entries")
	}
	seen := make(map[int]bool, 7)
	for _, d := range s {
		if d.Weekday < 0 || d.Weekday > 6 {
			return fmt.Errorf("weekday must be 0..6 (got %d)", d.Weekday)
		}
		if seen[d.Weekday] {
			return fmt.Errorf("duplicate weekday %d", d.Weekday)
		}
		seen[d.Weekday] = true
		if d.IsClosed {
			continue
		}
		if d.OpenHour < 0 || d.OpenHour > 23 {
			return fmt.Errorf("open_hour out of range on weekday %d", d.Weekday)
		}
		if d.CloseHour < 1 || d.CloseHour > 24 {
			return fmt.Errorf("close_hour out of range on weekday %d", d.Weekday)
		}
		if d.OpenHour >= d.CloseHour {
			return fmt.Errorf("open_hour must be earlier than close_hour on weekday %d", d.Weekday)
		}
	}
	for i := 0; i < 7; i++ {
		if !seen[i] {
			return fmt.Errorf("missing weekday %d", i)
		}
	}
	return nil
}

// buildPayload assembles the OfficeHoursStatus response.
func (h *OfficeHoursHandler) buildPayload(oh *models.OfficeHours, now time.Time) (models.OfficeHoursStatus, error) {
	schedule, err := h.hoursRepo.GetSchedule(oh.ID)
	if err != nil {
		return models.OfficeHoursStatus{}, err
	}
	active, err := h.closuresRepo.GetActive(oh.ID, now)
	if err != nil && !errors.Is(err, sql.ErrNoRows) {
		return models.OfficeHoursStatus{}, err
	}
	upcoming, err := h.closuresRepo.GetUpcoming(oh.ID, now)
	if err != nil {
		return models.OfficeHoursStatus{}, err
	}
	status := computeStatus(now, schedule, active)
	status.Department = oh.Department
	status.Schedule = schedule
	status.ActiveClosure = active
	status.UpcomingClosures = upcoming
	status.UpdatedAt = oh.UpdatedAt
	return status, nil
}

// computeStatus is pure: given the clock, the schedule, and any active
// closure, it returns is_open + a human status_message. Tested in
// office_hours_test.go.
//
// Precedence:
//  1. Active closure  → CLOSED (reason or "Temporarily closed").
//  2. Today is closed → CLOSED ("Office is closed today").
//  3. open_hour <= now.Hour() < close_hour → OPEN.
//  4. Otherwise       → CLOSED ("Outside office hours").
func computeStatus(now time.Time, schedule []models.DaySchedule, active *models.Closure) models.OfficeHoursStatus {
	if active != nil {
		msg := "Temporarily closed"
		if active.Reason != nil && *active.Reason != "" {
			msg = "Closed: " + *active.Reason
		}
		return models.OfficeHoursStatus{IsOpen: false, StatusMessage: msg}
	}
	wd := int(now.Weekday()) // 0=Sun..6=Sat — matches our schema.
	var today *models.DaySchedule
	for i := range schedule {
		if schedule[i].Weekday == wd {
			today = &schedule[i]
			break
		}
	}
	if today == nil {
		return models.OfficeHoursStatus{IsOpen: false, StatusMessage: "No schedule configured"}
	}
	if today.IsClosed {
		return models.OfficeHoursStatus{IsOpen: false, StatusMessage: "Office is closed today"}
	}
	h := now.Hour()
	if h >= today.OpenHour && h < today.CloseHour {
		return models.OfficeHoursStatus{
			IsOpen:        true,
			StatusMessage: fmt.Sprintf("Open today, %s – %s", formatHour(today.OpenHour), formatHour(today.CloseHour)),
		}
	}
	return models.OfficeHoursStatus{IsOpen: false, StatusMessage: "Outside office hours"}
}

// authorizeDept checks role-vs-dept (registrar role can only edit Registrar
// Office, accounting role can only edit Finance Office). Admins pass through.
func authorizeDept(c *gin.Context, dept string) bool {
	roleVal, _ := c.Get(middleware.CtxKeyRole)
	role, _ := roleVal.(string)
	if role == "registrar" && dept != "Registrar Office" {
		return false
	}
	if role == "accounting" && dept != "Finance Office" {
		return false
	}
	return true
}

func formatHour(h int) string {
	if h == 0 || h == 24 {
		return "12:00 AM"
	}
	suffix := "AM"
	if h >= 12 {
		suffix = "PM"
	}
	display := h % 12
	if display == 0 {
		display = 12
	}
	return fmt.Sprintf("%d:00 %s", display, suffix)
}

func manilaLocation() *time.Location {
	if loc, err := time.LoadLocation("Asia/Manila"); err == nil {
		return loc
	}
	return time.FixedZone("Asia/Manila", 8*60*60)
}
```

- [ ] **Step 4: Run the tests**

```bash
cd backend && go test ./internal/handlers/ -run TestComputeStatus -v
```

Expected: PASS for all 5 tests.

- [ ] **Step 5: Verify build**

```bash
cd backend && go build ./...
```

Expected: still fails — `cmd/main.go` references `officeHoursH.Set` (replaced) and the `OfficeHoursHandler` constructor signature changed. Task 11 fixes that.

- [ ] **Step 6: Commit**

```bash
git add backend/internal/handlers/office_hours.go \
        backend/internal/handlers/office_hours_test.go
git commit -m "feat(handlers): computeStatus + PutSchedule, with unit tests"
```

---

## Section 4 — Closure Handlers

### Task 6: `POST /api/office-hours/:dept/closures` (TDD — overlap returns 409)

**Files:**
- Create: `backend/internal/handlers/office_hours_closures.go`
- Create: `backend/internal/handlers/office_hours_closures_test.go`

- [ ] **Step 1: Write the failing test**

Path: `backend/internal/handlers/office_hours_closures_test.go`

```go
package handlers

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"idealink/internal/middleware"
	"idealink/internal/models"
	"idealink/internal/repository"

	"github.com/gin-gonic/gin"
)

// --- mocks ---

type mockHoursRepo struct {
	row *models.OfficeHours
}

func (m *mockHoursRepo) EnsureRow(dept string) (*models.OfficeHours, error) {
	if m.row == nil {
		m.row = &models.OfficeHours{ID: 1, Department: dept, UpdatedAt: time.Now()}
	}
	return m.row, nil
}
func (m *mockHoursRepo) GetByDepartment(dept string) (*models.OfficeHours, error) {
	if m.row != nil && m.row.Department == dept {
		return m.row, nil
	}
	return nil, nil
}
func (m *mockHoursRepo) GetSchedule(int) ([]models.DaySchedule, error) {
	return standardSchedule(), nil
}
func (m *mockHoursRepo) ReplaceSchedule(int, []models.DaySchedule) error { return nil }

type mockClosuresRepo struct {
	createErr error
	created   *models.Closure
	byID      map[int]*models.Closure
	cancelled bool
}

func (m *mockClosuresRepo) Create(officeID int, start, end time.Time, reason *string, by *int) (*models.Closure, error) {
	if m.createErr != nil {
		return nil, m.createErr
	}
	c := &models.Closure{ID: 42, StartAt: start, EndAt: end, Reason: reason, CreatedAt: time.Now()}
	m.created = c
	return c, nil
}
func (m *mockClosuresRepo) List(int, repository.ClosureStatus, int, int) ([]models.Closure, error) {
	return []models.Closure{}, nil
}
func (m *mockClosuresRepo) GetActive(int, time.Time) (*models.Closure, error)   { return nil, nil }
func (m *mockClosuresRepo) GetUpcoming(int, time.Time) ([]models.Closure, error) { return nil, nil }
func (m *mockClosuresRepo) FindByID(id int) (*models.Closure, error) {
	if c, ok := m.byID[id]; ok {
		return c, nil
	}
	return nil, nil
}
func (m *mockClosuresRepo) Cancel(id int, now time.Time) (*models.Closure, error) {
	c, _ := m.FindByID(id)
	if c == nil {
		return nil, nil
	}
	t := now
	c.CancelledAt = &t
	m.cancelled = true
	return c, nil
}

// --- helpers ---

func newTestRouter(h *OfficeHoursHandler, role string) *gin.Engine {
	gin.SetMode(gin.TestMode)
	r := gin.New()
	r.Use(func(c *gin.Context) {
		c.Set(middleware.CtxKeyRole, role)
		c.Next()
	})
	r.POST("/api/office-hours/:dept/closures", h.CreateClosure)
	r.DELETE("/api/office-hours/:dept/closures/:id", h.CancelClosure)
	r.GET("/api/office-hours/:dept/closures", h.ListClosures)
	return r
}

// --- tests ---

func TestCreateClosure_OverlapReturns409(t *testing.T) {
	hours := &mockHoursRepo{}
	closures := &mockClosuresRepo{createErr: repository.ErrClosureOverlap}
	h := NewOfficeHoursHandler(hours, closures)
	r := newTestRouter(h, "registrar")

	body, _ := json.Marshal(models.CreateClosureInput{
		StartAt: "2026-05-01T08:00:00+08:00",
		EndAt:   "2026-05-01T17:00:00+08:00",
	})
	req := httptest.NewRequest(http.MethodPost, "/api/office-hours/Registrar Office/closures", bytes.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

	if w.Code != http.StatusConflict {
		t.Fatalf("expected 409, got %d body=%s", w.Code, w.Body.String())
	}
}

func TestCreateClosure_CrossOfficeForbidden(t *testing.T) {
	h := NewOfficeHoursHandler(&mockHoursRepo{}, &mockClosuresRepo{})
	r := newTestRouter(h, "registrar")
	body, _ := json.Marshal(models.CreateClosureInput{
		StartAt: "2026-05-01T08:00:00+08:00",
		EndAt:   "2026-05-01T17:00:00+08:00",
	})
	req := httptest.NewRequest(http.MethodPost, "/api/office-hours/Finance Office/closures", bytes.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)
	if w.Code != http.StatusForbidden {
		t.Fatalf("expected 403, got %d", w.Code)
	}
}

func TestCancelClosure_PastReturns409(t *testing.T) {
	past := time.Now().Add(-24 * time.Hour)
	hours := &mockHoursRepo{}
	// Office row id will be 1 once EnsureRow runs; pre-set the closure to
	// belong to that office so the ownership check passes.
	closures := &mockClosuresRepoCancelOverride{
		mockClosuresRepo: mockClosuresRepo{
			byID: map[int]*models.Closure{
				7: {ID: 7, OfficeHoursID: 1, StartAt: past.Add(-time.Hour), EndAt: past},
			},
		},
		cancelErr: repository.ErrClosurePast,
	}
	h := NewOfficeHoursHandler(hours, closures)
	r := newTestRouter(h, "registrar")

	req := httptest.NewRequest(http.MethodDelete, "/api/office-hours/Registrar Office/closures/7", nil)
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

	if w.Code != http.StatusConflict {
		t.Fatalf("expected 409, got %d body=%s", w.Code, w.Body.String())
	}
}

// mockClosuresRepoCancelOverride lets a test inject an error from Cancel
// while keeping the rest of the mock behaviour.
type mockClosuresRepoCancelOverride struct {
	mockClosuresRepo
	cancelErr error
}

func (m *mockClosuresRepoCancelOverride) Cancel(id int, now time.Time) (*models.Closure, error) {
	if m.cancelErr != nil {
		return nil, m.cancelErr
	}
	return m.mockClosuresRepo.Cancel(id, now)
}
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd backend && go test ./internal/handlers/ -run TestCreateClosure -v
```

Expected: FAIL — `undefined: NewOfficeHoursHandler` argument count mismatch *or* `undefined: CreateClosure`.

- [ ] **Step 3: Implement the closure handlers**

Path: `backend/internal/handlers/office_hours_closures.go`

```go
package handlers

import (
	"database/sql"
	"errors"
	"net/http"
	"strconv"
	"time"

	"idealink/internal/middleware"
	"idealink/internal/models"
	"idealink/internal/repository"

	"github.com/gin-gonic/gin"
)

// CreateClosure → POST /api/office-hours/:dept/closures (staff)
func (h *OfficeHoursHandler) CreateClosure(c *gin.Context) {
	dept := c.Param("dept")
	if !authorizeDept(c, dept) {
		c.JSON(http.StatusForbidden, gin.H{"error": "cross-office edit is not allowed"})
		return
	}

	var input models.CreateClosureInput
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	startAt, endAt, err := parseClosureRange(input.StartAt, input.EndAt)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	if input.Reason != nil && len(*input.Reason) > 500 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "reason exceeds 500 chars"})
		return
	}

	oh, err := h.hoursRepo.EnsureRow(dept)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	var createdBy *int
	if v, ok := c.Get(middleware.CtxKeyUserID); ok {
		if id, ok := v.(int); ok {
			createdBy = &id
		}
	}

	closure, err := h.closuresRepo.Create(oh.ID, startAt, endAt, input.Reason, createdBy)
	if errors.Is(err, repository.ErrClosureOverlap) {
		c.JSON(http.StatusConflict, gin.H{"error": "closure overlaps with an existing closure"})
		return
	}
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusCreated, closure)
}

// ListClosures → GET /api/office-hours/:dept/closures (staff)
func (h *OfficeHoursHandler) ListClosures(c *gin.Context) {
	dept := c.Param("dept")
	if !authorizeDept(c, dept) {
		c.JSON(http.StatusForbidden, gin.H{"error": "cross-office read is not allowed"})
		return
	}
	oh, err := h.hoursRepo.EnsureRow(dept)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	status := repository.ClosureStatus(c.DefaultQuery("status", "all"))
	switch status {
	case repository.ClosureStatusActive,
		repository.ClosureStatusUpcoming,
		repository.ClosureStatusPast,
		repository.ClosureStatusAll:
	default:
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid status"})
		return
	}
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "50"))
	if limit < 1 || limit > 100 {
		limit = 50
	}
	offset, _ := strconv.Atoi(c.DefaultQuery("offset", "0"))
	if offset < 0 {
		offset = 0
	}

	closures, err := h.closuresRepo.List(oh.ID, status, limit, offset)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"closures": closures})
}

// CancelClosure → DELETE /api/office-hours/:dept/closures/:id (staff)
func (h *OfficeHoursHandler) CancelClosure(c *gin.Context) {
	dept := c.Param("dept")
	if !authorizeDept(c, dept) {
		c.JSON(http.StatusForbidden, gin.H{"error": "cross-office edit is not allowed"})
		return
	}
	idStr := c.Param("id")
	id, err := strconv.Atoi(idStr)
	if err != nil || id <= 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid id"})
		return
	}
	oh, err := h.hoursRepo.EnsureRow(dept)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	// Ownership check: the closure must belong to this office.
	existing, err := h.closuresRepo.FindByID(id)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	if existing == nil || existing.OfficeHoursID != oh.ID {
		c.JSON(http.StatusNotFound, gin.H{"error": "closure not found"})
		return
	}

	now := time.Now().In(manilaLocation())
	updated, err := h.closuresRepo.Cancel(id, now)
	if errors.Is(err, repository.ErrClosurePast) {
		c.JSON(http.StatusConflict, gin.H{"error": "closure is already past"})
		return
	}
	if errors.Is(err, sql.ErrNoRows) {
		c.JSON(http.StatusNotFound, gin.H{"error": "closure not found"})
		return
	}
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, updated)
}

// parseClosureRange accepts RFC3339 or "YYYY-MM-DDTHH:MM" (HTML
// datetime-local). Strings without a timezone are interpreted in
// Asia/Manila. Returns 400-friendly errors.
func parseClosureRange(startStr, endStr string) (time.Time, time.Time, error) {
	pht := time.FixedZone("PHT", 8*3600)
	parse := func(s string) (time.Time, error) {
		for _, layout := range []string{time.RFC3339, "2006-01-02T15:04"} {
			t, err := time.ParseInLocation(layout, s, pht)
			if err == nil {
				return t, nil
			}
		}
		return time.Time{}, errors.New("expected RFC3339 or YYYY-MM-DDTHH:MM")
	}
	start, err := parse(startStr)
	if err != nil {
		return time.Time{}, time.Time{}, errors.New("invalid start_at: " + err.Error())
	}
	end, err := parse(endStr)
	if err != nil {
		return time.Time{}, time.Time{}, errors.New("invalid end_at: " + err.Error())
	}
	if !end.After(start) {
		return time.Time{}, time.Time{}, errors.New("end_at must be after start_at")
	}
	if !end.After(time.Now()) {
		return time.Time{}, time.Time{}, errors.New("end_at must be in the future")
	}
	return start, end, nil
}
```

- [ ] **Step 4: Run the closure handler tests**

```bash
cd backend && go test ./internal/handlers/ -run TestCreateClosure -v
cd backend && go test ./internal/handlers/ -run TestCancelClosure -v
```

Expected: PASS for the overlap-409, cross-office-403, and cancel-past-409 tests.

- [ ] **Step 5: Commit**

```bash
git add backend/internal/handlers/office_hours_closures.go \
        backend/internal/handlers/office_hours_closures_test.go
git commit -m "feat(api): closure handlers — POST/GET/DELETE with overlap + cancel semantics"
```

---

### Task 7: Wire repos and routes in `main.go`

**Files:**
- Modify: `backend/cmd/main.go`

- [ ] **Step 1: Find the office-hours wiring block**

In `backend/cmd/main.go`, locate:

```go
officeHoursRepo := repository.NewOfficeHoursRepo(db)
…
officeHoursH := handlers.NewOfficeHoursHandler(officeHoursRepo)
```

Replace with:

```go
officeHoursRepo := repository.NewOfficeHoursRepo(db)
officeHoursClosuresRepo := repository.NewOfficeHoursClosuresRepo(db)
…
officeHoursH := handlers.NewOfficeHoursHandler(officeHoursRepo, officeHoursClosuresRepo)
```

(The `…` indicates other unrelated wiring; keep it as-is.)

- [ ] **Step 2: Update routes**

In `backend/cmd/main.go`, find:

```go
api.GET("/office-hours/:dept", officeHoursH.Get)
…
staff.POST("/office-hours/:dept", officeHoursH.Set)
```

Replace the public `GET` (keep) and the staff `POST` (remove, replace) with:

```go
api.GET("/office-hours/:dept", officeHoursH.Get)
```

Inside the `staff` group, replace `staff.POST("/office-hours/:dept", officeHoursH.Set)` with:

```go
staff.PUT("/office-hours/:dept/schedule",        officeHoursH.PutSchedule)
staff.GET("/office-hours/:dept/closures",        officeHoursH.ListClosures)
staff.POST("/office-hours/:dept/closures",       officeHoursH.CreateClosure)
staff.DELETE("/office-hours/:dept/closures/:id", officeHoursH.CancelClosure)
```

- [ ] **Step 3: Verify build + run all tests**

```bash
cd backend && go build ./...
cd backend && go test ./...
```

Expected: clean build, all tests pass (existing tests + the 5 status tests + 3 closure handler tests).

- [ ] **Step 4: Commit**

```bash
git add backend/cmd/main.go
git commit -m "feat(api): register office-hours v2 routes; remove POST /office-hours/:dept"
```

---

## Section 5 — Frontend API client + types

### Task 8: Update `types.ts` and `api/officeHours.ts`

**Files:**
- Modify: `frontend/src/types.ts`
- Modify: `frontend/src/api/officeHours.ts`

- [ ] **Step 1: Update types**

In `frontend/src/types.ts`, locate the existing `OfficeHoursStatus` type. Replace it (and add `DaySchedule` and `Closure`):

```ts
export interface DaySchedule {
  weekday: number       // 0=Sun..6=Sat
  open_hour: number
  close_hour: number
  is_closed: boolean
}

export interface Closure {
  id: number
  start_at: string      // ISO timestamp
  end_at: string
  reason?: string | null
  cancelled_at?: string | null
  created_by_id?: number | null
  created_at: string
}

export interface OfficeHoursStatus {
  department: string
  is_open: boolean
  status_message: string
  schedule: DaySchedule[]
  active_closure: Closure | null
  upcoming_closures: Closure[]
  updated_at: string
}
```

> If other files import `OfficeHoursStatus` and use the old field names
> (`open_hour`, `close_hour` directly on the status), they will fail to
> compile. We fix `OfficeHoursBanner.tsx` in Task 10 and `StaffDashboard.tsx`
> in Task 16.

- [ ] **Step 2: Replace the API client**

Path: `frontend/src/api/officeHours.ts`

```ts
import client from './client'
import type { Closure, DaySchedule, OfficeHoursStatus } from '../types'

export const getOfficeHours = (dept: string) =>
  client.get<OfficeHoursStatus>(`/api/office-hours/${encodeURIComponent(dept)}`)

export const putSchedule = (dept: string, schedule: DaySchedule[]) =>
  client.put<OfficeHoursStatus>(
    `/api/office-hours/${encodeURIComponent(dept)}/schedule`,
    { schedule },
  )

export type ClosureStatus = 'active' | 'upcoming' | 'past' | 'all'

export const listClosures = (dept: string, status: ClosureStatus = 'all', limit = 50, offset = 0) =>
  client.get<{ closures: Closure[] }>(
    `/api/office-hours/${encodeURIComponent(dept)}/closures`,
    { params: { status, limit, offset } },
  )

export interface CreateClosurePayload {
  start_at: string  // RFC3339 or "YYYY-MM-DDTHH:MM"
  end_at: string
  reason?: string
}

export const createClosure = (dept: string, payload: CreateClosurePayload) =>
  client.post<Closure>(`/api/office-hours/${encodeURIComponent(dept)}/closures`, payload)

export const cancelClosure = (dept: string, id: number) =>
  client.delete<Closure>(`/api/office-hours/${encodeURIComponent(dept)}/closures/${id}`)
```

- [ ] **Step 3: Verify the strict TS build**

```bash
cd frontend && npm run build
```

Expected: build **fails** with type errors in `OfficeHoursBanner.tsx` and `StaffDashboard.tsx` because they read `open_hour`/`close_hour` directly off the status. Tasks 10 and 16 fix those — proceed regardless.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/types.ts frontend/src/api/officeHours.ts
git commit -m "feat(api): typed office-hours v2 client (schedule + closures)"
```

---

## Section 6 — Frontend Pieces

### Task 9: `OfficeStatusPill` (read-only dashboard widget)

**Files:**
- Create: `frontend/src/components/shared/OfficeStatusPill.tsx`

- [ ] **Step 1: Create the component**

Path: `frontend/src/components/shared/OfficeStatusPill.tsx`

```tsx
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Clock, AlertCircle } from 'lucide-react'
import { getOfficeHours } from '../../api/officeHours'
import type { OfficeHoursStatus } from '../../types'

interface Props {
  office: 'Registrar Office' | 'Finance Office'
  /**
   * Where the "Manage →" link goes. The two staff portals are the only
   * callers; both pass an absolute path.
   */
  manageHref: string
}

export function OfficeStatusPill({ office, manageHref }: Props) {
  const [status, setStatus] = useState<OfficeHoursStatus | null>(null)

  useEffect(() => {
    let cancelled = false
    getOfficeHours(office)
      .then(res => { if (!cancelled) setStatus(res.data) })
      .catch(() => { if (!cancelled) setStatus(null) })
    return () => { cancelled = true }
  }, [office])

  if (!status) {
    return <div className="skeleton h-12 rounded-xl" />
  }

  const isOpen = status.is_open
  const dotClass = isOpen ? 'bg-green-400' : 'bg-red-400'

  return (
    <div className={`flex items-center gap-3 px-4 py-3 rounded-xl border ${
      isOpen
        ? 'bg-green-500/8 border-green-500/20'
        : 'bg-red-500/8 border-red-500/20'
    }`}>
      <span className="relative flex h-3 w-3 items-center justify-center shrink-0">
        {isOpen && (
          <span className={`absolute inline-flex h-full w-full rounded-full ${dotClass} opacity-40 animate-ping`} />
        )}
        <span className={`relative inline-flex h-2.5 w-2.5 rounded-full ${dotClass}`} />
      </span>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className={isOpen ? 'badge-open' : 'badge-closed'}>
            {isOpen ? 'OPEN' : 'CLOSED'}
          </span>
          <span className="text-sm font-medium text-white font-ui">{office}</span>
          <span className="text-xs text-gray-400 flex items-center gap-1 font-ui">
            {isOpen ? <Clock size={11} /> : <AlertCircle size={11} />}
            {status.status_message}
          </span>
        </div>
      </div>
      <Link
        to={manageHref}
        className="text-xs font-semibold text-ascb-orange hover:underline shrink-0 font-ui"
      >
        Manage →
      </Link>
    </div>
  )
}
```

- [ ] **Step 2: Verify the strict TS build**

```bash
cd frontend && npx tsc --noEmit
```

Expected: only the two pre-existing failures (`OfficeHoursBanner.tsx`, `StaffDashboard.tsx`); the new file should compile.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/shared/OfficeStatusPill.tsx
git commit -m "feat(ui): OfficeStatusPill — read-only dashboard widget"
```

---

### Task 10: Refactor `OfficeHoursBanner` to read today's hours from `schedule`

**Files:**
- Modify: `frontend/src/components/shared/OfficeHoursBanner.tsx`

- [ ] **Step 1: Replace the file**

Path: `frontend/src/components/shared/OfficeHoursBanner.tsx`

```tsx
import { useEffect, useState } from 'react'
import { Clock, AlertCircle } from 'lucide-react'
import { getOfficeHours } from '../../api/officeHours'
import type { OfficeHoursStatus } from '../../types'

interface Props { department: string }

function formatHour(h: number): string {
  if (h === 0 || h === 24) return '12:00 AM'
  const suffix = h >= 12 ? 'PM' : 'AM'
  const display = h % 12 === 0 ? 12 : h % 12
  return `${display}:00 ${suffix}`
}

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

function todayHoursLabel(status: OfficeHoursStatus): string {
  const now = new Date()
  const wd = now.getDay() // 0=Sun..6=Sat
  const today = status.schedule.find(d => d.weekday === wd)
  if (!today || today.is_closed) return `${DAY_LABELS[wd]} · Closed today`
  return `${DAY_LABELS[wd]} · ${formatHour(today.open_hour)} – ${formatHour(today.close_hour)}`
}

export function OfficeHoursBanner({ department }: Props) {
  const [status, setStatus] = useState<OfficeHoursStatus | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!department) return
    let cancelled = false
    setLoading(true)
    getOfficeHours(department)
      .then(res => { if (!cancelled) setStatus(res.data) })
      .catch(() => { if (!cancelled) setStatus(null) })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [department])

  if (loading) return <div className="skeleton h-12 rounded-xl mb-4" />
  if (!status) return null

  const isOpen = status.is_open

  return (
    <div className={`flex items-start gap-3 p-4 rounded-xl border mb-2 transition-all duration-300 ${
      isOpen ? 'bg-green-500/8 border-green-500/20' : 'bg-red-500/8 border-red-500/20'
    }`}>
      <div className="shrink-0 mt-0.5">
        {isOpen ? (
          <span className="relative flex h-4 w-4 items-center justify-center mt-0.5">
            <span className="absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-40 animate-ping" />
            <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-green-400" />
          </span>
        ) : (
          <AlertCircle size={17} className="text-red-400" />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className={isOpen ? 'badge-open' : 'badge-closed'}>
            {isOpen ? 'OPEN' : 'CLOSED'}
          </span>
          <span className="text-sm font-medium text-white font-ui">{department}</span>
          <span className="text-xs text-gray-400 flex items-center gap-1 font-ui">
            <Clock size={11} /> {todayHoursLabel(status)}
          </span>
        </div>
        {!isOpen && status.active_closure?.reason && (
          <p className="text-sm text-red-300 mt-1 font-body">{status.active_closure.reason}</p>
        )}
        {!isOpen && status.active_closure?.end_at && (
          <p className="text-xs text-gray-400 mt-0.5 font-ui">
            Expected reopen:{' '}
            {new Date(status.active_closure.end_at).toLocaleString('en-PH', {
              weekday: 'short', month: 'short', day: 'numeric',
              hour: 'numeric', minute: '2-digit',
            })}
          </p>
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Verify the strict TS build**

```bash
cd frontend && npx tsc --noEmit
```

Expected: only `StaffDashboard.tsx` still fails (it uses `setOfficeHours` which we removed). Task 16 fixes that.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/shared/OfficeHoursBanner.tsx
git commit -m "feat(ui): OfficeHoursBanner reads today's hours from schedule"
```

---

## Section 7 — OfficeHoursPage

### Task 11: `OfficeHoursPage` skeleton (route stub + GET integration + header pill)

**Files:**
- Create: `frontend/src/pages/shared/OfficeHoursPage.tsx`

> The full page lands across Tasks 11–14. Each task adds one card and is
> independently testable in the browser. After Task 11 you'll have an empty
> page with a working header.

- [ ] **Step 1: Create the page skeleton**

Path: `frontend/src/pages/shared/OfficeHoursPage.tsx`

```tsx
import { useEffect, useState } from 'react'
import { Clock, AlertCircle } from 'lucide-react'
import { toast } from 'sonner'
import axios from 'axios'
import { getOfficeHours } from '../../api/officeHours'
import type { OfficeHoursStatus } from '../../types'

interface Props {
  office: 'Registrar Office' | 'Finance Office'
}

export function OfficeHoursPage({ office }: Props) {
  const [status, setStatus] = useState<OfficeHoursStatus | null>(null)
  const [loading, setLoading]   = useState(true)

  const reload = async () => {
    try {
      const res = await getOfficeHours(office)
      setStatus(res.data)
    } catch (err) {
      toast.error(axios.isAxiosError(err) ? (err.response?.data?.error ?? 'Could not load hours') : 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { reload() /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [office])

  if (loading || !status) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-2 border-ascb-orange border-t-transparent animate-spin" />
      </div>
    )
  }

  const isOpen = status.is_open
  return (
    <div className="max-w-3xl mx-auto px-5 py-8 space-y-6">
      <header className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-white font-display">Office Hours</h1>
          <p className="text-gray-400 text-sm font-ui mt-1">{office}</p>
        </div>
        <div className={`px-3 py-1.5 rounded-full border flex items-center gap-2 ${
          isOpen ? 'bg-green-500/8 border-green-500/20' : 'bg-red-500/8 border-red-500/20'
        }`}>
          {isOpen
            ? <span className="h-2 w-2 rounded-full bg-green-400 inline-block" />
            : <AlertCircle size={12} className="text-red-400" />}
          <span className="text-xs font-ui font-semibold">
            {isOpen ? 'OPEN' : 'CLOSED'}
          </span>
          <span className="text-xs text-gray-400 font-ui">· {status.status_message}</span>
        </div>
      </header>

      {/* Card 1 — Weekly Schedule (Task 12) */}
      {/* Card 2 — Schedule a Temporary Closure (Task 13) */}
      {/* Card 3 — Closures Timeline (Task 14) */}
    </div>
  )
}
```

- [ ] **Step 2: Verify the strict TS build**

```bash
cd frontend && npx tsc --noEmit
```

Expected: only the `StaffDashboard.tsx` failure (still pending).

- [ ] **Step 3: Commit**

```bash
git add frontend/src/pages/shared/OfficeHoursPage.tsx
git commit -m "feat(ui): OfficeHoursPage skeleton — header + status pill"
```

---

### Task 12: `OfficeHoursPage` — Card 1 (Weekly Schedule editor)

**Files:**
- Modify: `frontend/src/pages/shared/OfficeHoursPage.tsx`

- [ ] **Step 1: Add schedule state, dirty tracking, and save flow**

Inside `OfficeHoursPage`, **after** the existing `loading` state line, add:

```tsx
  const [draftSchedule, setDraftSchedule] = useState<DaySchedule[] | null>(null)
  const [savingSchedule, setSavingSchedule] = useState(false)
```

Update the imports at the top:

```tsx
import { useEffect, useMemo, useState } from 'react'
import { Clock, AlertCircle } from 'lucide-react'
import { toast } from 'sonner'
import axios from 'axios'
import { getOfficeHours, putSchedule } from '../../api/officeHours'
import type { DaySchedule, OfficeHoursStatus } from '../../types'
```

Inside the existing `reload` success branch (`setStatus(res.data)`), add:

```tsx
      setDraftSchedule(res.data.schedule)
```

(So when the page loads or refreshes, the editable copy starts equal to the saved copy.)

- [ ] **Step 2: Add the visual-order helper, dirty flag, and save handler**

After the `reload` definition, add:

```tsx
  // The data is keyed Sun..Sat (0..6), but the UI shows Mon..Sun for staff.
  const VISUAL_ORDER = [1, 2, 3, 4, 5, 6, 0] as const
  const DAY_NAMES: Record<number, string> = {
    0: 'Sunday', 1: 'Monday', 2: 'Tuesday', 3: 'Wednesday',
    4: 'Thursday', 5: 'Friday', 6: 'Saturday',
  }

  const isDirty = useMemo(() => {
    if (!status || !draftSchedule) return false
    return JSON.stringify(status.schedule) !== JSON.stringify(draftSchedule)
  }, [status, draftSchedule])

  const updateDay = (weekday: number, patch: Partial<DaySchedule>) => {
    if (!draftSchedule) return
    setDraftSchedule(draftSchedule.map(d => d.weekday === weekday ? { ...d, ...patch } : d))
  }

  const saveSchedule = async () => {
    if (!draftSchedule) return
    // Pre-validate so the API doesn't have to bounce a 400.
    for (const d of draftSchedule) {
      if (!d.is_closed && d.open_hour >= d.close_hour) {
        toast.error(`${DAY_NAMES[d.weekday]}: Open must be earlier than Close`)
        return
      }
    }
    setSavingSchedule(true)
    try {
      const res = await putSchedule(office, draftSchedule)
      setStatus(res.data)
      setDraftSchedule(res.data.schedule)
      toast.success('Schedule saved')
    } catch (err) {
      toast.error(axios.isAxiosError(err) ? (err.response?.data?.error ?? 'Could not save schedule') : 'Something went wrong')
    } finally {
      setSavingSchedule(false)
    }
  }

  const HOUR_OPTIONS = Array.from({ length: 25 }, (_, i) => i) // 0..24
  const formatHour = (h: number) => {
    if (h === 0 || h === 24) return '12:00 AM'
    const suffix = h >= 12 && h < 24 ? 'PM' : 'AM'
    const display = h % 12 === 0 ? 12 : h % 12
    return `${display}:00 ${suffix}`
  }
```

- [ ] **Step 3: Render Card 1**

Replace the comment `{/* Card 1 — Weekly Schedule (Task 12) */}` with:

```tsx
      <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 md:p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-white font-ui">Weekly Schedule</h2>
          <button
            type="button"
            onClick={saveSchedule}
            disabled={!isDirty || savingSchedule}
            className="h-9 px-4 rounded-xl text-white font-semibold font-ui text-xs disabled:opacity-40 disabled:cursor-not-allowed"
            style={{ background: 'linear-gradient(135deg, #F47C20 0%, #d4651a 100%)' }}
          >
            {savingSchedule ? 'Saving…' : 'Save schedule'}
          </button>
        </div>

        <div className="space-y-2">
          {draftSchedule && VISUAL_ORDER.map(wd => {
            const day = draftSchedule.find(d => d.weekday === wd)!
            const invalid = !day.is_closed && day.open_hour >= day.close_hour
            return (
              <div key={wd} className="grid grid-cols-1 sm:grid-cols-[120px_1fr_1fr_auto] gap-3 items-center px-3 py-2 rounded-xl bg-white/[0.02] border border-white/8">
                <span className="text-sm font-medium text-white font-ui">{DAY_NAMES[wd]}</span>
                <select
                  className="input-field h-10 w-full"
                  value={day.open_hour}
                  disabled={day.is_closed}
                  onChange={e => updateDay(wd, { open_hour: parseInt(e.target.value, 10) })}
                >
                  {HOUR_OPTIONS.slice(0, 24).map(h => (
                    <option key={h} value={h}>Open at {formatHour(h)}</option>
                  ))}
                </select>
                <select
                  className="input-field h-10 w-full"
                  value={day.close_hour}
                  disabled={day.is_closed}
                  onChange={e => updateDay(wd, { close_hour: parseInt(e.target.value, 10) })}
                >
                  {HOUR_OPTIONS.slice(1).map(h => (
                    <option key={h} value={h}>Closes at {formatHour(h)}</option>
                  ))}
                </select>
                <label className="flex items-center gap-2 text-xs text-gray-300 font-ui select-none">
                  <input
                    type="checkbox"
                    checked={day.is_closed}
                    onChange={e => updateDay(wd, { is_closed: e.target.checked })}
                  />
                  Closed
                </label>
                {invalid && (
                  <p className="sm:col-span-4 text-[11px] text-red-400 font-ui">Open must be earlier than Close.</p>
                )}
              </div>
            )
          })}
        </div>
      </section>
```

- [ ] **Step 4: Verify the strict TS build**

```bash
cd frontend && npm run build
```

Expected: only `StaffDashboard.tsx` still failing.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/pages/shared/OfficeHoursPage.tsx
git commit -m "feat(ui): OfficeHoursPage Card 1 — per-day weekly schedule"
```

---

### Task 13: `OfficeHoursPage` — Card 2 (Schedule a Temporary Closure)

**Files:**
- Modify: `frontend/src/pages/shared/OfficeHoursPage.tsx`

- [ ] **Step 1: Add closure-form state + helpers**

Inside `OfficeHoursPage`, after `savingSchedule`, add:

```tsx
  const [closureFrom, setClosureFrom] = useState('')
  const [closureTo,   setClosureTo]   = useState('')
  const [closureReason, setClosureReason] = useState('')
  const [creatingClosure, setCreatingClosure] = useState(false)
```

Add to the imports:

```tsx
import { createClosure } from '../../api/officeHours'
```

Add a helper near the other helpers:

```tsx
  // datetime-local needs "YYYY-MM-DDTHH:MM" in local time, no timezone.
  const todayBounds = () => {
    const now = new Date()
    const pad = (n: number) => String(n).padStart(2, '0')
    const date = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`
    return { from: `${date}T00:00`, to: `${date}T23:59` }
  }

  // Default the inputs to today on first render.
  useEffect(() => {
    const { from, to } = todayBounds()
    setClosureFrom(from)
    setClosureTo(to)
  }, [])
```

Add the submit handler:

```tsx
  const submitClosure = async () => {
    if (!closureFrom || !closureTo) { toast.error('Set both From and To'); return }
    if (closureTo <= closureFrom)   { toast.error('To must be after From'); return }
    setCreatingClosure(true)
    try {
      await createClosure(office, {
        start_at: closureFrom,
        end_at:   closureTo,
        reason:   closureReason.trim() || undefined,
      })
      toast.success('Closure scheduled')
      setClosureReason('')
      const { from, to } = todayBounds()
      setClosureFrom(from)
      setClosureTo(to)
      reload()
    } catch (err) {
      toast.error(axios.isAxiosError(err) ? (err.response?.data?.error ?? 'Could not schedule closure') : 'Something went wrong')
    } finally {
      setCreatingClosure(false)
    }
  }
```

- [ ] **Step 2: Render Card 2**

Replace the comment `{/* Card 2 — Schedule a Temporary Closure (Task 13) */}` with:

```tsx
      <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 md:p-6 space-y-4">
        <h2 className="text-base font-semibold text-white font-ui">Schedule a Temporary Closure</h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-gray-400 font-ui">From</label>
            <input
              type="datetime-local"
              className="input-field h-11 w-full"
              value={closureFrom}
              onChange={e => setClosureFrom(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-gray-400 font-ui">To</label>
            <input
              type="datetime-local"
              className="input-field h-11 w-full"
              value={closureTo}
              onChange={e => setClosureTo(e.target.value)}
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="block text-xs font-semibold text-gray-400 font-ui">Reason (optional)</label>
          <textarea
            className="input-field w-full pt-2 pb-2 min-h-[72px]"
            maxLength={500}
            value={closureReason}
            onChange={e => setClosureReason(e.target.value)}
            placeholder="Power outage, conference, etc."
          />
          <p className="text-[10px] text-gray-500 font-ui text-right">{closureReason.length}/500</p>
        </div>

        <button
          type="button"
          onClick={submitClosure}
          disabled={creatingClosure}
          className="h-10 px-5 rounded-xl text-white font-semibold font-ui text-xs disabled:opacity-40"
          style={{ background: 'linear-gradient(135deg, #F47C20 0%, #d4651a 100%)' }}
        >
          {creatingClosure ? 'Scheduling…' : 'Schedule closure'}
        </button>
      </section>
```

- [ ] **Step 3: Verify**

```bash
cd frontend && npm run build
```

Expected: only `StaffDashboard.tsx` still pending.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/pages/shared/OfficeHoursPage.tsx
git commit -m "feat(ui): OfficeHoursPage Card 2 — schedule a temporary closure"
```

---

### Task 14: `OfficeHoursPage` — Card 3 (Closures Timeline)

**Files:**
- Modify: `frontend/src/pages/shared/OfficeHoursPage.tsx`

- [ ] **Step 1: Add timeline state and fetcher**

Inside `OfficeHoursPage`, add:

```tsx
  const [pastClosures, setPastClosures] = useState<Closure[]>([])
  const [pastOffset,   setPastOffset]   = useState(0)
  const [pastHasMore,  setPastHasMore]  = useState(false)
  const [pastLoading,  setPastLoading]  = useState(false)
  const [cancellingId, setCancellingId] = useState<number | null>(null)
```

Update imports:

```tsx
import { cancelClosure, listClosures } from '../../api/officeHours'
import type { Closure, DaySchedule, OfficeHoursStatus } from '../../types'
```

Add fetchers + handlers:

```tsx
  const PAST_PAGE_SIZE = 20

  const fetchPast = async (offset = 0, append = false) => {
    setPastLoading(true)
    try {
      const res = await listClosures(office, 'past', PAST_PAGE_SIZE, offset)
      const next = res.data.closures
      setPastClosures(append ? [...pastClosures, ...next] : next)
      setPastHasMore(next.length === PAST_PAGE_SIZE)
      setPastOffset(offset + next.length)
    } catch {
      toast.error('Could not load past closures')
    } finally {
      setPastLoading(false)
    }
  }

  // Reload past list whenever the page (re)mounts or after a successful cancel/create.
  useEffect(() => { fetchPast(0, false) /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [office])

  const handleCancel = async (id: number) => {
    setCancellingId(id)
    try {
      await cancelClosure(office, id)
      toast.success('Closure cancelled')
      reload()
      fetchPast(0, false)
    } catch (err) {
      toast.error(axios.isAxiosError(err) ? (err.response?.data?.error ?? 'Could not cancel closure') : 'Something went wrong')
    } finally {
      setCancellingId(null)
    }
  }

  const fmtRange = (start: string, end: string) => {
    const fmt = (s: string) => new Date(s).toLocaleString('en-PH', {
      weekday: 'short', month: 'short', day: 'numeric',
      hour: 'numeric', minute: '2-digit',
    })
    return `${fmt(start)} → ${fmt(end)}`
  }
```

Also wire `submitClosure` to refresh past on success — change the `reload()` line inside `submitClosure` to:

```tsx
      reload()
      fetchPast(0, false)
```

- [ ] **Step 2: Render Card 3**

Replace the comment `{/* Card 3 — Closures Timeline (Task 14) */}` with:

```tsx
      <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 md:p-6 space-y-4">
        <h2 className="text-base font-semibold text-white font-ui">Closures</h2>

        {/* Active */}
        {status.active_closure && (
          <div>
            <h3 className="text-xs uppercase text-red-300 tracking-widest font-ui mb-2">Active</h3>
            <div className="rounded-xl border border-red-500/30 bg-red-500/5 p-4 flex items-start gap-3">
              <AlertCircle size={16} className="text-red-400 mt-0.5 shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-xs text-red-200 font-ui mb-0.5">Happening now</p>
                <p className="text-sm text-white font-ui">{fmtRange(status.active_closure.start_at, status.active_closure.end_at)}</p>
                {status.active_closure.reason && (
                  <p className="text-xs text-gray-300 mt-1 font-body">{status.active_closure.reason}</p>
                )}
              </div>
              <button
                type="button"
                disabled={cancellingId === status.active_closure.id}
                onClick={() => handleCancel(status.active_closure!.id)}
                className="h-8 px-3 rounded-lg text-xs font-semibold text-white bg-red-600 hover:bg-red-500 disabled:opacity-50"
              >
                {cancellingId === status.active_closure.id ? 'Cancelling…' : 'Cancel closure'}
              </button>
            </div>
          </div>
        )}

        {/* Upcoming */}
        {status.upcoming_closures.length > 0 && (
          <div>
            <h3 className="text-xs uppercase text-yellow-300 tracking-widest font-ui mb-2">Upcoming</h3>
            <div className="space-y-2">
              {status.upcoming_closures.map(c => (
                <div key={c.id} className="rounded-xl border border-white/8 bg-white/[0.02] p-3 flex items-start gap-3">
                  <Clock size={14} className="text-yellow-300 mt-0.5 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-white font-ui">{fmtRange(c.start_at, c.end_at)}</p>
                    {c.reason && <p className="text-xs text-gray-400 mt-0.5 font-body">{c.reason}</p>}
                  </div>
                  <button
                    type="button"
                    disabled={cancellingId === c.id}
                    onClick={() => handleCancel(c.id)}
                    className="h-7 px-2.5 rounded-lg text-[11px] font-semibold text-gray-200 bg-white/8 hover:bg-white/15 disabled:opacity-50"
                  >
                    {cancellingId === c.id ? 'Cancelling…' : 'Cancel'}
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Past */}
        <div>
          <h3 className="text-xs uppercase text-gray-500 tracking-widest font-ui mb-2">Past</h3>
          {pastClosures.length === 0 && !pastLoading && (
            <p className="text-xs text-gray-500 font-ui">No past closures.</p>
          )}
          <div className="space-y-2">
            {pastClosures.map(c => (
              <div key={c.id} className="rounded-xl border border-white/8 bg-white/[0.02] p-3 flex items-start gap-3 opacity-80">
                <Clock size={14} className="text-gray-500 mt-0.5 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-200 font-ui">{fmtRange(c.start_at, c.end_at)}</p>
                  {c.reason && <p className="text-xs text-gray-400 mt-0.5 font-body">{c.reason}</p>}
                </div>
                {c.cancelled_at && (
                  <span className="text-[10px] text-gray-500 font-ui uppercase tracking-widest mt-1">cancelled</span>
                )}
              </div>
            ))}
          </div>
          {pastHasMore && (
            <button
              type="button"
              disabled={pastLoading}
              onClick={() => fetchPast(pastOffset, true)}
              className="mt-3 text-xs font-ui text-ascb-orange hover:underline disabled:opacity-50"
            >
              {pastLoading ? 'Loading…' : 'Show more'}
            </button>
          )}
        </div>
      </section>
```

- [ ] **Step 3: Verify**

```bash
cd frontend && npm run build
```

Expected: only `StaffDashboard.tsx` still failing (next task).

- [ ] **Step 4: Commit**

```bash
git add frontend/src/pages/shared/OfficeHoursPage.tsx
git commit -m "feat(ui): OfficeHoursPage Card 3 — active/upcoming/past timeline"
```

---

## Section 8 — Wiring

### Task 15: Sidebar entry + router routes for both portals

**Files:**
- Modify: `frontend/src/components/layout/Sidebar.tsx`
- Modify: `frontend/src/router.tsx`

- [ ] **Step 1: Add sidebar nav items**

In `frontend/src/components/layout/Sidebar.tsx`, update the imports (add `Clock`):

```tsx
import { LayoutDashboard, MessageSquare, Megaphone, Star, UserPlus, LogOut, X, Menu, Clock } from 'lucide-react'
```

Insert two new nav items into the `navItems` array, **before** the existing `/registrar/users` and `/accounting/suggestions` entries respectively:

```tsx
  { to: '/registrar/dashboard',     icon: LayoutDashboard, label: 'Dashboard',    roles: ['registrar'] },
  { to: '/registrar/suggestions',   icon: MessageSquare,   label: 'Feedback',     roles: ['registrar'] },
  { to: '/registrar/office-hours',  icon: Clock,           label: 'Office Hours', roles: ['registrar'] },  // ← new
  { to: '/registrar/users',         icon: UserPlus,        label: 'Users',        roles: ['registrar'] },
  { to: '/accounting/dashboard',    icon: LayoutDashboard, label: 'Dashboard',    roles: ['accounting'] },
  { to: '/accounting/suggestions',  icon: MessageSquare,   label: 'Feedback',     roles: ['accounting'] },
  { to: '/accounting/office-hours', icon: Clock,           label: 'Office Hours', roles: ['accounting'] },  // ← new
```

- [ ] **Step 2: Register the routes**

In `frontend/src/router.tsx`, add the import:

```tsx
import { OfficeHoursPage } from './pages/shared/OfficeHoursPage'
```

Find the registrar route block (around `<Route path="/registrar/dashboard" element={<RegistrarDashboard />} />`). Add right after it:

```tsx
            <Route path="/registrar/office-hours" element={<OfficeHoursPage office="Registrar Office" />} />
```

Find the accounting block. Add right after `<Route path="/accounting/dashboard" element={<AccountingDashboard />} />`:

```tsx
            <Route path="/accounting/office-hours" element={<OfficeHoursPage office="Finance Office" />} />
```

- [ ] **Step 3: Verify**

```bash
cd frontend && npm run build
```

Expected: only the `StaffDashboard.tsx` failure remains.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/components/layout/Sidebar.tsx frontend/src/router.tsx
git commit -m "feat(nav): Office Hours sidebar entry + routes"
```

---

### Task 16: Replace dashboard editor with `OfficeStatusPill`

**Files:**
- Modify: `frontend/src/components/shared/StaffDashboard.tsx`

- [ ] **Step 1: Strip the office-hours editor block**

Open `frontend/src/components/shared/StaffDashboard.tsx`. Identify and **delete**:

1. The `import { getOfficeHours, setOfficeHours } from '../../api/officeHours'` line.
2. The `OfficeHoursStatus` import (`OfficeHoursStatus, ` inside the import-from-types line — keep `Suggestion`).
3. State and refs related to office hours (typically lines around 50–53):
   - `officeHours`, `setOfficeHoursState`
   - `officeHoursLoading`, `setOfficeHoursLoading`
   - `closureReason`, `setClosureReason`
   - any `posting` / `clearing` state for closures.
4. Effect that calls `getOfficeHours(dept)` (around line 67).
5. Helper functions `submitHours`, `submitClosure`, `clearClosure`, and any `formatHour`/`isOpen`/`hasActiveClosure` helpers used **only** by the deleted JSX.
6. The entire JSX block from `{/* Office Hours: auto-derived from schedule + optional temporary closure */}` through its closing `</div>` (the dashboard card the user no longer wants).

After deletion, run a quick scan for stale references:

```bash
cd frontend && grep -n "officeHours\|setOfficeHours\|closureReason" src/components/shared/StaffDashboard.tsx
```

Expected: zero matches.

- [ ] **Step 2: Insert the status pill**

Add the import near the top:

```tsx
import { OfficeStatusPill } from './OfficeStatusPill'
```

Find where the deleted office-hours block used to render. Replace it with:

```tsx
      <OfficeStatusPill
        office={dept}
        manageHref={dept === 'Registrar Office' ? '/registrar/office-hours' : '/accounting/office-hours'}
      />
```

- [ ] **Step 3: Verify (the moment of truth)**

```bash
cd frontend && npm run build
cd frontend && npx vitest run
```

Expected: clean build. All existing tests still pass.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/components/shared/StaffDashboard.tsx
git commit -m "feat(ui): replace dashboard office-hours editor with OfficeStatusPill"
```

---

## Section 9 — Final verification

### Task 17: Full-suite checks + smoke checklist

**Files:** none (verification only)

- [ ] **Step 1: Backend full suite**

```bash
cd backend && go build ./...
cd backend && go test ./...
```

Expected: clean build, all tests pass.

- [ ] **Step 2: Frontend full suite**

```bash
cd frontend && npm run build
cd frontend && npx vitest run
```

Expected: clean strict build, all tests pass.

- [ ] **Step 3: Manual smoke test (local dev)**

Start the stack (or rely on the user's normal `make dev` / Vercel preview):

1. Log in as a registrar staff account. The dashboard should render the
   slim `OfficeStatusPill` (no edit controls). Click **Manage →**.
2. Land on `/registrar/office-hours`. Header shows OPEN/CLOSED + status.
3. Card 1: change Saturday from Closed to 8 AM – 12 PM. Click **Save schedule**.
   Toast says "Schedule saved". Refresh the page; the new hours persist.
4. Card 2: pick today 14:00 → today 16:00, reason "Smoke test". Click
   **Schedule closure**. Toast confirms.
5. If the new closure starts in the future, it appears under **Upcoming**;
   if it's currently active, it appears under **Active** and the header
   pill flips to CLOSED. Click **Cancel closure** — the row should vanish
   from Upcoming/Active and appear under **Past** with a `cancelled` tag.
6. Repeat steps 1–5 logged in as an accounting account at
   `/accounting/office-hours` for `Finance Office`.
7. As a regular user, visit `SubmitPage` — the `OfficeHoursBanner` shows
   today's hours (e.g., "Tue · 8:00 AM – 5:00 PM") instead of the old
   hard-coded "Mon–Fri" string. Active closures still surface with
   reason + expected reopen.

- [ ] **Step 4: Commit nothing — these are checks only.**

If something failed in Step 3, return to the relevant task. Do not patch
in this task.

---

## Self-Review Checklist (run after writing the plan, fix inline)

- [ ] Every section of the spec has at least one task implementing it.
- [ ] No `TBD` / `TODO` / "implement later" anywhere.
- [ ] Type names line up: `OfficeHoursStatus`, `DaySchedule`, `Closure`,
      `PutScheduleInput`, `CreateClosureInput`, `ClosureStatus` all match
      between models / handlers / repo / frontend types / API client.
- [ ] Every step that changes code shows the actual code.
- [ ] Every step that runs a command shows the exact command and expected
      output (PASS/FAIL/clean build).
- [ ] Frequent commits — one per task at minimum.
