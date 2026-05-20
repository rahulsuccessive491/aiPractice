-- User skills with proficiency levels, added in Phase 4 of profile setup.
CREATE TABLE IF NOT EXISTS user_skills (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name        TEXT    NOT NULL,
  category    TEXT    NOT NULL,
  proficiency TEXT    NOT NULL DEFAULT 'Beginner', -- Beginner | Intermediate | Advanced | Expert
  created_at  TEXT    NOT NULL DEFAULT (datetime('now')),
  UNIQUE(user_id, name)
);

CREATE INDEX IF NOT EXISTS idx_user_skills_user ON user_skills(user_id);
