import { useState, useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { api } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import PageWrapper from '../components/PageWrapper';
import { AI_MODELS } from '../lib/aiModels';

const BACKEND_URL = import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:4000';
const ALLOWED_EXT = '.jpg,.jpeg,.png,.gif,.pdf,.doc,.docx,.xls,.xlsx';

function ActivityCommentThread({ activityId, initialCount, currentUserId }) {
  const [comments, setComments]   = useState(null);
  const [open, setOpen]           = useState(false);
  const [text, setText]           = useState('');
  const [files, setFiles]         = useState([]);
  const [posting, setPosting]     = useState(false);
  const [postSuccess, setPostSuccess] = useState(false);
  const [postError, setPostError]     = useState(null);
  const [deleting, setDeleting]   = useState(null);
  const fileRef                   = useRef(null);
  const successTimer              = useRef(null);

  async function load() {
    if (comments !== null) return;
    try {
      const res = await api.get(`/activities/${activityId}/comments`);
      setComments(res.comments || []);
    } catch {
      setComments([]);
    }
  }

  function toggle() {
    if (!open) load();
    setOpen(o => !o);
  }

  async function postComment() {
    if (!text.trim() && files.length === 0) return;
    setPosting(true);
    setPostError(null);
    try {
      const fd = new FormData();
      fd.append('comment', text.trim());
      for (const f of files) fd.append('attachments', f);
      const res = await fetch(
        `${BACKEND_URL}/api/activities/${activityId}/comments`,
        { method: 'POST', headers: { Authorization: `Bearer ${localStorage.getItem('ai-skills-portal.token')}` }, body: fd }
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to post comment');
      setComments(prev => [...(prev || []), data.comment]);
      setText('');
      setFiles([]);
      setPostSuccess(true);
      clearTimeout(successTimer.current);
      successTimer.current = setTimeout(() => setPostSuccess(false), 3000);
    } catch (err) {
      setPostError(err.message);
    } finally {
      setPosting(false);
    }
  }

  async function deleteComment(commentId) {
    setDeleting(commentId);
    try {
      await api.del(`/activities/${activityId}/comments/${commentId}`);
      setComments(prev => prev.filter(c => c.id !== commentId));
    } catch {}
    finally { setDeleting(null); }
  }

  const initials = (fn, ln) => `${(fn || '?')[0]}${(ln || '?')[0]}`.toUpperCase();
  const count = comments !== null ? comments.length : initialCount;

  return (
    <div className="mt-2.5">
      <button
        onClick={toggle}
        className="flex items-center gap-1.5 text-xs font-medium text-brand-600 dark:text-brand-400 hover:underline"
      >
        💬 {count > 0 ? `${count} comment${count !== 1 ? 's' : ''}` : 'Add feedback'}
        <span className="text-slate-400 text-[10px]">{open ? '▲' : '▼'}</span>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="mt-3 space-y-3 border-l-2 border-brand-100 dark:border-brand-900/40 pl-3">

              {/* Success toast */}
              <AnimatePresence>
                {postSuccess && (
                  <motion.div
                    initial={{ opacity: 0, y: -6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -6 }}
                    transition={{ duration: 0.2 }}
                    className="flex items-center gap-2 rounded-lg border border-emerald-200 dark:border-emerald-800
                               bg-emerald-50 dark:bg-emerald-900/30 px-3 py-1.5 text-xs font-medium
                               text-emerald-700 dark:text-emerald-300"
                  >
                    ✅ Comment posted successfully!
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Error banner */}
              <AnimatePresence>
                {postError && (
                  <motion.div
                    initial={{ opacity: 0, y: -6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -6 }}
                    transition={{ duration: 0.2 }}
                    className="flex items-center justify-between gap-2 rounded-lg border border-rose-200 dark:border-rose-800
                               bg-rose-50 dark:bg-rose-900/30 px-3 py-1.5 text-xs font-medium
                               text-rose-700 dark:text-rose-300"
                  >
                    <span>⚠️ {postError}</span>
                    <button onClick={() => setPostError(null)} className="text-rose-400 hover:text-rose-600 font-bold">×</button>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Comment list */}
              {(comments || []).map(c => (
                <div key={c.id} className="group relative">
                  <div className="flex items-start gap-2">
                    {c.commenter?.avatar_url ? (
                      <img src={c.commenter.avatar_url} className="h-6 w-6 rounded-full object-cover shrink-0 mt-0.5" alt="" />
                    ) : (
                      <span className="grid h-6 w-6 place-items-center rounded-full bg-brand-600 text-[9px] font-bold text-white shrink-0 mt-0.5">
                        {initials(c.commenter?.first_name, c.commenter?.last_name)}
                      </span>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                          {c.commenter?.first_name} {c.commenter?.last_name}
                        </span>
                        <span className="text-[10px] text-slate-400 capitalize">{c.commenter?.role}</span>
                        <span className="text-[10px] text-slate-400">
                          · {new Date(c.created_at).toLocaleDateString('en', { month: 'short', day: 'numeric' })}
                        </span>
                      </div>
                      <p className="text-xs text-slate-700 dark:text-slate-300 mt-0.5 whitespace-pre-wrap">{c.comment}</p>
                      {c.attachments?.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 mt-1.5">
                          {c.attachments.map(a => (
                            <a key={a.id} href={`${BACKEND_URL}${a.url}`} target="_blank" rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 rounded-lg border border-slate-200 dark:border-slate-700
                                         bg-slate-50 dark:bg-slate-800 px-2 py-0.5 text-[10px] font-medium
                                         text-brand-600 dark:text-brand-400 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors">
                              📎 {a.original_name}
                            </a>
                          ))}
                        </div>
                      )}
                    </div>
                    {c.commenter?.id === currentUserId && (
                      <button
                        onClick={() => deleteComment(c.id)}
                        disabled={deleting === c.id}
                        className="opacity-0 group-hover:opacity-100 p-1 rounded text-slate-300 hover:text-rose-500 transition"
                        title="Delete"
                      >
                        🗑
                      </button>
                    )}
                  </div>
                </div>
              ))}

              {/* Reply input */}
              <div className="pt-1">
                <textarea
                  rows={2}
                  value={text}
                  onChange={e => setText(e.target.value)}
                  placeholder="Write a reply…"
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900
                             px-3 py-2 text-xs text-slate-900 dark:text-slate-100 placeholder:text-slate-400
                             focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/30 resize-none"
                />
                {files.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-1">
                    {files.map((f, i) => (
                      <span key={i} className="inline-flex items-center gap-1 rounded-lg border border-slate-200 dark:border-slate-700
                                               bg-slate-50 dark:bg-slate-800 px-2 py-0.5 text-[10px] text-slate-600 dark:text-slate-400">
                        📎 {f.name}
                        <button onClick={() => setFiles(fs => fs.filter((_, j) => j !== i))} className="text-rose-400 hover:text-rose-600 ml-0.5">×</button>
                      </span>
                    ))}
                  </div>
                )}
                <div className="flex items-center justify-between mt-1.5">
                  <button type="button" onClick={() => fileRef.current?.click()}
                    className="text-[10px] font-medium text-slate-500 hover:text-brand-600 dark:hover:text-brand-400 transition-colors">
                    📎 Attach files
                  </button>
                  <button
                    onClick={postComment}
                    disabled={posting || (!text.trim() && files.length === 0)}
                    className="rounded-lg bg-brand-600 hover:bg-brand-700 disabled:opacity-40 px-3 py-1
                               text-xs font-semibold text-white transition-colors"
                  >
                    {posting ? 'Posting…' : 'Send →'}
                  </button>
                </div>
                <input ref={fileRef} type="file" multiple accept={ALLOWED_EXT} className="hidden"
                  onChange={e => setFiles(f => [...f, ...Array.from(e.target.files || [])])} />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ── constants ───────────────────────────────────────────────── */
const TYPES = [
  { value: 'learning',         label: 'Learning',         icon: '📚', color: 'bg-blue-100   dark:bg-blue-900/40   text-blue-700   dark:text-blue-300' },
  { value: 'practice_project', label: 'Practice Project', icon: '🛠️', color: 'bg-violet-100 dark:bg-violet-900/40 text-violet-700 dark:text-violet-300' },
  { value: 'agent_built',      label: 'Agent Built',      icon: '🤖', color: 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300' },
  { value: 'code_review',      label: 'Code Review',      icon: '🔍', color: 'bg-amber-100  dark:bg-amber-900/40  text-amber-700  dark:text-amber-300' },
  { value: 'certification',    label: 'Certification',    icon: '🏆', color: 'bg-rose-100   dark:bg-rose-900/40   text-rose-700   dark:text-rose-300' },
];

const STATUSES = [
  { value: 'completed',   label: 'Completed' },
  { value: 'in_progress', label: 'In Progress' },
];

const TYPE_MAP    = Object.fromEntries(TYPES.map(t => [t.value, t]));
function localToday() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

const EMPTY_FORM  = {
  activity_type: 'learning',
  title: '',
  tool_used: '',
  model_used: '',
  domain: '',
  status: 'completed',
  notes: '',
  activity_date: localToday(),
  eta: '',
};

/* ── small helpers ───────────────────────────────────────────── */
const fieldCls = `w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white
  dark:bg-slate-900 px-3.5 py-2.5 text-sm text-slate-900 dark:text-slate-100
  shadow-sm transition placeholder:text-slate-400
  focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/30
  dark:focus:border-brand-400`;

const labelCls = 'mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400';

/* ── tab underline animation ─────────────────────────────────── */
const TAB_ITEMS = [
  { id: 'form',    label: 'Log Activity' },
  { id: 'history', label: 'My Activities' },
];

const listVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.06 } },
};
const itemVariants = {
  hidden:   { opacity: 0, y: 14 },
  visible:  { opacity: 1, y: 0, transition: { duration: 0.3, ease: [0.4, 0, 0.2, 1] } },
  exit:     { opacity: 0, x: -20, transition: { duration: 0.2 } },
};

/* ── component ───────────────────────────────────────────────── */
export default function ActivityLog() {
  const { user: currentUser } = useAuth();
  const [tab, setTab]             = useState('form');
  const [form, setForm]           = useState(EMPTY_FORM);
  const [tags, setTags]           = useState([]);
  const [activities, setActivities] = useState([]);
  const [loading, setLoading]     = useState(false);
  const [histLoading, setHistLoading] = useState(false);
  const [success, setSuccess]     = useState(false);
  const [error, setError]         = useState(null);
  const [filterType, setFilterType]     = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [deletingId, setDeletingId]     = useState(null);

  /* fetch tags once */
  useEffect(() => {
    api.get('/users/tags').then(r => setTags(r.tags || [])).catch(() => {});
  }, []);

  /* fetch history when switching to history tab */
  const loadActivities = () => {
    setHistLoading(true);
    api.get('/activities')
      .then(r => setActivities(r.activities || []))
      .catch(() => {})
      .finally(() => setHistLoading(false));
  };

  useEffect(() => {
    if (tab === 'history') loadActivities();
  }, [tab]);

  const toolTags   = useMemo(() => tags.filter(t => t.kind === 'tool'),   [tags]);
  const domainTags = useMemo(() => tags.filter(t => t.kind === 'domain'), [tags]);

  /* filtered list */
  const filtered = useMemo(() => activities.filter(a => {
    if (filterType   !== 'all' && a.activity_type !== filterType)   return false;
    if (filterStatus !== 'all' && a.status        !== filterStatus) return false;
    return true;
  }), [activities, filterType, filterStatus]);

  /* form handlers */
  const onChange = e => {
    const { name, value } = e.target;
    setForm(f => {
      const next = { ...f, [name]: value };
      if (name === 'tool_used') next.model_used = '';
      if (name === 'status' && value === 'completed') next.eta = '';
      return next;
    });
  };

  const onSubmit = async e => {
    e.preventDefault();
    setError(null);
    setSuccess(false);
    setLoading(true);
    try {
      await api.post('/activities', form);
      setSuccess(true);
      setForm(EMPTY_FORM);
      /* silently refresh history list in bg */
      api.get('/activities').then(r => setActivities(r.activities || [])).catch(() => {});
      setTimeout(() => setSuccess(false), 4000);
    } catch (err) {
      setError(err.message || 'Failed to log activity');
    } finally {
      setLoading(false);
    }
  };

  const onDelete = async id => {
    setDeletingId(id);
    try {
      await api.del(`/activities/${id}`);
      setActivities(prev => prev.filter(a => a.id !== id));
    } catch {
      /* silently ignore */
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <PageWrapper>
      <div className="max-w-2xl mx-auto space-y-6">

        {/* Header */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.28 }}>
          <h1 className="text-2xl font-bold tracking-tight">Activity Logger</h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Track your AI learning and projects
          </p>
        </motion.div>

        {/* Tabs */}
        <div className="flex gap-1 border-b border-slate-200 dark:border-slate-700">
          {TAB_ITEMS.map(t => (
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
                  layoutId="tab-line"
                  className="absolute bottom-0 left-0 right-0 h-0.5 bg-brand-600 dark:bg-brand-400 rounded-t"
                />
              )}
            </button>
          ))}
        </div>

        {/* Tab content */}
        <AnimatePresence mode="wait">

          {/* ── LOG FORM ── */}
          {tab === 'form' && (
            <motion.div
              key="form"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.22 }}
              className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-8 shadow-soft"
            >
              {/* Success banner */}
              <AnimatePresence>
                {success && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.96, y: -8 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.96 }}
                    transition={{ duration: 0.22 }}
                    className="mb-6 flex items-center gap-3 rounded-xl border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-900/30 px-4 py-3"
                  >
                    <span className="text-lg">✅</span>
                    <p className="text-sm font-medium text-emerald-800 dark:text-emerald-200">
                      Activity logged successfully!
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Error banner */}
              <AnimatePresence>
                {error && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.96, y: -8 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.96 }}
                    transition={{ duration: 0.22 }}
                    className="mb-6 flex items-center gap-3 rounded-xl border border-rose-200 dark:border-rose-800 bg-rose-50 dark:bg-rose-900/30 px-4 py-3"
                  >
                    <span className="text-lg">⚠️</span>
                    <p className="text-sm font-medium text-rose-800 dark:text-rose-200">{error}</p>
                  </motion.div>
                )}
              </AnimatePresence>

              <form onSubmit={onSubmit} className="space-y-5">

                {/* Activity type — pill selector */}
                <div>
                  <label className={labelCls}>Activity Type *</label>
                  <div className="flex flex-wrap gap-2 mt-1">
                    {TYPES.map(t => (
                      <motion.button
                        key={t.value}
                        type="button"
                        whileTap={{ scale: 0.95 }}
                        onClick={() => setForm(f => ({ ...f, activity_type: t.value }))}
                        className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
                          form.activity_type === t.value
                            ? `${t.color} border-transparent`
                            : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-slate-300'
                        }`}
                      >
                        {t.icon} {t.label}
                      </motion.button>
                    ))}
                  </div>
                </div>

                {/* Title */}
                <div>
                  <label className={labelCls} htmlFor="title">Title / Description *</label>
                  <input
                    id="title" name="title" type="text" required
                    value={form.title} onChange={onChange}
                    placeholder="e.g. Built a RAG chatbot, Completed AWS AI Practitioner"
                    className={fieldCls}
                  />
                </div>

                {/* Status + Date */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className={labelCls} htmlFor="status">Status</label>
                    <select id="status" name="status" value={form.status} onChange={onChange} className={fieldCls}>
                      {STATUSES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className={labelCls} htmlFor="activity_date">
                      {form.status === 'in_progress' ? 'Start Date *' : 'Completion Date *'}
                    </label>
                    <input
                      id="activity_date" name="activity_date" type="date" required
                      value={form.activity_date} onChange={onChange}
                      max={localToday()}
                      className={fieldCls}
                    />
                  </div>
                </div>

                {/* ETA — only when In Progress */}
                {form.status === 'in_progress' && (
                  <div>
                    <label className={labelCls} htmlFor="eta">ETA (Expected Completion)</label>
                    <input
                      id="eta" name="eta" type="date"
                      value={form.eta} onChange={onChange}
                      min={localToday()}
                      className={fieldCls}
                    />
                  </div>
                )}

                {/* Tool + Domain */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className={labelCls} htmlFor="tool_used">Tool Used</label>
                    <select id="tool_used" name="tool_used" value={form.tool_used} onChange={onChange} className={fieldCls}>
                      <option value="">— Select tool —</option>
                      {toolTags.map(t => <option key={t.id} value={t.name}>{t.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className={labelCls} htmlFor="domain">Domain</label>
                    <select id="domain" name="domain" value={form.domain} onChange={onChange} className={fieldCls}>
                      <option value="">— Select domain —</option>
                      {domainTags.map(t => <option key={t.id} value={t.name}>{t.name}</option>)}
                    </select>
                  </div>
                </div>

                {/* Model — only when a supported tool is selected */}
                {form.tool_used && AI_MODELS[form.tool_used] && (
                  <div>
                    <label className={labelCls} htmlFor="model_used">Model</label>
                    <select id="model_used" name="model_used" value={form.model_used} onChange={onChange} className={fieldCls}>
                      <option value="">— Select model —</option>
                      {AI_MODELS[form.tool_used].map(m => <option key={m} value={m}>{m}</option>)}
                    </select>
                  </div>
                )}

                {/* Notes */}
                <div>
                  <label className={labelCls} htmlFor="notes">Notes</label>
                  <textarea
                    id="notes" name="notes" rows={3}
                    value={form.notes} onChange={onChange}
                    placeholder="Any additional details…"
                    className={`${fieldCls} resize-none`}
                  />
                </div>

                <motion.button
                  type="submit"
                  disabled={loading}
                  whileTap={{ scale: 0.97 }}
                  className="w-full rounded-xl bg-brand-600 hover:bg-brand-700 disabled:opacity-50 disabled:cursor-not-allowed
                             text-white font-semibold py-3 text-sm transition-colors shadow-sm"
                >
                  {loading ? (
                    <span className="flex items-center justify-center gap-2">
                      <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                      </svg>
                      Logging…
                    </span>
                  ) : 'Log Activity'}
                </motion.button>
              </form>
            </motion.div>
          )}

          {/* ── HISTORY ── */}
          {tab === 'history' && (
            <motion.div
              key="history"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.22 }}
              className="space-y-4"
            >
              {/* Filter bar */}
              <div className="flex flex-wrap gap-2">
                <select
                  value={filterType}
                  onChange={e => setFilterType(e.target.value)}
                  className={`${fieldCls} w-auto`}
                >
                  <option value="all">All types</option>
                  {TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
                <select
                  value={filterStatus}
                  onChange={e => setFilterStatus(e.target.value)}
                  className={`${fieldCls} w-auto`}
                >
                  <option value="all">All statuses</option>
                  {STATUSES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                </select>
                <span className="flex items-center text-xs text-slate-400 dark:text-slate-500 ml-1">
                  {filtered.length} result{filtered.length !== 1 ? 's' : ''}
                </span>
              </div>

              {/* List */}
              {histLoading ? (
                <div className="space-y-3">
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="h-24 rounded-2xl bg-slate-100 dark:bg-slate-800 animate-pulse" />
                  ))}
                </div>
              ) : filtered.length === 0 ? (
                <motion.div
                  initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                  className="py-16 flex flex-col items-center gap-2 text-slate-400 dark:text-slate-500"
                >
                  <span className="text-5xl">📭</span>
                  <p className="text-sm mt-1">No activities match your filters.</p>
                </motion.div>
              ) : (
                <motion.ul
                  variants={listVariants}
                  initial="hidden"
                  animate="visible"
                  className="space-y-3"
                >
                  <AnimatePresence>
                    {filtered.map(activity => {
                      const meta = TYPE_MAP[activity.activity_type];
                      return (
                        <motion.li
                          key={activity.id}
                          variants={itemVariants}
                          exit={itemVariants.exit}
                          layout
                          className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-soft"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex items-start gap-3 min-w-0">
                              <span className="text-2xl mt-0.5 shrink-0">{meta?.icon ?? '📌'}</span>
                              <div className="min-w-0">
                                <p className="font-semibold text-slate-900 dark:text-white truncate">
                                  {activity.title}
                                </p>
                                <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
                                  {activity.status === 'in_progress' && activity.eta
                                    ? `ETA: ${new Date(activity.eta).toLocaleDateString('en', { year: 'numeric', month: 'short', day: 'numeric' })}`
                                    : new Date(activity.activity_date).toLocaleDateString('en', { year: 'numeric', month: 'short', day: 'numeric' })
                                  }
                                </p>
                              </div>
                            </div>

                            {/* Badges + delete */}
                            <div className="flex items-center gap-2 shrink-0">
                              <span className={`hidden sm:inline-flex px-2.5 py-1 rounded-full text-xs font-semibold ${meta?.color ?? ''}`}>
                                {meta?.label}
                              </span>
                              <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                                activity.status === 'completed'
                                  ? 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300'
                                  : 'bg-amber-100  dark:bg-amber-900/40  text-amber-700  dark:text-amber-300'
                              }`}>
                                {activity.status === 'completed' ? 'Done' : 'In Progress'}
                              </span>
                              <motion.button
                                whileTap={{ scale: 0.9 }}
                                onClick={() => onDelete(activity.id)}
                                disabled={deletingId === activity.id}
                                className="p-1.5 rounded-lg text-slate-300 dark:text-slate-600 hover:text-rose-500 dark:hover:text-rose-400
                                           hover:bg-rose-50 dark:hover:bg-rose-900/20 transition-colors disabled:opacity-40"
                                title="Delete"
                              >
                                {deletingId === activity.id ? (
                                  <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                                  </svg>
                                ) : (
                                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                    <path strokeLinecap="round" strokeLinejoin="round"
                                          d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                  </svg>
                                )}
                              </motion.button>
                            </div>
                          </div>

                          {/* Tool / model / domain / notes */}
                          {(activity.tool_used || activity.domain || activity.notes) && (
                            <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800 space-y-1.5">
                              <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500 dark:text-slate-400">
                                {activity.tool_used && (
                                  <span>🔧 <span className="font-medium text-slate-700 dark:text-slate-300">
                                    {activity.tool_used}{activity.model_used ? ` · ${activity.model_used}` : ''}
                                  </span></span>
                                )}
                                {activity.domain && (
                                  <span>🏷️ <span className="font-medium text-slate-700 dark:text-slate-300">{activity.domain}</span></span>
                                )}
                              </div>
                              {activity.notes && (
                                <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2">{activity.notes}</p>
                              )}
                            </div>
                          )}

                          {/* Comment thread */}
                          <ActivityCommentThread
                            activityId={activity.id}
                            initialCount={activity.comment_count || 0}
                            currentUserId={currentUser?.id}
                          />
                        </motion.li>
                      );
                    })}
                  </AnimatePresence>
                </motion.ul>
              )}
            </motion.div>
          )}

        </AnimatePresence>
      </div>
    </PageWrapper>
  );
}
