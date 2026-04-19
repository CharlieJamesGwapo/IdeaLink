-- 009_suggestion_rating.sql
-- Add 1-5 star rating to feedback submissions (nullable for historical rows).

ALTER TABLE suggestions
  ADD COLUMN IF NOT EXISTS rating SMALLINT
    CHECK (rating IS NULL OR (rating >= 1 AND rating <= 5));
