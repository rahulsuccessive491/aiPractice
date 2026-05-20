-- Extended personal detail fields added in Phase 3 of profile setup.
ALTER TABLE users ADD COLUMN work_email          TEXT;
ALTER TABLE users ADD COLUMN designation         TEXT;
ALTER TABLE users ADD COLUMN reporting_manager_id INTEGER REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE users ADD COLUMN location            TEXT;
ALTER TABLE users ADD COLUMN date_of_joining     TEXT;
ALTER TABLE users ADD COLUMN linkedin_url        TEXT;
ALTER TABLE users ADD COLUMN avatar_url          TEXT;
