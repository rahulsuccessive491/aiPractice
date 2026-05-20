const express = require('express');
const db = require('../db');
const { requireAuth } = require('../middleware/auth');
const { publicUser } = require('./auth');
const { notify, notifyReviewers, notifyManager } = require('./notifications');

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
  const allowed = [
    'first_name', 'last_name', 'mobile', 'department', 'team_id',
    'tech_stack', 'ai_tools', 'bio', 'profile_completed',
    'work_email', 'designation', 'reporting_manager_id',
    'location', 'date_of_joining', 'linkedin_url', 'avatar_url',
  ];
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

  // Notify manager/admins on profile changes (skip avatar-only updates to avoid noise)
  const profileFields = updates.filter(u => !u.startsWith('avatar_url') && !u.startsWith('updated_at'));
  if (profileFields.length > 0) {
    const actorName = `${user.first_name} ${user.last_name}`;
    notifyManager(
      req.user.id,
      'profile_updated',
      `👤 Profile Updated`,
      `${actorName} updated their profile details.`,
      'profile', req.user.id
    );
  }

  res.json({ user: publicUser(user) });
});

// ---------- POST /api/users/me/complete-profile ----------
router.post('/me/complete-profile', requireAuth, (req, res) => {
  db.run(
    `UPDATE users SET profile_completed = 1, updated_at = datetime('now') WHERE id = ?`,
    [req.user.id]
  );
  const user = db.get('SELECT * FROM users WHERE id = ?', [req.user.id]);
  res.json({ user: publicUser(user) });
});

// ---------- GET /api/users/search?q=&exclude_self=1 ----------
// Returns id, full name, email, designation for manager picker.
router.get('/search', requireAuth, (req, res) => {
  const q    = `%${(req.query.q || '').trim()}%`;
  const rows = db.all(
    `SELECT id, first_name, last_name, email, designation, department
     FROM users
     WHERE (first_name || ' ' || last_name LIKE ? OR email LIKE ?)
       AND id != ?
     ORDER BY first_name, last_name
     LIMIT 20`,
    [q, q, req.user.id]
  );
  res.json({ users: rows });
});

// ---------- POST /api/users/me/avatar ----------
// Body: { avatar: "data:image/png;base64,..." }  max ~2.7 MB after base64
router.post('/me/avatar', requireAuth, (req, res) => {
  const { avatar } = req.body;
  if (!avatar || typeof avatar !== 'string') {
    return res.status(400).json({ error: 'avatar field is required' });
  }
  const match = avatar.match(/^data:(image\/(?:jpeg|png|webp|gif));base64,/);
  if (!match) {
    return res.status(400).json({ error: 'avatar must be a base64-encoded JPEG, PNG, WebP, or GIF data URL' });
  }
  // Rough size check: base64 payload ≈ 4/3 of original bytes
  const base64Payload = avatar.split(',')[1] || '';
  const approxBytes   = Math.ceil(base64Payload.length * 0.75);
  const maxBytes      = 2 * 1024 * 1024; // 2 MB
  if (approxBytes > maxBytes) {
    return res.status(400).json({ error: 'Image must be under 2 MB' });
  }
  db.run(
    `UPDATE users SET avatar_url = ?, updated_at = datetime('now') WHERE id = ?`,
    [avatar, req.user.id]
  );
  const user = db.get('SELECT * FROM users WHERE id = ?', [req.user.id]);
  res.json({ user: publicUser(user) });
});

// ---------- GET /api/users/me/skills ----------
router.get('/me/skills', requireAuth, (req, res) => {
  const skills = db.all(
    'SELECT id, name, category, proficiency FROM user_skills WHERE user_id = ? ORDER BY category, name',
    [req.user.id]
  );
  res.json({ skills });
});

// ---------- POST /api/users/me/skills — full replace ----------
// Body: { skills: [{ name, category, proficiency }] }
router.post('/me/skills', requireAuth, (req, res) => {
  const { skills } = req.body;
  if (!Array.isArray(skills)) {
    return res.status(400).json({ error: 'skills must be an array' });
  }
  const VALID = ['Beginner', 'Intermediate', 'Advanced', 'Expert'];
  for (const s of skills) {
    if (!s.name?.trim()) return res.status(400).json({ error: 'Each skill must have a name' });
    if (!s.category?.trim()) return res.status(400).json({ error: 'Each skill must have a category' });
    if (s.proficiency && !VALID.includes(s.proficiency)) {
      return res.status(400).json({ error: `proficiency must be one of: ${VALID.join(', ')}` });
    }
  }
  db.raw.transaction(() => {
    db.run('DELETE FROM user_skills WHERE user_id = ?', [req.user.id]);
    const stmt = db.raw.prepare(
      'INSERT INTO user_skills (user_id, name, category, proficiency) VALUES (?, ?, ?, ?)'
    );
    for (const s of skills) {
      stmt.run(req.user.id, s.name.trim(), s.category.trim(), s.proficiency || 'Beginner');
    }
  })();
  const saved = db.all(
    'SELECT id, name, category, proficiency FROM user_skills WHERE user_id = ? ORDER BY category, name',
    [req.user.id]
  );
  res.json({ skills: saved });
});

