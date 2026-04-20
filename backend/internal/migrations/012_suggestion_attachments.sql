-- 012_suggestion_attachments.sql
-- Feedback-form file attachments. Stored as BYTEA inline because the deploy
-- target has ephemeral filesystem; 5 MB × 3 per submission caps the blast
-- radius. Cascades on suggestion delete (soft-delete keeps the suggestion row,
-- so attachments stay too — only hard DELETE cascades).

CREATE TABLE IF NOT EXISTS suggestion_attachments (
  id            SERIAL PRIMARY KEY,
  suggestion_id INT NOT NULL REFERENCES suggestions(id) ON DELETE CASCADE,
  filename      VARCHAR(255) NOT NULL,
  mime_type     VARCHAR(100) NOT NULL,
  size_bytes    INT NOT NULL,
  data          BYTEA NOT NULL,
  uploaded_at   TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_suggestion_attachments_suggestion_id
  ON suggestion_attachments (suggestion_id);
