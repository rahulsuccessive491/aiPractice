import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  AreaChart, Area, PieChart, Pie, Cell,
  CartesianGrid, XAxis, YAxis, Tooltip,
  Legend, ResponsiveContainer,
} from 'recharts';
import { useAuth } from '../context/AuthContext.jsx';
import { useTheme } from '../context/ThemeContext.jsx';
import { api } from '../lib/api.js';
import PageWrapper from '../components/PageWrapper.jsx';
import AnimatedNumber from '../components/AnimatedNumber.jsx';
import ChartTooltip from '../components/ChartTooltip.jsx';

const PALETTE = ['#3a60f5', '#8b5cf6', '#10b981', '#f59e0b', '#f43f5e', '#06b6d4'];

const TYPE_META = {
  learning:         { label: 'Learning',        icon: '📚' },
  practice_project: { label: 'Practice Project', icon: '🛠️' },
  agent_built:      { label: 'Agent Built',      icon: '🤖' },
  code_review:      { label: 'Code Review',      icon: '🔍' },
  certification:    { label: 'Certification',    icon: '🏆' },
};

const STATUS_STYLE = {
  completed:   'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300',
  in_progress: 'bg-amber-100  dark:bg-amber-900/40  text-amber-700  dark:text-amber-300',
};

const cardVariants = {
  hidden:   { opacity: 0, y: 20 },
  visible: i => ({
    opacity: 1, y: 0,
    transition: { delay: i * 0.09, duration: 0.38, ease: [0.4, 0, 0.2, 1] },
  }),
};

function KpiCard({ label, value, color, icon, index }) {
  return (
    <motion.div
      custom={index}
      variants={cardVariants}
      initial="hidden"
      animate="visible"
      whileHover={{ y: -3, transition: { duration: 0.18 } }}
      className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-soft"
    >
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">{label}</p>
        <span className="text-2xl">{icon}</span>
      </div>
      <p className={`text-4xl font-bold tabular-nums ${color}`}>
        <AnimatedNumber value={value} />
      </p>
    </motion.div>
  );
}

function SkeletonBlock({ className = '' }) {
  return <div className={`rounded-xl bg-slate-100 dark:bg-slate-800 animate-pulse ${className}`} />;
}

