-- 005_highlights.sql

CREATE TABLE IF NOT EXISTS highlights (
  id            SERIAL PRIMARY KEY,
  suggestion_id INT NOT NULL REFERENCES suggestions(id) ON DELETE CASCADE,
  created_by    INT NOT NULL REFERENCES admin_accounts(id),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at    TIMESTAMPTZ NOT NULL
);

-- Active-highlight uniqueness is enforced at the application layer (the
-- service checks EXISTS before inserting). Postgres disallows NOW() in a
-- partial index predicate because it is not IMMUTABLE.
CREATE INDEX IF NOT EXISTS idx_highlights_suggestion_id ON highlights(suggestion_id);
CREATE INDEX IF NOT EXISTS idx_highlights_expires_at ON highlights(expires_at);

CREATE TABLE IF NOT EXISTS highlight_reactions (
  highlight_id INT NOT NULL REFERENCES highlights(id) ON DELETE CASCADE,
  user_id      INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (highlight_id, user_id)
);
