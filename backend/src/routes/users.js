const express = require('express');
const db = require('../db');
const { requireAuth } = require('../middleware/auth');
const { publicUser } = require('./auth');

const router = express.Router();

// ---------- GET /api/users/me ----------
router.get('/me', requireAuth, (req, res) => {
  const user = db.get('SELECT * FROM users WHERE id = ?', [req.user.id]);
  if (!user) return res.status(404).json({ error: 'User not found' });
  res.json({ user: publicUser(user) });
});

// ---------- PATCH /api/users/me ----------
// Editable fields: first_name, last_name, mobile, department, team_id, tech_stack, ai_tools, bio
router.patch('/me', requireAuth, (req, res) => {
  const allowed = ['first_name', 'last_name', 'mobile', 'department', 'team_id', 'tech_stack', 'ai_tools', 'bio'];
  const updates = [];
  const params = [];

  for (const key of allowed) {
    if (req.body[key] === undefined) continue;
    let value = req.body[key];
    if (key === 'tech_stack' || key === 'ai_tools') {
      if (!Array.isArray(value)) {
        return res.status(400).json({ error: `${key} must be an array` });
      }
      value = JSON.stringify(value);
    }
    updates.push(`${key} = ?`);
    params.push(value);
  }

  if (updates.length === 0) return res.status(400).json({ error: 'No editable fields supplied' });

  updates.push(`updated_at = datetime('now')`);
  params.push(req.user.id);

  db.run(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`, params);
  const user = db.get('SELECT * FROM users WHERE id = ?', [req.user.id]);
  res.json({ user: publicUser(user) });
});

// ---------- GET /api/users/teams ----------
router.get('/teams', requireAuth, (req, res) => {
  const teams = db.all('SELECT id, name, description FROM teams ORDER BY name');
  res.json({ teams });
});

// ---------- GET /api/users/tags ----------
router.get('/tags', requireAuth, (req, res) => {
  const tags = db.all('SELECT id, name, kind FROM tags ORDER BY kind, name');
  res.json({ tags });
});

module.exports = router;
