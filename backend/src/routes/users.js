const express = require('express');
const db = require('../db');
const { requireAuth } = require('../middleware/auth');
const { publicUser } = require('./auth');
const { notify, notifyReviewers, notifyManager } = require('./notifications');

const router = express.Router();
const wrap = fn => (req, res, next) => fn(req, res, next).catch(next);

// ---------- GET /api/users/me ----------
router.get('/me', requireAuth, wrap(async (req, res) => {
  const user = await db.get('SELECT * FROM users WHERE id = ?', [req.user.id]);
  if (!user) return res.status(404).json({ error: 'User not found' });
  res.json({ user: publicUser(user) });
}));

// ---------- PATCH /api/users/me ----------
router.patch('/me', requireAuth, wrap(async (req, res) => {
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

  await db.run(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`, params);
  const user = await db.get('SELECT * FROM users WHERE id = ?', [req.user.id]);

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
}));

// ---------- POST /api/users/me/complete-profile ----------
router.post('/me/complete-profile', requireAuth, wrap(async (req, res) => {
  await db.run(
    `UPDATE users SET profile_completed = 1, updated_at = datetime('now') WHERE id = ?`,
    [req.user.id]
  );
  const user = await db.get('SELECT * FROM users WHERE id = ?', [req.user.id]);
  res.json({ user: publicUser(user) });
}));

// ---------- GET /api/users/search ----------
router.get('/search', requireAuth, wrap(async (req, res) => {
  const q    = `%${(req.query.q || '').trim()}%`;
  const rows = await db.all(
    `SELECT id, first_name, last_name, email, designation, department
     FROM users
     WHERE (first_name || ' ' || last_name LIKE ? OR email LIKE ?)
       AND id != ?
     ORDER BY first_name, last_name
     LIMIT 20`,
    [q, q, req.user.id]
  );
  res.json({ users: rows });
}));

// ---------- POST /api/users/me/avatar ----------
router.post('/me/avatar', requireAuth, wrap(async (req, res) => {
  const { avatar } = req.body;
  if (!avatar || typeof avatar !== 'string') {
    return res.status(400).json({ error: 'avatar field is required' });
  }
  const match = avatar.match(/^data:(image\/(?:jpeg|png|webp|gif));base64,/);
  if (!match) {
    return res.status(400).json({ error: 'avatar must be a base64-encoded JPEG, PNG, WebP, or GIF data URL' });
  }
  const base64Payload = avatar.split(',')[1] || '';
  const approxBytes   = Math.ceil(base64Payload.length * 0.75);
  const maxBytes      = 2 * 1024 * 1024;
  if (approxBytes > maxBytes) {
    return res.status(400).json({ error: 'Image must be under 2 MB' });
  }
  await db.run(
    `UPDATE users SET avatar_url = ?, updated_at = datetime('now') WHERE id = ?`,
    [avatar, req.user.id]
  );
  const user = await db.get('SELECT * FROM users WHERE id = ?', [req.user.id]);
  res.json({ user: publicUser(user) });
}));

// ---------- GET /api/users/me/skills ----------
router.get('/me/skills', requireAuth, wrap(async (req, res) => {
  const skills = await db.all(
    'SELECT id, name, category, proficiency FROM user_skills WHERE user_id = ? ORDER BY category, name',
    [req.user.id]
  );
  res.json({ skills });
}));

// ---------- POST /api/users/me/skills — full replace ----------
router.post('/me/skills', requireAuth, wrap(async (req, res) => {
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

  const stmts = [
    { sql: 'DELETE FROM user_skills WHERE user_id = ?', args: [req.user.id] },
    ...skills.map(s => ({
      sql: 'INSERT INTO user_skills (user_id, name, category, proficiency) VALUES (?, ?, ?, ?)',
      args: [req.user.id, s.name.trim(), s.category.trim(), s.proficiency || 'Beginner'],
    })),
  ];
  await db.batch(stmts);

  const saved = await db.all(
    'SELECT id, name, category, proficiency FROM user_skills WHERE user_id = ? ORDER BY category, name',
    [req.user.id]
  );
  res.json({ skills: saved });
}));

// ---------- GET /api/users/me/pocs ----------
router.get('/me/pocs', requireAuth, wrap(async (req, res) => {
  const rows = await db.all(
    'SELECT * FROM user_pocs WHERE user_id = ? ORDER BY created_at ASC',
    [req.user.id]
  );
  const pocs = rows.map(r => ({
    ...r,
    tools_stack:  db.parseJson(r.tools_stack, []),
    team_members: db.parseJson(r.team_members, []),
  }));
  res.json({ pocs });
}));

// ---------- POST /api/users/me/pocs — full replace ----------
router.post('/me/pocs', requireAuth, wrap(async (req, res) => {
  const { pocs } = req.body;
  if (!Array.isArray(pocs)) {
    return res.status(400).json({ error: 'pocs must be an array' });
  }
  for (const p of pocs) {
    if (!p.poc_name?.trim()) {
      return res.status(400).json({ error: 'Each POC must have a poc_name' });
    }
  }

  const insertSql = `
    INSERT INTO user_pocs
      (user_id, poc_name, category, problem_statement, tools_stack, team_members,
       poc_lead, status, progress, expected_outcome, business_impact,
       repo_link, challenges, next_steps, remarks, start_date, end_date, last_updated)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,datetime('now'))
  `;

  const stmts = [
    { sql: 'DELETE FROM user_pocs WHERE user_id = ?', args: [req.user.id] },
    ...pocs.map(p => ({
      sql: insertSql,
      args: [
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
      ],
    })),
  ];
  await db.batch(stmts);

  const saved = await db.all('SELECT * FROM user_pocs WHERE user_id = ? ORDER BY created_at ASC', [req.user.id]);

  if (pocs.length > 0) {
    const pocActor = await db.get('SELECT first_name, last_name FROM users WHERE id = ?', [req.user.id]);
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
}));

// ---------- GET /api/users/me/certifications ----------
router.get('/me/certifications', requireAuth, wrap(async (req, res) => {
  const rows = await db.all(
    `SELECT id, cert_name, issuing_org, issue_date, expiry_date, no_expiry,
            credential_id, credential_url, file_name, file_type,
            status, reviewer_comment, reviewed_at, created_at
     FROM user_certifications WHERE user_id = ? ORDER BY created_at DESC`,
    [req.user.id]
  );
  res.json({ certifications: rows.map(r => ({ ...r, no_expiry: r.no_expiry === 1 })) });
}));

// ---------- POST /api/users/me/certifications ----------
router.post('/me/certifications', requireAuth, wrap(async (req, res) => {
  const { cert_name, issuing_org, issue_date, expiry_date, no_expiry,
          credential_id, credential_url, file_data, file_name, file_type } = req.body;

  if (!cert_name?.trim())   return res.status(400).json({ error: 'cert_name is required' });
  if (!issuing_org?.trim()) return res.status(400).json({ error: 'issuing_org is required' });

  if (file_data) {
    const approxBytes = Math.ceil((file_data.split(',')[1] || '').length * 0.75);
    if (approxBytes > 10 * 1024 * 1024) {
      return res.status(400).json({ error: 'File must be under 10 MB' });
    }
  }

  const result = await db.run(
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

  const cert = await db.get(
    `SELECT id, cert_name, issuing_org, issue_date, expiry_date, no_expiry,
            credential_id, credential_url, file_name, file_type,
            status, reviewer_comment, reviewed_at, created_at
     FROM user_certifications WHERE id = ?`,
    [result.lastInsertRowid]
  );
  const actor = await db.get('SELECT first_name, last_name FROM users WHERE id = ?', [req.user.id]);
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
}));

// ---------- DELETE /api/users/me/certifications/:id ----------
router.delete('/me/certifications/:id', requireAuth, wrap(async (req, res) => {
  const cert = await db.get(
    'SELECT id, status FROM user_certifications WHERE id = ? AND user_id = ?',
    [req.params.id, req.user.id]
  );
  if (!cert) return res.status(404).json({ error: 'Certification not found' });
  if (cert.status !== 'Pending') {
    return res.status(403).json({ error: 'Only pending certifications can be deleted' });
  }
  await db.run('DELETE FROM user_certifications WHERE id = ?', [cert.id]);
  res.json({ ok: true });
}));

// ---------- GET /api/users/me/certifications/:id/file ----------
router.get('/me/certifications/:id/file', requireAuth, wrap(async (req, res) => {
  const row = await db.get(
    'SELECT file_data, file_name, file_type FROM user_certifications WHERE id = ? AND user_id = ?',
    [req.params.id, req.user.id]
  );
  if (!row || !row.file_data) return res.status(404).json({ error: 'File not found' });
  res.json({ file_data: row.file_data, file_name: row.file_name, file_type: row.file_type });
}));

// ---------- PATCH /api/users/certifications/:id/review ----------
router.patch('/certifications/:id/review', requireAuth, wrap(async (req, res) => {
  if (!['lead', 'manager', 'admin'].includes(req.user.role)) {
    return res.status(403).json({ error: 'Only leads, managers, or admins can review certifications' });
  }
  const { status, comment } = req.body;
  if (!['Approved', 'Rejected'].includes(status)) {
    return res.status(400).json({ error: 'status must be Approved or Rejected' });
  }
  const cert = await db.get('SELECT * FROM user_certifications WHERE id = ?', [req.params.id]);
  if (!cert) return res.status(404).json({ error: 'Certification not found' });

  await db.run(
    `UPDATE user_certifications
     SET status = ?, reviewer_id = ?, reviewer_comment = ?,
         reviewed_at = datetime('now'), updated_at = datetime('now')
     WHERE id = ?`,
    [status, req.user.id, comment || null, cert.id]
  );

  const reviewer     = await db.get('SELECT first_name, last_name FROM users WHERE id = ?', [req.user.id]);
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

  const updated = await db.get(
    `SELECT id, cert_name, issuing_org, status, reviewer_comment, reviewed_at
     FROM user_certifications WHERE id = ?`,
    [cert.id]
  );
  res.json({ certification: updated });
}));

// ---------- GET /api/users/teams ----------
router.get('/teams', requireAuth, wrap(async (req, res) => {
  const teams = await db.all('SELECT id, name, description FROM teams ORDER BY name');
  res.json({ teams });
}));

// ---------- GET /api/users/tags ----------
router.get('/tags', requireAuth, wrap(async (req, res) => {
  const tags = await db.all('SELECT id, name, kind FROM tags ORDER BY kind, name');
  res.json({ tags });
}));

module.exports = router;
