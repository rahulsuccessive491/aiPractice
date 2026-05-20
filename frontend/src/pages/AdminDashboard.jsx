import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis,
  CartesianGrid, Tooltip, Legend, ResponsiveContainer, LabelList,
} from 'recharts';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { api } from '../lib/api';
import PageWrapper from '../components/PageWrapper';
import AnimatedNumber from '../components/AnimatedNumber';
import ChartTooltip from '../components/ChartTooltip';

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
];

/* ── main component ──────────────────────────────────────────── */
export default function AdminDashboard() {
  const { user } = useAuth();
  const { theme } = useTheme();
  const navigate = useNavigate();
  const isDark = theme === 'dark';

  const gridColor = isDark ? '#334155' : '#e2e8f0';
  const tickColor = isDark ? '#94a3b8' : '#64748b';

  const [tab, setTab]           = useState('overview');
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState(null);
  const [overview, setOverview] = useState(null);
  const [chartData, setChartData] = useState({ byType: [], byDomain: [], byTeam: [], adoptionByTeam: [] });
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
          const [ovRes, typeRes, domainRes, teamRes, adoptionRes] = await Promise.all([
            api.get('/admin/dashboard/overview'),
            api.get('/admin/dashboard/chart/activities-by-type'),
            api.get('/admin/dashboard/chart/activities-by-domain'),
            api.get('/admin/dashboard/chart/activities-by-team'),
            api.get('/admin/dashboard/chart/adoption-by-team'),
          ]);
          setOverview(ovRes);
          setChartData({
            byType:       typeRes.data       || [],
            byDomain:     domainRes.data     || [],
            byTeam:       teamRes.data       || [],
            adoptionByTeam: adoptionRes.data || [],
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

  const ROLE_COLORS = {
    admin:     'bg-rose-100   dark:bg-rose-900/40   text-rose-700   dark:text-rose-300',
    manager:   'bg-violet-100 dark:bg-violet-900/40 text-violet-700 dark:text-violet-300',
    developer: 'bg-blue-100   dark:bg-blue-900/40   text-blue-700   dark:text-blue-300',
    lead:      'bg-amber-100  dark:bg-amber-900/40  text-amber-700  dark:text-amber-300',
  };

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
          {TABS.map(t => (
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

                {/* BarChart — Activities by Type */}
                <ChartCard title="Activities by Type" delay={0.2}>
                  {loading ? <Skeleton className="h-56" /> : chartData.byType.length === 0 ? <EmptyChart /> : (
                    <ResponsiveContainer width="100%" height={220}>
                      <BarChart data={chartData.byType} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke={gridColor} vertical={false} />
                        <XAxis dataKey="label" tick={{ fontSize: 10, fill: tickColor }}
                               tickFormatter={v => v.replace(/_/g, ' ')}
                               axisLine={false} tickLine={false} />
                        <YAxis allowDecimals={false} tick={{ fontSize: 10, fill: tickColor }}
                               axisLine={false} tickLine={false} />
                        <Tooltip content={<ChartTooltip />} />
                        <Bar dataKey="count" name="Activities" radius={[6, 6, 0, 0]} maxBarSize={48}
                             animationDuration={900}>
                          {chartData.byType.map((_, i) => (
                            <Cell key={i} fill={PALETTE[i % PALETTE.length]} />
                          ))}
                          <LabelList dataKey="count" position="top"
                            style={{ fontSize: 10, fontWeight: 600, fill: tickColor }} />
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </ChartCard>

                {/* PieChart — Activities by Domain */}
                <ChartCard title="Activities by Domain" delay={0.28}>
                  {loading ? <Skeleton className="h-56" /> : chartData.byDomain.length === 0 ? <EmptyChart /> : (
                    <ResponsiveContainer width="100%" height={220}>
                      <PieChart>
                        <Pie data={chartData.byDomain} cx="50%" cy="50%"
                             innerRadius={55} outerRadius={85}
                             dataKey="count" nameKey="label"
                             paddingAngle={3} strokeWidth={0}
                             animationBegin={0} animationDuration={900}>
                          {chartData.byDomain.map((_, i) => (
                            <Cell key={i} fill={PALETTE[i % PALETTE.length]} />
                          ))}
                        </Pie>
                        <Tooltip content={<ChartTooltip />} />
                        <Legend iconType="circle" iconSize={8}
                                wrapperStyle={{ fontSize: 11, color: tickColor }} />
                      </PieChart>
                    </ResponsiveContainer>
                  )}
                </ChartCard>

                {/* Horizontal BarChart — Activities by Team */}
                <ChartCard title="Activities by Team" delay={0.36}>
                  {loading ? <Skeleton className="h-56" /> : chartData.byTeam.length === 0 ? <EmptyChart /> : (
                    <ResponsiveContainer width="100%" height={220}>
                      <BarChart data={chartData.byTeam} layout="vertical"
                                margin={{ top: 4, right: 24, left: 8, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke={gridColor} horizontal={false} />
                        <XAxis type="number" allowDecimals={false}
                               tick={{ fontSize: 10, fill: tickColor }} axisLine={false} tickLine={false} />
                        <YAxis dataKey="label" type="category" width={68}
                               tick={{ fontSize: 10, fill: tickColor }} axisLine={false} tickLine={false} />
                        <Tooltip content={<ChartTooltip />} />
                        <Bar dataKey="count" name="Activities"
                             fill="#8b5cf6" radius={[0, 6, 6, 0]} maxBarSize={20}
                             animationDuration={900} />
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </ChartCard>

                {/* Horizontal BarChart — Adoption % by Team */}
                <ChartCard title="AI Adoption % by Team" delay={0.44}>
                  {loading ? <Skeleton className="h-56" /> : chartData.adoptionByTeam.length === 0 ? <EmptyChart /> : (
                    <ResponsiveContainer width="100%" height={220}>
                      <BarChart data={chartData.adoptionByTeam} layout="vertical"
                                margin={{ top: 4, right: 40, left: 8, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke={gridColor} horizontal={false} />
                        <XAxis type="number" domain={[0, 100]}
                               tickFormatter={v => `${v}%`}
                               tick={{ fontSize: 10, fill: tickColor }} axisLine={false} tickLine={false} />
                        <YAxis dataKey="label" type="category" width={68}
                               tick={{ fontSize: 10, fill: tickColor }} axisLine={false} tickLine={false} />
                        <Tooltip content={<ChartTooltip formatter={v => `${Math.round(v)}%`} />} />
                        <Bar dataKey="value" name="Adoption"
                             fill="#10b981" radius={[0, 6, 6, 0]} maxBarSize={20}
                             animationDuration={900} />
                      </BarChart>
                    </ResponsiveContainer>
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
                            className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
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
              {/* Search */}
              <input
                type="search"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search by name or email…"
                className="w-full max-w-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900
                           px-4 py-2.5 text-sm text-slate-900 dark:text-slate-100
                           focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/30"
              />
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
                            className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
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
        </AnimatePresence>

      </div>
    </PageWrapper>
  );
}
