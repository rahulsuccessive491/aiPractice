// Runs every .sql file in ./migrations in alphabetical order.
// Safe to re-run — each migration uses IF NOT EXISTS / INSERT OR IGNORE.

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const db = require('./db');

const migrationsDir = path.join(__dirname, 'migrations');
const files = fs.readdirSync(migrationsDir).filter(f => f.endsWith('.sql')).sort();

if (files.length === 0) {
  console.log('No migration files found.');
  process.exit(0);
}

console.log(`Running ${files.length} migration(s)...`);
for (const file of files) {
  const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf8');
  try {
    db.raw.exec(sql);
    console.log(`  ok  ${file}`);
  } catch (err) {
    // SQLite has no ADD COLUMN IF NOT EXISTS — treat "duplicate column" as a no-op.
    if (err.message && err.message.includes('duplicate column name')) {
      console.log(`  skip ${file} (already applied)`);
    } else {
      console.error(`  err ${file}:`, err.message);
      process.exit(1);
    }
  }
}

console.log('Done.');
db.close();
