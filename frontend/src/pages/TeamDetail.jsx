import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { api } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import PageWrapper from '../components/PageWrapper';

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

const ROLE_COLORS = {
  admin:     'bg-rose-100   dark:bg-rose-900/40   text-rose-700   dark:text-rose-300',
  manager:   'bg-violet-100 dark:bg-violet-900/40 text-violet-700 dark:text-violet-300',
  developer: 'bg-blue-100   dark:bg-blue-900/40   text-blue-700   dark:text-blue-300',
  lead:      'bg-amber-100  dark:bg-amber-900/40  text-amber-700  dark:text-amber-300',
};

function Skeleton({ className = '' }) {
  return <div className={`rounded-xl bg-slate-100 dark:bg-slate-800 animate-pulse ${className}`} />;
}

export default function TeamDetail() {
  const { teamId } = useParams();
  const navigate   = useNavigate();
  const { user }   = useAuth();

  const [team, setTeam]       = useState(null);
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(null);

  useEffect(() => {
    setLoading(true);
    api.get(`/admin/teams/${teamId}`)
      .then(res => { setTeam(res.team); setMembers(res.members); })
      .catch(err => setError(err.message || 'Failed to load team'))
      .finally(() => setLoading(false));
  }, [teamId]);

  if (!user || !['manager', 'admin'].includes(user.role)) {
    return (
      <PageWrapper>
        <div className="py-20 text-center">
          <p className="text-5xl mb-4">🔒</p>
          <h2 className="text-xl font-bold text-rose-600 dark:text-rose-400">Access Denied</h2>
        </div>
      </PageWrapper>
    );
  }

  return (
    <PageWrapper>
      <div className="space-y-6">

        {/* Back + header */}
        <motion.div
          initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.28 }}
        >
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-1.5 text-sm text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 mb-4 transition-colors"
          >
            ← Back
          </button>

          {loading ? (
            <Skeleton className="h-10 w-64" />
          ) : error ? (
            <p className="text-rose-600 dark:text-rose-400 text-sm">{error}</p>
          ) : (
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h1 className="text-2xl font-bold tracking-tight">{team.name}</h1>
                {team.description && (
                  <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{team.description}</p>
                )}
              </div>
            </div>
          )}
        </motion.div>

        {/* KPI row */}
        {!loading && team && (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { label: 'Members',    value: team.total_members,          color: 'text-brand-600 dark:text-brand-400',   icon: '👥' },
              { label: 'Active',     value: team.members_with_activities, color: 'text-emerald-600 dark:text-emerald-400', icon: '✅' },
              { label: 'Activities', value: team.activity_count,          color: 'text-violet-600 dark:text-violet-400', icon: '📊' },
              { label: 'Adoption',   value: `${team.adoptionRate}%`,      color: team.adoptionRate >= 70 ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400', icon: '📈' },
            ].map((kpi, i) => (
              <motion.div
                key={kpi.label}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.07, duration: 0.32 }}
                className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-soft"
              >
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">{kpi.label}</p>
                  <span className="text-xl">{kpi.icon}</span>
                </div>
                <p className={`text-3xl font-bold tabular-nums ${kpi.color}`}>{kpi.value}</p>
              </motion.div>
            ))}
          </div>
        )}

        {/* Members table */}
        <motion.div
          initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.18, duration: 0.32 }}
        >
          <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3">Team Members</h2>

          {loading ? (
            <div className="space-y-3">{[...Array(5)].map((_, i) => <Skeleton key={i} className="h-16" />)}</div>
          ) : members.length === 0 ? (
            <div className="py-16 text-center text-slate-400 dark:text-slate-500">
              <p className="text-4xl mb-3">👥</p>
              <p className="text-sm">No members in this team yet.</p>
            </div>
          ) : (
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-soft">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-100 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40">
                      <th className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Member</th>
                      <th className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Role</th>
                      <th className="px-5 py-3.5 text-right text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Activities</th>
                      <th className="px-5 py-3.5 text-right text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Skills</th>
                      <th className="px-5 py-3.5 text-right text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">POCs</th>
                      <th className="px-5 py-3.5 text-right text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Certs</th>
                      <th className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {members.map((m, i) => (
                      <motion.tr
                        key={m.id}
                        initial={{ opacity: 0, x: -6 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.03 }}
                        onClick={() => navigate(`/admin/users/${m.id}`)}
                        className="hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer transition-colors"
                      >
                        <td className="px-5 py-3.5">
                          <div className="flex items-center gap-2.5">
                            {m.avatar_url ? (
                              <img src={m.avatar_url} alt="" className="h-8 w-8 rounded-full object-cover shrink-0" />
                            ) : (
                              <div className="h-8 w-8 rounded-full bg-brand-600 text-white grid place-items-center text-xs font-bold shrink-0">
                                {m.first_name?.[0]}{m.last_name?.[0]}
                              </div>
                            )}
                            <div>
                              <p className="font-medium text-slate-900 dark:text-white">{m.first_name} {m.last_name}</p>
                              <p className="text-xs text-slate-400 dark:text-slate-500">{m.email}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-5 py-3.5">
                          <span className={`px-2.5 py-1 rounded-full text-xs font-semibold capitalize ${ROLE_COLORS[m.role] ?? 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'}`}>
                            {m.role}
                          </span>
                        </td>
                        <td className="px-5 py-3.5 text-right font-bold tabular-nums text-slate-900 dark:text-white">{m.activity_count}</td>
                        <td className="px-5 py-3.5 text-right tabular-nums text-slate-600 dark:text-slate-400">{m.skills_count}</td>
                        <td className="px-5 py-3.5 text-right tabular-nums text-slate-600 dark:text-slate-400">{m.pocs_count}</td>
                        <td className="px-5 py-3.5 text-right tabular-nums text-slate-600 dark:text-slate-400">{m.approved_certs}</td>
                        <td className="px-5 py-3.5">
                          {m.status === 'suspended' ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-rose-100 dark:bg-rose-900/40 text-rose-700 dark:text-rose-300">
                              ⏸ Suspended
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300">
                              ✓ Active
                            </span>
                          )}
                        </td>
                      </motion.tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </motion.div>

      </div>
    </PageWrapper>
  );
}
