import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { api } from '../lib/api';
import PageWrapper from '../components/PageWrapper';

const TYPES = [
  { value: 'learning',         label: 'Learning',         icon: '📚' },
  { value: 'practice_project', label: 'Practice Project', icon: '🛠️' },
  { value: 'agent_built',      label: 'Agent Built',      icon: '🤖' },
  { value: 'code_review',      label: 'Code Review',      icon: '🔍' },
  { value: 'certification',    label: 'Certification',    icon: '🏆' },
];

const TYPE_META = Object.fromEntries(TYPES.map(t => [t.value, t]));

const TYPE_COLORS = {
  learning:         'bg-blue-100   dark:bg-blue-900/40   text-blue-700   dark:text-blue-300',
  practice_project: 'bg-violet-100 dark:bg-violet-900/40 text-violet-700 dark:text-violet-300',
  agent_built:      'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300',
  code_review:      'bg-amber-100  dark:bg-amber-900/40  text-amber-700  dark:text-amber-300',
  certification:    'bg-rose-100   dark:bg-rose-900/40   text-rose-700   dark:text-rose-300',
};

const fieldCls = `rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900
  px-3 py-2 text-sm text-slate-900 dark:text-slate-100
  focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/30`;

function Skeleton({ className = '' }) {
  return <div className={`rounded-xl bg-slate-100 dark:bg-slate-800 animate-pulse ${className}`} />;
}

function getDateRange(filter) {
  const today = new Date().toISOString().split('T')[0];
  if (filter === 'week') {
    const d = new Date(); d.setDate(d.getDate() - 7);
    return { from: d.toISOString().split('T')[0], to: today };
  }
  if (filter === 'month') {
    const d = new Date(); d.setDate(d.getDate() - 30);
    return { from: d.toISOString().split('T')[0], to: today };
  }
  return { from: '', to: '' };
}

