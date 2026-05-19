// SQLite connection wrapper. Designed to be swappable for Postgres later —
// callers should only use the exported helpers, not the raw driver, so we
// can replace better-sqlite3 with pg/Knex in Sprint 4 without touching routes.

const path = require('path');
const fs = require('fs');
const Database = require('better-sqlite3');

const DB_FILE = process.env.DB_FILE || path.join(__dirname, '..', 'data', 'portal.db');

// ensure parent dir exists
fs.mkdirSync(path.dirname(DB_FILE), { recursive: true });

const db = new Database(DB_FILE);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

module.exports = {
  /** Raw better-sqlite3 instance — avoid using outside migrations. */
  raw: db,

  /** Run a statement (INSERT/UPDATE/DELETE). Returns { lastInsertRowid, changes }. */
  run(sql, params = []) {
    return db.prepare(sql).run(params);
  },

  /** Fetch a single row or undefined. */
  get(sql, params = []) {
    return db.prepare(sql).get(params);
  },

  /** Fetch all rows. */
  all(sql, params = []) {
    return db.prepare(sql).all(params);
  },

  /** Convenience: parse a JSON column safely. */
  parseJson(value, fallback = null) {
    if (value === null || value === undefined || value === '') return fallback;
    try { return JSON.parse(value); } catch { return fallback; }
  },

  close() {
    db.close();
  },
};
