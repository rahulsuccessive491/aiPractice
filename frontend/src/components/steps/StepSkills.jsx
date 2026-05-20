import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../context/AuthContext.jsx';
import { api } from '../../lib/api.js';

const CATEGORIES = [
  'Frontend', 'Backend', 'AI/ML', 'DevOps', 'Data',
  'Cloud', 'Mobile', 'QA', '.NET', 'Java', 'PHP', 'Soft',
];

const PROFICIENCY_LEVELS = ['Beginner', 'Intermediate', 'Advanced', 'Expert'];

const PROFICIENCY_COLORS = {
  Beginner:     'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300',
  Intermediate: 'bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300',
  Advanced:     'bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300',
  Expert:       'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
};

// ---------------------------------------------------------------------------
// Category pill selector
// ---------------------------------------------------------------------------

function CategoryPills({ active, onChange }) {
  return (
    <div className="flex flex-wrap gap-2">
      {CATEGORIES.map(cat => (
        <button
          key={cat}
          type="button"
          onClick={() => onChange(cat)}
          className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
            active === cat
              ? 'bg-brand-600 text-white dark:bg-brand-500'
              : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700'
          }`}
        >
          {cat}
        </button>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Proficiency selector (inline per-skill)
// ---------------------------------------------------------------------------

function ProficiencyBadge({ value, onChange }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    function handler(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className={`rounded-full px-2 py-0.5 text-[10px] font-semibold transition-colors ${PROFICIENCY_COLORS[value]}`}
      >
        {value} ▾
      </button>
      {open && (
        <ul className="absolute right-0 top-full z-30 mt-1 w-32 rounded-xl border border-slate-200
                       bg-white shadow-lg dark:border-slate-700 dark:bg-slate-900 overflow-hidden">
          {PROFICIENCY_LEVELS.map(level => (
            <li key={level}>
              <button
                type="button"
                onMouseDown={() => { onChange(level); setOpen(false); }}
                className={`w-full px-3 py-1.5 text-left text-xs font-medium transition-colors hover:bg-slate-50 dark:hover:bg-slate-800
                  ${value === level ? 'text-brand-600 dark:text-brand-400' : 'text-slate-700 dark:text-slate-300'}`}
              >
                {level}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Selected skills list
// ---------------------------------------------------------------------------

function SelectedSkills({ skills, onRemove, onProficiencyChange }) {
  if (skills.length === 0) return null;

  // Group by category
  const grouped = skills.reduce((acc, s) => {
    (acc[s.category] = acc[s.category] || []).push(s);
    return acc;
  }, {});

  return (
    <div className="space-y-3">
      {Object.entries(grouped).map(([cat, items]) => (
        <div key={cat}>
          <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
            {cat}
          </p>
          <div className="flex flex-wrap gap-2">
            {items.map(skill => (
              <div
                key={skill.name}
                className="flex items-center gap-1.5 rounded-full border border-brand-200 bg-brand-50 pl-3 pr-1 py-1
                           dark:border-brand-500/30 dark:bg-brand-500/10"
              >
                <span className="text-xs font-medium text-brand-700 dark:text-brand-300">
                  {skill.name}
                </span>
                <ProficiencyBadge
                  value={skill.proficiency}
                  onChange={p => onProficiencyChange(skill.name, p)}
                />
                <button
                  type="button"
                  onClick={() => onRemove(skill.name)}
                  className="ml-0.5 flex h-4 w-4 items-center justify-center rounded-full
                             text-brand-400 hover:bg-brand-200 hover:text-brand-700
                             dark:text-brand-500 dark:hover:bg-brand-500/20 dark:hover:text-brand-300"
                >
                  <svg viewBox="0 0 24 24" className="h-2.5 w-2.5" fill="none" stroke="currentColor" strokeWidth="3">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export default function StepSkills({ onSave, onBack, saving }) {
  const { user } = useAuth();

  const [activeCategory, setActiveCategory] = useState('Frontend');
  const [suggestions, setSuggestions]       = useState([]);       // skills for active category
  const [loadingSug, setLoadingSug]         = useState(false);
  const [selected, setSelected]             = useState([]);        // { name, category, proficiency }
  const [customInput, setCustomInput]       = useState('');
  const [loadingInit, setLoadingInit]       = useState(true);

  // Load existing skills on mount
  useEffect(() => {
    api.get('/users/me/skills')
      .then(d => setSelected(d.skills || []))
      .catch(() => {})
      .finally(() => setLoadingInit(false));
  }, []);

  // Fetch suggestions whenever category changes
  useEffect(() => {
    setLoadingSug(true);
    const dept = user?.department || '';
    api.get(`/skills/suggestions?category=${encodeURIComponent(activeCategory)}&department=${encodeURIComponent(dept)}`)
      .then(d => setSuggestions(d.skills || []))
      .catch(() => setSuggestions([]))
      .finally(() => setLoadingSug(false));
  }, [activeCategory, user?.department]);

  function isSelected(name) {
    return selected.some(s => s.name === name);
  }

  function toggleSkill(name) {
    if (isSelected(name)) {
      setSelected(prev => prev.filter(s => s.name !== name));
    } else {
      setSelected(prev => [...prev, { name, category: activeCategory, proficiency: 'Beginner' }]);
    }
  }

  function addCustomSkill() {
    const name = customInput.trim();
    if (!name || isSelected(name)) { setCustomInput(''); return; }
    setSelected(prev => [...prev, { name, category: activeCategory, proficiency: 'Beginner' }]);
    setCustomInput('');
  }

  function removeSkill(name) {
    setSelected(prev => prev.filter(s => s.name !== name));
  }

  function setProficiency(name, proficiency) {
    setSelected(prev => prev.map(s => s.name === name ? { ...s, proficiency } : s));
  }

  function handleSubmit() {
    onSave(selected);
  }

  if (loadingInit) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map(n => <div key={n} className="h-10 animate-pulse rounded-lg bg-slate-100 dark:bg-slate-800" />)}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-xl font-semibold tracking-tight">Skills</h2>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Select a category to see AI-suggested skills. Pick as many as you like, then set your proficiency level.
        </p>
      </div>

      {/* Category selector */}
      <div>
        <p className="mb-2 text-xs font-medium text-slate-500 dark:text-slate-400">Select a category</p>
        <CategoryPills active={activeCategory} onChange={setActiveCategory} />
      </div>

      {/* Suggestions grid */}
      <div>
        <div className="mb-2 flex items-center justify-between">
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
            Suggested skills — <span className="text-brand-600 dark:text-brand-400">{activeCategory}</span>
          </p>
          {selected.length > 0 && (
            <span className="rounded-full bg-brand-100 px-2 py-0.5 text-[10px] font-semibold text-brand-700
                             dark:bg-brand-500/20 dark:text-brand-300">
              {selected.length} selected
            </span>
          )}
        </div>

        {loadingSug ? (
          <div className="flex flex-wrap gap-2">
            {Array.from({ length: 12 }).map((_, i) => (
              <div key={i} className="h-7 w-20 animate-pulse rounded-full bg-slate-100 dark:bg-slate-800" />
            ))}
          </div>
        ) : (
          <div className="flex flex-wrap gap-2">
            {suggestions.map(skill => {
              const sel = isSelected(skill);
              return (
                <button
                  key={skill}
                  type="button"
                  onClick={() => toggleSkill(skill)}
                  className={`flex items-center gap-1 rounded-full px-3 py-1 text-xs font-medium transition-all ${
                    sel
                      ? 'bg-brand-600 text-white shadow-sm dark:bg-brand-500'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700'
                  }`}
                >
                  {sel && (
                    <svg viewBox="0 0 24 24" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth="3">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                    </svg>
                  )}
                  {skill}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Custom skill input */}
      <div>
        <p className="mb-2 text-xs font-medium text-slate-500 dark:text-slate-400">
          Can't find a skill? Add it manually
        </p>
        <div className="flex gap-2">
          <input
            type="text"
            className="field flex-1"
            placeholder={`Add custom skill to "${activeCategory}"…`}
            value={customInput}
            onChange={e => setCustomInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addCustomSkill(); } }}
          />
          <button
            type="button"
            onClick={addCustomSkill}
            disabled={!customInput.trim()}
            className="btn-outline shrink-0"
          >
            Add
          </button>
        </div>
      </div>

      {/* Selected skills */}
      {selected.length > 0 && (
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800/40">
          <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Your Skills — click the badge to change proficiency
          </p>
          <SelectedSkills
            skills={selected}
            onRemove={removeSkill}
            onProficiencyChange={setProficiency}
          />
        </div>
      )}

      {selected.length === 0 && (
        <p className="rounded-lg border border-dashed border-slate-300 dark:border-slate-700 px-4 py-3 text-sm text-slate-400 dark:text-slate-500 text-center">
          No skills selected yet — click any skill above to add it.
        </p>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between border-t border-slate-100 pt-5 dark:border-slate-800">
        <button
          type="button"
          onClick={onBack}
          className="btn-ghost flex items-center gap-1.5 text-sm"
        >
          <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18" />
          </svg>
          Back
        </button>
        <button
          type="button"
          onClick={handleSubmit}
          disabled={saving}
          className="btn-primary flex items-center gap-2"
        >
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
  );
}
