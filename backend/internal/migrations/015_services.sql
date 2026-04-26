-- 015_services.sql
-- Service catalog managed by admin. Replaces hardcoded arrays in SubmitPage.

CREATE TABLE IF NOT EXISTS services (
  id            SERIAL PRIMARY KEY,
  department    TEXT NOT NULL CHECK (department IN ('Registrar Office', 'Finance Office')),
  label         TEXT NOT NULL,
  icon_name     TEXT NOT NULL DEFAULT 'HelpCircle',
  display_order INT  NOT NULL DEFAULT 0,
  is_active     BOOLEAN NOT NULL DEFAULT TRUE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (department, label)
);

CREATE INDEX IF NOT EXISTS services_dept_active_order_idx
  ON services (department, is_active, display_order);

-- Seed the 16 currently-hardcoded services so prod isn't suddenly empty.
-- ON CONFLICT lets the migration be re-run idempotently.
INSERT INTO services (department, label, icon_name, display_order) VALUES
  ('Registrar Office', 'Enrollment / Registration',  'BookOpen',     1),
  ('Registrar Office', 'Transcript of Records (TOR)','FileText',     2),
  ('Registrar Office', 'Certificate of Enrollment',  'Award',        3),
  ('Registrar Office', 'Good Moral Certificate',     'Shield',       4),
  ('Registrar Office', 'Diploma & Authentication',   'Award',        5),
  ('Registrar Office', 'ID Issuance',                'CreditCard',   6),
  ('Registrar Office', 'Shifting / Cross-enrollment','Shuffle',      7),
  ('Registrar Office', 'Other Registrar Concern',    'HelpCircle',   8),
  ('Finance Office',   'Tuition Fee Payment',        'DollarSign',   1),
  ('Finance Office',   'Scholarship / Financial Aid','GraduationCap', 2),
  ('Finance Office',   'Fee Assessment',             'Receipt',      3),
  ('Finance Office',   'Clearance Processing',       'CheckCircle2', 4),
  ('Finance Office',   'Refund Request',             'RotateCcw',    5),
  ('Finance Office',   'Receipt Re-issuance',        'FileText',     6),
  ('Finance Office',   'Billing Dispute',            'AlertTriangle', 7),
  ('Finance Office',   'Other Accounting Concern',   'HelpCircle',   8)
  ON CONFLICT (department, label) DO NOTHING;
