-- 007_staff_email_login.sql
-- Replace staff username-based login with email.

ALTER TABLE registrar_accounts  ADD COLUMN IF NOT EXISTS email VARCHAR(255);
ALTER TABLE accounting_accounts ADD COLUMN IF NOT EXISTS email VARCHAR(255);

-- Backfill: map legacy usernames to a canonical ASCB domain.
-- If the username already looks like an email (contains '@'), keep it.
UPDATE registrar_accounts
   SET email = CASE
     WHEN email IS NOT NULL AND email <> '' THEN email
     WHEN username LIKE '%@%' THEN username
     ELSE username || '@ascb.edu.ph'
   END
 WHERE email IS NULL OR email = '';

UPDATE accounting_accounts
   SET email = CASE
     WHEN email IS NOT NULL AND email <> '' THEN email
     WHEN username LIKE '%@%' THEN username
     ELSE username || '@ascb.edu.ph'
   END
 WHERE email IS NULL OR email = '';

-- Enforce uniqueness going forward.
CREATE UNIQUE INDEX IF NOT EXISTS registrar_accounts_email_key  ON registrar_accounts  (email);
CREATE UNIQUE INDEX IF NOT EXISTS accounting_accounts_email_key ON accounting_accounts (email);

-- Make email NOT NULL (safe after backfill).
ALTER TABLE registrar_accounts  ALTER COLUMN email SET NOT NULL;
ALTER TABLE accounting_accounts ALTER COLUMN email SET NOT NULL;

-- Username is now optional (legacy). We keep the column to preserve old data
-- but drop the NOT NULL constraint so future inserts can omit it.
ALTER TABLE registrar_accounts  ALTER COLUMN username DROP NOT NULL;
ALTER TABLE accounting_accounts ALTER COLUMN username DROP NOT NULL;
