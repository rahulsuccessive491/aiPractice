-- Add profile_completed flag to users.
-- 0 = setup not done, 1 = setup complete.
-- Default 0 so all existing users are prompted on next login.
-- SQLite does not support ALTER TABLE ADD COLUMN IF NOT EXISTS;
-- the migrate runner will log the error and skip if already applied.
ALTER TABLE users ADD COLUMN profile_completed INTEGER NOT NULL DEFAULT 0;
