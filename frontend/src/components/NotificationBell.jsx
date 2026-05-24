import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { api } from '../lib/api.js';

// ---------------------------------------------------------------------------
// Relative time formatter
// ---------------------------------------------------------------------------

function timeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1)  return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 7)  return `${d}d ago`;
  return new Date(dateStr).toLocaleDateString();
}

// ---------------------------------------------------------------------------
// Type → icon
// ---------------------------------------------------------------------------

const TYPE_ICON = {
  cert_submitted: (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path strokeLinecap="round" strokeLinejoin="round"
        d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
    </svg>
  ),
  cert_reviewed: (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
    </svg>
  ),
  poc_updated: (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path strokeLinecap="round" strokeLinejoin="round"
        d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75Z" />
    </svg>
  ),
  profile_updated: (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path strokeLinecap="round" strokeLinejoin="round"
        d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0" />
    </svg>
  ),
  activity_commented: (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path strokeLinecap="round" strokeLinejoin="round"
        d="M8.625 12a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H8.25m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H12m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 0 1-2.555-.337A5.972 5.972 0 0 1 5.41 20.97a5.969 5.969 0 0 1-.474-.065 4.48 4.48 0 0 0 .978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25Z" />
    </svg>
  ),
};

const TYPE_COLOR = {
  cert_submitted:    'bg-sky-100 text-sky-600 dark:bg-sky-900/40 dark:text-sky-400',
  cert_reviewed:     'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/40 dark:text-emerald-400',
  poc_updated:       'bg-violet-100 text-violet-600 dark:bg-violet-900/40 dark:text-violet-400',
  profile_updated:   'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400',
  activity_commented:'bg-brand-100 text-brand-600 dark:bg-brand-900/40 dark:text-brand-400',
};

// ---------------------------------------------------------------------------
// Inline reviewer action — approve / reject with comment
// ---------------------------------------------------------------------------

