const express = require('express');
const db = require('../db');
const { requireAuth, requireRole } = require('../middleware/auth');

const router = express.Router();
const wrap = fn => (req, res, next) => fn(req, res, next).catch(next);

const ACTIVITY_TYPES = ['learning', 'practice_project', 'agent_built', 'code_review', 'certification'];
const ACTIVITY_STATUS = ['in_progress', 'completed'];

// ---------- POST /api/activities ----------
router.post('/', requireAuth, wrap(async (req, res) => {
  const { activity_type, title, tool_used, model_used, domain, status, notes, activity_date, eta } = req.body;

  if (!activity_type || !ACTIVITY_TYPES.includes(activity_type)) {
    return res.status(400).json({ error: `Invalid activity_type. Must be one of: ${ACTIVITY_TYPES.join(', ')}` });
  }
  if (!title || typeof title !== 'string' || title.trim().length === 0) {
    return res.status(400).json({ error: 'title is required and must be non-empty' });
  }
  if (!activity_date || !/^\d{4}-\d{2}-\d{2}$/.test(activity_date)) {
    return res.status(400).json({ error: 'activity_date must be in ISO date format (YYYY-MM-DD)' });
  }
  if (status && !ACTIVITY_STATUS.includes(status)) {
    return res.status(400).json({ error: `Invalid status. Must be one of: ${ACTIVITY_STATUS.join(', ')}` });
  }
  if (eta && !/^\d{4}-\d{2}-\d{2}$/.test(eta)) {
    return res.status(400).json({ error: 'eta must be in ISO date format (YYYY-MM-DD)' });
  }

  const actStatus = status || 'completed';
  const [ay, am, ad] = activity_date.split('-').map(Number);
  const actDate = new Date(ay, am - 1, ad);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  if (actDate > today) {
    return res.status(400).json({ error: 'activity_date cannot be in the future' });
  }

  const oneYearAgo = new Date();
  oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
  oneYearAgo.setHours(0, 0, 0, 0);
  if (actDate < oneYearAgo) {
    return res.status(400).json({ error: 'activity_date cannot be more than 1 year in the past' });
  }

  const result = await db.run(
    `INSERT INTO activities (user_id, activity_type, title, tool_used, model_used, domain, status, notes, activity_date, eta)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      req.user.id, activity_type, title.trim(),
      tool_used || null, model_used || null, domain || null,
      actStatus, notes || null, activity_date,
      actStatus === 'in_progress' ? (eta || null) : null,
    ]
  );

  const activity = await db.get('SELECT * FROM activities WHERE id = ?', [result.lastInsertRowid]);
  res.status(201).json({ activity });
}));

// ---------- GET /api/activities ----------
router.get('/', requireAuth, wrap(async (req, res) => {
  const activities = await db.all(
    `SELECT a.*,
       (SELECT COUNT(*) FROM activity_comments c WHERE c.activity_id = a.id) AS comment_count
     FROM activities a
     WHERE a.user_id = ?
     ORDER BY a.activity_date DESC, a.created_at DESC`,
    [req.user.id]
  );
  res.json({ activities });
}));

// ---------- GET /api/activities/chart/by-model ----------
router.get('/chart/by-model', requireAuth, wrap(async (req, res) => {
  const rows = await db.all(
    `SELECT model_used AS name, COUNT(*) AS count
     FROM activities
     WHERE user_id = ? AND model_used IS NOT NULL AND model_used != ''
     GROUP BY model_used
     ORDER BY count DESC`,
    [req.user.id]
  );
  res.json({ data: rows });
}));

// ---------- GET /api/activities/:id ----------
router.get('/:id', requireAuth, wrap(async (req, res) => {
  const activity = await db.get('SELECT * FROM activities WHERE id = ?', [req.params.id]);
  if (!activity) return res.status(404).json({ error: 'Activity not found' });

  if (activity.user_id !== req.user.id && !['manager', 'admin'].includes(req.user.role)) {
    return res.status(403).json({ error: 'Not authorized to view this activity' });
  }

  res.json({ activity });
}));

// ---------- PATCH /api/activities/:id ----------
router.patch('/:id', requireAuth, wrap(async (req, res) => {
  const activity = await db.get('SELECT * FROM activities WHERE id = ?', [req.params.id]);
  if (!activity) return res.status(404).json({ error: 'Activity not found' });

  if (activity.user_id !== req.user.id && req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Not authorized to update this activity' });
  }

  const allowed = ['activity_type', 'title', 'tool_used', 'model_used', 'domain', 'status', 'notes', 'activity_date', 'eta'];
  const updates = [];
  const params = [];

  for (const key of allowed) {
    if (req.body[key] === undefined) continue;
    const value = req.body[key];

    if (key === 'activity_type' && !ACTIVITY_TYPES.includes(value)) {
      return res.status(400).json({ error: `Invalid activity_type: ${value}` });
    }
    if (key === 'status' && !ACTIVITY_STATUS.includes(value)) {
      return res.status(400).json({ error: `Invalid status: ${value}` });
    }
    if (key === 'activity_date' && !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
      return res.status(400).json({ error: 'activity_date must be in ISO date format (YYYY-MM-DD)' });
    }
    if (key === 'eta' && value && !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
      return res.status(400).json({ error: 'eta must be in ISO date format (YYYY-MM-DD)' });
    }
    if (key === 'title' && (!value || typeof value !== 'string' || value.trim().length === 0)) {
      return res.status(400).json({ error: 'title cannot be empty' });
    }

    updates.push(`${key} = ?`);
    params.push(value === null || value === '' ? null : value);
  }

  if (updates.length === 0) return res.status(400).json({ error: 'No editable fields supplied' });

  updates.push(`updated_at = datetime('now')`);
  params.push(req.params.id);

  await db.run(`UPDATE activities SET ${updates.join(', ')} WHERE id = ?`, params);
  const updated = await db.get('SELECT * FROM activities WHERE id = ?', [req.params.id]);
  res.json({ activity: updated });
}));

// ---------- DELETE /api/activities/:id ----------
router.delete('/:id', requireAuth, wrap(async (req, res) => {
  const activity = await db.get('SELECT * FROM activities WHERE id = ?', [req.params.id]);
  if (!activity) return res.status(404).json({ error: 'Activity not found' });

  if (activity.user_id !== req.user.id && req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Not authorized to delete this activity' });
  }

  await db.run('DELETE FROM activities WHERE id = ?', [req.params.id]);
  res.json({ ok: true });
}));

// ---------- GET /api/activities/user/:userId ----------
router.get('/user/:userId', requireAuth, wrap(async (req, res) => {
  if (req.user.role !== 'manager' && req.user.role !== 'admin') {
    return res.status(403).json({ error: "Not authorized to view other users' activities" });
  }

  const activities = await db.all(
    `SELECT * FROM activities WHERE user_id = ? ORDER BY activity_date DESC, created_at DESC`,
    [req.params.userId]
  );

  res.json({ activities });
}));

module.exports = router;