export default function Dashboard() {
  const { user } = useAuth();
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modelData, setModelData] = useState([]);

  const gridColor  = isDark ? '#334155' : '#e2e8f0';
  const tickColor  = isDark ? '#94a3b8' : '#64748b';

  useEffect(() => {
    api.get('/activities')
      .then(r => setActivities(r.activities || []))
      .catch(() => {})
      .finally(() => setLoading(false));
    api.get('/activities/chart/by-model')
      .then(r => setModelData(r.data || []))
      .catch(() => {});
  }, []);

  const stats = useMemo(() => {
    const now   = new Date();
    const wkAgo = new Date(now - 7  * 864e5);
    const moAgo = new Date(now - 30 * 864e5);
    return {
      total: activities.length,
      week:  activities.filter(a => new Date(a.activity_date) >= wkAgo).length,
      month: activities.filter(a => new Date(a.activity_date) >= moAgo).length,
      certs: activities.filter(a => a.activity_type === 'certification').length,
    };
  }, [activities]);

  const trendData = useMemo(() => {
    const days = [];
    for (let i = 29; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const iso = d.toISOString().split('T')[0];
      days.push({
        label: d.toLocaleDateString('en', { month: 'short', day: 'numeric' }),
        count: activities.filter(a => a.activity_date === iso).length,
      });
    }
    return days;
  }, [activities]);

  const typeData = useMemo(() => {
    const counts = {};
    for (const a of activities) counts[a.activity_type] = (counts[a.activity_type] || 0) + 1;
    return Object.entries(counts).map(([key, value]) => ({
      name: TYPE_META[key]?.label ?? key,
      value,
    }));
  }, [activities]);

  const recent = useMemo(() => activities.slice(0, 5), [activities]);

  return (
    <PageWrapper>
      <div className="space-y-8">

        {/* Hero */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <h1 className="text-2xl font-bold tracking-tight">
            Welcome back, {user?.first_name} 👋
          </h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Your AI activity summary at a glance.
          </p>
        </motion.div>

        {/* KPI row */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <KpiCard index={0} label="Total Activities" value={stats.total} icon="📊"
            color="text-brand-600 dark:text-brand-400" />
          <KpiCard index={1} label="This Week"        value={stats.week}  icon="📅"
            color="text-violet-600 dark:text-violet-400" />
          <KpiCard index={2} label="This Month"       value={stats.month} icon="📈"
            color="text-emerald-600 dark:text-emerald-400" />
          <KpiCard index={3} label="Certifications"   value={stats.certs} icon="🏆"
            color="text-amber-600 dark:text-amber-400" />
        </div>

        {/* Charts row */}
        <div className="grid gap-6 lg:grid-cols-2">

          {/* Area chart — trend */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.28, duration: 0.38 }}
            className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-soft"
          >
            <p className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-5">
              Activity Trend — Last 30 Days
            </p>
            {loading ? (
              <SkeletonBlock className="h-48" />
            ) : (
              <ResponsiveContainer width="100%" height={200}>
                <AreaChart data={trendData} margin={{ top: 4, right: 4, left: -22, bottom: 0 }}>
                  <defs>
                    <linearGradient id="gradBlue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor="#3a60f5" stopOpacity={0.35} />
                      <stop offset="95%" stopColor="#3a60f5" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke={gridColor} vertical={false} />
                  <XAxis dataKey="label" tick={{ fontSize: 10, fill: tickColor }}
                         interval={6} axisLine={false} tickLine={false} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 10, fill: tickColor }}
                         axisLine={false} tickLine={false} />
                  <Tooltip content={<ChartTooltip />} />
                  <Area type="monotone" dataKey="count" name="Activities"
                        stroke="#3a60f5" strokeWidth={2.5}
                        fill="url(#gradBlue)" dot={false}
                        activeDot={{ r: 4, strokeWidth: 0, fill: '#3a60f5' }} />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </motion.div>

          {/* Donut — breakdown */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.36, duration: 0.38 }}
            className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-soft"
          >
            <p className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-5">
              Activity Breakdown
            </p>
            {loading ? (
              <SkeletonBlock className="h-48" />
            ) : typeData.length === 0 ? (
              <div className="h-48 flex flex-col items-center justify-center gap-2 text-slate-400 dark:text-slate-500">
                <span className="text-4xl">📭</span>
                <p className="text-sm">No activities logged yet</p>
                <Link to="/activities"
                  className="text-xs text-brand-600 dark:text-brand-400 hover:underline">
                  Log your first activity →
                </Link>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie data={typeData} cx="50%" cy="50%"
                       innerRadius={52} outerRadius={80}
                       dataKey="value" paddingAngle={3} strokeWidth={0}
                       animationBegin={0} animationDuration={900}>
                    {typeData.map((_, i) => (
                      <Cell key={i} fill={PALETTE[i % PALETTE.length]} />
                    ))}
                  </Pie>
                  <Tooltip content={<ChartTooltip />} />
                  <Legend iconType="circle" iconSize={8}
                          wrapperStyle={{ fontSize: 11, color: tickColor }} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </motion.div>
        </div>

        {/* AI Models Used — only shown when there is model data */}
        {(loading || modelData.length > 0) && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.42, duration: 0.38 }}
            className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-soft"
          >
            <p className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-5">AI Models Used</p>
            {loading ? (
              <SkeletonBlock className="h-48" />
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie
                    data={modelData} cx="50%" cy="50%"
                    innerRadius={58} outerRadius={88}
                    dataKey="count" nameKey="name"
                    paddingAngle={3} strokeWidth={0}
                    animationBegin={0} animationDuration={900}
                  >
                    {modelData.map((_, i) => (
                      <Cell key={i} fill={PALETTE[i % PALETTE.length]} />
                    ))}
                  </Pie>
                  <Tooltip content={<ChartTooltip />} />
                  <Legend iconType="circle" iconSize={8}
                          wrapperStyle={{ fontSize: 11, color: tickColor }} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </motion.div>
        )}

        {/* Recent activity + quick actions */}
        <div className="grid gap-6 lg:grid-cols-3">

          {/* Recent list */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.44, duration: 0.38 }}
            className="lg:col-span-2 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-soft"
          >
            <div className="flex items-center justify-between mb-5">
              <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">Recent Activity</p>
              <Link to="/activities"
                className="text-xs text-brand-600 dark:text-brand-400 hover:underline font-medium">
                View all →
              </Link>
            </div>

            {loading ? (
              <div className="space-y-3">
                {[...Array(4)].map((_, i) => <SkeletonBlock key={i} className="h-12" />)}
              </div>
            ) : recent.length === 0 ? (
              <div className="py-10 flex flex-col items-center gap-2 text-slate-400 dark:text-slate-500">
                <span className="text-4xl">🚀</span>
                <p className="text-sm">Start tracking your AI journey!</p>
                <Link to="/activities"
                  className="text-xs text-brand-600 dark:text-brand-400 hover:underline">
                  Log first activity →
                </Link>
              </div>
            ) : (
              <ul className="space-y-1">
                {recent.map((a, i) => (
                  <motion.li key={a.id}
                    initial={{ opacity: 0, x: -12 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.5 + i * 0.06 }}
                    className="flex items-center justify-between py-2.5 px-3 rounded-xl
                               hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="text-lg shrink-0">
                        {TYPE_META[a.activity_type]?.icon ?? '📌'}
                      </span>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-slate-800 dark:text-slate-200 truncate">
                          {a.title}
                        </p>
                        <p className="text-xs text-slate-400 dark:text-slate-500">
                          {TYPE_META[a.activity_type]?.label} · {a.activity_date}
                        </p>
                      </div>
                    </div>
                    <span className={`ml-3 shrink-0 px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_STYLE[a.status] ?? ''}`}>
                      {a.status === 'completed' ? 'Done' : 'In Progress'}
                    </span>
                  </motion.li>
                ))}
              </ul>
            )}
          </motion.div>

          {/* Right column — quick actions + role card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5, duration: 0.38 }}
            className="space-y-4"
          >
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-soft">
              <p className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-4">Quick Actions</p>
              <div className="space-y-2">
                <Link to="/activities"
                  className="flex items-center gap-3 p-3 rounded-xl bg-brand-50 dark:bg-brand-900/20
                             hover:bg-brand-100 dark:hover:bg-brand-900/40 transition-colors">
                  <span className="text-xl">✍️</span>
                  <div>
                    <p className="text-sm font-medium text-brand-700 dark:text-brand-300">Log Activity</p>
                    <p className="text-xs text-brand-500 dark:text-brand-400">Track your AI work</p>
                  </div>
                </Link>
                <Link to="/profile"
                  className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50
                             hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                  <span className="text-xl">👤</span>
                  <div>
                    <p className="text-sm font-medium text-slate-700 dark:text-slate-300">Edit Profile</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">Keep your stack current</p>
                  </div>
                </Link>
                {['manager', 'admin'].includes(user?.role) && (
                  <Link to="/admin"
                    className="flex items-center gap-3 p-3 rounded-xl bg-violet-50 dark:bg-violet-900/20
                               hover:bg-violet-100 dark:hover:bg-violet-900/40 transition-colors">
                    <span className="text-xl">📊</span>
                    <div>
                      <p className="text-sm font-medium text-violet-700 dark:text-violet-300">Leadership Dashboard</p>
                      <p className="text-xs text-violet-500 dark:text-violet-400">Team analytics</p>
                    </div>
                  </Link>
                )}
              </div>
            </div>

            {/* Role / tools card */}
            <div className="rounded-2xl bg-gradient-to-br from-brand-600 to-violet-600 p-6 text-white shadow-soft">
              <p className="text-xs font-semibold uppercase tracking-widest opacity-70 mb-1">Your Role</p>
              <p className="text-xl font-bold capitalize">{user?.role}</p>
              <p className="text-xs opacity-60 mt-0.5">{user?.department}</p>
              {(user?.ai_tools ?? []).length > 0 && (
                <div className="mt-4 flex flex-wrap gap-1.5">
                  {(user.ai_tools).map(t => (
                    <span key={t}
                      className="px-2 py-0.5 rounded-full bg-white/20 text-xs font-medium">
                      {t}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        </div>

      </div>
    </PageWrapper>
  );
}
