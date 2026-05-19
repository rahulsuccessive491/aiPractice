import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import { api } from '../lib/api.js';
import FormField from '../components/FormField.jsx';

const TECH_OPTIONS  = ['React', 'Node', 'Java', 'PHP', '.NET', 'Python', 'Go', 'TypeScript', 'Vue', 'Angular'];
const TOOL_OPTIONS  = ['Claude', 'GitHub Copilot', 'ChatGPT', 'Gemini', 'Cursor', 'Codeium'];
const ROLE_OPTIONS  = ['developer', 'lead', 'manager', 'admin'];

function Pills({ label, options, value, onChange }) {
  const set = new Set(value);
  function toggle(opt) {
    const next = new Set(set);
    next.has(opt) ? next.delete(opt) : next.add(opt);
    onChange([...next]);
  }
  return (
    <div>
      <span className="label">{label}</span>
      <div className="flex flex-wrap gap-2">
        {options.map(opt => {
          const active = set.has(opt);
          return (
            <button
              type="button"
              key={opt}
              onClick={() => toggle(opt)}
              className={`rounded-full border px-3 py-1 text-xs font-medium transition ${
                active
                  ? 'border-brand-600 bg-brand-600 text-white'
                  : 'border-slate-300 bg-white text-slate-700 hover:border-brand-400 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200'
              }`}
            >
              {opt}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default function Profile() {
  const { user, updateProfile } = useAuth();
  const [teams, setTeams] = useState([]);
  const [form, setForm]   = useState(null);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState(null);

  useEffect(() => {
    api.get('/users/teams').then(d => setTeams(d.teams)).catch(() => {});
  }, []);

  useEffect(() => {
    if (!user) return;
    setForm({
      first_name: user.first_name,
      last_name:  user.last_name,
      mobile:     user.mobile,
      department: user.department,
      team_id:    user.team_id ?? '',
      tech_stack: user.tech_stack || [],
      ai_tools:   user.ai_tools || [],
      bio:        user.bio || '',
    });
  }, [user]);

  const teamOptions = useMemo(
    () => teams.map(t => ({ value: t.id, label: t.name })),
    [teams]
  );

  if (!user || !form) return null;

  function onChange(e) {
    const { name, value } = e.target;
    setForm(f => ({ ...f, [name]: value }));
  }

  async function onSubmit(e) {
    e.preventDefault();
    setSaving(true);
    setStatus(null);
    try {
      await updateProfile({
        ...form,
        team_id: form.team_id === '' ? null : Number(form.team_id),
      });
      setStatus({ kind: 'ok', msg: 'Profile saved' });
    } catch (err) {
      setStatus({ kind: 'err', msg: err.message });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Your profile</h1>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
          Keep this updated — your team and stack power the leadership dashboard.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <aside className="card lg:col-span-1">
          <div className="flex items-center gap-3">
            <div className="grid h-12 w-12 place-items-center rounded-full bg-brand-600 text-base font-semibold text-white">
              {user.first_name?.[0]}{user.last_name?.[0]}
            </div>
            <div className="min-w-0">
              <p className="truncate font-semibold">{user.first_name} {user.last_name}</p>
              <p className="truncate text-xs text-slate-500 dark:text-slate-400">{user.email}</p>
            </div>
          </div>
          <dl className="mt-5 space-y-2 text-sm">
            <div className="flex justify-between"><dt className="text-slate-500">Role</dt><dd className="font-medium capitalize">{user.role}</dd></div>
            <div className="flex justify-between"><dt className="text-slate-500">Department</dt><dd className="font-medium">{user.department}</dd></div>
            <div className="flex justify-between"><dt className="text-slate-500">Joined</dt><dd className="font-medium">{(user.created_at || '').split(' ')[0]}</dd></div>
          </dl>
        </aside>

        <form onSubmit={onSubmit} className="card space-y-5 lg:col-span-2">
          <div className="grid gap-5 sm:grid-cols-2">
            <FormField label="First name" name="first_name" value={form.first_name} onChange={onChange} required />
            <FormField label="Last name"  name="last_name"  value={form.last_name}  onChange={onChange} required />
          </div>
          <div className="grid gap-5 sm:grid-cols-2">
            <FormField label="Mobile" name="mobile" value={form.mobile} onChange={onChange} required type="tel" />
            <FormField label="Department" name="department" value={form.department} onChange={onChange} required />
          </div>
          <FormField
            label="Team"
            name="team_id"
            value={form.team_id}
            onChange={onChange}
            as="select"
            options={teamOptions}
          />

          <Pills label="Tech stack" options={TECH_OPTIONS}
                 value={form.tech_stack} onChange={v => setForm(f => ({ ...f, tech_stack: v }))} />
          <Pills label="AI tools you use" options={TOOL_OPTIONS}
                 value={form.ai_tools} onChange={v => setForm(f => ({ ...f, ai_tools: v }))} />

          <div>
            <label htmlFor="bio" className="label">Short bio</label>
            <textarea
              id="bio" name="bio" rows={3} value={form.bio} onChange={onChange}
              placeholder="What are you currently exploring with AI?"
              className="field resize-none"
            />
          </div>

          {status && (
            <div className={`rounded-lg px-3 py-2 text-sm ${
              status.kind === 'ok'
                ? 'border border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-300'
                : 'border border-rose-300 bg-rose-50 text-rose-700 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-300'
            }`}>
              {status.msg}
            </div>
          )}

          <div className="flex justify-end pt-2">
            <button type="submit" className="btn-primary" disabled={saving}>
              {saving ? 'Saving…' : 'Save changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
