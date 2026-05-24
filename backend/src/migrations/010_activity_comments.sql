-- Two-way feedback/comment threads on activities with file attachments

CREATE TABLE IF NOT EXISTS activity_comments (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  activity_id  INTEGER NOT NULL REFERENCES activities(id) ON DELETE CASCADE,
  commenter_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  comment      TEXT NOT NULL,
  created_at   TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS activity_comment_attachments (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  comment_id    INTEGER NOT NULL REFERENCES activity_comments(id) ON DELETE CASCADE,
  filename      TEXT NOT NULL,       -- uuid-based filename stored on disk
  original_name TEXT NOT NULL,       -- original filename shown to user
  mimetype      TEXT NOT NULL,
  size          INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_activity_comments_activity ON activity_comments(activity_id);
