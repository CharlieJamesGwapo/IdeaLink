-- 010_suggestion_soft_delete.sql
-- Soft-delete support: staff can "delete" a suggestion without losing the row.
-- List queries filter out rows where deleted_at IS NOT NULL.

ALTER TABLE suggestions ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ NULL;

CREATE INDEX IF NOT EXISTS idx_suggestions_deleted_at ON suggestions (deleted_at);
