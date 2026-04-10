-- 002_additions.sql

ALTER TABLE suggestions ADD COLUMN IF NOT EXISTS service_category VARCHAR(100);

CREATE TABLE IF NOT EXISTS office_hours (
  id SERIAL PRIMARY KEY,
  department VARCHAR(50) NOT NULL UNIQUE,
  is_open BOOLEAN NOT NULL DEFAULT TRUE,
  closure_reason TEXT,
  closed_until TIMESTAMPTZ,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO office_hours (department) VALUES ('Registrar') ON CONFLICT (department) DO NOTHING;
INSERT INTO office_hours (department) VALUES ('Accounting Office') ON CONFLICT (department) DO NOTHING;
