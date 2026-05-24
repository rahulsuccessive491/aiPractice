const express = require('express');
const path    = require('path');
const fs      = require('fs');
const multer  = require('multer');
const db      = require('../db');
const { requireAuth }  = require('../middleware/auth');
const { notify }       = require('./notifications');

const router = express.Router();

const UPLOAD_DIR = process.env.UPLOAD_DIR
  ? path.join(process.env.UPLOAD_DIR, 'activity-comments')
  : path.join(__dirname, '../../uploads/activity-comments');
fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const ALLOWED_TYPES = new Set([
  'image/jpeg', 'image/jpg', 'image/png', 'image/gif',
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
]);

const storage = multer.diskStorage({
  destination: UPLOAD_DIR,
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
  fileFilter: (req, file, cb) => {
    if (ALLOWED_TYPES.has(file.mimetype)) cb(null, true);
    else cb(new Error(`File type not allowed: ${file.mimetype}`));
  },
});

function canAccessActivity(activity, user) {
  return activity.user_id === user.id || ['lead', 'manager', 'admin'].includes(user.role);
}

function attachmentsForComment(commentId) {
  return db.all(
    `SELECT id, filename, original_name, mimetype, size FROM activity_comment_attachments WHERE comment_id = ?`,
    [commentId]
  ).map(a => ({ ...a, url: `/uploads/activity-comments/${a.filename}` }));
}

// ---------- GET /api/activities/:id/comments ----------
router.get('/:id/comments', requireAuth, (req, res) => {
  const activity = db.get('SELECT * FROM activities WHERE id = ?', [req.params.id]);
  if (!activity) return res.status(404).json({ error: 'Activity not found' });
  if (!canAccessActivity(activity, req.user)) {
    return res.status(403).json({ error: 'Not authorized' });
  }

  const comments = db.all(
    `SELECT ac.id, ac.comment, ac.created_at, ac.commenter_id,
            u.first_name, u.last_name, u.avatar_url, u.role
     FROM activity_comments ac
     JOIN users u ON u.id = ac.commenter_id
     WHERE ac.activity_id = ?
     ORDER BY ac.created_at ASC`,
    [req.params.id]
  ).map(c => ({
    id:         c.id,
    comment:    c.comment,
    created_at: c.created_at,
    commenter: {
      id:         c.commenter_id,
      first_name: c.first_name,
      last_name:  c.last_name,
      avatar_url: c.avatar_url,
      role:       c.role,
    },
    attachments: attachmentsForComment(c.id),
  }));

  res.json({ comments });
});

// ---------- POST /api/activities/:id/comments ----------
router.post('/:id/comments', requireAuth, upload.array('attachments', 5), (req, res) => {
  const activity = db.get('SELECT * FROM activities WHERE id = ?', [req.params.id]);
  if (!activity) return res.status(404).json({ error: 'Activity not found' });

  const isOwner   = activity.user_id === req.user.id;
  const isManager = ['lead', 'manager', 'admin'].includes(req.user.role);
  if (!isOwner && !isManager) {
    return res.status(403).json({ error: 'Not authorized to comment on this activity' });
  }

  const comment = (req.body.comment || '').trim();
  if (!comment) return res.status(400).json({ error: 'comment is required' });

  const result = db.run(
    `INSERT INTO activity_comments (activity_id, commenter_id, comment) VALUES (?, ?, ?)`,
    [activity.id, req.user.id, comment]
  );
  const commentId = result.lastInsertRowid;

  // Save attachments
  for (const file of (req.files || [])) {
    db.run(
      `INSERT INTO activity_comment_attachments (comment_id, filename, original_name, mimetype, size)
       VALUES (?, ?, ?, ?, ?)`,
      [commentId, file.filename, file.originalname, file.mimetype, file.size]
    );
  }

  // Notifications
  const commenterName = `${req.user.first_name} ${req.user.last_name}`;
  if (isOwner && !isManager) {
    // Developer commented → notify reporting manager + leads/managers who previously commented
    const owner = db.get('SELECT reporting_manager_id FROM users WHERE id = ?', [req.user.id]);
    const notified = new Set();
    if (owner?.reporting_manager_id) {
      notify(owner.reporting_manager_id, req.user.id, 'activity_commented',
        `${commenterName} replied on their activity`,
        comment.slice(0, 120), 'activity', activity.id);
      notified.add(owner.reporting_manager_id);
    }
    // Also notify any lead/manager/admin who has commented before
    const priorCommenters = db.all(
      `SELECT DISTINCT ac.commenter_id FROM activity_comments ac
       JOIN users u ON u.id = ac.commenter_id
       WHERE ac.activity_id = ? AND ac.commenter_id != ? AND u.role IN ('lead','manager','admin')`,
      [activity.id, req.user.id]
    );
    for (const pc of priorCommenters) {
      if (!notified.has(pc.commenter_id)) {
        notify(pc.commenter_id, req.user.id, 'activity_commented',
          `${commenterName} replied on their activity`,
          comment.slice(0, 120), 'activity', activity.id);
        notified.add(pc.commenter_id);
      }
    }
  } else {
    // Manager/lead commented → notify activity owner
    notify(activity.user_id, req.user.id, 'activity_commented',
      `${commenterName} left feedback on your activity`,
      comment.slice(0, 120), 'activity', activity.id);
  }

  const newComment = {
    id:         commentId,
    comment,
    created_at: new Date().toISOString(),
    commenter: {
      id:         req.user.id,
      first_name: req.user.first_name,
      last_name:  req.user.last_name,
      avatar_url: req.user.avatar_url,
      role:       req.user.role,
    },
    attachments: attachmentsForComment(commentId),
  };
  res.status(201).json({ comment: newComment });
});

// ---------- DELETE /api/activities/:id/comments/:commentId ----------
router.delete('/:id/comments/:commentId', requireAuth, (req, res) => {
  const comment = db.get('SELECT * FROM activity_comments WHERE id = ?', [req.params.commentId]);
  if (!comment) return res.status(404).json({ error: 'Comment not found' });
  if (comment.activity_id !== Number(req.params.id)) {
    return res.status(400).json({ error: 'Comment does not belong to this activity' });
  }

  const canDelete = comment.commenter_id === req.user.id || req.user.role === 'admin';
  if (!canDelete) return res.status(403).json({ error: 'Not authorized to delete this comment' });

  // Delete attachment files from disk
  const attachments = db.all(
    'SELECT filename FROM activity_comment_attachments WHERE comment_id = ?', [comment.id]
  );
  for (const a of attachments) {
    try { fs.unlinkSync(path.join(UPLOAD_DIR, a.filename)); } catch {}
  }

  db.run('DELETE FROM activity_comments WHERE id = ?', [comment.id]);
  res.json({ ok: true });
});

module.exports = router;
