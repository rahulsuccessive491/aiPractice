import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import HighchartsReact from 'highcharts-react-official';
import Highcharts from '../lib/highchartsInit.js';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { api } from '../lib/api';
import PageWrapper from '../components/PageWrapper';
import AnimatedNumber from '../components/AnimatedNumber';

/* ── palette ─────────────────────────────────────────────────── */
const PALETTE = ['#3a60f5', '#8b5cf6', '#10b981', '#f59e0b', '#f43f5e', '#06b6d4', '#f97316', '#6366f1'];

/* ── KPI card ────────────────────────────────────────────────── */
const cardVariants = {
  hidden:   { opacity: 0, y: 20 },
  visible: i => ({ opacity: 1, y: 0, transition: { delay: i * 0.08, duration: 0.38, ease: [0.4, 0, 0.2, 1] } }),
};

function KpiCard({ label, value, color, icon, index, suffix = '', onClick }) {
  return (
    <motion.div
      custom={index}
      variants={cardVariants}
      initial="hidden"
      animate="visible"
      whileHover={{ y: -3, transition: { duration: 0.16 } }}
      onClick={onClick}
      className={`bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-soft
                  ${onClick ? 'cursor-pointer hover:border-brand-400 dark:hover:border-brand-500 hover:shadow-md transition-shadow' : ''}`}
    >
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">{label}</p>
        <span className="text-2xl">{icon}</span>
      </div>
      <p className={`text-4xl font-bold tabular-nums ${color}`}>
        <AnimatedNumber value={value} />{suffix}
      </p>
      {onClick && (
        <p className="mt-2 text-xs text-brand-500 dark:text-brand-400">View details →</p>
      )}
    </motion.div>
  );
}

/* ── chart card wrapper ──────────────────────────────────────── */
function ChartCard({ title, children, delay = 0, className = '' }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.38, ease: [0.4, 0, 0.2, 1] }}
      className={`bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-soft ${className}`}
    >
      <p className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-5">{title}</p>
      {children}
    </motion.div>
  );
}

/* ── skeleton ────────────────────────────────────────────────── */
function Skeleton({ className = '' }) {
  return <div className={`rounded-xl bg-slate-100 dark:bg-slate-800 animate-pulse ${className}`} />;
}

/* ── empty chart state ───────────────────────────────────────── */
function EmptyChart() {
  return (
    <div className="h-48 flex flex-col items-center justify-center gap-2 text-slate-300 dark:text-slate-600">
      <span className="text-4xl">📉</span>
      <p className="text-xs">No data yet</p>
    </div>
  );
}

/* ── adoption bar for teams table ────────────────────────────── */
function AdoptionBar({ value }) {
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${value}%` }}
          transition={{ duration: 0.8, ease: [0.4, 0, 0.2, 1] }}
          className={`h-full rounded-full ${
            value >= 70 ? 'bg-emerald-500' : value >= 40 ? 'bg-amber-500' : 'bg-rose-500'
          }`}
        />
      </div>
      <span className="text-xs font-semibold tabular-nums w-9 text-right text-slate-600 dark:text-slate-400">
        {value}%
      </span>
    </div>
  );
}

/* ── status badge ────────────────────────────────────────────── */
function StatusBadge({ status }) {
  const map = {
    Pending:  'bg-amber-100  dark:bg-amber-900/40  text-amber-700  dark:text-amber-300',
    Approved: 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300',
    Rejected: 'bg-rose-100   dark:bg-rose-900/40   text-rose-700   dark:text-rose-300',
  };
  return (
    <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${map[status] ?? 'bg-slate-100 text-slate-600'}`}>
      {status}
    </span>
  );
}

/* ── profile completion ring ─────────────────────────────────── */
function ProfileBadge({ completed }) {
  return completed
    ? <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-600 dark:text-emerald-400">✅ Complete</span>
    : <span className="inline-flex items-center gap-1 text-xs font-semibold text-amber-600 dark:text-amber-400">⏳ Pending</span>;
}

/* ── tabs ────────────────────────────────────────────────────── */
const TABS = [
  { id: 'overview',  label: 'Overview' },
  { id: 'teams',     label: 'Teams' },
  { id: 'users',     label: 'All Users' },
  { id: 'reviews',   label: 'Pending Approvals' },
  { id: 'profiles',  label: 'Team Profiles' },
  { id: 'roles',     label: 'Role Management', adminOnly: true },
];

