import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import Layout from './components/Layout.jsx';
import ProtectedRoute from './components/ProtectedRoute.jsx';
import Login from './pages/Login.jsx';
import Register from './pages/Register.jsx';
import Profile from './pages/Profile.jsx';
import Dashboard from './pages/Dashboard.jsx';
import ActivityLog from './pages/ActivityLog.jsx';
import AdminDashboard from './pages/AdminDashboard.jsx';
import { useAuth } from './context/AuthContext.jsx';

function HomeRedirect() {
  const { user, loading } = useAuth();
  if (loading) return null;
  return <Navigate to={user ? '/dashboard' : '/login'} replace />;
}

export default function App() {
  const location = useLocation();

  return (
    <Layout>
      <AnimatePresence mode="wait" initial={false}>
        <Routes location={location} key={location.pathname}>
          <Route path="/"          element={<HomeRedirect />} />
          <Route path="/login"     element={<Login />} />
          <Route path="/register"  element={<Register />} />
          <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
          <Route path="/profile"   element={<ProtectedRoute><Profile /></ProtectedRoute>} />
          <Route path="/activities" element={<ProtectedRoute><ActivityLog /></ProtectedRoute>} />
          <Route path="/admin"     element={<ProtectedRoute><AdminDashboard /></ProtectedRoute>} />
          <Route path="*" element={
            <div className="grid place-items-center py-20 text-center">
              <p className="text-sm text-slate-500 dark:text-slate-400">Page not found.</p>
            </div>
          } />
        </Routes>
      </AnimatePresence>
    </Layout>
  );
}
