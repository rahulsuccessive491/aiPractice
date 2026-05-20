-- Certifications table added in Phase 6 of profile setup.
CREATE TABLE IF NOT EXISTS user_certifications (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id         INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  cert_name       TEXT    NOT NULL,
  issuing_org     TEXT    NOT NULL,
  issue_date      TEXT,
  expiry_date     TEXT,
  no_expiry       INTEGER NOT NULL DEFAULT 0,   -- 1 = no expiry date
  credential_id   TEXT,
  credential_url  TEXT,
  file_data       TEXT,   -- base64 data URL (PDF or image, max 10 MB)
  file_name       TEXT,   -- original filename for display
  file_type       TEXT,   -- MIME type
  status          TEXT    NOT NULL DEFAULT 'Pending',   -- Pending | Approved | Rejected
  reviewer_id     INTEGER REFERENCES users(id) ON DELETE SET NULL,
  reviewer_comment TEXT,
  reviewed_at     TEXT,
  created_at      TEXT    NOT NULL DEFAULT (datetime('now')),
  updated_at      TEXT    NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_user_certs_user     ON user_certifications(user_id);
CREATE INDEX IF NOT EXISTS idx_user_certs_status   ON user_certifications(status);
CREATE INDEX IF NOT EXISTS idx_user_certs_reviewer ON user_certifications(reviewer_id);
