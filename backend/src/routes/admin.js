const express = require('express');
const bcrypt  = require('bcryptjs');
const db = require('../db');
const { requireAuth, requireRole } = require('../middleware/auth');

const DEFAULT_PASSWORD = 'Profile@123';

const router = express.Router();
const wrap = fn => (req, res, next) => fn(req, res, next).catch(next);
const safeJson = (v, fallback = null) => { try { return JSON.parse(v); } catch { return fallback; } };

router.use(requireAuth);
router.use((req, res, next) => {
  if (!['manager', 'admin'].includes(req.user.role)) {
    return res.status(403).json({ error: 'Not authorized to access admin endpoints' });
  }
  next();
});

// ---------- GET /api/admin/dashboard/overview ----------
router.get('/dashboard/overview', wrap(async (req, res) => {
  const totalUsers      = await db.get('SELECT COUNT(*) as count FROM users');
  const totalActivities = await db.get('SELECT COUNT(*) as count FROM activities');

  const thisWeek = await db.get(`
    SELECT COUNT(*) as count FROM activities
    WHERE activity_date >= date('now', '-7 days')
  `);

  const thisMonth = await db.get(`
    SELECT COUNT(*) as count FROM activities
    WHERE activity_date >= date('now', '-30 days')
  `);

  const topActivityTypes = await db.all(`
    SELECT activity_type, COUNT(*) as count
    FROM activities
    GROUP BY activity_type
    ORDER BY count DESC
    LIMIT 5
  `);

  const topDomains = await db.all(`
    SELECT domain, COUNT(*) as count
    FROM activities
    WHERE domain IS NOT NULL AND domain != ''
    GROUP BY domain
    ORDER BY count DESC
    LIMIT 5
  `);

  res.json({
    totalUsers: totalUsers.count,
    totalActivities: totalActivities.count,
    activitiesThisWeek: thisWeek.count,
    activitiesThisMonth: thisMonth.count,
    topActivityTypes,
    topDomains,
  });
}));

// ---------- GET /api/admin/dashboard/team-breakdown ----------
router.get('/dashboard/team-breakdown', wrap(async (req, res) => {
  const teams = await db.all(`
    SELECT t.id, t.name,
           COUNT(DISTINCT u.id) as total_members,
           COUNT(DISTINCT CASE WHEN a.id IS NOT NULL THEN u.id END) as members_with_activities,
           COUNT(a.id) as activity_count
    FROM teams t
    LEFT JOIN users u ON u.team_id = t.id
    LEFT JOIN activities a ON a.user_id = u.id
    GROUP BY t.id
    ORDER BY activity_count DESC
  `);

  const enriched = teams.map(team => ({
    ...team,
    adoptionRate: team.total_members > 0 ? Math.round((team.members_with_activities / team.total_members) * 100) : 0,
  }));

  res.json({ teams: enriched });
}));

// ---------- GET /api/admin/dashboard/user/:userId ----------
router.get('/dashboard/user/:userId', wrap(async (req, res) => {
  const user = await db.get(`
    SELECT id, email, first_name, last_name, team_id, role, tech_stack, ai_tools, bio, created_at
    FROM users WHERE id = ?
  `, [req.params.userId]);

  if (!user) return res.status(404).json({ error: 'User not found' });

  const activities = await db.all(`
    SELECT * FROM activities
    WHERE user_id = ?
    ORDER BY activity_date DESC
  `, [req.params.userId]);

  if (user.tech_stack) user.tech_stack = db.parseJson(user.tech_stack, []);
  if (user.ai_tools)   user.ai_tools   = db.parseJson(user.ai_tools,   []);

  res.json({
    user: {
      ...user,
      totalActivities: activities.length,
      recentActivities: activities.slice(0, 5),
    },
    activities,
  });
}));

