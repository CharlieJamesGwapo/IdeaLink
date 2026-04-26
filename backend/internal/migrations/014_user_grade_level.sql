-- 014_user_grade_level.sql
-- Adds an optional grade level for HS/SHS students. NULL is allowed and is
-- the only valid value when education_level = 'College'. Allowed string
-- values for HS/SHS: '7','8','9','10','11','12'.

ALTER TABLE users ADD COLUMN IF NOT EXISTS grade_level TEXT NULL;
