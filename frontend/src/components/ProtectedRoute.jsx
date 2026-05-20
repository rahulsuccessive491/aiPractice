import { useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import ProfileSetupGate from './ProfileSetupGate.jsx';

export default function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  const location = useLocation();
  const [dismissed, setDismissed] = useState(
    () => sessionStorage.getItem('profile_gate_dismissed') === '1'
  );

  if (loading) {
    return (
      <div className="grid min-h-[40vh] place-items-center text-sm text-slate-500 dark:text-slate-400">
        Loading…
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace state={{ from: location }} />;

  const isSetupRoute = location.pathname === '/profile-setup';
  const showGate = !user.profile_completed && !isSetupRoute && !dismissed;

  function handleDismiss() {
    sessionStorage.setItem('profile_gate_dismissed', '1');
    setDismissed(true);
  }

  return (
    <>
      {children}
      {showGate && <ProfileSetupGate onDismiss={handleDismiss} />}
    </>
  );
}
