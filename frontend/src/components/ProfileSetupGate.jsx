import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '../context/AuthContext.jsx';

export default function ProfileSetupGate({ onDismiss }) {
  const { user } = useAuth();
  const navigate = useNavigate();

  function handleSetup() {
    onDismiss?.();
    navigate('/profile-setup');
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.25 }}
      className="fixed inset-0 z-50 flex items-center justify-center
                 bg-slate-950/60 backdrop-blur-sm px-4"
      onClick={(e) => { if (e.target === e.currentTarget) onDismiss?.(); }}
    >
      <motion.div
        initial={{ scale: 0.92, opacity: 0, y: 16 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.95, opacity: 0, y: 8 }}
        transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
        className="relative w-full max-w-md rounded-2xl bg-white p-8 shadow-2xl
                   dark:bg-slate-900 dark:ring-1 dark:ring-slate-700"
      >
        {/* Dismiss × */}
        <button
          onClick={onDismiss}
          aria-label="Dismiss"
          className="absolute right-4 top-4 rounded-lg p-1.5 text-slate-400 transition
                     hover:bg-slate-100 hover:text-slate-600
                     dark:hover:bg-slate-800 dark:hover:text-slate-300"
        >
          <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
          </svg>
        </button>

        {/* Icon */}
        <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-xl
                        bg-brand-50 dark:bg-brand-500/10">
          <svg viewBox="0 0 24 24" className="h-7 w-7 text-brand-600 dark:text-brand-400"
               fill="none" stroke="currentColor" strokeWidth="1.8">
            <path strokeLinecap="round" strokeLinejoin="round"
                  d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" />
          </svg>
        </div>

        {/* Greeting */}
        <h2 className="text-xl font-semibold tracking-tight text-slate-900 dark:text-white">
          Complete your profile, {user?.first_name}!
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-slate-600 dark:text-slate-400">
          Help your team track skills, POCs, and certifications accurately by
          filling out a few quick details.
        </p>

        {/* Feature list */}
        <ul className="mt-5 space-y-2">
          {[
            'Personal & professional details',
            'Skills with AI-powered suggestions',
            'AI projects & POC tracking',
            'Certifications & achievements',
          ].map((item) => (
            <li key={item} className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full
                               bg-brand-100 dark:bg-brand-500/20">
                <svg viewBox="0 0 24 24" className="h-3 w-3 text-brand-600 dark:text-brand-400"
                     fill="none" stroke="currentColor" strokeWidth="3">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                </svg>
              </span>
              {item}
            </li>
          ))}
        </ul>

        {/* CTA */}
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.97 }}
          onClick={handleSetup}
          className="btn-primary mt-7 w-full justify-center py-2.5 text-base"
        >
          Set Up My Profile
          <svg viewBox="0 0 24 24" className="ml-2 h-4 w-4"
               fill="none" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
          </svg>
        </motion.button>

        <button
          onClick={onDismiss}
          className="mt-3 w-full text-center text-xs text-slate-400 hover:text-slate-600
                     dark:text-slate-500 dark:hover:text-slate-300 transition-colors"
        >
          Maybe later
        </button>
      </motion.div>
    </motion.div>
  );
}
