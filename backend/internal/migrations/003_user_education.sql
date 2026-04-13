-- 003_user_education.sql

ALTER TABLE users ADD COLUMN IF NOT EXISTS education_level TEXT NULL;
ALTER TABLE users ADD COLUMN IF NOT EXISTS college_department TEXT NULL;
