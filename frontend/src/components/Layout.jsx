import { useState, useRef, useEffect } from 'react';
import { NavLink, Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../context/AuthContext.jsx';
import ThemeToggle from './ThemeToggle.jsx';
import NotificationBell from './NotificationBell.jsx';

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

function AvatarMenu({ user, onLogout }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    function handleClick(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const initials = `${user.first_name?.[0] ?? ''}${user.last_name?.[0] ?? ''}`.toUpperCase();

  function go(path) {
    setOpen(false);
    navigate(path);
  }

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-2 rounded-full focus:outline-none focus:ring-2 focus:ring-brand-500/40"
        aria-label="User menu"
      >
        {user.avatar_url ? (
          <img src={user.avatar_url} alt="" className="h-8 w-8 rounded-full object-cover ring-2 ring-brand-500/30" />
        ) : (
          <span className="grid h-8 w-8 place-items-center rounded-full bg-brand-600 text-xs font-bold text-white ring-2 ring-brand-500/30">
            {initials}
          </span>
        )}
        <svg viewBox="0 0 24 24" className={`h-3.5 w-3.5 text-slate-500 transition-transform ${open ? 'rotate-180' : ''}`}
             fill="none" stroke="currentColor" strokeWidth="2.5">
          <path strokeLinecap="round" strokeLinejoin="round" d="m19 9-7 7-7-7" />
        </svg>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -4 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -4 }}
            transition={{ duration: 0.15, ease: [0.16, 1, 0.3, 1] }}
            className="absolute right-0 top-full mt-2 w-52 rounded-xl border border-slate-200 bg-white
                       shadow-lg dark:border-slate-700 dark:bg-slate-900 z-50 overflow-hidden"
          >
            {/* User info header */}
            <div className="border-b border-slate-100 dark:border-slate-800 px-4 py-3">
              <p className="text-sm font-semibold text-slate-900 dark:text-white truncate">
                {user.first_name} {user.last_name}
              </p>
              <p className="text-xs text-slate-400 dark:text-slate-500 truncate mt-0.5">{user.email}</p>
            </div>

            {/* Menu items */}
            <div className="py-1">
              <button
                onClick={() => go('/profile-setup')}
                className="flex w-full items-center gap-2.5 px-4 py-2 text-sm text-slate-700 dark:text-slate-300
                           hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
              >
                <svg viewBox="0 0 24 24" className="h-4 w-4 shrink-0 text-slate-400" fill="none" stroke="currentColor" strokeWidth="1.8">
                  <path strokeLinecap="round" strokeLinejoin="round"
                        d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" />
                </svg>
                View / Edit Profile
              </button>

              {/* Personal links for admin/manager — their nav only shows org-wide views */}
              {['admin', 'manager'].includes(user.role) && (
                <>
                  <button
                    onClick={() => go('/dashboard')}
                    className="flex w-full items-center gap-2.5 px-4 py-2 text-sm text-slate-700 dark:text-slate-300
                               hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                  >
                    <svg viewBox="0 0 24 24" className="h-4 w-4 shrink-0 text-slate-400" fill="none" stroke="currentColor" strokeWidth="1.8">
                      <path strokeLinecap="round" strokeLinejoin="round"
                            d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 0 1 3 19.875v-6.75ZM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V8.625ZM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V4.125Z" />
                    </svg>
                    My Dashboard
                  </button>
                  <button
                    onClick={() => go('/activities')}
                    className="flex w-full items-center gap-2.5 px-4 py-2 text-sm text-slate-700 dark:text-slate-300
                               hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                  >
                    <svg viewBox="0 0 24 24" className="h-4 w-4 shrink-0 text-slate-400" fill="none" stroke="currentColor" strokeWidth="1.8">
                      <path strokeLinecap="round" strokeLinejoin="round"
                            d="M11.35 3.836c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 0 0 .75-.75 2.25 2.25 0 0 0-.1-.664m-5.8 0A2.251 2.251 0 0 1 13.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m8.9-4.414c.376.023.75.05 1.124.08 1.131.094 1.976 1.057 1.976 2.192V16.5A2.25 2.25 0 0 1 18 18.75h-2.25m-7.5-10.5H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V18.75m-7.5-10.5h6.375c.621 0 1.125.504 1.125 1.125v9.375" />
                    </svg>
                    My Activities
                  </button>
                </>
              )}
            </div>

            <div className="border-t border-slate-100 dark:border-slate-800 py-1">
              <button
                onClick={() => { setOpen(false); onLogout(); }}
                className="flex w-full items-center gap-2.5 px-4 py-2 text-sm text-rose-600 dark:text-rose-400
                           hover:bg-rose-50 dark:hover:bg-rose-900/20 transition-colors"
              >
                <svg viewBox="0 0 24 24" className="h-4 w-4 shrink-0" fill="none" stroke="currentColor" strokeWidth="1.8">
                  <path strokeLinecap="round" strokeLinejoin="round"
                        d="M15.75 9V5.25A2.25 2.25 0 0 0 13.5 3h-6a2.25 2.25 0 0 0-2.25 2.25v13.5A2.25 2.25 0 0 0 7.5 21h6a2.25 2.25 0 0 0 2.25-2.25V15M12 9l-3 3m0 0 3 3m-3-3h12.75" />
                </svg>
                Logout
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
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

  const isLeader = user && ['manager', 'admin'].includes(user.role);

  const navLinks = user
    ? (isLeader
        ? [
            { to: '/admin',            label: 'Leadership' },
            { to: '/admin/activities', label: 'All Activities' },
          ]
        : [
            { to: '/dashboard',  label: 'My Dashboard' },
            { to: '/activities', label: 'My Activities' },
          ])
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
            {user && <NotificationBell />}
            {user ? (
              <AvatarMenu user={user} onLogout={handleLogout} />
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
                <NavItem to="/profile-setup" onClick={() => setMobileOpen(false)}>Profile</NavItem>
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
