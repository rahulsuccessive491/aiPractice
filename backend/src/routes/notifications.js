const express = require('express');
const db = require('../db');
const { requireAuth } = require('../middleware/auth');
const { publicUser } = require('./auth');

const router = express.Router();

// ---------------------------------------------------------------------------
// Shared helper — called by other routes to fire a notification
// notify(recipientId, actorId, type, title, body, entityType, entityId)
// ---------------------------------------------------------------------------

function notify(recipientId, actorId, type, title, body, entityType = null, entityId = null) {
  if (!recipientId) return;
  try {
    db.run(
      `INSERT INTO notifications
         (recipient_id, actor_id, type, title, body, entity_type, entity_id)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [recipientId, actorId || null, type, title, body || null, entityType, entityId]
    );
  } catch (err) {
    console.error('[notify] failed:', err.message);
  }
}

// Notify all leads/managers/admins in the system (used for cert submissions etc.)
function notifyReviewers(actorId, type, title, body, entityType, entityId) {
  const reviewers = db.all(
    `SELECT id FROM users WHERE role IN ('lead','manager','admin') AND id != ?`,
    [actorId]
  );
  for (const r of reviewers) {
    notify(r.id, actorId, type, title, body, entityType, entityId);
  }
}

// Notify the actor's reporting manager (if set)
function notifyManager(actorId, type, title, body, entityType, entityId) {
  const actor = db.get('SELECT reporting_manager_id FROM users WHERE id = ?', [actorId]);
  if (actor?.reporting_manager_id) {
    notify(actor.reporting_manager_id, actorId, type, title, body, entityType, entityId);
  }
  // Also notify all admins
  const admins = db.all(
    `SELECT id FROM users WHERE role = 'admin' AND id != ?`, [actorId]
  );
  for (const a of admins) {
    notify(a.id, actorId, type, title, body, entityType, entityId);
  }
}

// ---------------------------------------------------------------------------
// GET /api/notifications  — current user's notifications (newest first)
// ?unread=1  to filter unread only
// ---------------------------------------------------------------------------

router.get('/', requireAuth, (req, res) => {
  const onlyUnread = req.query.unread === '1';
  const rows = db.all(
    `SELECT n.id, n.type, n.title, n.body, n.entity_type, n.entity_id,
            n.read, n.action_taken, n.created_at,
            u.first_name AS actor_first, u.last_name AS actor_last,
            u.avatar_url AS actor_avatar
     FROM notifications n
     LEFT JOIN users u ON u.id = n.actor_id
     WHERE n.recipient_id = ?
       ${onlyUnread ? 'AND n.read = 0' : ''}
     ORDER BY n.created_at DESC
     LIMIT 50`,
    [req.user.id]
  );
  const unread_count = db.get(
    'SELECT COUNT(*) AS c FROM notifications WHERE recipient_id = ? AND read = 0',
    [req.user.id]
  ).c;
  res.json({ notifications: rows, unread_count });
});

// ---------------------------------------------------------------------------
// PATCH /api/notifications/:id/read
// ---------------------------------------------------------------------------

router.patch('/:id/read', requireAuth, (req, res) => {
  db.run(
    'UPDATE notifications SET read = 1 WHERE id = ? AND recipient_id = ?',
    [req.params.id, req.user.id]
  );
  res.json({ ok: true });
});

// ---------------------------------------------------------------------------
// PATCH /api/notifications/read-all
// ---------------------------------------------------------------------------

router.patch('/read-all', requireAuth, (req, res) => {
  db.run(
    'UPDATE notifications SET read = 1 WHERE recipient_id = ?',
    [req.user.id]
  );
  res.json({ ok: true });
});

// ---------------------------------------------------------------------------
// POST /api/notifications/review/:certId
// Reviewer approves/rejects directly from the notification panel.
// Body: { status: 'Approved'|'Rejected', comment: string, notification_id: number }
// ---------------------------------------------------------------------------

router.post('/review/:certId', requireAuth, (req, res) => {
  if (!['lead', 'manager', 'admin'].includes(req.user.role)) {
    return res.status(403).json({ error: 'Only leads, managers, or admins can review certifications' });
  }

  const { status, comment, notification_id } = req.body;
  if (!['Approved', 'Rejected'].includes(status)) {
    return res.status(400).json({ error: 'status must be Approved or Rejected' });
  }

  const cert = db.get('SELECT * FROM user_certifications WHERE id = ?', [req.params.certId]);
  if (!cert) return res.status(404).json({ error: 'Certification not found' });
  if (cert.status !== 'Pending') {
    return res.status(409).json({ error: 'Certification has already been reviewed' });
  }

  // Update cert status
  db.run(
    `UPDATE user_certifications
     SET status = ?, reviewer_id = ?, reviewer_comment = ?,
         reviewed_at = datetime('now'), updated_at = datetime('now')
     WHERE id = ?`,
    [status, req.user.id, comment || null, cert.id]
  );

  // Mark notification as actioned
  if (notification_id) {
    db.run(
      'UPDATE notifications SET action_taken = 1, read = 1 WHERE id = ? AND recipient_id = ?',
      [notification_id, req.user.id]
    );
  }

  // Get reviewer name for notification back to the cert owner
  const reviewer = db.get('SELECT first_name, last_name FROM users WHERE id = ?', [req.user.id]);
  const reviewerName = `${reviewer.first_name} ${reviewer.last_name}`;

  // Notify the cert owner
  const icon    = status === 'Approved' ? '✅' : '❌';
  const notifTitle = `${icon} Certificate ${status}`;
  const notifBody  = comment
    ? `${reviewerName} ${status.toLowerCase()} your certificate "${cert.cert_name}": "${comment}"`
    : `${reviewerName} ${status.toLowerCase()} your certificate "${cert.cert_name}".`;
  notify(cert.user_id, req.user.id, 'cert_reviewed', notifTitle, notifBody, 'certification', cert.id);

  const updated = db.get(
    `SELECT id, cert_name, issuing_org, status, reviewer_comment, reviewed_at
     FROM user_certifications WHERE id = ?`,
    [cert.id]
  );
  res.json({ certification: updated });
});

module.exports = router;
module.exports.notify           = notify;
module.exports.notifyReviewers  = notifyReviewers;
module.exports.notifyManager    = notifyManager;
