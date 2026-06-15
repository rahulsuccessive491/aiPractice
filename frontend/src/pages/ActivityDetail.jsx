import { useState, useEffect, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { api } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import PageWrapper from '../components/PageWrapper';

const BACKEND_URL = import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:4000';
const ALLOWED_EXT = '.jpg,.jpeg,.png,.gif,.pdf,.doc,.docx,.xls,.xlsx';

const TYPE_META = {
  learning:         { label: 'Learning',         icon: '📚', color: 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300' },
  practice_project: { label: 'Practice Project', icon: '🛠️', color: 'bg-violet-100 dark:bg-violet-900/40 text-violet-700 dark:text-violet-300' },
  agent_built:      { label: 'Agent Built',      icon: '🤖', color: 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300' },
  code_review:      { label: 'Code Review',      icon: '🔍', color: 'bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300' },
  certification:    { label: 'Certification',    icon: '🏆', color: 'bg-rose-100 dark:bg-rose-900/40 text-rose-700 dark:text-rose-300' },
};

function CommentThread({ activityId, currentUser }) {
  const [comments, setComments]       = useState(null);
  const [open, setOpen]               = useState(true);
  const [text, setText]               = useState('');
  const [files, setFiles]             = useState([]);
  const [posting, setPosting]         = useState(false);
  const [postSuccess, setPostSuccess] = useState(false);
  const [postError, setPostError]     = useState(null);
  const [deleting, setDeleting]       = useState(null);
  const fileRef                       = useRef(null);
  const successTimer                  = useRef(null);

  useEffect(() => {
    api.get(`/activities/${activityId}/comments`)
      .then(r => setComments(r.comments || []))
      .catch(() => setComments([]));
  }, [activityId]);

  useEffect(() => () => clearTimeout(successTimer.current), []);

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
      if (!res.ok) throw new Error(data.error || 'Failed to post');
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
    <div>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300">
          💬 Feedback & Comments {comments !== null && <span className="text-slate-400 font-normal">({count})</span>}
        </h3>
      </div>

      {comments === null ? (
        <div className="space-y-3">
          {[...Array(2)].map((_, i) => (
            <div key={i} className="h-14 rounded-xl bg-slate-100 dark:bg-slate-800 animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="space-y-4">
          {count === 0 && (
            <p className="text-sm text-slate-400 dark:text-slate-500 italic">No feedback yet. Be the first to comment!</p>
          )}

          {comments.map(c => (
            <div key={c.id} className="group flex items-start gap-3">
              {c.commenter?.avatar_url ? (
                <img src={c.commenter.avatar_url} className="h-7 w-7 rounded-full object-cover shrink-0 mt-0.5" alt="" />
              ) : (
                <span className="grid h-7 w-7 place-items-center rounded-full bg-brand-600 text-[10px] font-bold text-white shrink-0 mt-0.5">
                  {initials(c.commenter?.first_name, c.commenter?.last_name)}
                </span>
              )}
              <div className="flex-1 min-w-0 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 px-3 py-2.5">
                <div className="flex items-center justify-between gap-2 mb-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                      {c.commenter?.first_name} {c.commenter?.last_name}
                    </span>
                    <span className="text-[10px] text-slate-400 capitalize">{c.commenter?.role}</span>
                    <span className="text-[10px] text-slate-300 dark:text-slate-600">·</span>
                    <span className="text-[10px] text-slate-400">
                      {new Date(c.created_at).toLocaleDateString('en', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  {(c.commenter?.id === currentUser?.id || currentUser?.role === 'admin') && (
                    <button
                      onClick={() => deleteComment(c.id)}
                      disabled={deleting === c.id}
                      className="opacity-0 group-hover:opacity-100 p-1 rounded text-slate-300 hover:text-rose-500 transition shrink-0"
                      title="Delete"
                    >
                      🗑
                    </button>
                  )}
                </div>
                <p className="text-xs text-slate-700 dark:text-slate-300 whitespace-pre-wrap">{c.comment}</p>
                {c.attachments?.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {c.attachments.map(a => (
                      <a key={a.id} href={`${BACKEND_URL}${a.url}`} target="_blank" rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 rounded-lg border border-slate-200 dark:border-slate-700
                                   bg-white dark:bg-slate-900 px-2 py-0.5 text-[10px] font-medium
                                   text-brand-600 dark:text-brand-400 hover:bg-slate-50 transition-colors">
                        📎 {a.original_name}
                      </a>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}

          {/* New comment */}
          <div className="flex gap-3 pt-2">
            {currentUser?.avatar_url ? (
              <img src={currentUser.avatar_url} className="h-7 w-7 rounded-full object-cover shrink-0 mt-1" alt="" />
            ) : (
              <span className="grid h-7 w-7 place-items-center rounded-full bg-brand-600 text-[10px] font-bold text-white shrink-0 mt-1">
                {`${(currentUser?.first_name || '?')[0]}${(currentUser?.last_name || '?')[0]}`.toUpperCase()}
              </span>
            )}
            <div className="flex-1">
              <AnimatePresence>
                {postSuccess && (
                  <motion.div
                    initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                    className="mb-2 flex items-center gap-2 rounded-lg border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-900/30 px-3 py-1.5 text-xs font-medium text-emerald-700 dark:text-emerald-300"
                  >
                    ✅ Feedback posted!
                  </motion.div>
                )}
              </AnimatePresence>
              <AnimatePresence>
                {postError && (
                  <motion.div
                    initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                    className="mb-2 flex items-center justify-between gap-2 rounded-lg border border-rose-200 dark:border-rose-800 bg-rose-50 dark:bg-rose-900/30 px-3 py-1.5 text-xs font-medium text-rose-700 dark:text-rose-300"
                  >
                    <span>⚠️ {postError}</span>
                    <button onClick={() => setPostError(null)} className="font-bold">×</button>
                  </motion.div>
                )}
              </AnimatePresence>
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
                    <span key={i} className="inline-flex items-center gap-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-2 py-0.5 text-[10px] text-slate-600 dark:text-slate-400">
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
                  className="rounded-lg bg-brand-600 hover:bg-brand-700 disabled:opacity-40 px-3 py-1 text-xs font-semibold text-white transition-colors"
                >
                  {posting ? 'Posting…' : 'Post →'}
                </button>
              </div>
              <input ref={fileRef} type="file" multiple accept={ALLOWED_EXT} className="hidden"
                onChange={e => setFiles(f => [...f, ...Array.from(e.target.files || [])])} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Skeleton({ className = '' }) {
  return <div className={`rounded-xl bg-slate-100 dark:bg-slate-800 animate-pulse ${className}`} />;
}

export default function ActivityDetail() {
  const { id } = useParams();
  const { user: currentUser } = useAuth();
  const navigate = useNavigate();
  const [activity, setActivity] = useState(null);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState(null);

  useEffect(() => {
    api.get(`/activities/${id}`)
      .then(r => setActivity(r.activity))
      .catch(err => setError(err.message || 'Activity not found'))
      .finally(() => setLoading(false));
  }, [id]);

  const meta = activity ? TYPE_META[activity.activity_type] : null;

  if (loading) {
    return (
      <PageWrapper>
        <div className="max-w-2xl mx-auto space-y-5">
          <Skeleton className="h-8 w-32" />
          <Skeleton className="h-40" />
          <Skeleton className="h-32" />
          <Skeleton className="h-56" />
        </div>
      </PageWrapper>
    );
  }

  if (error || !activity) {
    return (
      <PageWrapper>
        <div className="py-20 text-center">
          <p className="text-4xl mb-3">😕</p>
          <p className="text-sm text-slate-500 dark:text-slate-400">{error || 'Activity not found'}</p>
          <button onClick={() => navigate(-1)} className="mt-4 inline-block text-sm text-brand-600 hover:underline">
            ← Go back
          </button>
        </div>
      </PageWrapper>
    );
  }

  const dateLabel = activity.status === 'in_progress' && activity.eta
    ? `ETA: ${new Date(activity.eta).toLocaleDateString('en', { year: 'numeric', month: 'long', day: 'numeric' })}`
    : new Date(activity.activity_date).toLocaleDateString('en', { year: 'numeric', month: 'long', day: 'numeric' });

  return (
    <PageWrapper>
      <div className="max-w-2xl mx-auto space-y-5">

        {/* Back */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <button
            onClick={() => navigate(-1)}
            className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 dark:hover:text-slate-200 transition-colors"
          >
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
            </svg>
            Back
          </button>
        </motion.div>

        {/* Activity header card */}
        <motion.div
          initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.28 }}
          className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-soft"
        >
          <div className="flex items-start gap-4">
            <span className="text-4xl shrink-0 mt-0.5">{meta?.icon ?? '📌'}</span>
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap gap-2 mb-2">
                <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${meta?.color ?? ''}`}>
                  {meta?.label ?? activity.activity_type}
                </span>
                <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                  activity.status === 'completed'
                    ? 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300'
                    : 'bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300'
                }`}>
                  {activity.status === 'completed' ? 'Done' : 'In Progress'}
                </span>
              </div>
              <h1 className="text-xl font-bold text-slate-900 dark:text-white leading-snug">
                {activity.title}
              </h1>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">{dateLabel}</p>
            </div>
          </div>

          {/* Metadata grid */}
          {(activity.tool_used || activity.model_used || activity.domain) && (
            <div className="mt-5 grid grid-cols-2 sm:grid-cols-3 gap-3">
              {activity.tool_used && (
                <div className="rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 px-3 py-2.5">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400 mb-0.5">Tool</p>
                  <p className="text-sm font-medium text-slate-700 dark:text-slate-300">🔧 {activity.tool_used}</p>
                </div>
              )}
              {activity.model_used && (
                <div className="rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 px-3 py-2.5">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400 mb-0.5">Model</p>
                  <p className="text-sm font-medium text-slate-700 dark:text-slate-300">🧠 {activity.model_used}</p>
                </div>
              )}
              {activity.domain && (
                <div className="rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 px-3 py-2.5">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400 mb-0.5">Domain</p>
                  <p className="text-sm font-medium text-slate-700 dark:text-slate-300">🏷️ {activity.domain}</p>
                </div>
              )}
            </div>
          )}

          {/* Notes */}
          {activity.notes && (
            <div className="mt-4 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 px-4 py-3">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400 mb-1.5">Notes</p>
              <p className="text-sm text-slate-700 dark:text-slate-300 whitespace-pre-wrap leading-relaxed">
                {activity.notes}
              </p>
            </div>
          )}
        </motion.div>

        {/* Comments */}
        <motion.div
          initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1, duration: 0.28 }}
          className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-soft"
        >
          <CommentThread activityId={activity.id} currentUser={currentUser} />
        </motion.div>

      </div>
    </PageWrapper>
  );
}
