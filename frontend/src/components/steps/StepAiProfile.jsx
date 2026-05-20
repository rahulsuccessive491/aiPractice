import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext.jsx';
import { api } from '../../lib/api.js';

const CATEGORIES = ['GenAI', 'Automation', 'ML Model', 'Analytics', 'Agent', 'Other'];
const STATUSES   = ['Not Started', 'In Progress', 'Completed', 'On Hold'];

// ---------------------------------------------------------------------------
// Empty POC template
// ---------------------------------------------------------------------------

function emptyPoc(user) {
  return {
    _id:              Date.now() + Math.random(), // local key only
    poc_name:         '',
    category:         'GenAI',
    problem_statement:'',
    tools_stack:      [],
    team_members:     [],
    poc_lead:         `${user?.first_name || ''} ${user?.last_name || ''}`.trim(),
    status:           'In Progress',
    progress:         0,
    expected_outcome: '',
    business_impact:  '',
    repo_link:        '',
    challenges:       '',
    next_steps:       '',
    remarks:          '',
    start_date:       '',
    end_date:         '',
  };
}

// ---------------------------------------------------------------------------
// Tag-input — for tools_stack and team_members
// ---------------------------------------------------------------------------

function TagInput({ label, placeholder, values, onChange }) {
  const [input, setInput] = useState('');

  function add() {
    const v = input.trim();
    if (!v || values.includes(v)) { setInput(''); return; }
    onChange([...values, v]);
    setInput('');
  }

  function remove(tag) {
    onChange(values.filter(t => t !== tag));
  }

  return (
    <div className="w-full">
      <label className="label">{label}</label>
      <div className="flex gap-2">
        <input
          type="text"
          className="field flex-1"
          placeholder={placeholder}
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); add(); } }}
        />
        <button type="button" onClick={add} disabled={!input.trim()} className="btn-outline shrink-0 text-sm">
          Add
        </button>
      </div>
      {values.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {values.map(tag => (
            <span key={tag} className="flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-0.5
                                       text-xs font-medium text-slate-700 dark:bg-slate-800 dark:text-slate-300">
              {tag}
              <button type="button" onClick={() => remove(tag)}
                      className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
                <svg viewBox="0 0 24 24" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth="3">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                </svg>
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Progress slider
// ---------------------------------------------------------------------------

function ProgressSlider({ value, onChange }) {
  return (
    <div className="w-full">
      <label className="label">Progress</label>
      <div className="flex items-center gap-3">
        <input
          type="range" min="0" max="100" step="5"
          value={value}
          onChange={e => onChange(Number(e.target.value))}
          className="flex-1 accent-brand-600"
        />
        <span className={`w-12 shrink-0 rounded-lg px-2 py-0.5 text-center text-sm font-semibold ${
          value >= 80 ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' :
          value >= 50 ? 'bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-400' :
          'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
        }`}>
          {value}%
        </span>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Single POC card (collapsible)
// ---------------------------------------------------------------------------

function PocCard({ poc, index, onChange, onRemove, canRemove }) {
  const [open, setOpen] = useState(true);

  function set(field, value) {
    onChange({ ...poc, [field]: value });
  }

  const statusColor = {
    'Not Started': 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400',
    'In Progress':  'bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-400',
    'Completed':    'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
    'On Hold':      'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  };

  return (
    <div className="rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
      {/* Card header — always visible */}
      <div className="flex items-center justify-between bg-slate-50 px-4 py-3 dark:bg-slate-800/60">
        <div className="flex items-center gap-2 min-w-0">
          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full
                           bg-brand-100 text-xs font-bold text-brand-700
                           dark:bg-brand-500/20 dark:text-brand-300">
            {index + 1}
          </span>
          <span className="truncate text-sm font-medium text-slate-800 dark:text-slate-200">
            {poc.poc_name || <span className="text-slate-400">Untitled POC</span>}
          </span>
          {poc.status && (
            <span className={`hidden sm:inline-flex shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold ${statusColor[poc.status]}`}>
              {poc.status}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {canRemove && (
            <button type="button" onClick={onRemove}
                    className="rounded-lg p-1 text-rose-400 hover:bg-rose-50 hover:text-rose-600
                               dark:hover:bg-rose-900/20 dark:hover:text-rose-400 transition-colors">
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round"
                  d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
              </svg>
            </button>
          )}
          <button type="button" onClick={() => setOpen(o => !o)}
                  className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600
                             dark:hover:bg-slate-700 dark:hover:text-slate-300 transition-colors">
            <svg viewBox="0 0 24 24" className={`h-4 w-4 transition-transform ${open ? 'rotate-180' : ''}`}
                 fill="none" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
            </svg>
          </button>
        </div>
      </div>

      {/* Expandable body */}
      {open && (
        <div className="space-y-5 p-4">
          {/* Row 1: Name + Category */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="label">POC / Project Name <span className="text-rose-500">*</span></label>
              <input className="field" value={poc.poc_name}
                     onChange={e => set('poc_name', e.target.value)}
                     placeholder="e.g. AI-powered code reviewer" />
            </div>
            <div>
              <label className="label">Category</label>
              <select className="field" value={poc.category} onChange={e => set('category', e.target.value)}>
                {CATEGORIES.map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
          </div>

          {/* Row 2: Problem statement */}
          <div>
            <label className="label">Problem Statement</label>
            <textarea className="field min-h-[72px] resize-y" value={poc.problem_statement}
                      onChange={e => set('problem_statement', e.target.value)}
                      placeholder="What problem does this POC solve?" />
          </div>

          {/* Row 3: Tools + Team members */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <TagInput
              label="AI Tools / Stack Used"
              placeholder="e.g. Claude, LangChain…"
              values={poc.tools_stack}
              onChange={v => set('tools_stack', v)}
            />
            <TagInput
              label="Team Members"
              placeholder="e.g. Rahul Sharma…"
              values={poc.team_members}
              onChange={v => set('team_members', v)}
            />
          </div>

          {/* Row 4: POC Lead + Status */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="label">POC Lead / Owner</label>
              <input className="field" value={poc.poc_lead}
                     onChange={e => set('poc_lead', e.target.value)}
                     placeholder="Name of the lead" />
            </div>
            <div>
              <label className="label">Current Status</label>
              <select className="field" value={poc.status} onChange={e => set('status', e.target.value)}>
                {STATUSES.map(s => <option key={s}>{s}</option>)}
              </select>
            </div>
          </div>

          {/* Progress slider */}
          <ProgressSlider value={poc.progress} onChange={v => set('progress', v)} />

          {/* Row 5: Dates */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="label">Start Date</label>
              <input type="date" className="field" value={poc.start_date}
                     onChange={e => set('start_date', e.target.value)} />
            </div>
            <div>
              <label className="label">End Date</label>
              <input type="date" className="field" value={poc.end_date}
                     onChange={e => set('end_date', e.target.value)} />
            </div>
          </div>

          {/* Row 6: Expected outcome + Business impact */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="label">Expected Outcome</label>
              <textarea className="field min-h-[68px] resize-y" value={poc.expected_outcome}
                        onChange={e => set('expected_outcome', e.target.value)}
                        placeholder="What does success look like?" />
            </div>
            <div>
              <label className="label">Business Impact</label>
              <textarea className="field min-h-[68px] resize-y" value={poc.business_impact}
                        onChange={e => set('business_impact', e.target.value)}
                        placeholder="How does this benefit the business?" />
            </div>
          </div>

          {/* Row 7: Repo link */}
          <div>
            <label className="label">Repo / Demo Link</label>
            <input type="url" className="field" value={poc.repo_link}
                   onChange={e => set('repo_link', e.target.value)}
                   placeholder="https://github.com/…" />
          </div>

          {/* Row 8: Challenges + Next steps */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="label">Challenges / Blockers</label>
              <textarea className="field min-h-[68px] resize-y" value={poc.challenges}
                        onChange={e => set('challenges', e.target.value)}
                        placeholder="Any current blockers?" />
            </div>
            <div>
              <label className="label">Next Steps</label>
              <textarea className="field min-h-[68px] resize-y" value={poc.next_steps}
                        onChange={e => set('next_steps', e.target.value)}
                        placeholder="What's planned next?" />
            </div>
          </div>

          {/* Row 9: Remarks */}
          <div>
            <label className="label">Remarks</label>
            <textarea className="field min-h-[56px] resize-y" value={poc.remarks}
                      onChange={e => set('remarks', e.target.value)}
                      placeholder="Any additional notes…" />
          </div>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export default function StepAiProfile({ onSave, onBack, saving }) {
  const { user } = useAuth();

  const [pocs, setPocs]     = useState([]);
  const [errors, setErrors] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/users/me/pocs')
      .then(d => {
        const loaded = (d.pocs || []).map(p => ({ ...p, _id: p.id }));
        setPocs(loaded.length > 0 ? loaded : [emptyPoc(user)]);
      })
      .catch(() => setPocs([emptyPoc(user)]))
      .finally(() => setLoading(false));
  }, [user]);

  function updatePoc(idx, updated) {
    setPocs(prev => prev.map((p, i) => i === idx ? updated : p));
    setErrors(prev => { const c = [...prev]; c[idx] = undefined; return c; });
  }

  function addPoc() {
    setPocs(prev => [...prev, emptyPoc(user)]);
  }

  function removePoc(idx) {
    setPocs(prev => prev.filter((_, i) => i !== idx));
  }

  function validate() {
    const errs = pocs.map(p => p.poc_name.trim() ? undefined : 'POC name is required');
    setErrors(errs);
    return errs.every(e => !e);
  }

  function handleSubmit() {
    if (!validate()) return;
    // Strip local-only _id before sending
    const payload = pocs.map(({ _id, ...rest }) => rest);
    onSave(payload);
  }

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2].map(n => <div key={n} className="h-16 animate-pulse rounded-xl bg-slate-100 dark:bg-slate-800" />)}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-xl font-semibold tracking-tight">AI Profile & POC Details</h2>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Document your AI initiatives, proof-of-concept projects, and experiments. You can add multiple POCs.
        </p>
      </div>

      {/* POC cards */}
      <div className="space-y-4">
        {pocs.map((poc, idx) => (
          <div key={poc._id ?? idx}>
            <PocCard
              poc={poc}
              index={idx}
              onChange={updated => updatePoc(idx, updated)}
              onRemove={() => removePoc(idx)}
              canRemove={pocs.length > 1}
            />
            {errors[idx] && (
              <p className="mt-1 text-xs text-rose-500">{errors[idx]}</p>
            )}
          </div>
        ))}
      </div>

      {/* Add another POC */}
      <button
        type="button"
        onClick={addPoc}
        className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed
                   border-slate-300 py-3 text-sm font-medium text-slate-500
                   hover:border-brand-400 hover:text-brand-600
                   dark:border-slate-700 dark:text-slate-400
                   dark:hover:border-brand-500 dark:hover:text-brand-400
                   transition-colors"
      >
        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
        </svg>
        Add Another POC
      </button>

      {/* Skip hint */}
      <p className="text-center text-xs text-slate-400 dark:text-slate-500">
        No active POCs yet? That's fine — you can skip and add them later from your profile.
      </p>

      {/* Footer */}
      <div className="flex items-center justify-between border-t border-slate-100 pt-5 dark:border-slate-800">
        <button type="button" onClick={onBack}
                className="btn-ghost flex items-center gap-1.5 text-sm">
          <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18" />
          </svg>
          Back
        </button>

        <div className="flex gap-2">
          <button type="button" onClick={() => onSave([])}
                  className="btn-ghost text-sm text-slate-500">
            Skip for now
          </button>
          <button type="button" onClick={handleSubmit} disabled={saving}
                  className="btn-primary flex items-center gap-2">
            {saving ? (
              <>
                <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 0 1 8-8v4a4 4 0 0 0-4 4H4Z" />
                </svg>
                Saving…
              </>
            ) : (
              <>
                Save & Continue
                <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
                </svg>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
