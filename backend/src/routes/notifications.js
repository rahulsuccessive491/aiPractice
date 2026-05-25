const express = require('express');
const db = require('../db');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();
const wrap = fn => (req, res, next) => fn(req, res, next).catch(next);

// ---------------------------------------------------------------------------
// Shared helpers — async, fire-and-forget safe (errors caught internally)
// ---------------------------------------------------------------------------

async function notify(recipientId, actorId, type, title, body, entityType = null, entityId = null) {
  if (!recipientId) return;
  try {
    await db.run(
      `INSERT INTO notifications
         (recipient_id, actor_id, type, title, body, entity_type, entity_id)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [recipientId, actorId || null, type, title, body || null, entityType, entityId]
    );
  } catch (err) {
    console.error('[notify] failed:', err.message);
  }
}

async function notifyReviewers(actorId, type, title, body, entityType, entityId) {
  try {
    const reviewers = await db.all(
      `SELECT id FROM users WHERE role IN ('lead','manager','admin') AND id != ?`,
      [actorId]
    );
    for (const r of reviewers) {
      await notify(r.id, actorId, type, title, body, entityType, entityId);
    }
  } catch (err) {
    console.error('[notifyReviewers] failed:', err.message);
  }
}

async function notifyManager(actorId, type, title, body, entityType, entityId) {
  try {
    const actor = await db.get('SELECT reporting_manager_id FROM users WHERE id = ?', [actorId]);
    if (actor?.reporting_manager_id) {
      await notify(actor.reporting_manager_id, actorId, type, title, body, entityType, entityId);
    }
    const admins = await db.all(
      `SELECT id FROM users WHERE role = 'admin' AND id != ?`, [actorId]
    );
    for (const a of admins) {
      await notify(a.id, actorId, type, title, body, entityType, entityId);
    }
  } catch (err) {
    console.error('[notifyManager] failed:', err.message);
  }
}

// ---------------------------------------------------------------------------
// GET /api/notifications
// ---------------------------------------------------------------------------

router.get('/', requireAuth, wrap(async (req, res) => {
  const onlyUnread = req.query.unread === '1';
  const rows = await db.all(
    `SELECT n.id, n.type, n.title, n.body, n.entity_type, n.entity_id,
            n.actor_id,
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
  const countRow = await db.get(
    'SELECT COUNT(*) AS c FROM notifications WHERE recipient_id = ? AND read = 0',
    [req.user.id]
  );
  res.json({ notifications: rows, unread_count: countRow.c });
}));

// ---------------------------------------------------------------------------
// PATCH /api/notifications/:id/read
// ---------------------------------------------------------------------------

router.patch('/:id/read', requireAuth, wrap(async (req, res) => {
  await db.run(
    'UPDATE notifications SET read = 1 WHERE id = ? AND recipient_id = ?',
    [req.params.id, req.user.id]
  );
  res.json({ ok: true });
}));

// ---------------------------------------------------------------------------
// PATCH /api/notifications/read-all
// ---------------------------------------------------------------------------

router.patch('/read-all', requireAuth, wrap(async (req, res) => {
  await db.run(
    'UPDATE notifications SET read = 1 WHERE recipient_id = ?',
    [req.user.id]
  );
  res.json({ ok: true });
}));

// ---------------------------------------------------------------------------
// POST /api/notifications/review/:certId
// ---------------------------------------------------------------------------

router.post('/review/:certId', requireAuth, wrap(async (req, res) => {
  if (!['lead', 'manager', 'admin'].includes(req.user.role)) {
    return res.status(403).json({ error: 'Only leads, managers, or admins can review certifications' });
  }

  const { status, comment, notification_id } = req.body;
  if (!['Approved', 'Rejected'].includes(status)) {
    return res.status(400).json({ error: 'status must be Approved or Rejected' });
  }

  const cert = await db.get('SELECT * FROM user_certifications WHERE id = ?', [req.params.certId]);
  if (!cert) return res.status(404).json({ error: 'Certification not found' });
  if (cert.status !== 'Pending') {
    return res.status(409).json({ error: 'Certification has already been reviewed' });
  }

  await db.run(
    `UPDATE user_certifications
     SET status = ?, reviewer_id = ?, reviewer_comment = ?,
         reviewed_at = datetime('now'), updated_at = datetime('now')
     WHERE id = ?`,
    [status, req.user.id, comment || null, cert.id]
  );

  if (notification_id) {
    await db.run(
      'UPDATE notifications SET action_taken = 1, read = 1 WHERE id = ? AND recipient_id = ?',
      [notification_id, req.user.id]
    );
  }

  const reviewer     = await db.get('SELECT first_name, last_name FROM users WHERE id = ?', [req.user.id]);
  const reviewerName = `${reviewer.first_name} ${reviewer.last_name}`;

  const icon       = status === 'Approved' ? '✅' : '❌';
  const notifTitle = `${icon} Certificate ${status}`;
  const notifBody  = comment
    ? `${reviewerName} ${status.toLowerCase()} your certificate "${cert.cert_name}": "${comment}"`
    : `${reviewerName} ${status.toLowerCase()} your certificate "${cert.cert_name}".`;
  notify(cert.user_id, req.user.id, 'cert_reviewed', notifTitle, notifBody, 'certification', cert.id);

  const updated = await db.get(
    `SELECT id, cert_name, issuing_org, status, reviewer_comment, reviewed_at
     FROM user_certifications WHERE id = ?`,
    [cert.id]
  );
  res.json({ certification: updated });
}));

module.exports = router;
module.exports.notify           = notify;
module.exports.notifyReviewers  = notifyReviewers;
module.exports.notifyManager    = notifyManager;
