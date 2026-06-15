import { useState, useEffect, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import HighchartsReact from 'highcharts-react-official';
import Highcharts from '../lib/highchartsInit.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useTheme } from '../context/ThemeContext.jsx';
import { api } from '../lib/api.js';
import PageWrapper from '../components/PageWrapper.jsx';
import AnimatedNumber from '../components/AnimatedNumber.jsx';

const PALETTE = ['#3a60f5', '#8b5cf6', '#10b981', '#f59e0b', '#f43f5e', '#06b6d4'];
const MONTHLY_TARGET = 8;

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

function Sparkline({ data, color }) {
  if (!data || data.length < 2) return null;
  const max = Math.max(...data, 1);
  const w = 100, h = 28;
  const pts = data.map((v, i) => {
    const x = (i / (data.length - 1)) * w;
    const y = h * 0.95 - (v / max) * h * 0.85;
    return `${x},${y}`;
  }).join(' ');
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full mt-3" style={{ height: h }} aria-hidden="true">
      <polyline points={pts} fill="none" stroke={color} strokeWidth="1.5"
        strokeLinejoin="round" strokeLinecap="round" opacity="0.65" />
    </svg>
  );
}

function KpiCard({ label, value, color, icon, index, sparkData, sparkColor }) {
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
      {sparkData && <Sparkline data={sparkData} color={sparkColor || '#94a3b8'} />}
    </motion.div>
  );
}

function GoalGaugeCard({ index, current, target, isDark }) {
  const pct = Math.min(100, Math.round((current / target) * 100));
  const gaugeColor = pct >= 80 ? '#10b981' : pct >= 50 ? '#f59e0b' : '#f43f5e';

  const options = useMemo(() => ({
    chart: {
      type: 'solidgauge',
      height: 76,
      margin: [0, 0, 0, 0],
      backgroundColor: 'transparent',
      animation: { duration: 900 },
    },
    title: { text: '' },
    credits: { enabled: false },
    exporting: { enabled: false },
    pane: {
      center: ['50%', '100%'],
      size: '200%',
      startAngle: -90,
      endAngle: 90,
      background: {
        backgroundColor: isDark ? '#334155' : '#e2e8f0',
        innerRadius: '60%',
        outerRadius: '100%',
        shape: 'arc',
      },
    },
    yAxis: {
      min: 0, max: 100,
      lineWidth: 0, tickWidth: 0,
      minorTickInterval: null, tickAmount: 2,
      labels: { enabled: false },
    },
    plotOptions: {
      solidgauge: {
        innerRadius: '60%',
        dataLabels: { enabled: false },
        linecap: 'round',
        rounded: true,
      },
    },
    tooltip: { enabled: false },
    series: [{ data: [{ y: pct, color: gaugeColor }] }],
  }), [pct, gaugeColor, isDark]);

  return (
    <motion.div
      custom={index}
      variants={cardVariants}
      initial="hidden"
      animate="visible"
      whileHover={{ y: -3, transition: { duration: 0.18 } }}
      className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-soft"
    >
      <div className="flex items-center justify-between mb-1">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Monthly Goal</p>
        <span className="text-2xl">🎯</span>
      </div>
      <HighchartsReact highcharts={Highcharts} options={options} />
      <div className="text-center -mt-1">
        <p className="text-2xl font-bold tabular-nums" style={{ color: gaugeColor }}>{pct}%</p>
        <p className="text-xs text-slate-400 dark:text-slate-500">{current} / {target} activities</p>
      </div>
    </motion.div>
  );
}

function SkeletonBlock({ className = '' }) {
  return <div className={`rounded-xl bg-slate-100 dark:bg-slate-800 animate-pulse ${className}`} />;
}

