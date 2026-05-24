import { useState, useEffect, useRef, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { api } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import PageWrapper from '../components/PageWrapper';

const BACKEND_URL = import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:4000';
const ALLOWED_EXT = '.jpg,.jpeg,.png,.gif,.pdf,.doc,.docx,.xls,.xlsx';

function CommentThread({ activityId, currentUser }) {
  const [comments, setComments]       = useState(null);
  const [open, setOpen]               = useState(false);
  const [text, setText]               = useState('');
  const [files, setFiles]             = useState([]);
  const [posting, setPosting]         = useState(false);
  const [postSuccess, setPostSuccess] = useState(false);
  const [postError, setPostError]     = useState(null);
  const [deleting, setDeleting]       = useState(null);
  const fileRef                       = useRef(null);
  const successTimer                  = useRef(null);

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
  const count = comments?.length ?? 0;

  return (
    <div className="mt-2">
      <button
        onClick={toggle}
        className="flex items-center gap-1.5 text-xs font-medium text-brand-600 dark:text-brand-400 hover:underline"
      >
        💬 {comments === null ? 'Feedback' : `${count} comment${count !== 1 ? 's' : ''}`}
        <span className="text-slate-400">{open ? '▲' : '▼'}</span>
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
                    ✅ Feedback posted successfully!
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
                        <span className="text-[10px] text-slate-300 dark:text-slate-600">·</span>
                        <span className="text-[10px] text-slate-400">
                          {new Date(c.created_at).toLocaleDateString('en', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
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
                    {(c.commenter?.id === currentUser.id || currentUser.role === 'admin') && (
                      <button
                        onClick={() => deleteComment(c.id)}
                        disabled={deleting === c.id}
                        className="opacity-0 group-hover:opacity-100 p-1 rounded text-slate-300 hover:text-rose-500 transition"
                        title="Delete comment"
                      >
                        🗑
                      </button>
                    )}
                  </div>
                </div>
              ))}

              {/* New comment input */}
              <div className="pt-1">
                <textarea
                  rows={2}
                  value={text}
                  onChange={e => setText(e.target.value)}
                  placeholder="Leave feedback…"
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
                  <button
                    type="button"
                    onClick={() => fileRef.current?.click()}
                    className="text-[10px] font-medium text-slate-500 hover:text-brand-600 dark:hover:text-brand-400 transition-colors"
                  >
                    📎 Attach files
                  </button>
                  <button
                    onClick={postComment}
                    disabled={posting || (!text.trim() && files.length === 0)}
                    className="rounded-lg bg-brand-600 hover:bg-brand-700 disabled:opacity-40 px-3 py-1
                               text-xs font-semibold text-white transition-colors"
                  >
                    {posting ? 'Posting…' : 'Post →'}
                  </button>
                </div>
                <input
                  ref={fileRef} type="file" multiple accept={ALLOWED_EXT} className="hidden"
                  onChange={e => setFiles(f => [...f, ...Array.from(e.target.files || [])])}
                />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

const PROF_COLORS = {
  Beginner:     'bg-slate-100  dark:bg-slate-800  text-slate-600  dark:text-slate-400',
  Intermediate: 'bg-blue-100   dark:bg-blue-900/40   text-blue-700   dark:text-blue-300',
  Advanced:     'bg-violet-100 dark:bg-violet-900/40 text-violet-700 dark:text-violet-300',
  Expert:       'bg-amber-100  dark:bg-amber-900/40  text-amber-700  dark:text-amber-300',
};

const ROLE_COLORS = {
  admin:     'bg-rose-100   dark:bg-rose-900/40   text-rose-700   dark:text-rose-300',
  manager:   'bg-violet-100 dark:bg-violet-900/40 text-violet-700 dark:text-violet-300',
  developer: 'bg-blue-100   dark:bg-blue-900/40   text-blue-700   dark:text-blue-300',
  lead:      'bg-amber-100  dark:bg-amber-900/40  text-amber-700  dark:text-amber-300',
};

const TYPE_COLORS = {
  learning:         'bg-blue-100   dark:bg-blue-900/40   text-blue-700   dark:text-blue-300',
  practice_project: 'bg-violet-100 dark:bg-violet-900/40 text-violet-700 dark:text-violet-300',
  agent_built:      'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300',
  code_review:      'bg-amber-100  dark:bg-amber-900/40  text-amber-700  dark:text-amber-300',
  certification:    'bg-rose-100   dark:bg-rose-900/40   text-rose-700   dark:text-rose-300',
};

function Section({ title, icon, children, delay = 0 }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.3 }}
      className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-soft"
    >
      <h2 className="flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-slate-300 mb-5">
        <span>{icon}</span> {title}
      </h2>
      {children}
    </motion.div>
  );
}

