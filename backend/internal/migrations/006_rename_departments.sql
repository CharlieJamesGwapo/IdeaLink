-- 006_rename_departments.sql
-- Rename 'Registrar' -> 'Registrar Office' and 'Accounting Office' -> 'Finance Office'.
-- Idempotent: survives re-runs even if target rows already exist.

-- office_hours: drop stale duplicates, then rename survivors.
DELETE FROM office_hours
 WHERE department = 'Registrar'
   AND EXISTS (SELECT 1 FROM office_hours oh2 WHERE oh2.department = 'Registrar Office');
DELETE FROM office_hours
 WHERE department = 'Accounting Office'
   AND EXISTS (SELECT 1 FROM office_hours oh2 WHERE oh2.department = 'Finance Office');

UPDATE office_hours SET department = 'Registrar Office' WHERE department = 'Registrar';
UPDATE office_hours SET department = 'Finance Office'   WHERE department = 'Accounting Office';

INSERT INTO office_hours (department) VALUES ('Registrar Office') ON CONFLICT (department) DO NOTHING;
INSERT INTO office_hours (department) VALUES ('Finance Office')   ON CONFLICT (department) DO NOTHING;

-- suggestions: historical rows keep the new canonical names.
UPDATE suggestions SET department = 'Registrar Office' WHERE department = 'Registrar';
UPDATE suggestions SET department = 'Finance Office'   WHERE department = 'Accounting Office';

-- testimonials: same.
UPDATE testimonials SET department = 'Registrar Office' WHERE department = 'Registrar';
UPDATE testimonials SET department = 'Finance Office'   WHERE department = 'Accounting Office';
