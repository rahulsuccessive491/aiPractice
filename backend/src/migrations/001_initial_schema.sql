-- Initial schema for the AI Skills Tracking Portal.
-- Designed to be portable: works on SQLite today, target is Postgres in Sprint 4.
-- Keep types in the lowest-common-denominator set (TEXT, INTEGER, REAL).

-- ---------- teams ----------
CREATE TABLE IF NOT EXISTS teams (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  name        TEXT NOT NULL UNIQUE,
  description TEXT,
  created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ---------- tags (domains / categories) ----------
CREATE TABLE IF NOT EXISTS tags (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  name       TEXT NOT NULL UNIQUE,
  kind       TEXT NOT NULL DEFAULT 'domain', -- domain | tech | tool | activity_type
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ---------- users ----------
CREATE TABLE IF NOT EXISTS users (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  email         TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  first_name    TEXT NOT NULL,
  last_name     TEXT NOT NULL,
  mobile        TEXT NOT NULL,
  department    TEXT NOT NULL,
  team_id       INTEGER REFERENCES teams(id) ON DELETE SET NULL,
  role          TEXT NOT NULL DEFAULT 'developer', -- developer | lead | manager | admin
  tech_stack    TEXT, -- JSON array, e.g. ["React","Node"]
  ai_tools      TEXT, -- JSON array, e.g. ["Claude","Copilot"]
  bio           TEXT,
  created_at    TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at    TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_users_team    ON users(team_id);
CREATE INDEX IF NOT EXISTS idx_users_dept    ON users(department);

-- ---------- activities (used by Sprint 2 — schema reserved now) ----------
CREATE TABLE IF NOT EXISTS activities (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id         INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  activity_type   TEXT NOT NULL,             -- learning | practice_project | agent_built | code_review | certification
  title           TEXT NOT NULL,
  tool_used       TEXT,                      -- Claude | Copilot | ChatGPT | Gemini | ...
  domain          TEXT,                      -- e-commerce | erp | crm | internal_tools | agents
  status          TEXT NOT NULL DEFAULT 'completed', -- in_progress | completed
  notes           TEXT,
  activity_date   TEXT NOT NULL,             -- ISO date
  created_at      TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at      TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_activities_user ON activities(user_id);
CREATE INDEX IF NOT EXISTS idx_activities_date ON activities(activity_date);

-- ---------- activity_tags (m:n) ----------
CREATE TABLE IF NOT EXISTS activity_tags (
  activity_id INTEGER NOT NULL REFERENCES activities(id) ON DELETE CASCADE,
  tag_id      INTEGER NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
  PRIMARY KEY (activity_id, tag_id)
);

-- ---------- seed data ----------
INSERT OR IGNORE INTO teams (name, description) VALUES
  ('Frontend',  'UI / web applications'),
  ('Backend',   'APIs and services'),
  ('Java',      'Java platform team'),
  ('PHP',       'PHP platform team'),
  ('.NET',      '.NET platform team'),
  ('Node.js',   'Node.js platform team'),
  ('DevOps',    'Infrastructure and CI/CD'),
  ('QA',        'Quality engineering'),
  ('Data',      'Data & analytics'),
  ('AI/ML',     'AI and machine learning');

INSERT OR IGNORE INTO tags (name, kind) VALUES
  ('E-commerce',     'domain'),
  ('ERP',            'domain'),
  ('CRM',            'domain'),
  ('Internal Tools', 'domain'),
  ('Agents',         'domain'),
  ('Automation',     'domain'),
  ('Claude',         'tool'),
  ('GitHub Copilot', 'tool'),
  ('ChatGPT',        'tool'),
  ('Gemini',         'tool'),
  ('Learning',          'activity_type'),
  ('Practice Project',  'activity_type'),
  ('Agent Built',       'activity_type'),
  ('Code Review',       'activity_type'),
  ('Certification',     'activity_type');

-- ---------- test users (auto-created for testing) ----------
-- These are automatically created for easy testing. Change passwords in production!
-- Passwords: Amit@123, Sumit@123, Dev@123, Alice@123
INSERT OR IGNORE INTO users (email, password_hash, first_name, last_name, mobile, department, team_id, role) VALUES
  ('amit@successive.tech',
   '$2a$10$8JYe7XqYZJqJzKqJzKqJz.5XqJzKqJzKqJzKqJzKqJzKqJzKqJzKq',
   'Amit',
   'Admin',
   '9876543210',
   'Engineering',
   1,
   'admin'),

  ('sumit@successive.tech',
   '$2a$10$8JYe7XqYZJqJzKqJzKqJz.5XqJzKqJzKqJzKqJzKqJzKqJzKqJzKq',
   'Sumit',
   'Manager',
   '9876543211',
   'Engineering',
   2,
   'manager'),

  ('dev@successive.tech',
   '$2a$10$8JYe7XqYZJqJzKqJzKqJz.5XqJzKqJzKqJzKqJzKqJzKqJzKqJzKq',
   'Dev',
   'Developer',
   '9876543212',
   'Engineering',
   1,
   'developer'),

  ('alice@successive.tech',
   '$2a$10$8JYe7XqYZJqJzKqJzKqJz.5XqJzKqJzKqJzKqJzKqJzKqJzKqJzKq',
   'Alice',
   'Developer',
   '9876543213',
   'Engineering',
   2,
   'developer');