export default function AllActivities() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const initFilter = searchParams.get('filter') || '';
  const initType   = searchParams.get('type')   || '';
  const initDomain = searchParams.get('domain') || '';
  const { from: initFrom, to: initTo } = getDateRange(initFilter);

  const [filters, setFilters] = useState({
    user:   '',
    dept:   '',
    team:   '',
    type:   initType,
    domain: initDomain,
    status: '',
    from:   initFrom,
    to:     initTo,
  });
  const [page, setPage]           = useState(1);
  const [data, setData]           = useState(null);
  const [pocs, setPocs]           = useState([]);
  const [certs, setCerts]         = useState([]);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState(null);
  const [options, setOptions]     = useState({ departments: [], teams: [], domains: [] });

  const fetchData = useCallback(async (f, p) => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ page: p, limit: 50 });
      if (f.user)   params.set('user',   f.user);
      if (f.dept)   params.set('dept',   f.dept);
      if (f.team)   params.set('team',   f.team);
      if (f.type)   params.set('type',   f.type);
      if (f.domain) params.set('domain', f.domain);
      if (f.status) params.set('status', f.status);
      if (f.from)   params.set('from',   f.from);
      if (f.to)     params.set('to',     f.to);

      const pocParams = new URLSearchParams();
      if (f.user) pocParams.set('user', f.user);
      if (f.dept) pocParams.set('dept', f.dept);
      if (f.from) pocParams.set('from', f.from);
      if (f.to)   pocParams.set('to',   f.to);

      const certParams = new URLSearchParams({ status: 'all' });
      if (f.dept) certParams.set('dept', f.dept);
      if (f.from) certParams.set('from', f.from);
      if (f.to)   certParams.set('to',   f.to);

      const [actRes, pocRes, certRes] = await Promise.all([
        api.get(`/admin/activities?${params}`),
        api.get(`/admin/pocs?${pocParams}`),
        api.get(`/admin/reviews?${certParams}`),
      ]);
      setData(actRes);
      setPocs(pocRes.pocs || []);
      setCerts(certRes.certifications || []);
      if (!options.departments.length) {
        setOptions({ departments: actRes.departments, teams: actRes.teams, domains: actRes.domains });
      }
    } catch (err) {
      setError(err.message || 'Failed to load activities');
    } finally {
      setLoading(false);
    }
  }, [options.departments.length]);

  useEffect(() => {
    fetchData(filters, page);
  }, [filters, page]); // eslint-disable-line react-hooks/exhaustive-deps

  function setFilter(key, value) {
    setFilters(f => ({ ...f, [key]: value }));
    setPage(1);
  }

  function exportCSV() {
    const rows = (data?.activities || []);
    const headers = ['Date', 'ETA', 'User', 'Email', 'Team', 'Dept', 'Type', 'Title', 'Tool', 'Model', 'Domain', 'Status'];
    const csvRows = rows.map(a => [
      a.activity_date,
      a.eta || '',
      `${a.first_name} ${a.last_name}`,
      a.email,
      a.team || '',
      a.department || '',
      a.activity_type,
      a.title,
      a.tool_used || '',
      a.model_used || '',
      a.domain || '',
      a.status,
    ]);
    const csv = [headers, ...csvRows].map(r =>
      r.map(v => (String(v).includes(',') || String(v).includes('"')) ? `"${String(v).replace(/"/g, '""')}"` : v).join(',')
    ).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url  = URL.createObjectURL(blob);
    const a    = Object.assign(document.createElement('a'), {
      href: url, download: `all-activities-${new Date().toISOString().split('T')[0]}.csv`,
    });
    document.body.appendChild(a); a.click(); URL.revokeObjectURL(url); a.remove();
  }

  const activities = data?.activities || [];
  const total = data?.total || 0;
  const totalPages = Math.ceil(total / 50);

  const timeline = useMemo(() => {
    const acts      = activities.map(a => ({ ...a, _type: 'activity' }));
    const pocItems  = pocs.map(p  => ({ ...p, _type: 'poc',  _sortDate: p.start_date  || p.created_at }));
    const certItems = certs.map(c => ({ ...c, _type: 'cert', _sortDate: c.issue_date  || c.created_at }));
    return [...acts, ...pocItems, ...certItems].sort((a, b) => {
      const da = new Date(a._type === 'activity' ? a.activity_date : a._sortDate);
      const db = new Date(b._type === 'activity' ? b.activity_date : b._sortDate);
      return db - da;
    });
  }, [activities, pocs, certs]);

  return (
    <PageWrapper>
      <div className="space-y-6">

        {/* Header */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.28 }}
          className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link to="/admin"
              className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm text-slate-500
                         hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200 transition-colors">
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
              </svg>
              Back
            </Link>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">All Activities</h1>
              <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">
                {loading ? '…' : `${total.toLocaleString()} activit${total !== 1 ? 'ies' : 'y'}${pocs.length > 0 ? ` · ${pocs.length} POC${pocs.length !== 1 ? 's' : ''}` : ''}${certs.length > 0 ? ` · ${certs.length} cert${certs.length !== 1 ? 's' : ''}` : ''} across all teams`}
              </p>
            </div>
          </div>
          <button onClick={exportCSV}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 dark:border-slate-700
                       bg-white dark:bg-slate-900 px-4 py-2.5 text-sm font-semibold text-slate-700 dark:text-slate-300
                       hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors shadow-sm">
            ↓ Export CSV
          </button>
        </motion.div>

        {/* Filter bar */}
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08 }}
          className="flex flex-wrap gap-2 items-end">

          <input
            type="search" placeholder="Search user or email…"
            value={filters.user} onChange={e => setFilter('user', e.target.value)}
            className={`${fieldCls} w-48`}
          />
          <select value={filters.dept} onChange={e => setFilter('dept', e.target.value)} className={fieldCls}>
            <option value="">All Departments</option>
            {options.departments.map(d => <option key={d} value={d}>{d}</option>)}
          </select>
          <select value={filters.team} onChange={e => setFilter('team', e.target.value)} className={fieldCls}>
            <option value="">All Teams</option>
            {options.teams.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
          <select value={filters.type} onChange={e => setFilter('type', e.target.value)} className={fieldCls}>
            <option value="">All Types</option>
            {TYPES.map(t => <option key={t.value} value={t.value}>{t.icon} {t.label}</option>)}
          </select>
          <select value={filters.domain} onChange={e => setFilter('domain', e.target.value)} className={fieldCls}>
            <option value="">All Domains</option>
            {options.domains.map(d => <option key={d} value={d}>{d}</option>)}
          </select>
          <select value={filters.status} onChange={e => setFilter('status', e.target.value)} className={fieldCls}>
            <option value="">All Statuses</option>
            <option value="completed">Completed</option>
            <option value="in_progress">In Progress</option>
          </select>
          <div className="flex items-center gap-1">
            <input type="date" value={filters.from} onChange={e => setFilter('from', e.target.value)}
              className={fieldCls} title="From date" />
            <span className="text-xs text-slate-400">→</span>
            <input type="date" value={filters.to} onChange={e => setFilter('to', e.target.value)}
              className={fieldCls} title="To date" />
          </div>
          {(filters.user || filters.dept || filters.team || filters.type || filters.domain || filters.status || filters.from || filters.to) && (
            <button
              onClick={() => { setFilters({ user:'', dept:'', team:'', type:'', domain:'', status:'', from:'', to:'' }); setPage(1); }}
              className="rounded-xl border border-slate-200 dark:border-slate-700 px-3 py-2 text-xs font-medium
                         text-slate-500 hover:text-rose-600 hover:border-rose-300 transition-colors dark:hover:border-rose-700"
            >
              Clear filters
            </button>
          )}
        </motion.div>

        {/* Error */}
        <AnimatePresence>
          {error && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="rounded-xl border border-rose-200 dark:border-rose-800 bg-rose-50 dark:bg-rose-900/30 px-4 py-3 text-sm text-rose-700 dark:text-rose-300">
              {error}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Table */}
        {loading ? (
          <div className="space-y-3">{[...Array(8)].map((_, i) => <Skeleton key={i} className="h-14" />)}</div>
        ) : timeline.length === 0 ? (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            className="py-20 text-center text-slate-400 dark:text-slate-500">
            <p className="text-4xl mb-3">📭</p>
            <p className="text-sm">No activities match the current filters.</p>
          </motion.div>
        ) : (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
            className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-soft">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40">
                    <th className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">User</th>
                    <th className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400 hidden md:table-cell">Team / Dept</th>
                    <th className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Type</th>
                    <th className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Title</th>
                    <th className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400 hidden lg:table-cell">Tool / Domain</th>
                    <th className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Date</th>
                    <th className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {timeline.map((item, i) => {
                    const userId = item.user_id;
                    const userCell = (
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-2.5">
                          {item.avatar_url ? (
                            <img src={item.avatar_url} alt="" className="h-7 w-7 rounded-full object-cover shrink-0" />
                          ) : (
                            <span className="grid h-7 w-7 place-items-center rounded-full bg-brand-600 text-[10px] font-bold text-white shrink-0">
                              {item.first_name?.[0]}{item.last_name?.[0]}
                            </span>
                          )}
                          <div className="min-w-0">
                            <p className="font-medium text-slate-900 dark:text-white truncate text-xs">
                              {item.first_name} {item.last_name}
                            </p>
                            <p className="text-[11px] text-slate-400 truncate">{item.email}</p>
                          </div>
                        </div>
                      </td>
                    );
                    const teamCell = (
                      <td className="px-5 py-3.5 hidden md:table-cell">
                        <p className="text-xs text-slate-600 dark:text-slate-400">{item.team || '—'}</p>
                        <p className="text-[11px] text-slate-400 dark:text-slate-500">{item.department || ''}</p>
                      </td>
                    );

                    /* ── POC row ── */
                    if (item._type === 'poc') return (
                      <motion.tr key={`poc-${item.id}`}
                        initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.015 }}
                        onClick={() => navigate(`/admin/users/${userId}`)}
                        className="hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer transition-colors border-l-4 border-l-purple-400"
                      >
                        {userCell}
                        {teamCell}
                        <td className="px-5 py-3.5">
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300">
                            🚀 POC
                          </span>
                        </td>
                        <td className="px-5 py-3.5 max-w-[220px]">
                          <p className="text-sm font-medium text-slate-900 dark:text-white truncate">{item.poc_name}</p>
                          {item.category && <p className="text-[11px] text-slate-400 truncate mt-0.5">📂 {item.category}</p>}
                        </td>
                        <td className="px-5 py-3.5 hidden lg:table-cell">
                          {item.tools_stack?.length > 0 && (
                            <p className="text-xs text-slate-500 dark:text-slate-400">🔧 {item.tools_stack.join(', ')}</p>
                          )}
                          {item.progress > 0 && (
                            <p className="text-[11px] text-slate-400 mt-0.5">📊 {item.progress}%</p>
                          )}
                        </td>
                        <td className="px-5 py-3.5 text-xs text-slate-500 dark:text-slate-400 whitespace-nowrap">
                          {item.start_date ? new Date(item.start_date).toLocaleDateString('en', { year: 'numeric', month: 'short', day: 'numeric' }) : '—'}
                        </td>
                        <td className="px-5 py-3.5">
                          <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                            item.status === 'Completed'
                              ? 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300'
                              : 'bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300'
                          }`}>
                            {item.status || 'In Progress'}
                          </span>
                        </td>
                      </motion.tr>
                    );

                    /* ── Cert row ── */
                    if (item._type === 'cert') return (
                      <motion.tr key={`cert-${item.id}`}
                        initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.015 }}
                        onClick={() => navigate(`/admin/users/${userId}`)}
                        className="hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer transition-colors border-l-4 border-l-emerald-400"
                      >
                        {userCell}
                        {teamCell}
                        <td className="px-5 py-3.5">
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300">
                            🏆 Cert
                          </span>
                        </td>
                        <td className="px-5 py-3.5 max-w-[220px]">
                          <p className="text-sm font-medium text-slate-900 dark:text-white truncate">{item.cert_name}</p>
                          {item.issuing_org && <p className="text-[11px] text-slate-400 truncate mt-0.5">{item.issuing_org}</p>}
                        </td>
                        <td className="px-5 py-3.5 hidden lg:table-cell text-xs text-slate-500 dark:text-slate-400">
                          {item.credential_id && <p>🔑 {item.credential_id}</p>}
                        </td>
                        <td className="px-5 py-3.5 text-xs text-slate-500 dark:text-slate-400 whitespace-nowrap">
                          {item.issue_date ? new Date(item.issue_date).toLocaleDateString('en', { year: 'numeric', month: 'short', day: 'numeric' }) : '—'}
                        </td>
                        <td className="px-5 py-3.5">
                          <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                            item.status === 'Approved'
                              ? 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300'
                              : item.status === 'Rejected'
                              ? 'bg-rose-100 dark:bg-rose-900/40 text-rose-700 dark:text-rose-300'
                              : 'bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300'
                          }`}>
                            {item.status || 'Pending'}
                          </span>
                        </td>
                      </motion.tr>
                    );

                    /* ── Activity row ── */
                    return (
                      <motion.tr key={`act-${item.id}`}
                        initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.015 }}
                        onClick={() => navigate(`/admin/users/${userId}`)}
                        className="hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer transition-colors"
                      >
                        {userCell}
                        {teamCell}
                        <td className="px-5 py-3.5">
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${TYPE_COLORS[item.activity_type] ?? ''}`}>
                            {TYPE_META[item.activity_type]?.icon} {TYPE_META[item.activity_type]?.label ?? item.activity_type}
                          </span>
                        </td>
                        <td className="px-5 py-3.5 max-w-[220px]">
                          <p className="text-sm font-medium text-slate-900 dark:text-white truncate">{item.title}</p>
                          {item.notes && <p className="text-[11px] text-slate-400 truncate mt-0.5">{item.notes}</p>}
                        </td>
                        <td className="px-5 py-3.5 hidden lg:table-cell">
                          <div className="space-y-0.5 text-xs text-slate-500 dark:text-slate-400">
                            {item.tool_used && (
                              <p>🔧 {item.tool_used}{item.model_used ? <span className="ml-1 text-slate-400 dark:text-slate-500">· {item.model_used}</span> : null}</p>
                            )}
                            {item.domain && <p>🏷️ {item.domain}</p>}
                          </div>
                        </td>
                        <td className="px-5 py-3.5 text-xs text-slate-500 dark:text-slate-400 whitespace-nowrap">
                          {item.status === 'in_progress' && item.eta
                            ? <span title="Expected completion">ETA: {new Date(item.eta).toLocaleDateString('en', { year: 'numeric', month: 'short', day: 'numeric' })}</span>
                            : new Date(item.activity_date).toLocaleDateString('en', { year: 'numeric', month: 'short', day: 'numeric' })
                          }
                        </td>
                        <td className="px-5 py-3.5">
                          <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                            item.status === 'completed'
                              ? 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300'
                              : 'bg-amber-100  dark:bg-amber-900/40  text-amber-700  dark:text-amber-300'
                          }`}>
                            {item.status === 'completed' ? 'Done' : 'In Progress'}
                          </span>
                        </td>
                      </motion.tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between border-t border-slate-100 dark:border-slate-800 px-5 py-3">
                <p className="text-xs text-slate-400">
                  Showing {(page - 1) * 50 + 1}–{Math.min(page * 50, total)} of {total}
                </p>
                <div className="flex gap-1.5">
                  <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                    className="rounded-lg border border-slate-200 dark:border-slate-700 px-3 py-1.5 text-xs
                               disabled:opacity-40 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
                    ← Prev
                  </button>
                  <span className="flex items-center px-3 text-xs text-slate-500">
                    {page} / {totalPages}
                  </span>
                  <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                    className="rounded-lg border border-slate-200 dark:border-slate-700 px-3 py-1.5 text-xs
                               disabled:opacity-40 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
                    Next →
                  </button>
                </div>
              </div>
            )}
          </motion.div>
        )}

      </div>
    </PageWrapper>
  );
}
