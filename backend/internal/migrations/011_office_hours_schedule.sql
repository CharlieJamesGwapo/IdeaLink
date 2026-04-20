-- 011_office_hours_schedule.sql
-- Add per-office weekday schedule. is_open is no longer a manual toggle —
-- the handler computes it from (open_hour, close_hour, weekday, temporary
-- closure override) on each read.

ALTER TABLE office_hours ADD COLUMN IF NOT EXISTS open_hour  INT NOT NULL DEFAULT 8;
ALTER TABLE office_hours ADD COLUMN IF NOT EXISTS close_hour INT NOT NULL DEFAULT 17;
