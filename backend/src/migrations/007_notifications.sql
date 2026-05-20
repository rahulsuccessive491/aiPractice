-- Notification & activity feed table added in Phase 7.
CREATE TABLE IF NOT EXISTS notifications (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  recipient_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  actor_id     INTEGER REFERENCES users(id) ON DELETE SET NULL,  -- who triggered it
  type         TEXT    NOT NULL,  -- cert_submitted | cert_reviewed | poc_updated | profile_updated
  title        TEXT    NOT NULL,
  body         TEXT,
  entity_type  TEXT,   -- certification | poc | profile
  entity_id    INTEGER,
  read         INTEGER NOT NULL DEFAULT 0,
  action_taken INTEGER NOT NULL DEFAULT 0,  -- 1 once reviewer approves/rejects from bell
  created_at   TEXT    NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_notif_recipient ON notifications(recipient_id, read);
CREATE INDEX IF NOT EXISTS idx_notif_entity    ON notifications(entity_type, entity_id);