// ---------- GET /api/admin/dashboard/chart/activities-by-type ----------
router.get('/dashboard/chart/activities-by-type', wrap(async (req, res) => {
  const data = await db.all(`
    SELECT activity_type as label, COUNT(*) as count
    FROM activities
    GROUP BY activity_type
    ORDER BY count DESC
  `);
  res.json({ data });
}));

// ---------- GET /api/admin/dashboard/chart/activities-by-domain ----------
router.get('/dashboard/chart/activities-by-domain', wrap(async (req, res) => {
  const data = await db.all(`
    SELECT COALESCE(domain, 'Uncategorized') as label, COUNT(*) as count
    FROM activities
    GROUP BY domain
    ORDER BY count DESC
  `);
  res.json({ data });
}));

// ---------- GET /api/admin/dashboard/chart/activities-by-team ----------
router.get('/dashboard/chart/activities-by-team', wrap(async (req, res) => {
  const data = await db.all(`
    SELECT t.name as label, COUNT(a.id) as count
    FROM teams t
    LEFT JOIN users u ON u.team_id = t.id
    LEFT JOIN activities a ON a.user_id = u.id
    GROUP BY t.id
    ORDER BY count DESC
  `);
  res.json({ data });
}));

// ---------- GET /api/admin/dashboard/chart/adoption-by-team ----------
router.get('/dashboard/chart/adoption-by-team', wrap(async (req, res) => {
  const data = await db.all(`
    SELECT t.name as label,
           CASE WHEN COUNT(DISTINCT u.id) > 0
                THEN ROUND(COUNT(DISTINCT CASE WHEN a.id IS NOT NULL THEN u.id END) * 100.0 / COUNT(DISTINCT u.id), 1)
                ELSE 0
           END as value
    FROM teams t
    LEFT JOIN users u ON u.team_id = t.id
    LEFT JOIN activities a ON a.user_id = u.id
    GROUP BY t.id
    ORDER BY value DESC
  `);
  res.json({ data });
}));

// ---------- GET /api/admin/dashboard/chart/activities-by-model ----------
router.get('/dashboard/chart/activities-by-model', wrap(async (req, res) => {
  const data = await db.all(`
    SELECT model_used AS name, COUNT(*) AS count
    FROM activities
    WHERE model_used IS NOT NULL AND model_used != ''
    GROUP BY model_used
    ORDER BY count DESC
  `);
  res.json({ data });
}));

