import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import FormField from '../components/FormField.jsx';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const next = location.state?.from?.pathname || '/profile';

  const [values, setValues] = useState({ email: '', password: '' });
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  function onChange(e) {
    const { name, value } = e.target;
    setValues(v => ({ ...v, [name]: value }));
    if (errors[name]) setErrors(e => ({ ...e, [name]: undefined }));
  }

  async function onSubmit(e) {
    e.preventDefault();
    setServerError(null);
    setSubmitting(true);
    const result = await login({
      email: values.email.trim().toLowerCase(),
      password: values.password,
    });
    setSubmitting(false);
    if (!result.ok) {
      if (result.fields) setErrors(result.fields);
      else setServerError(result.error || 'Sign-in failed');
      return;
    }
    navigate(next, { replace: true });
  }

  return (
    <div className="mx-auto max-w-md">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">Welcome back</h1>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
          Sign in to track your AI activities and certifications.
        </p>
      </div>
      <form onSubmit={onSubmit} className="card space-y-5" noValidate>
        <FormField label="Email" name="email" type="email" value={values.email}
                   onChange={onChange} error={errors.email} autoComplete="email" required />
        <FormField label="Password" name="password" type="password" value={values.password}
                   onChange={onChange} error={errors.password} autoComplete="current-password" required />

        {serverError && (
          <div className="rounded-lg border border-rose-300 bg-rose-50 px-3 py-2 text-sm text-rose-700
                          dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-300">
            {serverError}
          </div>
        )}

        <div className="flex items-center justify-between pt-2">
          <p className="text-sm text-slate-600 dark:text-slate-400">
            New here?{' '}
            <Link to="/register" className="font-medium text-brand-600 hover:underline dark:text-brand-400">
              Create an account
            </Link>
          </p>
          <button type="submit" className="btn-primary" disabled={submitting}>
            {submitting ? 'Signing in…' : 'Sign in'}
          </button>
        </div>
      </form>
    </div>
  );
}