export default function Dashboard() {
  const { user } = useAuth();
  const { theme } = useTheme();
  const navigate = useNavigate();
  const isDark = theme === 'dark';
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modelData, setModelData] = useState([]);

  const gridColor    = isDark ? '#334155' : '#e2e8f0';
  const labelColor   = isDark ? '#94a3b8' : '#64748b';
  const tooltipBg    = isDark ? '#1e293b' : '#ffffff';
  const tooltipBorder = isDark ? '#334155' : '#e2e8f0';
  const tooltipText  = isDark ? '#e2e8f0' : '#1e293b';

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

  const sparkData = useMemo(() => {
    const days = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const iso = d.toISOString().split('T')[0];
      days.push(activities.filter(a => a.activity_date === iso).length);
    }
    return days;
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

  const trendOptions = useMemo(() => ({
    chart: {
      type: 'areaspline',
      height: 200,
      backgroundColor: 'transparent',
      zoomType: 'x',
      panning: { enabled: true, type: 'x' },
      panKey: 'shift',
      resetZoomButton: {
        position: { align: 'right', verticalAlign: 'top', x: -4, y: 4 },
        theme: {
          fill: isDark ? '#1e293b' : '#f8fafc',
          stroke: isDark ? '#334155' : '#e2e8f0',
          r: 6,
          style: { color: labelColor, fontSize: '10px' },
          states: { hover: { fill: isDark ? '#334155' : '#f1f5f9' } },
        },
      },
    },
    title: { text: '' },
    credits: { enabled: false },
    exporting: { enabled: false },
    xAxis: {
      categories: trendData.map(d => d.label),
      crosshair: { color: isDark ? '#475569' : '#cbd5e1', width: 1, dashStyle: 'ShortDash' },
      tickInterval: 7,
      labels: { style: { color: labelColor, fontSize: '10px' } },
      lineColor: gridColor,
      tickColor: 'transparent',
      gridLineColor: 'transparent',
    },
    yAxis: {
      allowDecimals: false,
      gridLineColor: gridColor,
      labels: { style: { color: labelColor, fontSize: '10px' } },
      title: { text: '' },
    },
    plotOptions: {
      areaspline: {
        fillColor: {
          linearGradient: { x1: 0, y1: 0, x2: 0, y2: 1 },
          stops: [
            [0, 'rgba(58,96,245,0.38)'],
            [1, 'rgba(58,96,245,0)'],
          ],
        },
        lineColor: '#3a60f5',
        lineWidth: 2.5,
        marker: {
          enabled: false,
          states: { hover: { enabled: true, radius: 5, fillColor: '#3a60f5', lineWidth: 0 } },
        },
        states: { hover: { lineWidth: 2.5 } },
      },
    },
    tooltip: {
      shared: true,
      backgroundColor: tooltipBg,
      borderColor: tooltipBorder,
      borderRadius: 10,
      style: { color: tooltipText, fontSize: '12px' },
      shadow: false,
      headerFormat: '<span style="font-size:10px;font-weight:600;text-transform:uppercase;letter-spacing:.05em">{point.key}</span><br/>',
      pointFormat: '<span style="color:{series.color}">●</span> Activities: <b>{point.y}</b>',
    },
    series: [{ name: 'Activities', data: trendData.map(d => d.count), color: '#3a60f5' }],
    legend: { enabled: false },
  }), [trendData, isDark, gridColor, labelColor, tooltipBg, tooltipBorder, tooltipText]);

  const breakdownOptions = useMemo(() => ({
    chart: {
      type: 'pie',
      height: 220,
      backgroundColor: 'transparent',
      options3d: { enabled: true, alpha: 42, beta: 0 },
      animation: { duration: 900 },
    },
    title: { text: '' },
    credits: { enabled: false },
    exporting: { enabled: false },
    plotOptions: {
      pie: {
        innerSize: '48%',
        depth: 28,
        dataLabels: { enabled: false },
        showInLegend: true,
        slicedOffset: 12,
        allowPointSelect: true,
        cursor: 'pointer',
        point: {
          events: {
            mouseOver() { this.slice(true); },
            mouseOut()  { this.slice(false); },
          },
        },
      },
    },
    legend: {
      align: 'center',
      verticalAlign: 'bottom',
      itemStyle: { color: labelColor, fontSize: '11px', fontWeight: '400' },
      itemHoverStyle: { color: isDark ? '#e2e8f0' : '#1e293b' },
      symbolRadius: 4,
    },
    tooltip: {
      backgroundColor: tooltipBg,
      borderColor: tooltipBorder,
      borderRadius: 10,
      style: { color: tooltipText, fontSize: '12px' },
      shadow: false,
      pointFormat: '<span style="color:{point.color}">●</span> <b>{point.name}</b><br/>Count: <b>{point.y}</b> · <b>{point.percentage:.1f}%</b>',
    },
    series: [{
      name: 'Activities',
      data: typeData.map((d, i) => ({ name: d.name, y: d.value, color: PALETTE[i % PALETTE.length] })),
    }],
  }), [typeData, isDark, labelColor, tooltipBg, tooltipBorder, tooltipText]);

  const modelOptions = useMemo(() => ({
    chart: {
      type: 'pie',
      height: 260,
      backgroundColor: 'transparent',
      animation: { duration: 900 },
    },
    title: { text: '' },
    credits: { enabled: false },
    exporting: { enabled: false },
    plotOptions: {
      pie: {
        innerSize: '58%',
        startAngle: -90,
        endAngle: 90,
        center: ['50%', '78%'],
        size: '120%',
        dataLabels: {
          enabled: true,
          format: '<b>{point.name}</b><br/>{point.percentage:.0f}%',
          distance: 16,
          style: {
            fontSize: '10px',
            color: labelColor,
            fontWeight: '500',
            textOutline: 'none',
          },
        },
        showInLegend: false,
        cursor: 'pointer',
        allowPointSelect: true,
      },
    },
    tooltip: {
      backgroundColor: tooltipBg,
      borderColor: tooltipBorder,
      borderRadius: 10,
      style: { color: tooltipText, fontSize: '12px' },
      shadow: false,
      pointFormat: '<span style="color:{point.color}">●</span> <b>{point.name}</b><br/>Uses: <b>{point.y}</b> ({point.percentage:.1f}%)',
    },
    series: [{
      name: 'Uses',
      data: modelData.map((d, i) => ({ name: d.name, y: d.count, color: PALETTE[i % PALETTE.length] })),
    }],
  }), [modelData, labelColor, tooltipBg, tooltipBorder, tooltipText]);

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

        {/* KPI row — 4 metrics + monthly goal gauge */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5">
          <KpiCard index={0} label="Total Activities" value={stats.total} icon="📊"
            color="text-brand-600 dark:text-brand-400"
            sparkData={sparkData} sparkColor="#3a60f5" />
          <KpiCard index={1} label="This Week"        value={stats.week}  icon="📅"
            color="text-violet-600 dark:text-violet-400"
            sparkData={sparkData} sparkColor="#8b5cf6" />
          <KpiCard index={2} label="This Month"       value={stats.month} icon="📈"
            color="text-emerald-600 dark:text-emerald-400"
            sparkData={sparkData} sparkColor="#10b981" />
          <KpiCard index={3} label="Certifications"   value={stats.certs} icon="🏆"
            color="text-amber-600 dark:text-amber-400"
            sparkData={sparkData} sparkColor="#f59e0b" />
          <GoalGaugeCard index={4} current={stats.month} target={MONTHLY_TARGET} isDark={isDark} />
        </div>

        {/* Charts row */}
        <div className="grid gap-6 lg:grid-cols-2">

          {/* Area spline — 30-day trend */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.28, duration: 0.38 }}
            className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-soft"
          >
            <div className="flex items-center justify-between mb-5">
              <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                Activity Trend — Last 30 Days
              </p>
              <span className="text-xs text-slate-400 dark:text-slate-500 select-none">
                Drag to zoom · Shift+drag to pan
              </span>
            </div>
            {loading ? (
              <SkeletonBlock className="h-[200px]" />
            ) : (
              <HighchartsReact highcharts={Highcharts} options={trendOptions} />
            )}
          </motion.div>

          {/* 3D Donut — activity breakdown */}
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
              <SkeletonBlock className="h-[220px]" />
            ) : typeData.length === 0 ? (
              <div className="h-[220px] flex flex-col items-center justify-center gap-2 text-slate-400 dark:text-slate-500">
                <span className="text-4xl">📭</span>
                <p className="text-sm">No activities logged yet</p>
                <Link to="/activities"
                  className="text-xs text-brand-600 dark:text-brand-400 hover:underline">
                  Log your first activity →
                </Link>
              </div>
            ) : (
              <HighchartsReact highcharts={Highcharts} options={breakdownOptions} />
            )}
          </motion.div>
        </div>

        {/* Semi-donut — AI Models Used */}
        {(loading || modelData.length > 0) && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.42, duration: 0.38 }}
            className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-soft"
          >
            <p className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-5">AI Models Used</p>
            {loading ? (
              <SkeletonBlock className="h-[260px]" />
            ) : (
              <HighchartsReact highcharts={Highcharts} options={modelOptions} />
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
                    onClick={() => navigate(`/activities/${a.id}`)}
                    className="flex items-center justify-between py-2.5 px-3 rounded-xl cursor-pointer
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
