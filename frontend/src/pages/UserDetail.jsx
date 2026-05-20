import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { api } from '../lib/api';
import PageWrapper from '../components/PageWrapper';

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

export default function UserDetail() {
  const { userId } = useParams();
  const [data, setData]     = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]   = useState(null);

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
                <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold capitalize ${ROLE_COLORS[user.role] ?? ''}`}>
                  {user.role}
                </span>
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

        {/* POCs */}
        {pocs.length > 0 && (
          <Section title={`AI Projects & POCs (${pocs.length})`} icon="🚀" delay={0.16}>
            <div className="space-y-4">
              {pocs.map(poc => (
                <div key={poc.id}
                  className="rounded-xl border border-slate-100 dark:border-slate-800 p-4 space-y-2">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold text-slate-900 dark:text-white">{poc.poc_name}</p>
                      <p className="text-xs text-slate-400 mt-0.5">{poc.category}</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                        poc.status === 'Completed' ? 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300' :
                        poc.status === 'In Progress' ? 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300' :
                        poc.status === 'On Hold' ? 'bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300' :
                        'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                      }`}>
                        {poc.status}
                      </span>
                      <span className="text-xs text-slate-400">{poc.progress}%</span>
                    </div>
                  </div>

                  {/* Progress bar */}
                  <div className="h-1.5 w-full rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }} animate={{ width: `${poc.progress}%` }}
                      transition={{ duration: 0.7, ease: [0.4, 0, 0.2, 1] }}
                      className={`h-full rounded-full ${
                        poc.progress >= 80 ? 'bg-emerald-500' : poc.progress >= 40 ? 'bg-brand-500' : 'bg-amber-500'
                      }`}
                    />
                  </div>

                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500 dark:text-slate-400">
                    {poc.problem_statement && <p className="w-full text-slate-600 dark:text-slate-400">{poc.problem_statement}</p>}
                    {poc.tools_stack?.length > 0 && (
                      <p>🔧 {poc.tools_stack.join(', ')}</p>
                    )}
                    {poc.repo_link && (
                      <a href={poc.repo_link} target="_blank" rel="noopener noreferrer"
                        className="text-brand-600 dark:text-brand-400 hover:underline">🔗 Repo</a>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </Section>
        )}

        {/* Certifications */}
        {certifications.length > 0 && (
          <Section title={`Certifications (${certifications.length})`} icon="🏆" delay={0.2}>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100 dark:border-slate-800">
                    <th className="pb-2.5 text-left text-xs font-semibold uppercase tracking-wide text-slate-400">Certificate</th>
                    <th className="pb-2.5 text-left text-xs font-semibold uppercase tracking-wide text-slate-400 hidden sm:table-cell">Issuer</th>
                    <th className="pb-2.5 text-left text-xs font-semibold uppercase tracking-wide text-slate-400 hidden sm:table-cell">Issued</th>
                    <th className="pb-2.5 text-left text-xs font-semibold uppercase tracking-wide text-slate-400">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
                  {certifications.map(c => (
                    <tr key={c.id}>
                      <td className="py-3 pr-4">
                        <p className="font-medium text-slate-900 dark:text-white">{c.cert_name}</p>
                        {c.credential_url && (
                          <a href={c.credential_url} target="_blank" rel="noopener noreferrer"
                            className="text-xs text-brand-600 dark:text-brand-400 hover:underline">🔗 Verify</a>
                        )}
                      </td>
                      <td className="py-3 pr-4 text-xs text-slate-500 dark:text-slate-400 hidden sm:table-cell">{c.issuing_org}</td>
                      <td className="py-3 pr-4 text-xs text-slate-500 dark:text-slate-400 hidden sm:table-cell">
                        {c.issue_date ? new Date(c.issue_date).toLocaleDateString('en', { year: 'numeric', month: 'short' }) : '—'}
                      </td>
                      <td className="py-3">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                          c.status === 'Approved'  ? 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300' :
                          c.status === 'Rejected'  ? 'bg-rose-100   dark:bg-rose-900/40   text-rose-700   dark:text-rose-300' :
                          'bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300'
                        }`}>
                          {c.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Section>
        )}

        {/* Recent Activities */}
        {activities.length > 0 && (
          <Section title={`Recent Activities (${activityStats.total} total)`} icon="📊" delay={0.24}>
            <div className="space-y-3">
              {activities.map((a, i) => (
                <motion.div key={a.id}
                  initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.24 + i * 0.03 }}
                  className="flex items-start justify-between gap-3 py-2 border-b border-slate-50 dark:border-slate-800 last:border-0"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-slate-900 dark:text-white truncate">{a.title}</p>
                    <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-0.5 text-xs text-slate-400">
                      {a.tool_used && <span>🔧 {a.tool_used}</span>}
                      {a.domain    && <span>🏷️ {a.domain}</span>}
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1 shrink-0">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${TYPE_COLORS[a.activity_type] ?? ''}`}>
                      {a.activity_type.replace(/_/g, ' ')}
                    </span>
                    <span className="text-[11px] text-slate-400">
                      {new Date(a.activity_date).toLocaleDateString('en', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </span>
                  </div>
                </motion.div>
              ))}
            </div>
          </Section>
        )}

      </div>
    </PageWrapper>
  );
}
