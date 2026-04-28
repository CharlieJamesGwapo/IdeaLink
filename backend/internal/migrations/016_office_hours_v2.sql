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
