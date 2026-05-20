-- POC / AI Project tracking table added in Phase 5 of profile setup.
CREATE TABLE IF NOT EXISTS user_pocs (
  id                INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id           INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  poc_name          TEXT    NOT NULL,
  category          TEXT    NOT NULL DEFAULT 'GenAI',
  problem_statement TEXT,
  tools_stack       TEXT,    -- JSON array e.g. ["Claude","LangChain"]
  team_members      TEXT,    -- JSON array of user ids or free-text names
  poc_lead          TEXT,
  status            TEXT    NOT NULL DEFAULT 'In Progress',
  progress          INTEGER NOT NULL DEFAULT 0,  -- 0–100
  expected_outcome  TEXT,
  business_impact   TEXT,
  repo_link         TEXT,
  challenges        TEXT,
  next_steps        TEXT,
  remarks           TEXT,
  start_date        TEXT,
  end_date          TEXT,
  last_updated      TEXT    NOT NULL DEFAULT (datetime('now')),
  created_at        TEXT    NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_user_pocs_user ON user_pocs(user_id);
