import { useState } from 'react';
import { NavLink, Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../context/AuthContext.jsx';
import ThemeToggle from './ThemeToggle.jsx';

function NavItem({ to, children, onClick }) {
  return (
    <NavLink
      to={to}
      onClick={onClick}
      className={({ isActive }) =>
        `rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
          isActive
            ? 'bg-brand-50 text-brand-700 dark:bg-brand-500/10 dark:text-brand-300'
            : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800'
        }`
      }
    >
      {children}
    </NavLink>
  );
}

export default function Layout({ children }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);

  function handleLogout() {
    logout();
    navigate('/login');
    setMobileOpen(false);
  }

  const navLinks = user
    ? [
        { to: '/dashboard', label: 'Dashboard' },
        { to: '/activities', label: 'Activities' },
        ...((['manager', 'admin'].includes(user.role)) ? [{ to: '/admin', label: 'Admin' }] : []),
        { to: '/profile', label: 'Profile' },
      ]
    : [];

  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-20 border-b border-slate-200/80 bg-white/85 backdrop-blur
                         dark:border-slate-800/80 dark:bg-slate-950/80">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 sm:px-6">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2 shrink-0">
            <motion.span
              whileHover={{ scale: 1.08 }}
              whileTap={{ scale: 0.95 }}
              className="grid h-8 w-8 place-items-center rounded-lg bg-brand-600 text-white shadow-soft"
            >
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
                <path strokeLinecap="round" strokeLinejoin="round"
                      d="M12 2 4 6v6c0 5 3.5 8.5 8 10 4.5-1.5 8-5 8-10V6l-8-4z" />
              </svg>
            </motion.span>
            <span className="text-sm font-semibold tracking-tight sm:text-base">AI Skills Portal</span>
          </Link>

          {/* Desktop nav */}
          {user && (
            <nav className="hidden items-center gap-1 md:flex">
              {navLinks.map(n => <NavItem key={n.to} to={n.to}>{n.label}</NavItem>)}
            </nav>
          )}

          {/* Right controls */}
          <div className="flex items-center gap-2">
            <ThemeToggle />
            {user ? (
              <>
                <span className="hidden text-xs text-slate-500 dark:text-slate-400 sm:inline">
                  {user.first_name} {user.last_name}
                </span>
                <button onClick={handleLogout} className="btn-outline h-9 hidden md:inline-flex">
                  Logout
                </button>
              </>
            ) : (
              <Link to="/login" className="btn-primary h-9">Sign in</Link>
            )}

            {/* Mobile hamburger */}
            {user && (
              <motion.button
                whileTap={{ scale: 0.9 }}
                onClick={() => setMobileOpen(o => !o)}
                className="md:hidden p-2 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                aria-label="Toggle menu"
              >
                <motion.svg
                  animate={mobileOpen ? 'open' : 'closed'}
                  viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                  className="h-5 w-5"
                >
                  <motion.path
                    strokeLinecap="round"
                    variants={{ closed: { d: 'M 3 6 L 21 6' }, open: { d: 'M 4 4 L 20 20' } }}
                    transition={{ duration: 0.2 }}
                  />
                  <motion.path
                    strokeLinecap="round"
                    variants={{ closed: { opacity: 1, d: 'M 3 12 L 21 12' }, open: { opacity: 0, d: 'M 3 12 L 21 12' } }}
                    transition={{ duration: 0.2 }}
                  />
                  <motion.path
                    strokeLinecap="round"
                    variants={{ closed: { d: 'M 3 18 L 21 18' }, open: { d: 'M 4 20 L 20 4' } }}
                    transition={{ duration: 0.2 }}
                  />
                </motion.svg>
              </motion.button>
            )}
          </div>
        </div>

        {/* Mobile nav drawer */}
        <AnimatePresence>
          {mobileOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.22, ease: [0.4, 0, 0.2, 1] }}
              className="overflow-hidden border-t border-slate-200 dark:border-slate-800 md:hidden"
            >
              <div className="flex flex-col gap-1 px-4 py-3">
                {navLinks.map(n => (
                  <NavItem key={n.to} to={n.to} onClick={() => setMobileOpen(false)}>
                    {n.label}
                  </NavItem>
                ))}
                <button
                  onClick={handleLogout}
                  className="mt-2 w-full rounded-lg border border-slate-200 dark:border-slate-700 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                >
                  Logout
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </header>

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6">
        {children}
      </main>

      <footer className="border-t border-slate-200 py-6 text-center text-xs text-slate-500
                         dark:border-slate-800 dark:text-slate-400">
        AI Skills Tracking Portal · Built with Claude
      </footer>
    </div>
  );
}
