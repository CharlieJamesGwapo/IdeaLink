-- 013_email_logs.sql
-- Persistent audit of every email send attempt. Lets operators diagnose
-- delivery failures without grepping logs that die on restart.

CREATE TABLE IF NOT EXISTS email_logs (
    id          BIGSERIAL PRIMARY KEY,
    to_address  TEXT NOT NULL,
    kind        TEXT NOT NULL,
    status      TEXT NOT NULL,
    error_msg   TEXT,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS email_logs_created_at_idx
    ON email_logs (created_at DESC);
