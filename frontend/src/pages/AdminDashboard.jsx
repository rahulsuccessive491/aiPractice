import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis,
  CartesianGrid, Tooltip, Legend, ResponsiveContainer,
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

function KpiCard({ label, value, color, icon, index, suffix = '' }) {
  return (
    <motion.div
      custom={index}
      variants={cardVariants}
      initial="hidden"
      animate="visible"
      whileHover={{ y: -3, transition: { duration: 0.16 } }}
      className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-soft"
    >
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">{label}</p>
        <span className="text-2xl">{icon}</span>
      </div>
      <p className={`text-4xl font-bold tabular-nums ${color}`}>
        <AnimatedNumber value={value} />{suffix}
      </p>
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

/* ── tabs ────────────────────────────────────────────────────── */
const TABS = [
  { id: 'overview', label: 'Overview' },
  { id: 'teams',    label: 'Teams' },
  { id: 'users',    label: 'All Users' },
];

/* ── main component ──────────────────────────────────────────── */
export default function AdminDashboard() {
  const { user } = useAuth();
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const gridColor = isDark ? '#334155' : '#e2e8f0';
  const tickColor = isDark ? '#94a3b8' : '#64748b';

  const [tab, setTab]           = useState('overview');
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState(null);
  const [overview, setOverview] = useState(null);
  const [chartData, setChartData] = useState({ byType: [], byDomain: [], byTeam: [], adoptionByTeam: [] });
  const [teamBreakdown, setTeamBreakdown] = useState([]);
  const [allUsers, setAllUsers] = useState([]);
  const [search, setSearch]     = useState('');

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
        }
      } catch (err) {
        setError(err.message || 'Failed to load data');
      } finally {
        setLoading(false);
      }
    };
    run();
  }, [tab]);

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

  const filteredUsers = allUsers.filter(u =>
    `${u.first_name} ${u.last_name} ${u.email}`.toLowerCase().includes(search.toLowerCase())
  );

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
        <div className="flex gap-1 border-b border-slate-200 dark:border-slate-700">
          {TABS.map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`relative px-4 py-2.5 text-sm font-medium transition-colors ${
                tab === t.id
                  ? 'text-brand-600 dark:text-brand-400'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              {t.label}
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
                  <KpiCard index={0} label="Total Users"        value={overview.totalUsers}            icon="👥" color="text-brand-600 dark:text-brand-400" />
                  <KpiCard index={1} label="Total Activities"   value={overview.totalActivities}       icon="📊" color="text-violet-600 dark:text-violet-400" />
                  <KpiCard index={2} label="This Week"          value={overview.activitiesThisWeek}    icon="📅" color="text-emerald-600 dark:text-emerald-400" />
                  <KpiCard index={3} label="This Month"         value={overview.activitiesThisMonth}   icon="📈" color="text-amber-600 dark:text-amber-400" />
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
                          <span className="font-bold text-slate-900 dark:text-white tabular-nums">{t.count}</span>
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
                          <span className="font-bold text-slate-900 dark:text-white tabular-nums">{d.count}</span>
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
                          <th className="px-6 py-3.5 text-left text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">User</th>
                          <th className="px-6 py-3.5 text-left text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Team</th>
                          <th className="px-6 py-3.5 text-left text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Role</th>
                          <th className="px-6 py-3.5 text-right text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Activities</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                        {filteredUsers.map((u, i) => (
                          <motion.tr key={u.id}
                            initial={{ opacity: 0, x: -8 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: i * 0.03 }}
                            className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
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
        </AnimatePresence>

      </div>
    </PageWrapper>
  );
}
