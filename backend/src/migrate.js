// Runs every .sql file in ./migrations in alphabetical order.
// Safe to re-run — each migration uses IF NOT EXISTS / INSERT OR IGNORE.

require('dotenv').config();
const fs   = require('fs');
const path = require('path');
const { createClient } = require('@libsql/client');

let url;
if (process.env.TURSO_DATABASE_URL) {
  url = process.env.TURSO_DATABASE_URL;
} else {
  const dbPath = process.env.DB_FILE || path.join(__dirname, '..', 'data', 'portal.db');
  fs.mkdirSync(path.dirname(dbPath), { recursive: true });
  url = `file:${dbPath}`;
}

const client = createClient({ url, authToken: process.env.TURSO_AUTH_TOKEN });

// Split a SQL script into individual statements, stripping comment-only lines.
function splitStatements(sql) {
  return sql
    .split(';')
    .map(s => s.replace(/--[^\n]*/g, '').trim())
    .filter(s => s.length > 0);
}

async function main() {
  const migrationsDir = path.join(__dirname, 'migrations');
  const files = fs.readdirSync(migrationsDir).filter(f => f.endsWith('.sql')).sort();

  if (files.length === 0) {
    console.log('No migration files found.');
    process.exit(0);
  }

  console.log(`Running ${files.length} migration(s)...`);

  for (const file of files) {
    const sql   = fs.readFileSync(path.join(migrationsDir, file), 'utf8');
    const stmts = splitStatements(sql);
    let skipped = false;

    for (const stmt of stmts) {
      try {
        await client.execute(stmt);
      } catch (err) {
        const msg = err.message || '';
        if (msg.includes('duplicate column name') || msg.includes('already exists')) {
          skipped = true;
        } else {
          console.error(`  err  ${file}:`, msg);
          process.exit(1);
        }
      }
    }

    console.log(skipped ? `  skip ${file} (already applied)` : `  ok   ${file}`);
  }

  console.log('Done.');
  client.close();
}

main().catch(err => { console.error('Fatal:', err.message); process.exit(1); });
