-- 008_status_simplification.sql
-- Canonical suggestion status becomes just two values: Delivered, Reviewed.
-- Old rows: Pending / Under Review -> Delivered, Resolved -> Reviewed.

UPDATE suggestions
   SET status = CASE
     WHEN status IN ('Pending', 'Under Review') THEN 'Delivered'
     WHEN status = 'Resolved'                   THEN 'Reviewed'
     ELSE status
   END;

-- Default for new rows
ALTER TABLE suggestions ALTER COLUMN status SET DEFAULT 'Delivered';

-- Track whether the submitter has seen the latest status change (#8 notif).
-- TRUE by default because existing rows predate the notif system.
ALTER TABLE suggestions ADD COLUMN IF NOT EXISTS status_seen_by_user BOOLEAN NOT NULL DEFAULT TRUE;
