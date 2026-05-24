const express = require('express');
const bcrypt  = require('bcryptjs');
const db = require('../db');
const { requireAuth, requireRole } = require('../middleware/auth');

const DEFAULT_PASSWORD = 'Profile@123';

const router = express.Router();

// All admin routes require authentication + manager or admin role
router.use(requireAuth);
router.use((req, res, next) => {
  if (!['manager', 'admin'].includes(req.user.role)) {
    return res.status(403).json({ error: 'Not authorized to access admin endpoints' });
  }
  next();
});

// ---------- GET /api/admin/dashboard/overview ----------
// High-level summary: total users, activities this week/month
router.get('/dashboard/overview', (req, res) => {
  const totalUsers = db.get('SELECT COUNT(*) as count FROM users');
  const totalActivities = db.get('SELECT COUNT(*) as count FROM activities');

  // Activities this week (last 7 days)
  const thisWeek = db.get(`
    SELECT COUNT(*) as count FROM activities
    WHERE activity_date >= date('now', '-7 days')
  `);

  // Activities this month (last 30 days)
  const thisMonth = db.get(`
    SELECT COUNT(*) as count FROM activities
    WHERE activity_date >= date('now', '-30 days')
  `);

  // Top activity types
  const topActivityTypes = db.all(`
    SELECT activity_type, COUNT(*) as count
    FROM activities
    GROUP BY activity_type
    ORDER BY count DESC
    LIMIT 5
  `);

  // Top domains
  const topDomains = db.all(`
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
});

// ---------- GET /api/admin/dashboard/team-breakdown ----------
// Activities by team with adoption percentage
router.get('/dashboard/team-breakdown', (req, res) => {
  const teams = db.all(`
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
});

// ---------- GET /api/admin/dashboard/user/:userId ----------
// View a specific user's activities and progress
router.get('/dashboard/user/:userId', (req, res) => {
  const user = db.get(`
    SELECT id, email, first_name, last_name, team_id, role, tech_stack, ai_tools, bio, created_at
    FROM users WHERE id = ?
  `, [req.params.userId]);

  if (!user) return res.status(404).json({ error: 'User not found' });

  const activities = db.all(`
    SELECT * FROM activities
    WHERE user_id = ?
    ORDER BY activity_date DESC
  `, [req.params.userId]);

  // Parse JSON fields
  if (user.tech_stack) user.tech_stack = db.parseJson(user.tech_stack, []);
  if (user.ai_tools) user.ai_tools = db.parseJson(user.ai_tools, []);

  res.json({
    user: {
      ...user,
      totalActivities: activities.length,
      recentActivities: activities.slice(0, 5),
    },
    activities,
  });
});

// ---------- GET /api/admin/dashboard/chart/activities-by-type ----------
// Chart data: activities grouped by type
router.get('/dashboard/chart/activities-by-type', (req, res) => {
  const data = db.all(`
    SELECT activity_type as label, COUNT(*) as count
    FROM activities
    GROUP BY activity_type
    ORDER BY count DESC
  `);

  res.json({ data });
});

// ---------- GET /api/admin/dashboard/chart/activities-by-domain ----------
// Chart data: activities grouped by domain
router.get('/dashboard/chart/activities-by-domain', (req, res) => {
  const data = db.all(`
    SELECT COALESCE(domain, 'Uncategorized') as label, COUNT(*) as count
    FROM activities
    GROUP BY domain
    ORDER BY count DESC
  `);

  res.json({ data });
});

// ---------- GET /api/admin/dashboard/chart/activities-by-team ----------
// Chart data: activities grouped by team
router.get('/dashboard/chart/activities-by-team', (req, res) => {
  const data = db.all(`
    SELECT t.name as label, COUNT(a.id) as count
    FROM teams t
    LEFT JOIN users u ON u.team_id = t.id
    LEFT JOIN activities a ON a.user_id = u.id
    GROUP BY t.id
    ORDER BY count DESC
  `);

  res.json({ data });
});

// ---------- GET /api/admin/dashboard/chart/adoption-by-team ----------
// Chart data: adoption percentage by team
router.get('/dashboard/chart/adoption-by-team', (req, res) => {
  const data = db.all(`
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
});

// ---------- GET /api/admin/dashboard/chart/activities-by-model ----------
// Chart data: model usage distribution across all users
router.get('/dashboard/chart/activities-by-model', (req, res) => {
  const data = db.all(`
    SELECT model_used AS name, COUNT(*) AS count
    FROM activities
    WHERE model_used IS NOT NULL AND model_used != ''
    GROUP BY model_used
    ORDER BY count DESC
  `);
  res.json({ data });
});

// ---------- GET /api/admin/dashboard/export/csv ----------
// Export all activities to CSV
router.get('/dashboard/export/csv', (req, res) => {
  const activities = db.all(`
    SELECT a.id, a.created_at, u.email, u.first_name, u.last_name, t.name as team,
           a.activity_type, a.title, a.tool_used, a.domain, a.status, a.activity_date, a.notes
    FROM activities a
    JOIN users u ON a.user_id = u.id
    LEFT JOIN teams t ON u.team_id = t.id
    ORDER BY a.activity_date DESC
  `);

  // Build CSV
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
});

// ---------- GET /api/admin/dashboard/users ----------
// List all users with activity counts
router.get('/dashboard/users', (req, res) => {
  const users = db.all(`
    SELECT u.id, u.email, u.first_name, u.last_name, u.role, t.name as team,
           COUNT(a.id) as activity_count
    FROM users u
    LEFT JOIN teams t ON u.team_id = t.id
    LEFT JOIN activities a ON a.user_id = u.id
    GROUP BY u.id
    ORDER BY activity_count DESC
  `);

  res.json({ users });
});

// ---------- GET /api/admin/reviews ----------
// Pending certifications with user + reviewer info for approval table
// ?dept=&status=Pending|Approved|Rejected&from=YYYY-MM-DD&to=YYYY-MM-DD
router.get('/reviews', (req, res) => {
  const { dept, status, from, to } = req.query;
  const params = [];
  const clauses = [];

  if (status) {
    clauses.push('uc.status = ?');
    params.push(status);
  } else {
    clauses.push("uc.status = 'Pending'");
  }
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

  const certs = db.all(`
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

  const pending_count = db.get(
    "SELECT COUNT(*) AS c FROM user_certifications WHERE status = 'Pending'"
  ).c;

  res.json({
    certifications: certs.map(c => ({ ...c, no_expiry: c.no_expiry === 1 })),
    pending_count,
  });
});

// ---------- GET /api/admin/profiles ----------
// All users with profile completion stats
// ?dept=&completed=0|1&search=
router.get('/profiles', (req, res) => {
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

  const users = db.all(`
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

  const departments = db.all(
    `SELECT DISTINCT department FROM users WHERE department IS NOT NULL AND department != '' ORDER BY department`
  );

  res.json({
    users: users.map(u => ({ ...u, profile_completed: u.profile_completed === 1 })),
    departments: departments.map(d => d.department),
  });
});

// ---------- GET /api/admin/activities ----------
// All activities across all users with filters
// ?dept=&team=&type=&domain=&status=&user=&from=&to=&page=&limit=
router.get('/activities', (req, res) => {
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

  const { count: total } = db.get(`
    SELECT COUNT(*) as count
    FROM activities a
    JOIN users u ON a.user_id = u.id
    LEFT JOIN teams t ON u.team_id = t.id
    ${where}
  `, params);

  const activities = db.all(`
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

  const departments = db.all(
    `SELECT DISTINCT department FROM users WHERE department IS NOT NULL AND department != '' ORDER BY department`
  ).map(d => d.department);

  const teams = db.all(`SELECT DISTINCT name FROM teams ORDER BY name`).map(t => t.name);

  const domains = db.all(
    `SELECT DISTINCT domain FROM activities WHERE domain IS NOT NULL AND domain != '' ORDER BY domain`
  ).map(d => d.domain);

  res.json({ activities, total, page, limit, departments, teams, domains });
});

// ---------- GET /api/admin/users/:userId/profile ----------
// Full profile view for a single user (admin/manager access)
router.get('/users/:userId/profile', (req, res) => {
  const user = db.get(`
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

  const skills = db.all(
    `SELECT * FROM user_skills WHERE user_id = ? ORDER BY category, name`,
    [req.params.userId]
  );

  const pocs = db.all(
    `SELECT * FROM user_pocs WHERE user_id = ? ORDER BY created_at DESC`,
    [req.params.userId]
  ).map(p => ({
    ...p,
    tools_stack:  db.parseJson(p.tools_stack,  []),
    team_members: db.parseJson(p.team_members, []),
  }));

  const certifications = db.all(
    `SELECT * FROM user_certifications WHERE user_id = ? ORDER BY created_at DESC`,
    [req.params.userId]
  ).map(c => ({ ...c, no_expiry: c.no_expiry === 1 }));

  const activities = db.all(
    `SELECT a.*,
       (SELECT COUNT(*) FROM activity_comments c WHERE c.activity_id = a.id) AS comment_count
     FROM activities a
     WHERE a.user_id = ?
     ORDER BY a.activity_date DESC
     LIMIT 20`,
    [req.params.userId]
  );

  const activityStats = db.get(`
    SELECT COUNT(*) as total,
           COUNT(CASE WHEN status = 'completed' THEN 1 END)                           as completed,
           COUNT(CASE WHEN activity_date >= date('now', '-30 days') THEN 1 END)       as this_month
    FROM activities WHERE user_id = ?
  `, [req.params.userId]);

  const { password_hash, ...safeUser } = user;
  res.json({ user: { ...safeUser, profile_completed: safeUser.profile_completed === 1 }, skills, pocs, certifications, activities, activityStats });
});

// ---------- POST /api/admin/users ----------
// Admin creates a new user account with default password Profile@123
router.post('/users', requireRole('admin'), async (req, res) => {
  const { email, first_name, last_name, role = 'developer', department = '' } = req.body;

  if (!email?.trim() || !first_name?.trim() || !last_name?.trim()) {
    return res.status(400).json({ error: 'email, first_name and last_name are required' });
  }

  const normalised = email.trim().toLowerCase();
  const existing = db.get('SELECT id FROM users WHERE email = ?', [normalised]);
  if (existing) {
    return res.status(409).json({ error: 'A user with this email already exists' });
  }

  const allowed = ['developer', 'lead', 'manager', 'admin'];
  if (!allowed.includes(role)) {
    return res.status(400).json({ error: `Invalid role. Must be one of: ${allowed.join(', ')}` });
  }

  const password_hash = await bcrypt.hash(DEFAULT_PASSWORD, 10);

  const result = db.run(
    `INSERT INTO users (email, password_hash, first_name, last_name, department, role)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [normalised, password_hash, first_name.trim(), last_name.trim(), department.trim(), role]
  );

  const newUser = db.get(
    'SELECT id, email, first_name, last_name, role, department, created_at FROM users WHERE id = ?',
    [result.lastInsertRowid]
  );
  res.status(201).json({ user: newUser });
});

// ---------- PATCH /api/admin/users/:userId/role ----------
// Change a user's role — admin only, cannot target admin accounts
router.patch('/users/:userId/role', requireRole('admin'), (req, res) => {
  const { role } = req.body;
  const allowed = ['developer', 'lead', 'manager'];
  if (!allowed.includes(role)) {
    return res.status(400).json({ error: `Invalid role. Must be one of: ${allowed.join(', ')}` });
  }
  const target = db.get('SELECT id, email, role FROM users WHERE id = ?', [req.params.userId]);
  if (!target) return res.status(404).json({ error: 'User not found' });
  if (target.role === 'admin') {
    return res.status(403).json({ error: 'Cannot change the role of an admin account' });
  }
  db.run("UPDATE users SET role = ?, updated_at = datetime('now') WHERE id = ?", [role, req.params.userId]);
  res.json({ id: target.id, email: target.email, role });
});

module.exports = router;
