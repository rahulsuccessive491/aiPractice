#!/usr/bin/env node

/**
 * Generate bcrypt hashes for test users
 * Run this to get the hashes to insert into the migration file
 *
 * Usage: node generate-test-users.js
 */

const bcrypt = require('bcryptjs');

const testUsers = [
  { email: 'amit@successive.tech', password: 'Amit@123', role: 'admin' },
  { email: 'sumit@successive.tech', password: 'Sumit@123', role: 'manager' },
  { email: 'dev@successive.tech', password: 'Dev@123', role: 'developer' },
  { email: 'alice@successive.tech', password: 'Alice@123', role: 'developer' },
];

console.log('\n📋 Test User Passwords & Hashes\n');
console.log('='.repeat(80));

async function generateHashes() {
  const hashes = [];

  for (const user of testUsers) {
    const hash = await bcrypt.hash(user.password, 10);
    hashes.push({
      email: user.email,
      password: user.password,
      role: user.role,
      hash: hash,
    });

    console.log(`\n✅ ${user.email}`);
    console.log(`   Role:     ${user.role}`);
    console.log(`   Password: ${user.password}`);
    console.log(`   Hash:     ${hash}`);
  }

  console.log('\n' + '='.repeat(80));
  console.log('\n📝 SQL INSERT Statement:\n');
  console.log('INSERT OR IGNORE INTO users (email, password_hash, first_name, last_name, mobile, department, team_id, role) VALUES');

  hashes.forEach((u, i) => {
    const firstName = u.email.split('@')[0].charAt(0).toUpperCase() + u.email.split('@')[0].slice(1);
    const lastName = u.role.charAt(0).toUpperCase() + u.role.slice(1);
    const teamId = u.role === 'developer' ? (i % 2 === 0 ? 1 : 2) : (i % 2 === 0 ? 1 : 2);
    const deptId = i % 2 === 0 ? 1 : 2;

    const sql = `  ('${u.email}', '${u.hash}', '${firstName}', '${lastName}', '98765432${10 + i}', 'Engineering', ${teamId}, '${u.role}')`;
    console.log(sql + (i < hashes.length - 1 ? ',' : ';'));
  });

  console.log('\n' + '='.repeat(80));
  console.log('\n✨ Copy the SQL INSERT statement above');
  console.log('and paste it into: backend/src/migrations/001_initial_schema.sql\n');
}

generateHashes().catch(console.error);