/* ── main component ──────────────────────────────────────────── */
export default function AdminDashboard() {
  const { user } = useAuth();
  const { theme } = useTheme();
  const navigate = useNavigate();
  const isDark = theme === 'dark';

  const gridColor    = isDark ? '#334155' : '#e2e8f0';
  const tickColor    = isDark ? '#94a3b8' : '#64748b';
  const tooltipBg    = isDark ? '#1e293b' : '#ffffff';
  const tooltipBorder = isDark ? '#334155' : '#e2e8f0';
  const tooltipText  = isDark ? '#e2e8f0' : '#1e293b';

  const [tab, setTab]           = useState('overview');
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState(null);
  const [overview, setOverview] = useState(null);
  const [chartData, setChartData] = useState({ byType: [], byDomain: [], byTeam: [], adoptionByTeam: [], byModel: [] });
  const [teamBreakdown, setTeamBreakdown] = useState([]);
  const [allUsers, setAllUsers]       = useState([]);
  const [search, setSearch]           = useState('');
  const [sortKey, setSortKey]         = useState('activity_count');
  const [sortDir, setSortDir]         = useState('desc');
  const [reviews, setReviews]         = useState([]);
  const [reviewFilters, setReviewFilters] = useState({ dept: '', status: '', from: '', to: '' });
  const [reviewComment, setReviewComment] = useState({});
  const [reviewLoading, setReviewLoading] = useState({});
  const [profiles, setProfiles]       = useState([]);
  const [profileDepts, setProfileDepts] = useState([]);
  const [profileFilters, setProfileFilters] = useState({ dept: '', completed: '', search: '' });
  const [pendingCount, setPendingCount] = useState(0);
  const [roleSearch, setRoleSearch]     = useState('');
  const [pendingRole, setPendingRole]   = useState({});   // { [userId]: newRole }
  const [roleStatus, setRoleStatus]     = useState({});   // { [userId]: 'saving'|'saved'|'error' }

  // Create user modal
  const EMPTY_CREATE = { email: '', first_name: '', last_name: '', role: 'developer', department: '' };
  const [showCreateUser,  setShowCreateUser]  = useState(false);
  const [createForm,      setCreateForm]      = useState(EMPTY_CREATE);
  const [createLoading,   setCreateLoading]   = useState(false);
  const [createError,     setCreateError]     = useState(null);
  const [createSuccess,   setCreateSuccess]   = useState(null);

  /* access guard */
  if (!user || !['manager', 'admin'].includes(user.role)) {
    return (
      <PageWrapper>
        <div className="py-20 text-center">
          <p className="text-5xl mb-4">🔒</p>
          <h2 className="text-xl font-bold text-rose-600 dark:text-rose-400">Access Denied</h2>
          <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
            Only managers and admins can view this dashboard.
          </p>
        </div>
      </PageWrapper>
    );
  }

  /* fetch pending badge count on mount */
  useEffect(() => {
    api.get('/admin/reviews?status=Pending')
      .then(r => setPendingCount(r.pending_count || 0))
      .catch(() => {});
  }, []);

  /* data fetcher */
  useEffect(() => {
    const run = async () => {
      setLoading(true);
      setError(null);
      try {
        if (tab === 'overview') {
          const [ovRes, typeRes, domainRes, teamRes, adoptionRes, modelRes] = await Promise.all([
            api.get('/admin/dashboard/overview'),
            api.get('/admin/dashboard/chart/activities-by-type'),
            api.get('/admin/dashboard/chart/activities-by-domain'),
            api.get('/admin/dashboard/chart/activities-by-team'),
            api.get('/admin/dashboard/chart/adoption-by-team'),
            api.get('/admin/dashboard/chart/activities-by-model'),
          ]);
          setOverview(ovRes);
          setChartData({
            byType:       typeRes.data       || [],
            byDomain:     domainRes.data     || [],
            byTeam:       teamRes.data       || [],
            adoptionByTeam: adoptionRes.data || [],
            byModel:      modelRes.data      || [],
          });
        } else if (tab === 'teams') {
          const res = await api.get('/admin/dashboard/team-breakdown');
          setTeamBreakdown(res.teams || []);
        } else if (tab === 'users') {
          const res = await api.get('/admin/dashboard/users');
          setAllUsers(res.users || []);
        } else if (tab === 'reviews') {
          const params = new URLSearchParams();
          if (reviewFilters.dept)   params.set('dept',   reviewFilters.dept);
          if (reviewFilters.status) params.set('status', reviewFilters.status);
          if (reviewFilters.from)   params.set('from',   reviewFilters.from);
          if (reviewFilters.to)     params.set('to',     reviewFilters.to);
          const res = await api.get(`/admin/reviews?${params}`);
          setReviews(res.certifications || []);
          setPendingCount(res.pending_count || 0);
        } else if (tab === 'profiles') {
          const params = new URLSearchParams();
          if (profileFilters.dept)      params.set('dept',      profileFilters.dept);
          if (profileFilters.completed !== '') params.set('completed', profileFilters.completed);
          if (profileFilters.search)    params.set('search',    profileFilters.search);
          const res = await api.get(`/admin/profiles?${params}`);
          setProfiles(res.users || []);
          setProfileDepts(res.departments || []);
        } else if (tab === 'roles') {
          const res = await api.get('/admin/dashboard/users');
          setAllUsers(res.users || []);
        }
      } catch (err) {
        setError(err.message || 'Failed to load data');
      } finally {
        setLoading(false);
      }
    };
    run();
  }, [tab, reviewFilters, profileFilters]);

  /* CSV export */
  const handleExport = async () => {
    try {
      const res = await api.get('/admin/dashboard/export/csv', { responseType: 'blob' });
      const url = URL.createObjectURL(res.data);
      const a = document.createElement('a');
      a.href = url;
      a.download = `activities-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      URL.revokeObjectURL(url);
      a.remove();
    } catch {
      setError('Failed to export CSV');
    }
  };

  const filteredUsers = allUsers
    .filter(u => `${u.first_name} ${u.last_name} ${u.email}`.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => {
      const av = a[sortKey] ?? '';
      const bv = b[sortKey] ?? '';
      const cmp = typeof av === 'number'
        ? av - bv
        : String(av).localeCompare(String(bv));
      return sortDir === 'asc' ? cmp : -cmp;
    });

  function toggleSort(key) {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortKey(key); setSortDir('asc'); }
  }

  function SortTh({ label, col, right = false }) {
    const active = sortKey === col;
    return (
      <th
        onClick={() => toggleSort(col)}
        className={`px-6 py-3.5 text-xs font-semibold uppercase tracking-wide cursor-pointer select-none
          text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 transition-colors
          ${right ? 'text-right' : 'text-left'}`}
      >
        <span className="inline-flex items-center gap-1">
          {label}
          <span className={`text-[10px] ${active ? 'opacity-100' : 'opacity-30'}`}>
            {active && sortDir === 'asc' ? '▲' : '▼'}
          </span>
        </span>
      </th>
    );
  }

  async function handleReview(certId, status) {
    setReviewLoading(prev => ({ ...prev, [certId]: true }));
    try {
      await api.post(`/notifications/review/${certId}`, {
        status,
        comment: reviewComment[certId] || '',
      });
      setReviews(prev => prev.map(c =>
        c.id === certId ? { ...c, status, reviewer_comment: reviewComment[certId] || null } : c
      ));
      setPendingCount(prev => Math.max(0, prev - 1));
    } catch (err) {
      setError(err.message || 'Review failed');
    } finally {
      setReviewLoading(prev => ({ ...prev, [certId]: false }));
    }
  }

  function exportReviewsCSV() {
    const headers = ['User', 'Email', 'Department', 'Certificate', 'Issuer', 'Status', 'Submitted'];
    const rows = reviews.map(c => [
      `${c.first_name} ${c.last_name}`,
      c.email,
      c.department || '',
      c.cert_name,
      c.issuing_org,
      c.status,
      new Date(c.created_at).toLocaleDateString(),
    ]);
    const csv = [headers, ...rows].map(r =>
      r.map(v => (String(v).includes(',') || String(v).includes('"')) ? `"${String(v).replace(/"/g, '""')}"` : v).join(',')
    ).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url  = URL.createObjectURL(blob);
    const a    = Object.assign(document.createElement('a'), { href: url, download: `cert-reviews-${new Date().toISOString().split('T')[0]}.csv` });
    document.body.appendChild(a); a.click(); URL.revokeObjectURL(url); a.remove();
  }

  function exportProfilesCSV() {
    const headers = ['User', 'Email', 'Department', 'Designation', 'Profile', 'Skills', 'POCs', 'Certs (Approved)'];
    const rows = profiles.map(u => [
      `${u.first_name} ${u.last_name}`,
      u.email,
      u.department || '',
      u.designation || '',
      u.profile_completed ? 'Complete' : 'Pending',
      u.skills_count,
      u.pocs_count,
      `${u.approved_certs}/${u.certs_count}`,
    ]);
    const csv = [headers, ...rows].map(r =>
      r.map(v => (String(v).includes(',') || String(v).includes('"')) ? `"${String(v).replace(/"/g, '""')}"` : v).join(',')
    ).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url  = URL.createObjectURL(blob);
    const a    = Object.assign(document.createElement('a'), { href: url, download: `team-profiles-${new Date().toISOString().split('T')[0]}.csv` });
    document.body.appendChild(a); a.click(); URL.revokeObjectURL(url); a.remove();
  }

  async function handleRoleChange(userId) {
    const newRole = pendingRole[userId];
    if (!newRole) return;
    setRoleStatus(s => ({ ...s, [userId]: 'saving' }));
    try {
      await api.patch(`/admin/users/${userId}/role`, { role: newRole });
      setAllUsers(prev => prev.map(u => u.id === userId ? { ...u, role: newRole } : u));
      setPendingRole(p => { const n = { ...p }; delete n[userId]; return n; });
      setRoleStatus(s => ({ ...s, [userId]: 'saved' }));
      setTimeout(() => setRoleStatus(s => { const n = { ...s }; delete n[userId]; return n; }), 2000);
    } catch (err) {
      setRoleStatus(s => ({ ...s, [userId]: 'error' }));
      setError(err.message || 'Role update failed');
    }
  }

  const ROLE_COLORS = {
    admin:     'bg-rose-100   dark:bg-rose-900/40   text-rose-700   dark:text-rose-300',
    manager:   'bg-violet-100 dark:bg-violet-900/40 text-violet-700 dark:text-violet-300',
    developer: 'bg-blue-100   dark:bg-blue-900/40   text-blue-700   dark:text-blue-300',
    lead:      'bg-amber-100  dark:bg-amber-900/40  text-amber-700  dark:text-amber-300',
  };

  async function createUser(e) {
    e.preventDefault();
    setCreateLoading(true);
    setCreateError(null);
    setCreateSuccess(null);
    try {
      const { user: newUser } = await api.post('/admin/users', createForm);
      setAllUsers(prev => [{ ...newUser, team: null, activity_count: 0 }, ...prev]);
      setCreateSuccess(newUser);
      setCreateForm(EMPTY_CREATE);
    } catch (err) {
      setCreateError(err.message || 'Failed to create user');
    } finally {
      setCreateLoading(false);
    }
  }

  return (
    <PageWrapper>
      <div className="space-y-8">

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.28 }}
          className="flex flex-col sm:flex-row sm:items-center justify-between gap-4"
        >
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Leadership Dashboard</h1>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              Real-time AI adoption analytics
            </p>
          </div>
          <motion.button
            whileTap={{ scale: 0.96 }}
            onClick={handleExport}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 dark:border-slate-700
                       bg-white dark:bg-slate-900 px-4 py-2.5 text-sm font-semibold text-slate-700
                       dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors shadow-sm"
          >
            ↓ Export CSV
          </motion.button>
        </motion.div>

        {/* Tabs */}
        <div className="flex gap-1 border-b border-slate-200 dark:border-slate-700 overflow-x-auto">
          {TABS.filter(t => !t.adminOnly || user.role === 'admin').map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`relative whitespace-nowrap px-4 py-2.5 text-sm font-medium transition-colors ${
                tab === t.id
                  ? 'text-brand-600 dark:text-brand-400'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              <span className="flex items-center gap-1.5">
                {t.label}
                {t.id === 'reviews' && pendingCount > 0 && (
                  <span className="inline-flex h-4 min-w-[1rem] items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-bold text-white">
                    {pendingCount > 99 ? '99+' : pendingCount}
                  </span>
                )}
              </span>
              {tab === t.id && (
                <motion.span
                  layoutId="admin-tab-line"
                  className="absolute bottom-0 left-0 right-0 h-0.5 bg-brand-600 dark:bg-brand-400 rounded-t"
                />
              )}
            </button>
          ))}
        </div>

        {/* Error */}
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              className="rounded-xl border border-rose-200 dark:border-rose-800 bg-rose-50 dark:bg-rose-900/30 px-4 py-3 text-sm text-rose-700 dark:text-rose-300"
            >
              {error}
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── OVERVIEW TAB ── */}
        <AnimatePresence mode="wait">
          {tab === 'overview' && (
            <motion.div key="overview" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.18 }}>
              {/* KPI row */}
              {loading || !overview ? (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-28" />)}
                </div>
              ) : (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  <KpiCard index={0} label="Total Users"        value={overview.totalUsers}            icon="👥" color="text-brand-600 dark:text-brand-400"   onClick={() => setTab('users')} />
                  <KpiCard index={1} label="Total Activities"   value={overview.totalActivities}       icon="📊" color="text-violet-600 dark:text-violet-400" onClick={() => navigate('/admin/activities')} />
                  <KpiCard index={2} label="This Week"          value={overview.activitiesThisWeek}    icon="📅" color="text-emerald-600 dark:text-emerald-400" onClick={() => navigate('/admin/activities?filter=week')} />
                  <KpiCard index={3} label="This Month"         value={overview.activitiesThisMonth}   icon="📈" color="text-amber-600 dark:text-amber-400"   onClick={() => navigate('/admin/activities?filter=month')} />
                </div>
              )}

              {/* Chart grid */}
              <div className="mt-6 grid gap-6 lg:grid-cols-2">

                {/* Column — Activities by Type */}
                <ChartCard title="Activities by Type" delay={0.2}>
                  {loading ? <Skeleton className="h-56" /> : chartData.byType.length === 0 ? <EmptyChart /> : (
                    <HighchartsReact highcharts={Highcharts} options={{
                      chart: { type: 'column', height: 220, backgroundColor: 'transparent', animation: { duration: 700 } },
                      title: { text: '' }, credits: { enabled: false }, exporting: { enabled: false },
                      xAxis: {
                        categories: chartData.byType.map(d => d.label.replace(/_/g, ' ')),
                        crosshair: { color: isDark ? '#475569' : '#cbd5e1', width: 1 },
                        labels: { style: { color: tickColor, fontSize: '10px' } },
                        lineColor: gridColor, tickColor: 'transparent',
                      },
                      yAxis: {
                        allowDecimals: false,
                        gridLineColor: gridColor,
                        labels: { style: { color: tickColor, fontSize: '10px' } },
                        title: { text: '' },
                      },
                      plotOptions: {
                        column: {
                          borderRadius: 6, maxPointWidth: 48,
                          dataLabels: { enabled: true, format: '{point.y}', style: { fontSize: '10px', fontWeight: '600', color: tickColor, textOutline: 'none' } },
                        },
                      },
                      tooltip: {
                        backgroundColor: tooltipBg, borderColor: tooltipBorder, borderRadius: 10,
                        style: { color: tooltipText, fontSize: '12px' }, shadow: false,
                        pointFormat: '<span style="color:{point.color}">●</span> Activities: <b>{point.y}</b>',
                      },
                      series: [{
                        name: 'Activities',
                        data: chartData.byType.map((d, i) => ({ y: d.count, color: PALETTE[i % PALETTE.length] })),
                      }],
                      legend: { enabled: false },
                    }} />
                  )}
                </ChartCard>

                {/* Donut — Activities by Domain */}
                <ChartCard title="Activities by Domain" delay={0.28}>
                  {loading ? <Skeleton className="h-56" /> : chartData.byDomain.length === 0 ? <EmptyChart /> : (
                    <HighchartsReact highcharts={Highcharts} options={{
                      chart: { type: 'pie', height: 220, backgroundColor: 'transparent', animation: { duration: 700 } },
                      title: { text: '' }, credits: { enabled: false }, exporting: { enabled: false },
                      plotOptions: {
                        pie: {
                          innerSize: '52%', dataLabels: { enabled: false }, showInLegend: true,
                          allowPointSelect: true, cursor: 'pointer', slicedOffset: 10,
                        },
                      },
                      legend: {
                        align: 'center', verticalAlign: 'bottom', symbolRadius: 4,
                        itemStyle: { color: tickColor, fontSize: '11px', fontWeight: '400' },
                        itemHoverStyle: { color: isDark ? '#e2e8f0' : '#1e293b' },
                      },
                      tooltip: {
                        backgroundColor: tooltipBg, borderColor: tooltipBorder, borderRadius: 10,
                        style: { color: tooltipText, fontSize: '12px' }, shadow: false,
                        pointFormat: '<span style="color:{point.color}">●</span> <b>{point.name}</b><br/>Count: <b>{point.y}</b> · <b>{point.percentage:.1f}%</b>',
                      },
                      series: [{
                        name: 'Activities',
                        data: chartData.byDomain.map((d, i) => ({ name: d.label, y: d.count, color: PALETTE[i % PALETTE.length] })),
                      }],
                    }} />
                  )}
                </ChartCard>

                {/* Bar — Activities by Team */}
                <ChartCard title="Activities by Team" delay={0.36}>
                  {loading ? <Skeleton className="h-56" /> : chartData.byTeam.length === 0 ? <EmptyChart /> : (
                    <HighchartsReact highcharts={Highcharts} options={{
                      chart: { type: 'bar', height: 220, backgroundColor: 'transparent', animation: { duration: 700 } },
                      title: { text: '' }, credits: { enabled: false }, exporting: { enabled: false },
                      xAxis: {
                        categories: chartData.byTeam.map(d => d.label), gridLineWidth: 0,
                        labels: { style: { color: tickColor, fontSize: '10px' } },
                        lineColor: gridColor, tickColor: 'transparent',
                      },
                      yAxis: {
                        allowDecimals: false, gridLineColor: gridColor,
                        labels: { style: { color: tickColor, fontSize: '10px' } },
                        title: { text: '' },
                      },
                      plotOptions: {
                        bar: {
                          borderRadius: 4, maxPointWidth: 20,
                          dataLabels: { enabled: true, format: '{point.y}', style: { fontSize: '10px', fontWeight: '600', color: tickColor, textOutline: 'none' } },
                        },
                      },
                      tooltip: {
                        backgroundColor: tooltipBg, borderColor: tooltipBorder, borderRadius: 10,
                        style: { color: tooltipText, fontSize: '12px' }, shadow: false,
                        pointFormat: '<span style="color:{series.color}">●</span> Activities: <b>{point.y}</b>',
                      },
                      series: [{ name: 'Activities', color: '#8b5cf6', data: chartData.byTeam.map(d => d.count) }],
                      legend: { enabled: false },
                    }} />
                  )}
                </ChartCard>

                {/* Bar — AI Adoption % by Team (color-coded) */}
                <ChartCard title="AI Adoption % by Team" delay={0.44}>
                  {loading ? <Skeleton className="h-56" /> : chartData.adoptionByTeam.length === 0 ? <EmptyChart /> : (
                    <HighchartsReact highcharts={Highcharts} options={{
                      chart: { type: 'bar', height: 220, backgroundColor: 'transparent', animation: { duration: 700 } },
                      title: { text: '' }, credits: { enabled: false }, exporting: { enabled: false },
                      xAxis: {
                        categories: chartData.adoptionByTeam.map(d => d.label), gridLineWidth: 0,
                        labels: { style: { color: tickColor, fontSize: '10px' } },
                        lineColor: gridColor, tickColor: 'transparent',
                      },
                      yAxis: {
                        max: 100, gridLineColor: gridColor,
                        labels: { format: '{value}%', style: { color: tickColor, fontSize: '10px' } },
                        title: { text: '' },
                      },
                      plotOptions: {
                        bar: {
                          borderRadius: 4, maxPointWidth: 20, colorByPoint: true,
                          dataLabels: { enabled: true, format: '{point.y:.0f}%', style: { fontSize: '10px', fontWeight: '600', textOutline: 'none' } },
                        },
                      },
                      tooltip: {
                        backgroundColor: tooltipBg, borderColor: tooltipBorder, borderRadius: 10,
                        style: { color: tooltipText, fontSize: '12px' }, shadow: false,
                        pointFormat: '<span style="color:{point.color}">●</span> Adoption: <b>{point.y:.0f}%</b>',
                      },
                      series: [{
                        name: 'Adoption',
                        data: chartData.adoptionByTeam.map(d => ({
                          y: d.value,
                          color: d.value >= 70 ? '#10b981' : d.value >= 40 ? '#f59e0b' : '#f43f5e',
                        })),
                      }],
                      legend: { enabled: false },
                    }} />
                  )}
                </ChartCard>

                {/* Donut — AI Models Used */}
                <ChartCard title="AI Models Used" delay={0.52}>
                  {loading ? <Skeleton className="h-56" /> : chartData.byModel.length === 0 ? <EmptyChart /> : (
                    <HighchartsReact highcharts={Highcharts} options={{
                      chart: { type: 'pie', height: 220, backgroundColor: 'transparent', animation: { duration: 700 } },
                      title: { text: '' }, credits: { enabled: false }, exporting: { enabled: false },
                      plotOptions: {
                        pie: {
                          innerSize: '52%', dataLabels: { enabled: false }, showInLegend: true,
                          allowPointSelect: true, cursor: 'pointer', slicedOffset: 10,
                        },
                      },
                      legend: {
                        align: 'center', verticalAlign: 'bottom', symbolRadius: 4,
                        itemStyle: { color: tickColor, fontSize: '11px', fontWeight: '400' },
                        itemHoverStyle: { color: isDark ? '#e2e8f0' : '#1e293b' },
                      },
                      tooltip: {
                        backgroundColor: tooltipBg, borderColor: tooltipBorder, borderRadius: 10,
                        style: { color: tooltipText, fontSize: '12px' }, shadow: false,
                        pointFormat: '<span style="color:{point.color}">●</span> <b>{point.name}</b><br/>Uses: <b>{point.y}</b> ({point.percentage:.1f}%)',
                      },
                      series: [{
                        name: 'Uses',
                        data: chartData.byModel.map((d, i) => ({ name: d.name, y: d.count, color: PALETTE[i % PALETTE.length] })),
                      }],
                    }} />
                  )}
                </ChartCard>

              </div>

              {/* Top lists row */}
              {!loading && overview && (
                <div className="mt-6 grid gap-6 lg:grid-cols-2">
                  <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.52 }}
                    className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-soft">
                    <p className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-4">Top Activity Types</p>
                    <ul className="space-y-2">
                      {(overview.topActivityTypes || []).map((t, i) => (
                        <li key={i} className="flex items-center justify-between text-sm">
                          <span className="text-slate-600 dark:text-slate-400 capitalize">{t.activity_type.replace(/_/g, ' ')}</span>
                          <button
                            onClick={() => navigate(`/admin/activities?type=${encodeURIComponent(t.activity_type)}`)}
                            className="font-bold tabular-nums text-brand-600 dark:text-brand-400
                                       hover:underline hover:text-brand-700 dark:hover:text-brand-300 transition-colors"
                          >
                            {t.count}
                          </button>
                        </li>
                      ))}
                    </ul>
                  </motion.div>
                  <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.58 }}
                    className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-soft">
                    <p className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-4">Top Domains</p>
                    <ul className="space-y-2">
                      {(overview.topDomains || []).map((d, i) => (
                        <li key={i} className="flex items-center justify-between text-sm">
                          <span className="text-slate-600 dark:text-slate-400">{d.domain || 'Uncategorized'}</span>
                          <button
                            onClick={() => navigate(`/admin/activities?domain=${encodeURIComponent(d.domain || '')}`)}
                            className="font-bold tabular-nums text-brand-600 dark:text-brand-400
                                       hover:underline hover:text-brand-700 dark:hover:text-brand-300 transition-colors"
                          >
                            {d.count}
                          </button>
                        </li>
                      ))}
                    </ul>
                  </motion.div>
                </div>
              )}
            </motion.div>
          )}

          {/* ── TEAMS TAB ── */}
          {tab === 'teams' && (
            <motion.div key="teams" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.18 }}>
              {loading ? (
                <div className="space-y-3">{[...Array(5)].map((_, i) => <Skeleton key={i} className="h-14" />)}</div>
              ) : (
                <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-soft">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-slate-100 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40">
                          <th className="px-6 py-3.5 text-left text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Team</th>
                          <th className="px-6 py-3.5 text-right text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Members</th>
                          <th className="px-6 py-3.5 text-right text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Active</th>
                          <th className="px-6 py-3.5 text-right text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Activities</th>
                          <th className="px-6 py-3.5 text-left text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400 min-w-[160px]">Adoption</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                        {teamBreakdown.map((team, i) => (
                          <motion.tr key={team.id}
                            initial={{ opacity: 0, x: -8 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: i * 0.04 }}
                            onClick={() => navigate(`/admin/teams/${team.id}`)}
                            className="hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer transition-colors"
                          >
                            <td className="px-6 py-4 font-medium text-slate-900 dark:text-white">{team.name}</td>
                            <td className="px-6 py-4 text-right text-slate-500 dark:text-slate-400">{team.total_members}</td>
                            <td className="px-6 py-4 text-right text-slate-500 dark:text-slate-400">{team.members_with_activities}</td>
                            <td className="px-6 py-4 text-right font-bold text-slate-900 dark:text-white">{team.activity_count}</td>
                            <td className="px-6 py-4"><AdoptionBar value={team.adoptionRate} /></td>
                          </motion.tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </motion.div>
          )}

          {/* ── USERS TAB ── */}
          {tab === 'users' && (
            <motion.div key="users" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.18 }}
              className="space-y-4">
              {/* Search + Add User */}
              <div className="flex items-center gap-3">
                <input
                  type="search"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Search by name or email…"
                  className="w-full max-w-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900
                             px-4 py-2.5 text-sm text-slate-900 dark:text-slate-100
                             focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/30"
                />
                {user?.role === 'admin' && (
                  <button
                    onClick={() => { setShowCreateUser(true); setCreateError(null); setCreateSuccess(null); }}
                    className="flex items-center gap-1.5 rounded-xl bg-brand-600 hover:bg-brand-700 px-4 py-2.5
                               text-sm font-semibold text-white transition-colors shrink-0"
                  >
                    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                    </svg>
                    Add User
                  </button>
                )}
              </div>
              {loading ? (
                <div className="space-y-3">{[...Array(5)].map((_, i) => <Skeleton key={i} className="h-16" />)}</div>
              ) : (
                <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-soft">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-slate-100 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40">
                          <SortTh label="User"       col="first_name" />
                          <SortTh label="Team"       col="team" />
                          <SortTh label="Role"       col="role" />
                          <SortTh label="Activities" col="activity_count" right />
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                        {filteredUsers.map((u, i) => (
                          <motion.tr key={u.id}
                            initial={{ opacity: 0, x: -8 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: i * 0.03 }}
                            onClick={() => navigate(`/admin/users/${u.id}`)}
                            className="hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer transition-colors"
                          >
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-3">
                                <div className="h-8 w-8 rounded-full bg-brand-600 text-white grid place-items-center text-xs font-bold shrink-0">
                                  {u.first_name?.[0]}{u.last_name?.[0]}
                                </div>
                                <div>
                                  <p className="font-medium text-slate-900 dark:text-white">{u.first_name} {u.last_name}</p>
                                  <p className="text-xs text-slate-400 dark:text-slate-500">{u.email}</p>
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4 text-slate-500 dark:text-slate-400">{u.team || '—'}</td>
                            <td className="px-6 py-4">
                              <span className={`px-2.5 py-1 rounded-full text-xs font-semibold capitalize ${ROLE_COLORS[u.role] ?? 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'}`}>
                                {u.role}
                              </span>
                            </td>
                            <td className="px-6 py-4 text-right font-bold tabular-nums text-slate-900 dark:text-white">
                              {u.activity_count}
                            </td>
                          </motion.tr>
                        ))}
                      </tbody>
                    </table>
                    {filteredUsers.length === 0 && (
                      <div className="py-12 text-center text-slate-400 dark:text-slate-500 text-sm">
                        No users found matching "{search}"
                      </div>
                    )}
                  </div>
                </div>
              )}
            </motion.div>
          )}
          {/* ── REVIEWS TAB ── */}
          {tab === 'reviews' && (
            <motion.div key="reviews" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.18 }}
              className="space-y-4">

              {/* Filters row */}
              <div className="flex flex-wrap items-end gap-3">
                <select
                  value={reviewFilters.status}
                  onChange={e => setReviewFilters(f => ({ ...f, status: e.target.value }))}
                  className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900
                             px-3 py-2 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-500/30"
                >
                  <option value="">Pending only</option>
                  <option value="Pending">Pending</option>
                  <option value="Approved">Approved</option>
                  <option value="Rejected">Rejected</option>
                </select>
                <input
                  type="date"
                  value={reviewFilters.from}
                  onChange={e => setReviewFilters(f => ({ ...f, from: e.target.value }))}
                  className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900
                             px-3 py-2 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-500/30"
                  placeholder="From"
                />
                <input
                  type="date"
                  value={reviewFilters.to}
                  onChange={e => setReviewFilters(f => ({ ...f, to: e.target.value }))}
                  className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900
                             px-3 py-2 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-500/30"
                  placeholder="To"
                />
                <button onClick={exportReviewsCSV}
                  className="ml-auto rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900
                             px-4 py-2 text-sm font-semibold text-slate-700 dark:text-slate-300
                             hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors shadow-sm">
                  ↓ Export CSV
                </button>
              </div>

              {loading ? (
                <div className="space-y-3">{[...Array(4)].map((_, i) => <Skeleton key={i} className="h-28" />)}</div>
              ) : reviews.length === 0 ? (
                <div className="py-16 text-center text-slate-400 dark:text-slate-500">
                  <p className="text-4xl mb-3">📋</p>
                  <p className="text-sm">No certifications match the current filters.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {reviews.map((cert, i) => (
                    <motion.div key={cert.id}
                      initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}
                      className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-soft"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        {/* Left: user + cert info */}
                        <div className="flex items-start gap-3 min-w-0">
                          {cert.avatar_url ? (
                            <img src={cert.avatar_url} alt="" className="h-9 w-9 rounded-full object-cover shrink-0" />
                          ) : (
                            <div className="h-9 w-9 rounded-full bg-brand-600 text-white grid place-items-center text-xs font-bold shrink-0">
                              {cert.first_name?.[0]}{cert.last_name?.[0]}
                            </div>
                          )}
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-slate-900 dark:text-white">
                              {cert.first_name} {cert.last_name}
                              <span className="ml-2 text-xs font-normal text-slate-400 dark:text-slate-500">{cert.email}</span>
                            </p>
                            <p className="text-xs text-slate-500 dark:text-slate-400">{cert.department || '—'} · {cert.designation || '—'}</p>
                            <div className="mt-1.5 flex flex-wrap items-center gap-2">
                              <span className="font-medium text-slate-800 dark:text-slate-200 text-sm">📜 {cert.cert_name}</span>
                              <span className="text-xs text-slate-400">·</span>
                              <span className="text-xs text-slate-500 dark:text-slate-400">{cert.issuing_org}</span>
                              {cert.file_name && (
                                <span className="text-xs bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-full text-slate-500 dark:text-slate-400">
                                  📎 {cert.file_name}
                                </span>
                              )}
                              {cert.credential_url && (
                                <a href={cert.credential_url} target="_blank" rel="noopener noreferrer"
                                  className="text-xs text-brand-600 dark:text-brand-400 hover:underline">
                                  🔗 Verify
                                </a>
                              )}
                            </div>
                            <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">
                              Submitted {new Date(cert.created_at).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                        {/* Right: status */}
                        <div className="shrink-0"><StatusBadge status={cert.status} /></div>
                      </div>

                      {/* Reviewer comment (already reviewed) */}
                      {cert.status !== 'Pending' && cert.reviewer_comment && (
                        <p className="mt-3 text-xs text-slate-500 dark:text-slate-400 italic border-t border-slate-100 dark:border-slate-800 pt-2">
                          Comment: "{cert.reviewer_comment}"
                        </p>
                      )}

                      {/* Inline review action (Pending only) */}
                      {cert.status === 'Pending' && (
                        <div className="mt-3 border-t border-slate-100 dark:border-slate-800 pt-3 space-y-2">
                          <textarea
                            rows={1}
                            placeholder="Optional comment…"
                            value={reviewComment[cert.id] || ''}
                            onChange={e => setReviewComment(prev => ({ ...prev, [cert.id]: e.target.value }))}
                            className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800
                                       px-3 py-2 text-xs text-slate-800 dark:text-slate-200 resize-none
                                       focus:outline-none focus:ring-2 focus:ring-brand-500/30"
                          />
                          <div className="flex gap-2">
                            <motion.button
                              whileTap={{ scale: 0.96 }}
                              disabled={reviewLoading[cert.id]}
                              onClick={() => handleReview(cert.id, 'Approved')}
                              className="flex-1 rounded-xl bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50
                                         text-white text-xs font-semibold py-2 transition-colors"
                            >
                              {reviewLoading[cert.id] ? '…' : '✅ Approve'}
                            </motion.button>
                            <motion.button
                              whileTap={{ scale: 0.96 }}
                              disabled={reviewLoading[cert.id]}
                              onClick={() => handleReview(cert.id, 'Rejected')}
                              className="flex-1 rounded-xl border border-rose-300 dark:border-rose-700 hover:bg-rose-50
                                         dark:hover:bg-rose-900/30 text-rose-600 dark:text-rose-400 text-xs font-semibold py-2 transition-colors"
                            >
                              {reviewLoading[cert.id] ? '…' : '❌ Reject'}
                            </motion.button>
                          </div>
                        </div>
                      )}
                    </motion.div>
                  ))}
                </div>
              )}
            </motion.div>
          )}

          {/* ── PROFILES TAB ── */}
          {tab === 'profiles' && (
            <motion.div key="profiles" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.18 }}
              className="space-y-4">

              {/* Filters row */}
              <div className="flex flex-wrap items-end gap-3">
                <input
                  type="search"
                  value={profileFilters.search}
                  onChange={e => setProfileFilters(f => ({ ...f, search: e.target.value }))}
                  placeholder="Search by name or email…"
                  className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900
                             px-3 py-2 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-500/30 w-52"
                />
                <select
                  value={profileFilters.dept}
                  onChange={e => setProfileFilters(f => ({ ...f, dept: e.target.value }))}
                  className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900
                             px-3 py-2 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-500/30"
                >
                  <option value="">All Departments</option>
                  {profileDepts.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
                <select
                  value={profileFilters.completed}
                  onChange={e => setProfileFilters(f => ({ ...f, completed: e.target.value }))}
                  className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900
                             px-3 py-2 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-500/30"
                >
                  <option value="">All Statuses</option>
                  <option value="1">Complete</option>
                  <option value="0">Pending</option>
                </select>
                <button onClick={exportProfilesCSV}
                  className="ml-auto rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900
                             px-4 py-2 text-sm font-semibold text-slate-700 dark:text-slate-300
                             hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors shadow-sm">
                  ↓ Export CSV
                </button>
              </div>

              {loading ? (
                <div className="space-y-3">{[...Array(5)].map((_, i) => <Skeleton key={i} className="h-16" />)}</div>
              ) : (
                <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-soft">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-slate-100 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40">
                          <th className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">User</th>
                          <th className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Dept / Role</th>
                          <th className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Profile</th>
                          <th className="px-5 py-3.5 text-right text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Skills</th>
                          <th className="px-5 py-3.5 text-right text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">POCs</th>
                          <th className="px-5 py-3.5 text-right text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Certs</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                        {profiles.map((u, i) => (
                          <motion.tr key={u.id}
                            initial={{ opacity: 0, x: -6 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: i * 0.025 }}
                            onClick={() => navigate(`/admin/users/${u.id}`)}
                            className="hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer transition-colors"
                          >
                            <td className="px-5 py-3.5">
                              <div className="flex items-center gap-2.5">
                                {u.avatar_url ? (
                                  <img src={u.avatar_url} alt="" className="h-8 w-8 rounded-full object-cover shrink-0" />
                                ) : (
                                  <div className="h-8 w-8 rounded-full bg-brand-600 text-white grid place-items-center text-xs font-bold shrink-0">
                                    {u.first_name?.[0]}{u.last_name?.[0]}
                                  </div>
                                )}
                                <div>
                                  <p className="font-medium text-slate-900 dark:text-white">{u.first_name} {u.last_name}</p>
                                  <p className="text-xs text-slate-400 dark:text-slate-500">{u.email}</p>
                                </div>
                              </div>
                            </td>
                            <td className="px-5 py-3.5">
                              <p className="text-slate-600 dark:text-slate-400 text-xs">{u.department || '—'}</p>
                              <span className={`mt-0.5 inline-block px-2 py-0.5 rounded-full text-xs font-semibold capitalize ${ROLE_COLORS[u.role] ?? 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'}`}>
                                {u.role}
                              </span>
                            </td>
                            <td className="px-5 py-3.5"><ProfileBadge completed={u.profile_completed} /></td>
                            <td className="px-5 py-3.5 text-right font-bold tabular-nums text-slate-900 dark:text-white">{u.skills_count}</td>
                            <td className="px-5 py-3.5 text-right font-bold tabular-nums text-slate-900 dark:text-white">{u.pocs_count}</td>
                            <td className="px-5 py-3.5 text-right text-xs text-slate-600 dark:text-slate-400">
                              <span className="font-bold text-slate-900 dark:text-white">{u.approved_certs}</span>
                              <span className="text-slate-400"> / {u.certs_count}</span>
                            </td>
                          </motion.tr>
                        ))}
                      </tbody>
                    </table>
                    {profiles.length === 0 && (
                      <div className="py-12 text-center text-slate-400 dark:text-slate-500 text-sm">
                        No profiles match the current filters.
                      </div>
                    )}
                  </div>
                </div>
              )}
            </motion.div>
          )}
          {/* ── ROLE MANAGEMENT TAB ── */}
          {tab === 'roles' && (
            <motion.div key="roles" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.18 }}
              className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h2 className="text-base font-semibold text-slate-900 dark:text-white">Role Management</h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Promote or demote users between developer, lead and manager roles.</p>
                </div>
                <input
                  type="search"
                  value={roleSearch}
                  onChange={e => setRoleSearch(e.target.value)}
                  placeholder="Search by name or email…"
                  className="w-full sm:max-w-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900
                             px-4 py-2.5 text-sm text-slate-900 dark:text-slate-100
                             focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/30"
                />
              </div>

              {loading ? (
                <div className="space-y-3">{[...Array(6)].map((_, i) => <Skeleton key={i} className="h-16" />)}</div>
              ) : (
                <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-soft">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-slate-100 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40">
                          <th className="px-6 py-3.5 text-left text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">User</th>
                          <th className="px-6 py-3.5 text-left text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Department</th>
                          <th className="px-6 py-3.5 text-left text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Current Role</th>
                          <th className="px-6 py-3.5 text-left text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Change To</th>
                          <th className="px-6 py-3.5 text-left text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                        {allUsers
                          .filter(u => `${u.first_name} ${u.last_name} ${u.email}`.toLowerCase().includes(roleSearch.toLowerCase()))
                          .map((u, i) => {
                            const isAdmin = u.role === 'admin';
                            const status  = roleStatus[u.id];
                            const pending = pendingRole[u.id];
                            return (
                              <motion.tr key={u.id}
                                initial={{ opacity: 0, x: -8 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: i * 0.025 }}
                                className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                              >
                                <td className="px-6 py-4">
                                  <div className="flex items-center gap-3">
                                    <div className="h-8 w-8 rounded-full bg-brand-600 text-white grid place-items-center text-xs font-bold shrink-0">
                                      {u.first_name?.[0]}{u.last_name?.[0]}
                                    </div>
                                    <div>
                                      <p className="font-medium text-slate-900 dark:text-white">{u.first_name} {u.last_name}</p>
                                      <p className="text-xs text-slate-400">{u.email}</p>
                                    </div>
                                  </div>
                                </td>
                                <td className="px-6 py-4 text-sm text-slate-500 dark:text-slate-400">{u.department || '—'}</td>
                                <td className="px-6 py-4">
                                  <span className={`px-2.5 py-1 rounded-full text-xs font-semibold capitalize ${ROLE_COLORS[u.role] ?? 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'}`}>
                                    {u.role}
                                  </span>
                                </td>
                                <td className="px-6 py-4">
                                  {isAdmin ? (
                                    <span className="text-xs text-slate-400 italic">Protected</span>
                                  ) : (
                                    <select
                                      value={pending ?? u.role}
                                      onChange={e => setPendingRole(p => ({ ...p, [u.id]: e.target.value }))}
                                      className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800
                                                 px-3 py-1.5 text-sm text-slate-900 dark:text-slate-100
                                                 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/30"
                                    >
                                      <option value="developer">developer</option>
                                      <option value="lead">lead</option>
                                      <option value="manager">manager</option>
                                    </select>
                                  )}
                                </td>
                                <td className="px-6 py-4">
                                  {!isAdmin && pending && pending !== u.role && (
                                    <motion.button
                                      initial={{ opacity: 0, scale: 0.9 }}
                                      animate={{ opacity: 1, scale: 1 }}
                                      whileTap={{ scale: 0.95 }}
                                      onClick={() => handleRoleChange(u.id)}
                                      disabled={status === 'saving'}
                                      className="rounded-lg bg-brand-600 hover:bg-brand-700 disabled:opacity-60
                                                 px-3 py-1.5 text-xs font-semibold text-white transition-colors"
                                    >
                                      {status === 'saving' ? 'Saving…' : 'Confirm'}
                                    </motion.button>
                                  )}
                                  {status === 'saved' && (
                                    <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">✓ Updated</span>
                                  )}
                                  {status === 'error' && (
                                    <span className="text-xs font-semibold text-rose-600 dark:text-rose-400">Failed</span>
                                  )}
                                </td>
                              </motion.tr>
                            );
                          })}
                      </tbody>
                    </table>
                    {allUsers.filter(u => `${u.first_name} ${u.last_name} ${u.email}`.toLowerCase().includes(roleSearch.toLowerCase())).length === 0 && (
                      <div className="py-12 text-center text-slate-400 dark:text-slate-500 text-sm">
                        No users found matching "{roleSearch}"
                      </div>
                    )}
                  </div>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

      </div>

      {/* ── Create User Modal ── */}
      <AnimatePresence>
        {showCreateUser && (
          <>
            <motion.div
              key="cu-backdrop"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              transition={{ duration: 0.18 }}
              className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
              onClick={() => { setShowCreateUser(false); setCreateSuccess(null); }}
            />
            <motion.div
              key="cu-modal"
              initial={{ opacity: 0, scale: 0.96, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 12 }}
              transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
              className="fixed left-1/2 top-1/2 z-50 w-full max-w-md -translate-x-1/2 -translate-y-1/2
                         bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl"
            >
              {/* Modal header */}
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 px-6 py-4">
                <h2 className="text-sm font-semibold text-slate-900 dark:text-white">Add New User</h2>
                <button
                  onClick={() => { setShowCreateUser(false); setCreateSuccess(null); }}
                  className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 transition-colors"
                >
                  <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="px-6 py-5">
                {/* Success state */}
                {createSuccess ? (
                  <div className="space-y-4">
                    <div className="rounded-xl border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-900/20 px-4 py-4">
                      <p className="text-sm font-semibold text-emerald-700 dark:text-emerald-300 mb-2">✅ User created successfully!</p>
                      <div className="text-xs text-emerald-700 dark:text-emerald-400 space-y-1">
                        <p><span className="font-semibold">Name:</span> {createSuccess.first_name} {createSuccess.last_name}</p>
                        <p><span className="font-semibold">Email:</span> {createSuccess.email}</p>
                        <p><span className="font-semibold">Role:</span> {createSuccess.role}</p>
                        <p><span className="font-semibold">Password:</span> Profile@123</p>
                      </div>
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Share the email and default password with the user. They can change it after login.
                    </p>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setCreateSuccess(null)}
                        className="flex-1 rounded-xl border border-slate-200 dark:border-slate-700 px-4 py-2 text-sm font-semibold
                                   text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                      >
                        Add Another
                      </button>
                      <button
                        onClick={() => { setShowCreateUser(false); setCreateSuccess(null); }}
                        className="flex-1 rounded-xl bg-brand-600 hover:bg-brand-700 px-4 py-2 text-sm font-semibold text-white transition-colors"
                      >
                        Done
                      </button>
                    </div>
                  </div>
                ) : (
                  /* Create form */
                  <form onSubmit={createUser} className="space-y-4">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5">First Name *</label>
                        <input
                          required
                          value={createForm.first_name}
                          onChange={e => setCreateForm(f => ({ ...f, first_name: e.target.value }))}
                          placeholder="Rahul"
                          className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800
                                     px-3 py-2 text-sm text-slate-900 dark:text-slate-100
                                     focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/30"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5">Last Name *</label>
                        <input
                          required
                          value={createForm.last_name}
                          onChange={e => setCreateForm(f => ({ ...f, last_name: e.target.value }))}
                          placeholder="Chauhan"
                          className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800
                                     px-3 py-2 text-sm text-slate-900 dark:text-slate-100
                                     focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/30"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5">Email *</label>
                      <input
                        required
                        type="email"
                        value={createForm.email}
                        onChange={e => setCreateForm(f => ({ ...f, email: e.target.value }))}
                        placeholder="rahul.chauhan@successive.tech"
                        className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800
                                   px-3 py-2 text-sm text-slate-900 dark:text-slate-100
                                   focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/30"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5">Role</label>
                        <select
                          value={createForm.role}
                          onChange={e => setCreateForm(f => ({ ...f, role: e.target.value }))}
                          className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800
                                     px-3 py-2 text-sm text-slate-900 dark:text-slate-100
                                     focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/30"
                        >
                          <option value="developer">Developer</option>
                          <option value="lead">Lead</option>
                          <option value="manager">Manager</option>
                          <option value="admin">Admin</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5">Department</label>
                        <input
                          value={createForm.department}
                          onChange={e => setCreateForm(f => ({ ...f, department: e.target.value }))}
                          placeholder="Engineering"
                          className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800
                                     px-3 py-2 text-sm text-slate-900 dark:text-slate-100
                                     focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/30"
                        />
                      </div>
                    </div>

                    <div className="rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 px-3 py-2.5">
                      <p className="text-[11px] text-slate-500 dark:text-slate-400">
                        🔐 Default password: <span className="font-semibold text-slate-700 dark:text-slate-300">Profile@123</span>
                        &nbsp;— share with the user after creation.
                      </p>
                    </div>

                    {createError && (
                      <p className="text-xs font-medium text-rose-600 dark:text-rose-400">⚠️ {createError}</p>
                    )}

                    <div className="flex gap-2 pt-1">
                      <button type="button"
                        onClick={() => setShowCreateUser(false)}
                        className="flex-1 rounded-xl border border-slate-200 dark:border-slate-700 px-4 py-2.5 text-sm font-semibold
                                   text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                      >
                        Cancel
                      </button>
                      <button type="submit" disabled={createLoading}
                        className="flex-1 rounded-xl bg-brand-600 hover:bg-brand-700 disabled:opacity-50 px-4 py-2.5
                                   text-sm font-semibold text-white transition-colors"
                      >
                        {createLoading ? 'Creating…' : 'Create User'}
                      </button>
                    </div>
                  </form>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

    </PageWrapper>
  );
}
