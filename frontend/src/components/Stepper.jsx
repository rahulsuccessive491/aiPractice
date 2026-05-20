import { motion } from 'framer-motion';

const STEPS = [
  { label: 'Personal Details', icon: PersonIcon },
  { label: 'Skills',           icon: SkillsIcon },
  { label: 'AI Profile & POC', icon: AiIcon },
  { label: 'Certifications',   icon: CertIcon },
];

function PersonIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path strokeLinecap="round" strokeLinejoin="round"
        d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0" />
    </svg>
  );
}
function SkillsIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path strokeLinecap="round" strokeLinejoin="round"
        d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09Z" />
    </svg>
  );
}
function AiIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path strokeLinecap="round" strokeLinejoin="round"
        d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75Z" />
    </svg>
  );
}
function CertIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path strokeLinecap="round" strokeLinejoin="round"
        d="M16.5 18.75h-9m9 0a3 3 0 0 1 3 3h-15a3 3 0 0 1 3-3m9 0v-3.375c0-.621-.503-1.125-1.125-1.125h-.871M7.5 18.75v-3.375c0-.621.504-1.125 1.125-1.125h.872m5.007 0H9.497m5.007 0a7.454 7.454 0 0 1-.982-3.172M9.497 14.25a7.454 7.454 0 0 0 .981-3.172M5.25 4.236c-.982.143-1.954.317-2.916.52A6.003 6.003 0 0 0 7.73 9.728M5.25 4.236V4.5c0 2.108.966 3.99 2.48 5.228M5.25 4.236V2.721C7.456 2.41 9.71 2.25 12 2.25c2.291 0 4.545.16 6.75.47v1.516M7.73 9.728a6.726 6.726 0 0 0 2.748 1.35m8.272-6.842V4.5c0 2.108-.966 3.99-2.48 5.228m2.48-5.492a46.32 46.32 0 0 1 2.916.52 6.003 6.003 0 0 1-5.395 4.972m0 0a6.726 6.726 0 0 1-2.749 1.35m0 0a6.772 6.772 0 0 1-3.044 0" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="3">
      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
    </svg>
  );
}

/**
 * @param {number} current  0-based active step index
 * @param {number[]} completed  array of completed step indices
 */
export default function Stepper({ current, completed = [] }) {
  const progress = ((current) / (STEPS.length - 1)) * 100;

  return (
    <div className="mb-8">
      {/* Top label row */}
      <div className="mb-3 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
        <span className="font-medium text-slate-700 dark:text-slate-300">
          {STEPS[current].label}
        </span>
        <span>Step {current + 1} of {STEPS.length}</span>
      </div>

      {/* Progress bar */}
      <div className="relative h-1.5 w-full rounded-full bg-slate-100 dark:bg-slate-800">
        <motion.div
          className="h-full rounded-full bg-brand-600 dark:bg-brand-500"
          initial={false}
          animate={{ width: `${((current + 1) / STEPS.length) * 100}%` }}
          transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1] }}
        />
      </div>

      {/* Step pills */}
      <div className="mt-4 flex gap-2">
        {STEPS.map((step, i) => {
          const isDone    = completed.includes(i);
          const isActive  = i === current;
          const isLocked  = i > current && !isDone;

          return (
            <div
              key={step.label}
              className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg px-2 py-2 text-xs font-medium transition-colors
                ${isActive  ? 'bg-brand-50 text-brand-700 ring-1 ring-brand-200 dark:bg-brand-500/10 dark:text-brand-300 dark:ring-brand-500/30' : ''}
                ${isDone    ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400' : ''}
                ${isLocked  ? 'text-slate-400 dark:text-slate-600' : ''}
              `}
            >
              {/* Step number / check bubble */}
              <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px]
                ${isActive  ? 'bg-brand-600 text-white dark:bg-brand-500' : ''}
                ${isDone    ? 'bg-emerald-500 text-white' : ''}
                ${isLocked  ? 'bg-slate-200 text-slate-500 dark:bg-slate-700 dark:text-slate-400' : ''}
              `}>
                {isDone ? <CheckIcon /> : i + 1}
              </span>

              {/* Label — hide on very small screens */}
              <span className="hidden sm:inline truncate">{step.label}</span>

              {/* Icon — show on small screens instead */}
              <span className="sm:hidden">
                <step.icon />
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export { STEPS };