// ---------- GET /api/users/me/pocs ----------
router.get('/me/pocs', requireAuth, (req, res) => {
  const rows = db.all(
    'SELECT * FROM user_pocs WHERE user_id = ? ORDER BY created_at ASC',
    [req.user.id]
  );
  const pocs = rows.map(r => ({
    ...r,
    tools_stack:  db.parseJson(r.tools_stack, []),
    team_members: db.parseJson(r.team_members, []),
  }));
  res.json({ pocs });
});

// ---------- POST /api/users/me/pocs — full replace ----------
// Body: { pocs: [ { poc_name, category, ... } ] }
router.post('/me/pocs', requireAuth, (req, res) => {
  const { pocs } = req.body;
  if (!Array.isArray(pocs)) {
    return res.status(400).json({ error: 'pocs must be an array' });
  }
  for (const p of pocs) {
    if (!p.poc_name?.trim()) {
      return res.status(400).json({ error: 'Each POC must have a poc_name' });
    }
  }

  db.raw.transaction(() => {
    db.run('DELETE FROM user_pocs WHERE user_id = ?', [req.user.id]);
    const stmt = db.raw.prepare(`
      INSERT INTO user_pocs
        (user_id, poc_name, category, problem_statement, tools_stack, team_members,
         poc_lead, status, progress, expected_outcome, business_impact,
         repo_link, challenges, next_steps, remarks, start_date, end_date, last_updated)
      VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,datetime('now'))
    `);
    for (const p of pocs) {
      stmt.run(
        req.user.id,
        p.poc_name.trim(),
        p.category || 'GenAI',
        p.problem_statement || null,
        JSON.stringify(Array.isArray(p.tools_stack)  ? p.tools_stack  : []),
        JSON.stringify(Array.isArray(p.team_members) ? p.team_members : []),
        p.poc_lead || null,
        p.status   || 'In Progress',
        Number(p.progress) || 0,
        p.expected_outcome || null,
        p.business_impact  || null,
        p.repo_link        || null,
        p.challenges       || null,
        p.next_steps       || null,
        p.remarks          || null,
        p.start_date       || null,
        p.end_date         || null,
      );
    }
  })();

  const saved = db.all('SELECT * FROM user_pocs WHERE user_id = ? ORDER BY created_at ASC', [req.user.id]);

  // Notify manager/admins that POC details were updated
  if (pocs.length > 0) {
    const pocActor = db.get('SELECT first_name, last_name FROM users WHERE id = ?', [req.user.id]);
    const pocActorName = `${pocActor.first_name} ${pocActor.last_name}`;
    notifyManager(
      req.user.id,
      'poc_updated',
      `🚀 POC Details Updated`,
      `${pocActorName} updated their AI Profile & POC details (${pocs.length} project${pocs.length > 1 ? 's' : ''}).`,
      'poc', null
    );
  }

  res.json({ pocs: saved.map(r => ({ ...r, tools_stack: db.parseJson(r.tools_stack,[]), team_members: db.parseJson(r.team_members,[]) })) });
});

// ---------- GET /api/users/me/certifications ----------
router.get('/me/certifications', requireAuth, (req, res) => {
  const rows = db.all(
    `SELECT id, cert_name, issuing_org, issue_date, expiry_date, no_expiry,
            credential_id, credential_url, file_name, file_type,
            status, reviewer_comment, reviewed_at, created_at
     FROM user_certifications WHERE user_id = ? ORDER BY created_at DESC`,
    [req.user.id]
  );
  // file_data excluded from list — fetched individually to keep payload small
  res.json({ certifications: rows.map(r => ({ ...r, no_expiry: r.no_expiry === 1 })) });
});

