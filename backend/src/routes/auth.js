const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const db = require('../db');
const { validateRegistration, validateLogin } = require('../middleware/validation');

const router = express.Router();

function signToken(user) {
  return jwt.sign(
    { sub: user.id, email: user.email, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );
}

function publicUser(row) {
  return {
    id: row.id,
    email: row.email,
    first_name: row.first_name,
    last_name: row.last_name,
    mobile: row.mobile,
    department: row.department,
    team_id: row.team_id,
    role: row.role,
    tech_stack: db.parseJson(row.tech_stack, []),
    ai_tools:   db.parseJson(row.ai_tools, []),
    bio: row.bio || '',
    created_at: row.created_at,
  };
}

// ---------- POST /api/auth/register ----------
router.post('/register', async (req, res) => {
  const { ok, errors } = validateRegistration(req.body);
  if (!ok) return res.status(400).json({ error: 'Validation failed', fields: errors });

  const email = req.body.email.trim().toLowerCase();
  const existing = db.get('SELECT id FROM users WHERE email = ?', [email]);
  if (existing) {
    return res.status(409).json({
      error: 'Email already registered',
      fields: { email: 'An account with this email already exists' },
    });
  }

  const password_hash = await bcrypt.hash(req.body.password, 10);

  const result = db.run(
    `INSERT INTO users (email, password_hash, first_name, last_name, mobile, department)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [
      email,
      password_hash,
      req.body.first_name.trim(),
      req.body.last_name.trim(),
      String(req.body.mobile).trim(),
      req.body.department.trim(),
    ]
  );

  const user = db.get('SELECT * FROM users WHERE id = ?', [result.lastInsertRowid]);
  const token = signToken(user);
  return res.status(201).json({ token, user: publicUser(user) });
});

// ---------- POST /api/auth/login ----------
router.post('/login', async (req, res) => {
  const { ok, errors } = validateLogin(req.body);
  if (!ok) return res.status(400).json({ error: 'Validation failed', fields: errors });

  const email = req.body.email.trim().toLowerCase();
  const user = db.get('SELECT * FROM users WHERE email = ?', [email]);
  if (!user) return res.status(401).json({ error: 'Invalid email or password' });

  const match = await bcrypt.compare(req.body.password, user.password_hash);
  if (!match) return res.status(401).json({ error: 'Invalid email or password' });

  const token = signToken(user);
  return res.json({ token, user: publicUser(user) });
});

module.exports = router;
module.exports.publicUser = publicUser;
