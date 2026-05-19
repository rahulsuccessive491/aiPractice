const express = require('express');
const db = require('../db');
const { requireAuth, requireRole } = require('../middleware/auth');

const router = express.Router();

// Activity type enum
const ACTIVITY_TYPES = ['learning', 'practice_project', 'agent_built', 'code_review', 'certification'];
const ACTIVITY_STATUS = ['in_progress', 'completed'];

// ---------- POST /api/activities ----------
// Create a new activity log entry
router.post('/', requireAuth, (req, res) => {
  const { activity_type, title, tool_used, domain, status, notes, activity_date } = req.body;

  // Validation
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

  // Date bounds check: not in the future, not more than 1 year in the past
  const actDate = new Date(activity_date);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  if (actDate > today) {
    return res.status(400).json({ error: 'activity_date cannot be in the future' });
  }

  const oneYearAgo = new Date();
  oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
  if (actDate < oneYearAgo) {
    return res.status(400).json({ error: 'activity_date cannot be more than 1 year in the past' });
  }

  // Insert activity
  const actStatus = status || 'completed';
  const result = db.run(
    `INSERT INTO activities (user_id, activity_type, title, tool_used, domain, status, notes, activity_date)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [req.user.id, activity_type, title.trim(), tool_used || null, domain || null, actStatus, notes || null, activity_date]
  );

  const activity = db.get('SELECT * FROM activities WHERE id = ?', [result.lastInsertRowid]);
  res.status(201).json({ activity });
});

// ---------- GET /api/activities ----------
// Get all activities for the current user
router.get('/', requireAuth, (req, res) => {
  const activities = db.all(
    `SELECT * FROM activities WHERE user_id = ? ORDER BY activity_date DESC, created_at DESC`,
    [req.user.id]
  );
  res.json({ activities });
});

// ---------- GET /api/activities/:id ----------
// Get a single activity
router.get('/:id', requireAuth, (req, res) => {
  const activity = db.get('SELECT * FROM activities WHERE id = ?', [req.params.id]);
  if (!activity) return res.status(404).json({ error: 'Activity not found' });

  // Authorization: user can view their own activities, or managers/admins can view any
  if (activity.user_id !== req.user.id && !['manager', 'admin'].includes(req.user.role)) {
    return res.status(403).json({ error: 'Not authorized to view this activity' });
  }

  res.json({ activity });
});

// ---------- PATCH /api/activities/:id ----------
// Update an activity (owner only, unless admin)
router.patch('/:id', requireAuth, (req, res) => {
  const activity = db.get('SELECT * FROM activities WHERE id = ?', [req.params.id]);
  if (!activity) return res.status(404).json({ error: 'Activity not found' });

  // Authorization: user can edit their own, admins can edit any
  if (activity.user_id !== req.user.id && req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Not authorized to update this activity' });
  }

  const allowed = ['activity_type', 'title', 'tool_used', 'domain', 'status', 'notes', 'activity_date'];
  const updates = [];
  const params = [];

  for (const key of allowed) {
    if (req.body[key] === undefined) continue;
    const value = req.body[key];

    // Validate based on field
    if (key === 'activity_type' && !ACTIVITY_TYPES.includes(value)) {
      return res.status(400).json({ error: `Invalid activity_type: ${value}` });
    }
    if (key === 'status' && !ACTIVITY_STATUS.includes(value)) {
      return res.status(400).json({ error: `Invalid status: ${value}` });
    }
    if (key === 'activity_date' && !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
      return res.status(400).json({ error: 'activity_date must be in ISO date format (YYYY-MM-DD)' });
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

  db.run(`UPDATE activities SET ${updates.join(', ')} WHERE id = ?`, params);
  const updated = db.get('SELECT * FROM activities WHERE id = ?', [req.params.id]);
  res.json({ activity: updated });
});

// ---------- DELETE /api/activities/:id ----------
// Delete an activity (owner only, unless admin)
router.delete('/:id', requireAuth, (req, res) => {
  const activity = db.get('SELECT * FROM activities WHERE id = ?', [req.params.id]);
  if (!activity) return res.status(404).json({ error: 'Activity not found' });

  // Authorization: user can delete their own, admins can delete any
  if (activity.user_id !== req.user.id && req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Not authorized to delete this activity' });
  }

  db.run('DELETE FROM activities WHERE id = ?', [req.params.id]);
  res.json({ ok: true });
});

// ---------- GET /api/activities/user/:userId ----------
// Get activities for a specific user (managers/admins only)
router.get('/user/:userId', requireAuth, (req, res) => {
  // Only managers and admins can view other users' activities
  if (req.user.role !== 'manager' && req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Not authorized to view other users\' activities' });
  }

  const activities = db.all(
    `SELECT * FROM activities WHERE user_id = ? ORDER BY activity_date DESC, created_at DESC`,
    [req.params.userId]
  );

  res.json({ activities });
});

module.exports = router;