// ---------- POST /api/users/me/certifications — add one cert ----------
router.post('/me/certifications', requireAuth, (req, res) => {
  const { cert_name, issuing_org, issue_date, expiry_date, no_expiry,
          credential_id, credential_url, file_data, file_name, file_type } = req.body;

  if (!cert_name?.trim())   return res.status(400).json({ error: 'cert_name is required' });
  if (!issuing_org?.trim()) return res.status(400).json({ error: 'issuing_org is required' });

  // File size guard: base64 of 10 MB ≈ 13.3 MB string
  if (file_data) {
    const approxBytes = Math.ceil((file_data.split(',')[1] || '').length * 0.75);
    if (approxBytes > 10 * 1024 * 1024) {
      return res.status(400).json({ error: 'File must be under 10 MB' });
    }
  }

  const result = db.run(
    `INSERT INTO user_certifications
       (user_id, cert_name, issuing_org, issue_date, expiry_date, no_expiry,
        credential_id, credential_url, file_data, file_name, file_type, status)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,'Pending')`,
    [
      req.user.id,
      cert_name.trim(),
      issuing_org.trim(),
      issue_date   || null,
      no_expiry ? null : (expiry_date || null),
      no_expiry ? 1 : 0,
      credential_id  || null,
      credential_url || null,
      file_data      || null,
      file_name      || null,
      file_type      || null,
    ]
  );

  const cert = db.get(
    `SELECT id, cert_name, issuing_org, issue_date, expiry_date, no_expiry,
            credential_id, credential_url, file_name, file_type,
            status, reviewer_comment, reviewed_at, created_at
     FROM user_certifications WHERE id = ?`,
    [result.lastInsertRowid]
  );
  // Notify all leads/managers/admins about the new submission
  const actor = db.get('SELECT first_name, last_name FROM users WHERE id = ?', [req.user.id]);
  const actorName = `${actor.first_name} ${actor.last_name}`;
  notifyReviewers(
    req.user.id,
    'cert_submitted',
    `📜 New Certificate Submitted`,
    `${actorName} submitted a new certificate for review: "${cert.cert_name}" from ${cert.issuing_org}.`,
    'certification',
    cert.id
  );

  res.status(201).json({ certification: { ...cert, no_expiry: cert.no_expiry === 1 } });
});

// ---------- DELETE /api/users/me/certifications/:id — only if Pending ----------
router.delete('/me/certifications/:id', requireAuth, (req, res) => {
  const cert = db.get(
    'SELECT id, status FROM user_certifications WHERE id = ? AND user_id = ?',
    [req.params.id, req.user.id]
  );
  if (!cert) return res.status(404).json({ error: 'Certification not found' });
  if (cert.status !== 'Pending') {
    return res.status(403).json({ error: 'Only pending certifications can be deleted' });
  }
  db.run('DELETE FROM user_certifications WHERE id = ?', [cert.id]);
  res.json({ ok: true });
});

// ---------- GET /api/users/me/certifications/:id/file — fetch file_data ----------
router.get('/me/certifications/:id/file', requireAuth, (req, res) => {
  const row = db.get(
    'SELECT file_data, file_name, file_type FROM user_certifications WHERE id = ? AND user_id = ?',
    [req.params.id, req.user.id]
  );
  if (!row || !row.file_data) return res.status(404).json({ error: 'File not found' });
  res.json({ file_data: row.file_data, file_name: row.file_name, file_type: row.file_type });
});

// ---------- PATCH /api/users/certifications/:id/review (manager/admin only) ----------
router.patch('/certifications/:id/review', requireAuth, (req, res) => {
  if (!['lead', 'manager', 'admin'].includes(req.user.role)) {
    return res.status(403).json({ error: 'Only leads, managers, or admins can review certifications' });
  }
  const { status, comment } = req.body;
  if (!['Approved', 'Rejected'].includes(status)) {
    return res.status(400).json({ error: 'status must be Approved or Rejected' });
  }
  const cert = db.get('SELECT * FROM user_certifications WHERE id = ?', [req.params.id]);
  if (!cert) return res.status(404).json({ error: 'Certification not found' });

  db.run(
    `UPDATE user_certifications
     SET status = ?, reviewer_id = ?, reviewer_comment = ?,
         reviewed_at = datetime('now'), updated_at = datetime('now')
     WHERE id = ?`,
    [status, req.user.id, comment || null, cert.id]
  );

  // Notify the cert owner
  const reviewer = db.get('SELECT first_name, last_name FROM users WHERE id = ?', [req.user.id]);
  const reviewerName = `${reviewer.first_name} ${reviewer.last_name}`;
  const icon = status === 'Approved' ? '✅' : '❌';
  notify(
    cert.user_id, req.user.id,
    'cert_reviewed',
    `${icon} Certificate ${status}`,
    comment
      ? `${reviewerName} ${status.toLowerCase()} your certificate "${cert.cert_name}": "${comment}"`
      : `${reviewerName} ${status.toLowerCase()} your certificate "${cert.cert_name}".`,
    'certification', cert.id
  );

  const updated = db.get(
    `SELECT id, cert_name, issuing_org, status, reviewer_comment, reviewed_at
     FROM user_certifications WHERE id = ?`,
    [cert.id]
  );
  res.json({ certification: updated });
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
