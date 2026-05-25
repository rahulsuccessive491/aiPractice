#!/usr/bin/env node
/**
 * Seed / upsert users into any environment via the admin API.
 * - Creates user if email doesn't exist
 * - Updates role if user already exists but role differs
 *
 * Usage:
 *   ADMIN_EMAIL=you@email.com ADMIN_PASSWORD=yourpw node scripts/seed-prod-users.js
 *   API_URL=http://localhost:4000/api  ... (override for local)
 */

const API_URL        = process.env.API_URL        || 'https://aipractice-9s92.onrender.com/api';
const ADMIN_EMAIL    = process.env.ADMIN_EMAIL;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;

const USERS = [
  { first_name: 'Arjun',  last_name: 'Mehta',    email: 'arjun.mehta@successive.tech',    role: 'developer' },
  { first_name: 'Sneha',  last_name: 'Kulkarni', email: 'sneha.kulkarni@successive.tech', role: 'lead'      },
  { first_name: 'Vikram', last_name: 'Desai',    email: 'vikram.desai@successive.tech',   role: 'manager'   },
  { first_name: 'Neha',   last_name: 'Kapoor',   email: 'neha.kapoor@successive.tech',    role: 'admin'     },
  { first_name: 'Amit',   last_name: '',          email: 'amit@successive.tech',           role: 'admin'     },
  { first_name: 'Sumit',  last_name: '',          email: 'sumit@successive.tech',          role: 'admin'     },
];

async function json(res) { try { return await res.json(); } catch { return {}; } }

async function main() {
  if (!ADMIN_EMAIL || !ADMIN_PASSWORD) {
    console.error('❌  Set ADMIN_EMAIL and ADMIN_PASSWORD env vars before running.');
    process.exit(1);
  }

  console.log(`\n🔗  API: ${API_URL}`);
  console.log(`🔑  Logging in as ${ADMIN_EMAIL}…\n`);

  // --- Login ---
  const loginRes = await fetch(`${API_URL}/auth/login`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD }),
  });
  const loginData = await json(loginRes);
  if (!loginRes.ok) {
    console.error('❌  Login failed:', loginData.error || loginRes.status);
    process.exit(1);
  }
  const token  = loginData.token;
  const headers = { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` };
  console.log('✅  Logged in.\n');

  // --- Fetch existing users (to detect who needs role update) ---
  const usersRes  = await fetch(`${API_URL}/admin/dashboard/users`, { headers });
  const usersData = await json(usersRes);
  const existing  = {};
  for (const u of (usersData.users || [])) existing[u.email.toLowerCase()] = u;

  // --- Upsert each user ---
  for (const u of USERS) {
    const email = u.email.toLowerCase();
    const tag   = `[${u.role.padEnd(9)}]  ${email}`;
    const found = existing[email];

    if (!found) {
      // Create new user
      const res  = await fetch(`${API_URL}/admin/users`, {
        method: 'POST', headers,
        body:   JSON.stringify(u),
      });
      const data = await json(res);
      if (res.ok)            console.log(`✅  Created  ${tag}`);
      else                   console.log(`❌  Failed   ${tag}  — ${data.error}`);
    } else if (found.role !== u.role) {
      // Update role
      const res  = await fetch(`${API_URL}/admin/users/${found.id}/role`, {
        method: 'PATCH', headers,
        body:   JSON.stringify({ role: u.role }),
      });
      const data = await json(res);
      if (res.ok)            console.log(`🔄  Updated  ${tag}  (was: ${found.role})`);
      else                   console.log(`❌  Failed   ${tag}  — ${data.error}`);
    } else {
      console.log(`⚠️   Skipped  ${tag}  — already correct`);
    }
  }

  console.log('\n🔐  Default password for new users: Profile@123\n');
}

main().catch(err => { console.error('Fatal:', err.message); process.exit(1); });
