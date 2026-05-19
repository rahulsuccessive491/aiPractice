const express = require('express');
const db = require('../db');
const { requireAuth, requireRole } = require('../middleware/auth');

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

module.exports = router;