function ReviewAction({ notif, onDone }) {
  const [open,    setOpen]    = useState(false);
  const [action,  setAction]  = useState(null); // 'Approved' | 'Rejected'
  const [comment, setComment] = useState('');
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState('');

  if (notif.action_taken) {
    return <span className="text-[10px] text-slate-400 dark:text-slate-500">Action taken</span>;
  }

  async function submit() {
    if (!action) return;
    if (action === 'Rejected' && !comment.trim()) {
      setError('Please provide a reason for rejection.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      await api.post(`/notifications/review/${notif.entity_id}`, {
        status: action,
        comment: comment.trim() || null,
        notification_id: notif.id,
      });
      onDone(notif.id);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  if (!open) {
    return (
      <div className="flex gap-1.5">
        <button
          onClick={() => { setAction('Approved'); setOpen(true); }}
          className="rounded-md bg-emerald-100 px-2 py-0.5 text-[11px] font-medium text-emerald-700
                     hover:bg-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400 dark:hover:bg-emerald-900/50 transition-colors"
        >
          Approve
        </button>
        <button
          onClick={() => { setAction('Rejected'); setOpen(true); }}
          className="rounded-md bg-rose-100 px-2 py-0.5 text-[11px] font-medium text-rose-700
                     hover:bg-rose-200 dark:bg-rose-900/30 dark:text-rose-400 dark:hover:bg-rose-900/50 transition-colors"
        >
          Reject
        </button>
      </div>
    );
  }

  return (
    <div className="mt-2 space-y-1.5">
      <div className="flex gap-1.5">
        {['Approved', 'Rejected'].map(opt => (
          <button key={opt} type="button"
            onClick={() => setAction(opt)}
            className={`rounded-md px-2 py-0.5 text-[11px] font-medium transition-colors ${
              action === opt
                ? opt === 'Approved'
                  ? 'bg-emerald-600 text-white'
                  : 'bg-rose-600 text-white'
                : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'
            }`}
          >
            {opt}
          </button>
        ))}
      </div>
      <textarea
        className="field w-full text-xs py-1.5 min-h-[52px] resize-none"
        placeholder={action === 'Rejected' ? 'Reason for rejection (required)…' : 'Optional comment…'}
        value={comment}
        onChange={e => setComment(e.target.value)}
      />
      {error && <p className="text-[10px] text-rose-500">{error}</p>}
      <div className="flex gap-1.5">
        <button onClick={submit} disabled={loading}
          className={`rounded-md px-2.5 py-1 text-[11px] font-semibold text-white transition-colors ${
            action === 'Approved' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-rose-600 hover:bg-rose-700'
          }`}
        >
          {loading ? 'Saving…' : `Confirm ${action}`}
        </button>
        <button onClick={() => { setOpen(false); setError(''); setComment(''); }}
          className="rounded-md px-2.5 py-1 text-[11px] text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800">
          Cancel
        </button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Single notification row
// ---------------------------------------------------------------------------

function NotifItem({ notif, isReviewer, currentUser, onRead, onReviewDone, onNavigate }) {
  function handleClick() {
    if (!notif.read) onRead(notif.id);
    if (notif.type === 'activity_commented') {
      const isManager = ['lead', 'manager', 'admin'].includes(currentUser?.role);
      onNavigate(isManager ? `/admin/users/${notif.actor_id}` : '/activities');
    }
  }

  return (
    <div
      className={`px-4 py-3 transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/60 ${
        notif.type === 'activity_commented' ? 'cursor-pointer' : ''
      } ${!notif.read ? 'bg-brand-50/60 dark:bg-brand-500/5' : ''}`}
      onClick={handleClick}
    >
      <div className="flex gap-3">
        {/* Type icon */}
        <div className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${TYPE_COLOR[notif.type] || TYPE_COLOR.profile_updated}`}>
          {TYPE_ICON[notif.type] || TYPE_ICON.profile_updated}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <p className={`text-sm leading-snug ${!notif.read ? 'font-semibold text-slate-900 dark:text-white' : 'text-slate-700 dark:text-slate-300'}`}>
              {notif.title}
            </p>
            <div className="flex shrink-0 items-center gap-1.5">
              {!notif.read && (
                <span className="h-2 w-2 rounded-full bg-brand-500" />
              )}
              <span className="whitespace-nowrap text-[10px] text-slate-400 dark:text-slate-500">
                {timeAgo(notif.created_at)}
              </span>
            </div>
          </div>

          {notif.body && (
            <p className="mt-0.5 text-xs leading-relaxed text-slate-500 dark:text-slate-400 line-clamp-3">
              {notif.body}
            </p>
          )}

          {/* Reviewer inline action for cert_submitted notifications */}
          {isReviewer && notif.type === 'cert_submitted' && notif.entity_id && (
            <div className="mt-2" onClick={e => e.stopPropagation()}>
              <ReviewAction notif={notif} onDone={onReviewDone} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main bell component
// ---------------------------------------------------------------------------

const POLL_INTERVAL = 10_000; // 10 s

export default function NotificationBell() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [notifs,  setNotifs]  = useState([]);
  const [unread,  setUnread]  = useState(0);
  const [open,    setOpen]    = useState(false);
  const [loading, setLoading] = useState(false);
  const panelRef = useRef(null);

  const isReviewer = ['lead', 'manager', 'admin'].includes(user?.role);

  const fetchNotifs = useCallback(async () => {
    try {
      const data = await api.get('/notifications');
      setNotifs(data.notifications || []);
      setUnread(data.unread_count  || 0);
    } catch { /* silent */ }
  }, []);

  // Initial load + polling
  useEffect(() => {
    fetchNotifs();
    const t = setInterval(fetchNotifs, POLL_INTERVAL);
    return () => clearInterval(t);
  }, [fetchNotifs]);

  // Close on outside click
  useEffect(() => {
    function handler(e) {
      if (panelRef.current && !panelRef.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  async function openPanel() {
    setOpen(o => !o);
    if (!open && unread > 0) {
      // Optimistically mark as read visually; server catches up in background
      setUnread(0);
      setNotifs(prev => prev.map(n => ({ ...n, read: 1 })));
      try { await api.patch('/notifications/read-all', {}); } catch { /* silent */ }
    }
  }

  async function markRead(id) {
    setNotifs(prev => prev.map(n => n.id === id ? { ...n, read: 1 } : n));
    try { await api.patch(`/notifications/${id}/read`, {}); } catch { /* silent */ }
  }

  function handleReviewDone(notifId) {
    setNotifs(prev => prev.map(n => n.id === notifId ? { ...n, action_taken: 1, read: 1 } : n));
    // Refresh to pick up any new notification sent to cert owner
    setTimeout(fetchNotifs, 800);
  }

  return (
    <div ref={panelRef} className="relative">
      {/* Bell button */}
      <motion.button
        whileTap={{ scale: 0.88 }}
        onClick={openPanel}
        className="relative flex h-9 w-9 items-center justify-center rounded-lg
                   text-slate-600 hover:bg-slate-100
                   dark:text-slate-300 dark:hover:bg-slate-800 transition-colors"
        aria-label="Notifications"
      >
        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
          <path strokeLinecap="round" strokeLinejoin="round"
            d="M14.857 17.082a23.848 23.848 0 0 0 5.454-1.31A8.967 8.967 0 0 1 18 9.75V9A6 6 0 0 0 6 9v.75a8.967 8.967 0 0 1-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 0 1-5.714 0m5.714 0a3 3 0 1 1-5.714 0" />
        </svg>
        {unread > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center
                           rounded-full bg-rose-500 text-[9px] font-bold text-white">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </motion.button>

      {/* Dropdown panel */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.97 }}
            transition={{ duration: 0.18, ease: [0.4, 0, 0.2, 1] }}
            className="absolute right-0 top-full z-50 mt-2 w-[360px] max-w-[calc(100vw-1rem)]
                       overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl
                       dark:border-slate-700 dark:bg-slate-900"
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3 dark:border-slate-800">
              <span className="text-sm font-semibold text-slate-800 dark:text-slate-200">Notifications</span>
              {notifs.length > 0 && (
                <button
                  onClick={async () => {
                    setNotifs(prev => prev.map(n => ({ ...n, read: 1 })));
                    setUnread(0);
                    try { await api.patch('/notifications/read-all', {}); } catch { /* silent */ }
                  }}
                  className="text-xs text-brand-600 hover:underline dark:text-brand-400"
                >
                  Mark all read
                </button>
              )}
            </div>

            {/* List */}
            <div className="max-h-[480px] overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800">
              {notifs.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-10 text-center">
                  <svg viewBox="0 0 24 24" className="mb-2 h-8 w-8 text-slate-300 dark:text-slate-600"
                       fill="none" stroke="currentColor" strokeWidth="1.5">
                    <path strokeLinecap="round" strokeLinejoin="round"
                      d="M14.857 17.082a23.848 23.848 0 0 0 5.454-1.31A8.967 8.967 0 0 1 18 9.75V9A6 6 0 0 0 6 9v.75a8.967 8.967 0 0 1-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 0 1-5.714 0m5.714 0a3 3 0 1 1-5.714 0" />
                  </svg>
                  <p className="text-sm text-slate-400 dark:text-slate-500">No notifications yet</p>
                </div>
              ) : (
                notifs.map(n => (
                  <NotifItem
                    key={n.id}
                    notif={n}
                    isReviewer={isReviewer}
                    currentUser={user}
                    onRead={markRead}
                    onReviewDone={handleReviewDone}
                    onNavigate={(path) => { setOpen(false); navigate(path); }}
                  />
                ))
              )}
            </div>

            {/* Footer */}
            {notifs.length > 0 && (
              <div className="border-t border-slate-100 px-4 py-2.5 dark:border-slate-800">
                <p className="text-center text-xs text-slate-400 dark:text-slate-500">
                  Showing last {notifs.length} notification{notifs.length !== 1 ? 's' : ''}
                </p>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