// ---------- GET /api/admin/dashboard/export/csv ----------
router.get('/dashboard/export/csv', wrap(async (req, res) => {
  const activities = await db.all(`
    SELECT a.id, a.created_at, u.email, u.first_name, u.last_name, t.name as team,
           a.activity_type, a.title, a.tool_used, a.domain, a.status, a.activity_date, a.notes
    FROM activities a
    JOIN users u ON a.user_id = u.id
    LEFT JOIN teams t ON u.team_id = t.id
    ORDER BY a.activity_date DESC
  `);

  const headers = ['Date', 'User', 'Team', 'Activity Type', 'Title', 'Tool', 'Domain', 'Status', 'Notes'];
  const rows = activities.map(a => [
    new Date(a.activity_date).toLocaleDateString(),
    `${a.first_name} ${a.last_name}`,
    a.team || '',
    a.activity_type,
    a.title,
    a.tool_used || '',
    a.domain || '',
    a.status,
    (a.notes || '').replace(/"/g, '""'),
  ]);

  const csv = [
    headers.join(','),
    ...rows.map(row => row.map(cell => {
      if (typeof cell === 'string' && (cell.includes(',') || cell.includes('"') || cell.includes('\n'))) {
        return `"${cell}"`;
      }
      return cell;
    }).join(',')),
  ].join('\n');

  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', `attachment; filename="activities-${new Date().toISOString().split('T')[0]}.csv"`);
  res.send(csv);
}));

// ---------- GET /api/admin/dashboard/users ----------
router.get('/dashboard/users', wrap(async (req, res) => {
  const users = await db.all(`
    SELECT u.id, u.email, u.first_name, u.last_name, u.role, t.name as team,
           COUNT(a.id) as activity_count
    FROM users u
    LEFT JOIN teams t ON u.team_id = t.id
    LEFT JOIN activities a ON a.user_id = u.id
    GROUP BY u.id
    ORDER BY activity_count DESC
  `);
  res.json({ users });
}));

// ---------- GET /api/admin/reviews ----------
router.get('/reviews', wrap(async (req, res) => {
  const { dept, status, from, to } = req.query;
  const params = [];
  const clauses = [];

  if (status && status !== 'all') {
    clauses.push('uc.status = ?');
    params.push(status);
  } else if (!status) {
    clauses.push("uc.status = 'Pending'");
  }
  // status=all → no filter, return all statuses
  if (dept) {
    clauses.push('u.department = ?');
    params.push(dept);
  }
  if (from) {
    clauses.push("uc.created_at >= ?");
    params.push(from);
  }
  if (to) {
    clauses.push("uc.created_at <= ?");
    params.push(to + ' 23:59:59');
  }

  const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';

  const certs = await db.all(`
    SELECT uc.id, uc.cert_name, uc.issuing_org, uc.issue_date, uc.expiry_date, uc.no_expiry,
           uc.credential_id, uc.credential_url, uc.file_name, uc.file_type,
           uc.status, uc.reviewer_comment, uc.reviewed_at, uc.created_at,
           u.id AS user_id, u.first_name, u.last_name, u.email, u.department, u.designation,
           u.avatar_url,
           rv.first_name AS reviewer_first, rv.last_name AS reviewer_last
    FROM user_certifications uc
    JOIN users u ON u.id = uc.user_id
    LEFT JOIN users rv ON rv.id = uc.reviewer_id
    ${where}
    ORDER BY uc.created_at DESC
  `, params);

  const pending = await db.get(
    "SELECT COUNT(*) AS c FROM user_certifications WHERE status = 'Pending'"
  );

  res.json({
    certifications: certs.map(c => ({ ...c, no_expiry: c.no_expiry === 1 })),
    pending_count: pending.c,
  });
}));

// ---------- GET /api/admin/pocs ----------
router.get('/pocs', wrap(async (req, res) => {
  const { user, dept, status, from, to } = req.query;
  const args = [];
  const where = ['1=1'];

  if (user)   { where.push(`(u.first_name || ' ' || u.last_name LIKE ? OR u.email LIKE ?)`); args.push(`%${user}%`, `%${user}%`); }
  if (dept)   { where.push('u.department = ?');  args.push(dept); }
  if (status) { where.push('p.status = ?');      args.push(status); }
  if (from)   { where.push('p.start_date >= ?'); args.push(from); }
  if (to)     { where.push('p.start_date <= ?'); args.push(to); }

  const rows = await db.all(
    `SELECT p.id, p.poc_name, p.category, p.tools_stack, p.status, p.progress,
            p.start_date, p.end_date, p.created_at,
            u.id AS user_id, u.first_name, u.last_name, u.email,
            u.department, u.designation, u.avatar_url,
            t.name AS team
     FROM user_pocs p
     JOIN users u ON u.id = p.user_id
     LEFT JOIN teams t ON t.id = u.team_id
     WHERE ${where.join(' AND ')}
     ORDER BY p.start_date DESC, p.created_at DESC`,
    args
  );

  res.json({
    pocs: rows.map(r => ({ ...r, tools_stack: safeJson(r.tools_stack, []) })),
  });
}));

// ---------- GET /api/admin/profiles ----------
router.get('/profiles', wrap(async (req, res) => {
  const { dept, completed, search } = req.query;
  const params = [];
  const clauses = [];

  if (dept) {
    clauses.push('u.department = ?');
    params.push(dept);
  }
  if (completed !== undefined && completed !== '') {
    clauses.push('u.profile_completed = ?');
    params.push(Number(completed));
  }
  if (search) {
    const q = `%${search.trim()}%`;
    clauses.push('(u.first_name || \' \' || u.last_name LIKE ? OR u.email LIKE ?)');
    params.push(q, q);
  }

  const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';

  const users = await db.all(`
    SELECT u.id, u.first_name, u.last_name, u.email, u.role, u.department, u.designation,
           u.profile_completed, u.avatar_url, u.location, u.date_of_joining,
           t.name AS team,
           (SELECT COUNT(*) FROM user_skills   WHERE user_id = u.id) AS skills_count,
           (SELECT COUNT(*) FROM user_pocs     WHERE user_id = u.id) AS pocs_count,
           (SELECT COUNT(*) FROM user_certifications WHERE user_id = u.id) AS certs_count,
           (SELECT COUNT(*) FROM user_certifications WHERE user_id = u.id AND status = 'Approved') AS approved_certs
    FROM users u
    LEFT JOIN teams t ON t.id = u.team_id
    ${where}
    ORDER BY u.profile_completed ASC, u.first_name, u.last_name
  `, params);

  const departments = await db.all(
    `SELECT DISTINCT department FROM users WHERE department IS NOT NULL AND department != '' ORDER BY department`
  );

  res.json({
    users: users.map(u => ({ ...u, profile_completed: u.profile_completed === 1 })),
    departments: departments.map(d => d.department),
  });
}));

// ---------- GET /api/admin/activities ----------
router.get('/activities', wrap(async (req, res) => {
  const { dept, team, type, domain, status, user: userSearch, from, to } = req.query;
  const page  = Math.max(1, Number(req.query.page  || 1));
  const limit = Math.min(100, Math.max(10, Number(req.query.limit || 50)));

  const params = [];
  const clauses = [];

  if (dept)       { clauses.push('u.department = ?');         params.push(dept); }
  if (team)       { clauses.push('t.name = ?');               params.push(team); }
  if (type)       { clauses.push('a.activity_type = ?');      params.push(type); }
  if (domain)     { clauses.push('a.domain = ?');             params.push(domain); }
  if (status)     { clauses.push('a.status = ?');             params.push(status); }
  if (from)       { clauses.push('a.activity_date >= ?');     params.push(from); }
  if (to)         { clauses.push('a.activity_date <= ?');     params.push(to); }
  if (userSearch) {
    const q = `%${userSearch.trim()}%`;
    clauses.push("(u.first_name || ' ' || u.last_name LIKE ? OR u.email LIKE ?)");
    params.push(q, q);
  }

  const where  = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
  const offset = (page - 1) * limit;

  const countRow = await db.get(`
    SELECT COUNT(*) as count
    FROM activities a
    JOIN users u ON a.user_id = u.id
    LEFT JOIN teams t ON u.team_id = t.id
    ${where}
  `, params);

  const activities = await db.all(`
    SELECT a.id, a.activity_type, a.title, a.tool_used, a.domain, a.status,
           a.notes, a.activity_date, a.created_at,
           u.id as user_id, u.first_name, u.last_name, u.email,
           u.department, u.avatar_url,
           t.name as team
    FROM activities a
    JOIN users u ON a.user_id = u.id
    LEFT JOIN teams t ON u.team_id = t.id
    ${where}
    ORDER BY a.activity_date DESC, a.created_at DESC
    LIMIT ? OFFSET ?
  `, [...params, limit, offset]);

  const departments = (await db.all(
    `SELECT DISTINCT department FROM users WHERE department IS NOT NULL AND department != '' ORDER BY department`
  )).map(d => d.department);

  const teams = (await db.all(`SELECT DISTINCT name FROM teams ORDER BY name`)).map(t => t.name);

  const domains = (await db.all(
    `SELECT DISTINCT domain FROM activities WHERE domain IS NOT NULL AND domain != '' ORDER BY domain`
  )).map(d => d.domain);

  res.json({ activities, total: countRow.count, page, limit, departments, teams, domains });
}));

// ---------- GET /api/admin/users/:userId/profile ----------
router.get('/users/:userId/profile', wrap(async (req, res) => {
  const user = await db.get(`
    SELECT u.*,
           t.name  AS team_name,
           rm.first_name AS manager_first,
           rm.last_name  AS manager_last
    FROM users u
    LEFT JOIN teams t  ON t.id  = u.team_id
    LEFT JOIN users rm ON rm.id = u.reporting_manager_id
    WHERE u.id = ?
  `, [req.params.userId]);

  if (!user) return res.status(404).json({ error: 'User not found' });

  if (user.tech_stack) user.tech_stack = db.parseJson(user.tech_stack, []);
  if (user.ai_tools)   user.ai_tools   = db.parseJson(user.ai_tools,   []);

  const skills = await db.all(
    `SELECT * FROM user_skills WHERE user_id = ? ORDER BY category, name`,
    [req.params.userId]
  );

  const pocRows = await db.all(
    `SELECT * FROM user_pocs WHERE user_id = ? ORDER BY created_at DESC`,
    [req.params.userId]
  );
  const pocs = pocRows.map(p => ({
    ...p,
    tools_stack:  db.parseJson(p.tools_stack,  []),
    team_members: db.parseJson(p.team_members, []),
  }));

  const certRows = await db.all(
    `SELECT * FROM user_certifications WHERE user_id = ? ORDER BY created_at DESC`,
    [req.params.userId]
  );
  const certifications = certRows.map(c => ({ ...c, no_expiry: c.no_expiry === 1 }));

  const activities = await db.all(
    `SELECT a.*,
       (SELECT COUNT(*) FROM activity_comments c WHERE c.activity_id = a.id) AS comment_count
     FROM activities a
     WHERE a.user_id = ?
     ORDER BY a.activity_date DESC
     LIMIT 20`,
    [req.params.userId]
  );

  const activityStats = await db.get(`
    SELECT COUNT(*) as total,
           COUNT(CASE WHEN status = 'completed' THEN 1 END)                           as completed,
           COUNT(CASE WHEN activity_date >= date('now', '-30 days') THEN 1 END)       as this_month
    FROM activities WHERE user_id = ?
  `, [req.params.userId]);

  const { password_hash, ...safeUser } = user;
  res.json({ user: { ...safeUser, profile_completed: safeUser.profile_completed === 1 }, skills, pocs, certifications, activities, activityStats });
}));

// ---------- POST /api/admin/users ----------
router.post('/users', requireRole('admin'), wrap(async (req, res) => {
  const { email, first_name, last_name, role = 'developer', department = '' } = req.body;

  if (!email?.trim() || !first_name?.trim() || !last_name?.trim()) {
    return res.status(400).json({ error: 'email, first_name and last_name are required' });
  }

  const normalised = email.trim().toLowerCase();
  const existing = await db.get('SELECT id FROM users WHERE email = ?', [normalised]);
  if (existing) {
    return res.status(409).json({ error: 'A user with this email already exists' });
  }

  const allowed = ['developer', 'lead', 'manager', 'admin'];
  if (!allowed.includes(role)) {
    return res.status(400).json({ error: `Invalid role. Must be one of: ${allowed.join(', ')}` });
  }

  const password_hash = await bcrypt.hash(DEFAULT_PASSWORD, 10);

  const result = await db.run(
    `INSERT INTO users (email, password_hash, first_name, last_name, mobile, department, role)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [normalised, password_hash, first_name.trim(), last_name.trim(), '', department.trim(), role]
  );

  const newUser = await db.get(
    'SELECT id, email, first_name, last_name, role, department, created_at FROM users WHERE id = ?',
    [result.lastInsertRowid]
  );
  res.status(201).json({ user: newUser });
}));

// ---------- GET /api/admin/teams/:teamId ----------
router.get('/teams/:teamId', wrap(async (req, res) => {
  const team = await db.get('SELECT id, name, description, created_at FROM teams WHERE id = ?', [req.params.teamId]);
  if (!team) return res.status(404).json({ error: 'Team not found' });

  const members = await db.all(`
    SELECT u.id, u.first_name, u.last_name, u.email, u.role, u.designation, u.department,
           u.avatar_url, u.profile_completed, u.status,
           COUNT(a.id) as activity_count,
           (SELECT COUNT(*) FROM user_skills   WHERE user_id = u.id) AS skills_count,
           (SELECT COUNT(*) FROM user_pocs     WHERE user_id = u.id) AS pocs_count,
           (SELECT COUNT(*) FROM user_certifications WHERE user_id = u.id AND status = 'Approved') AS approved_certs
    FROM users u
    LEFT JOIN activities a ON a.user_id = u.id
    WHERE u.team_id = ?
    GROUP BY u.id
    ORDER BY activity_count DESC
  `, [req.params.teamId]);

  const stats = await db.get(`
    SELECT COUNT(DISTINCT u.id) as total_members,
           COUNT(DISTINCT CASE WHEN a.id IS NOT NULL THEN u.id END) as members_with_activities,
           COUNT(a.id) as activity_count
    FROM users u
    LEFT JOIN activities a ON a.user_id = u.id
    WHERE u.team_id = ?
  `, [req.params.teamId]);

  const adoptionRate = stats.total_members > 0
    ? Math.round((stats.members_with_activities / stats.total_members) * 100)
    : 0;

  res.json({
    team: { ...team, ...stats, adoptionRate },
    members: members.map(m => ({ ...m, profile_completed: m.profile_completed === 1 })),
  });
}));

// ---------- PATCH /api/admin/users/:userId/status ----------
router.patch('/users/:userId/status', requireRole('admin'), wrap(async (req, res) => {
  const { status } = req.body;
  if (!['active', 'suspended'].includes(status)) {
    return res.status(400).json({ error: 'status must be active or suspended' });
  }
  const target = await db.get('SELECT id, email, role, status FROM users WHERE id = ?', [req.params.userId]);
  if (!target) return res.status(404).json({ error: 'User not found' });
  if (target.role === 'admin') {
    return res.status(403).json({ error: 'Cannot suspend an admin account' });
  }
  await db.run("UPDATE users SET status = ?, updated_at = datetime('now') WHERE id = ?", [status, req.params.userId]);
  res.json({ id: target.id, email: target.email, status });
}));

// ---------- DELETE /api/admin/users/:userId ----------
router.delete('/users/:userId', requireRole('admin'), wrap(async (req, res) => {
  const target = await db.get('SELECT id, email, role FROM users WHERE id = ?', [req.params.userId]);
  if (!target) return res.status(404).json({ error: 'User not found' });
  if (target.role === 'admin') {
    return res.status(403).json({ error: 'Cannot delete an admin account' });
  }
  if (String(target.id) === String(req.user.id)) {
    return res.status(403).json({ error: 'Cannot delete your own account' });
  }
  await db.run('DELETE FROM users WHERE id = ?', [req.params.userId]);
  res.json({ deleted: true, id: target.id });
}));

// ---------- PATCH /api/admin/users/:userId/role ----------
router.patch('/users/:userId/role', requireRole('admin'), wrap(async (req, res) => {
  const { role } = req.body;
  const allowed = ['developer', 'lead', 'manager'];
  if (!allowed.includes(role)) {
    return res.status(400).json({ error: `Invalid role. Must be one of: ${allowed.join(', ')}` });
  }
  const target = await db.get('SELECT id, email, role FROM users WHERE id = ?', [req.params.userId]);
  if (!target) return res.status(404).json({ error: 'User not found' });
  if (target.role === 'admin') {
    return res.status(403).json({ error: 'Cannot change the role of an admin account' });
  }
  await db.run("UPDATE users SET role = ?, updated_at = datetime('now') WHERE id = ?", [role, req.params.userId]);
  res.json({ id: target.id, email: target.email, role });
}));

module.exports = router;
