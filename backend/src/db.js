// Database client — wraps @libsql/client so the rest of the code uses a
// simple async run/get/all interface regardless of whether we're hitting a
// local SQLite file (dev) or Turso cloud (production).

const { createClient } = require('@libsql/client');
const path = require('path');
const fs   = require('fs');

let _client;

function getClient() {
  if (_client) return _client;

  let url;
  if (process.env.TURSO_DATABASE_URL) {
    url = process.env.TURSO_DATABASE_URL;
  } else {
    const dbPath = process.env.DB_FILE || path.join(__dirname, '..', 'data', 'portal.db');
    fs.mkdirSync(path.dirname(dbPath), { recursive: true });
    url = `file:${dbPath}`;
  }

  _client = createClient({
    url,
    authToken: process.env.TURSO_AUTH_TOKEN,
  });
  return _client;
}

// Convert a libSQL Row into a plain JS object keyed by column name.
// Ensures spread/destructuring behaves like a normal SQLite row.
function toObj(row, columns) {
  if (!row) return undefined;
  const obj = {};
  for (let i = 0; i < columns.length; i++) {
    obj[columns[i]] = row[i] !== undefined ? row[i] : row[columns[i]];
  }
  return obj;
}

module.exports = {
  /** INSERT / UPDATE / DELETE. Returns { lastInsertRowid, changes }. */
  async run(sql, params = []) {
    const r = await getClient().execute({ sql, args: params });
    return {
      lastInsertRowid: r.lastInsertRowid != null ? Number(r.lastInsertRowid) : null,
      changes: r.rowsAffected,
    };
  },

  /** Fetch one row or undefined. */
  async get(sql, params = []) {
    const r = await getClient().execute({ sql, args: params });
    return r.rows.length ? toObj(r.rows[0], r.columns) : undefined;
  },

  /** Fetch all rows. */
  async all(sql, params = []) {
    const r = await getClient().execute({ sql, args: params });
    return r.rows.map(row => toObj(row, r.columns));
  },

  /**
   * Execute multiple statements atomically.
   * stmts: [{ sql, args? }]
   */
  async batch(stmts) {
    await getClient().batch(stmts, 'write');
  },

  /** Parse a JSON column safely — synchronous, no DB needed. */
  parseJson(value, fallback = null) {
    if (value === null || value === undefined || value === '') return fallback;
    try { return JSON.parse(value); } catch { return fallback; }
  },

  close() {
    if (_client) { _client.close(); _client = null; }
  },
};