function StatPill({ label, value, color = 'text-slate-900 dark:text-white' }) {
  return (
    <div className="text-center">
      <p className={`text-2xl font-bold tabular-nums ${color}`}>{value}</p>
      <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{label}</p>
    </div>
  );
}

function Skeleton({ className = '' }) {
  return <div className={`rounded-xl bg-slate-100 dark:bg-slate-800 animate-pulse ${className}`} />;
}

function ActivityDetailPanel({ activity, currentUser, onClose }) {
  const TYPE_LABELS = {
    learning: 'Learning', practice_project: 'Practice Project',
    agent_built: 'Agent Built', code_review: 'Code Review', certification: 'Certification',
  };

  return (
    <AnimatePresence>
      {activity && (
        <>
          {/* Backdrop */}
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm"
            onClick={onClose}
          />

          {/* Slide-over panel */}
          <motion.div
            key="panel"
            initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            className="fixed right-0 top-0 z-50 flex h-full w-full flex-col bg-white shadow-2xl dark:bg-slate-900
                       sm:w-[480px] border-l border-slate-200 dark:border-slate-800"
          >
            {/* Header */}
            <div className="flex items-start justify-between gap-3 border-b border-slate-100 dark:border-slate-800 px-5 py-4">
              <div className="min-w-0">
                <span className={`inline-block mb-1.5 px-2 py-0.5 rounded-full text-[10px] font-semibold ${TYPE_COLORS[activity.activity_type] ?? ''}`}>
                  {TYPE_LABELS[activity.activity_type] ?? activity.activity_type}
                </span>
                <h3 className="text-sm font-semibold text-slate-900 dark:text-white leading-snug">
                  {activity.title}
                </h3>
              </div>
              <button
                onClick={onClose}
                className="shrink-0 rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200 transition-colors"
              >
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Body — scrollable */}
            <div className="flex-1 overflow-y-auto px-5 py-5 space-y-5">

              {/* Metadata grid */}
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 px-3 py-2.5">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400 mb-0.5">Status</p>
                  <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                    activity.status === 'completed'
                      ? 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300'
                      : 'bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300'
                  }`}>
                    {activity.status === 'completed' ? 'Completed' : 'In Progress'}
                  </span>
                </div>
                <div className="rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 px-3 py-2.5">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400 mb-0.5">
                    {activity.status === 'in_progress' ? 'ETA' : 'Date'}
                  </p>
                  <p className="text-slate-700 dark:text-slate-300 font-medium">
                    {activity.status === 'in_progress' && activity.eta
                      ? new Date(activity.eta).toLocaleDateString('en', { month: 'short', day: 'numeric', year: 'numeric' })
                      : new Date(activity.activity_date).toLocaleDateString('en', { month: 'short', day: 'numeric', year: 'numeric' })
                    }
                  </p>
                </div>
                {activity.tool_used && (
                  <div className="rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 px-3 py-2.5">
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400 mb-0.5">Tool</p>
                    <p className="text-slate-700 dark:text-slate-300 font-medium">
                      {activity.tool_used}{activity.model_used ? ` · ${activity.model_used}` : ''}
                    </p>
                  </div>
                )}
                {activity.domain && (
                  <div className="rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 px-3 py-2.5">
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400 mb-0.5">Domain</p>
                    <p className="text-slate-700 dark:text-slate-300 font-medium">{activity.domain}</p>
                  </div>
                )}
              </div>

              {activity.notes && (
                <div className="rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 px-3 py-2.5 text-xs">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400 mb-1">Notes</p>
                  <p className="text-slate-700 dark:text-slate-300 whitespace-pre-wrap">{activity.notes}</p>
                </div>
              )}

              {/* Comment thread */}
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400 mb-3">
                  💬 Feedback & Comments
                </p>
                <CommentThread activityId={activity.id} currentUser={currentUser} />
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

export default function UserDetail() {
  const { userId } = useParams();
  const { user: currentUser } = useAuth();
  const [data, setData]         = useState(null);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState(null);
  const [editingRole, setEditingRole] = useState(false);
  const [selectedRole, setSelectedRole] = useState('');
  const [roleSaving, setRoleSaving]   = useState(false);
  const [roleSaved, setRoleSaved]     = useState(false);
  const [selectedActivity, setSelectedActivity] = useState(null);

  async function saveRole() {
    setRoleSaving(true);
    try {
      await api.patch(`/admin/users/${userId}/role`, { role: selectedRole });
      setData(d => ({ ...d, user: { ...d.user, role: selectedRole } }));
      setEditingRole(false);
      setRoleSaved(true);
      setTimeout(() => setRoleSaved(false), 2500);
    } catch (err) {
      setError(err.message || 'Role update failed');
    } finally {
      setRoleSaving(false);
    }
  }

  useEffect(() => {
    api.get(`/admin/users/${userId}/profile`)
      .then(setData)
      .catch(err => setError(err.message || 'Failed to load user'))
      .finally(() => setLoading(false));
  }, [userId]);

  if (loading) {
    return (
      <PageWrapper>
        <div className="space-y-5 max-w-3xl mx-auto">
          <Skeleton className="h-10 w-48" />
          <Skeleton className="h-44" />
          <Skeleton className="h-36" />
          <Skeleton className="h-56" />
        </div>
      </PageWrapper>
    );
  }

  if (error || !data) {
    return (
      <PageWrapper>
        <div className="py-20 text-center">
          <p className="text-4xl mb-3">😕</p>
          <p className="text-sm text-slate-500 dark:text-slate-400">{error || 'User not found'}</p>
          <Link to="/admin" className="mt-4 inline-block text-sm text-brand-600 hover:underline">← Back to Dashboard</Link>
        </div>
      </PageWrapper>
    );
  }

  const { user, skills, pocs, certifications, activities, activityStats } = data;

  // Group skills by category
  const skillsByCategory = skills.reduce((acc, s) => {
    (acc[s.category] = acc[s.category] || []).push(s);
    return acc;
  }, {});

  const initials = `${user.first_name?.[0] ?? ''}${user.last_name?.[0] ?? ''}`.toUpperCase();

  const timeline = useMemo(() => {
    const acts     = (activities     || []).map(a => ({ ...a, _type: 'activity' }));
    const pocItems = (pocs           || []).map(p => ({ ...p, _type: 'poc',  _sortDate: p.start_date  || p.created_at }));
    const certItems = (certifications || []).map(c => ({ ...c, _type: 'cert', _sortDate: c.issue_date || c.created_at }));
    return [...acts, ...pocItems, ...certItems].sort((a, b) => {
      const da = new Date(a._type === 'activity' ? a.activity_date : a._sortDate);
      const db = new Date(b._type === 'activity' ? b.activity_date : b._sortDate);
      return db - da;
    });
  }, [activities, pocs, certifications]);

  return (
    <PageWrapper>
      <div className="max-w-3xl mx-auto space-y-5">

        {/* Back */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <Link to="/admin"
            className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700
                       dark:hover:text-slate-200 transition-colors">
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
            </svg>
            Back to Dashboard
          </Link>
        </motion.div>

        {/* Profile Hero */}
        <motion.div
          initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}
          className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-soft"
        >
          <div className="flex flex-col sm:flex-row items-start gap-5">
            {/* Avatar */}
            {user.avatar_url ? (
              <img src={user.avatar_url} alt="" className="h-20 w-20 rounded-2xl object-cover shrink-0 ring-2 ring-brand-500/20" />
            ) : (
              <span className="grid h-20 w-20 place-items-center rounded-2xl bg-brand-600 text-2xl font-bold text-white shrink-0">
                {initials}
              </span>
            )}

            {/* Info */}
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-xl font-bold text-slate-900 dark:text-white">
                  {user.first_name} {user.last_name}
                </h1>

                {/* Role badge — editable for admins viewing non-admin users */}
                {editingRole ? (
                  <div className="flex items-center gap-2">
                    <select
                      value={selectedRole}
                      onChange={e => setSelectedRole(e.target.value)}
                      autoFocus
                      className="rounded-lg border border-brand-400 bg-white dark:bg-slate-800 px-2.5 py-1
                                 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-500/40"
                    >
                      <option value="developer">developer</option>
                      <option value="lead">lead</option>
                      <option value="manager">manager</option>
                    </select>
                    <button
                      onClick={saveRole}
                      disabled={roleSaving}
                      className="rounded-lg bg-brand-600 hover:bg-brand-700 disabled:opacity-60 px-3 py-1 text-xs font-semibold text-white transition-colors"
                    >
                      {roleSaving ? 'Saving…' : 'Save'}
                    </button>
                    <button
                      onClick={() => setEditingRole(false)}
                      className="rounded-lg border border-slate-200 dark:border-slate-700 px-3 py-1 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-1.5">
                    <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold capitalize ${ROLE_COLORS[user.role] ?? ''}`}>
                      {user.role}
                    </span>
                    {currentUser?.role === 'admin' && user.role !== 'admin' && (
                      <button
                        onClick={() => { setSelectedRole(user.role); setEditingRole(true); }}
                        title="Change role"
                        className="rounded-full p-1 text-slate-400 hover:text-brand-600 hover:bg-brand-50 dark:hover:bg-brand-500/10 transition-colors"
                      >
                        <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2.5">
                          <path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Z" />
                        </svg>
                      </button>
                    )}
                    {roleSaved && <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">✓ Updated</span>}
                  </div>
                )}

                {user.profile_completed
                  ? <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">✅ Profile Complete</span>
                  : <span className="text-xs font-semibold text-amber-600 dark:text-amber-400">⏳ Profile Pending</span>
                }
              </div>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">{user.email}</p>
              {user.designation && (
                <p className="text-sm font-medium text-slate-700 dark:text-slate-300 mt-1">{user.designation}</p>
              )}

              {/* Meta grid */}
              <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1.5 text-xs text-slate-500 dark:text-slate-400">
                {user.department  && <span>🏢 {user.department}</span>}
                {user.team_name   && <span>👥 {user.team_name}</span>}
                {user.location    && <span>📍 {user.location}</span>}
                {user.date_of_joining && <span>📅 Joined {new Date(user.date_of_joining).toLocaleDateString('en', { year: 'numeric', month: 'short' })}</span>}
                {(user.manager_first || user.manager_last) && (
                  <span>👔 Reports to {user.manager_first} {user.manager_last}</span>
                )}
                {user.linkedin_url && (
                  <a href={user.linkedin_url} target="_blank" rel="noopener noreferrer"
                    className="text-brand-600 dark:text-brand-400 hover:underline">
                    🔗 LinkedIn
                  </a>
                )}
              </div>
            </div>
          </div>

          {/* Stats row */}
          <div className="mt-5 grid grid-cols-2 sm:grid-cols-4 gap-4 border-t border-slate-100 dark:border-slate-800 pt-5">
            <StatPill label="Total Activities"  value={activityStats.total}      color="text-brand-600 dark:text-brand-400" />
            <StatPill label="Completed"         value={activityStats.completed}  color="text-emerald-600 dark:text-emerald-400" />
            <StatPill label="This Month"        value={activityStats.this_month} color="text-violet-600 dark:text-violet-400" />
            <StatPill label="Skills"            value={skills.length}            color="text-amber-600 dark:text-amber-400" />
          </div>

          {/* Bio */}
          {user.bio && (
            <p className="mt-4 text-sm text-slate-600 dark:text-slate-400 border-t border-slate-100 dark:border-slate-800 pt-4">
              {user.bio}
            </p>
          )}
        </motion.div>

        {/* Tech stack + AI tools */}
        {((user.tech_stack?.length > 0) || (user.ai_tools?.length > 0)) && (
          <Section title="Tech Stack & AI Tools" icon="🧰" delay={0.08}>
            {user.tech_stack?.length > 0 && (
              <div className="mb-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400 mb-2">Tech Stack</p>
                <div className="flex flex-wrap gap-2">
                  {user.tech_stack.map(t => (
                    <span key={t} className="px-2.5 py-1 rounded-full border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-700 dark:text-slate-300">
                      {t}
                    </span>
                  ))}
                </div>
              </div>
            )}
            {user.ai_tools?.length > 0 && (
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400 mb-2">AI Tools</p>
                <div className="flex flex-wrap gap-2">
                  {user.ai_tools.map(t => (
                    <span key={t} className="px-2.5 py-1 rounded-full bg-brand-50 dark:bg-brand-500/10 border border-brand-200 dark:border-brand-500/30 text-xs font-medium text-brand-700 dark:text-brand-300">
                      {t}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </Section>
        )}

        {/* Skills */}
        {skills.length > 0 && (
          <Section title={`Skills (${skills.length})`} icon="⚡" delay={0.12}>
            <div className="space-y-4">
              {Object.entries(skillsByCategory).map(([cat, catSkills]) => (
                <div key={cat}>
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-400 mb-2">{cat}</p>
                  <div className="flex flex-wrap gap-2">
                    {catSkills.map(s => (
                      <span key={s.id} className="flex items-center gap-1.5 rounded-full border border-slate-200 dark:border-slate-700 pl-3 pr-1.5 py-1 text-xs text-slate-700 dark:text-slate-300">
                        {s.name}
                        <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${PROF_COLORS[s.proficiency] ?? ''}`}>
                          {s.proficiency}
                        </span>
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </Section>
        )}

        {/* Unified Timeline */}
        {timeline.length > 0 && (
          <Section title={`Recent Timeline (${timeline.length} items)`} icon="📋" delay={0.16}>
            <div className="space-y-1">
              {timeline.slice(0, 20).map((item, i) => {
                if (item._type === 'activity') {
                  return (
                    <motion.div key={`act-${item.id}`}
                      initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.16 + i * 0.03 }}
                      onClick={() => setSelectedActivity(item)}
                      className="py-3 px-2 -mx-2 rounded-xl border-b border-slate-50 dark:border-slate-800 last:border-0
                                 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium text-slate-900 dark:text-white truncate">{item.title}</p>
                          <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-0.5 text-xs text-slate-400">
                            {item.tool_used && <span>🔧 {item.tool_used}</span>}
                            {item.domain    && <span>🏷️ {item.domain}</span>}
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-1 shrink-0">
                          <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${TYPE_COLORS[item.activity_type] ?? ''}`}>
                            {item.activity_type.replace(/_/g, ' ')}
                          </span>
                          <span className="text-[11px] text-slate-400">
                            {new Date(item.activity_date).toLocaleDateString('en', { month: 'short', day: 'numeric', year: 'numeric' })}
                          </span>
                          {item.comment_count > 0 && (
                            <span className="text-[10px] font-semibold text-brand-600 dark:text-brand-400">
                              💬 {item.comment_count}
                            </span>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  );
                }

                if (item._type === 'poc') {
                  return (
                    <motion.div key={`poc-${item.id}`}
                      initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.16 + i * 0.03 }}
                      className="py-3 px-3 rounded-xl border-b border-slate-50 dark:border-slate-800 last:border-0
                                 border-l-4 border-l-purple-400"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium text-slate-900 dark:text-white truncate">{item.poc_name}</p>
                          <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-0.5 text-xs text-slate-400">
                            {item.category && <span>📂 {item.category}</span>}
                            {item.tools_stack?.length > 0 && <span>🔧 {item.tools_stack.join(', ')}</span>}
                          </div>
                          <div className="mt-1.5 h-1 w-24 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                            <div
                              className={`h-full rounded-full ${item.progress >= 80 ? 'bg-emerald-500' : item.progress >= 40 ? 'bg-brand-500' : 'bg-amber-500'}`}
                              style={{ width: `${item.progress ?? 0}%` }}
                            />
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-1 shrink-0">
                          <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300">
                            POC
                          </span>
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                            item.status === 'Completed'   ? 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300' :
                            item.status === 'In Progress' ? 'bg-blue-100    dark:bg-blue-900/40    text-blue-700    dark:text-blue-300' :
                            'bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300'
                          }`}>
                            {item.status}
                          </span>
                          {item.start_date && (
                            <span className="text-[11px] text-slate-400">
                              {new Date(item.start_date).toLocaleDateString('en', { month: 'short', day: 'numeric', year: 'numeric' })}
                            </span>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  );
                }

                if (item._type === 'cert') {
                  return (
                    <motion.div key={`cert-${item.id}`}
                      initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.16 + i * 0.03 }}
                      className="py-3 px-3 rounded-xl border-b border-slate-50 dark:border-slate-800 last:border-0
                                 border-l-4 border-l-emerald-400"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium text-slate-900 dark:text-white truncate">{item.cert_name}</p>
                          <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-0.5 text-xs text-slate-400">
                            {item.issuing_org && <span>🏢 {item.issuing_org}</span>}
                            {item.credential_url && (
                              <a href={item.credential_url} target="_blank" rel="noopener noreferrer"
                                onClick={e => e.stopPropagation()}
                                className="text-brand-600 dark:text-brand-400 hover:underline">🔗 Verify</a>
                            )}
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-1 shrink-0">
                          <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300">
                            Cert
                          </span>
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                            item.status === 'Approved' ? 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300' :
                            item.status === 'Rejected' ? 'bg-rose-100    dark:bg-rose-900/40    text-rose-700    dark:text-rose-300' :
                            'bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300'
                          }`}>
                            {item.status}
                          </span>
                          {item.issue_date && (
                            <span className="text-[11px] text-slate-400">
                              {new Date(item.issue_date).toLocaleDateString('en', { month: 'short', day: 'numeric', year: 'numeric' })}
                            </span>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  );
                }

                return null;
              })}
            </div>
          </Section>
        )}

      </div>

      {/* Activity detail slide-over */}
      <ActivityDetailPanel
        activity={selectedActivity}
        currentUser={currentUser}
        onClose={() => setSelectedActivity(null)}
      />

    </PageWrapper>
  );
}
