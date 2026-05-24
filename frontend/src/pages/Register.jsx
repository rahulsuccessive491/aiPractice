import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import FormField from '../components/FormField.jsx';
import { DEPARTMENTS } from '../lib/constants.js';

const ALLOWED_DOMAIN = 'successive.tech';

const empty = {
  first_name: '', last_name: '', mobile: '', department: '',
  email: '', password: '', confirm_password: '',
};

function clientValidate(values) {
  const errs = {};
  if (!values.first_name.trim()) errs.first_name = 'First name is required';
  if (!values.last_name.trim())  errs.last_name  = 'Last name is required';
  if (!values.department)        errs.department = 'Choose a department';
  if (!/^\+?[0-9\s\-()]{10,20}$/.test(values.mobile.trim())) {
    errs.mobile = 'Enter a valid mobile number';
  }
  const emailLc = values.email.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailLc)) {
    errs.email = 'Enter a valid email';
  } else if (emailLc.split('@')[1] !== ALLOWED_DOMAIN) {
    errs.email = `Only @${ALLOWED_DOMAIN} work emails are allowed`;
  }
  if (values.password.length < 8) {
    errs.password = 'At least 8 characters';
  } else if (!/[A-Za-z]/.test(values.password) || !/[0-9]/.test(values.password)) {
    errs.password = 'Must contain a letter and a number';
  }
  if (values.password !== values.confirm_password) {
    errs.confirm_password = 'Passwords do not match';
  }
  return errs;
}

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();

  const [values, setValues] = useState(empty);
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
    const clientErrs = clientValidate(values);
    if (Object.keys(clientErrs).length) {
      setErrors(clientErrs);
      return;
    }
    setSubmitting(true);
    const result = await register({
      ...values,
      email: values.email.trim().toLowerCase(),
      first_name: values.first_name.trim(),
      last_name:  values.last_name.trim(),
      mobile:     values.mobile.trim(),
      department: values.department.trim(),
    });
    setSubmitting(false);
    if (!result.ok) {
      if (result.fields) setErrors(result.fields);
      else setServerError(result.error || 'Registration failed');
      return;
    }
    navigate('/profile', { replace: true });
  }

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">Create your account</h1>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
          Use your <span className="font-medium">@{ALLOWED_DOMAIN}</span> work email. SSO is coming in Sprint 4 — for now, register below.
        </p>
      </div>

      <form onSubmit={onSubmit} className="card space-y-5" noValidate>
        <div className="grid gap-5 sm:grid-cols-2">
          <FormField label="First name" name="first_name" value={values.first_name}
                     onChange={onChange} error={errors.first_name} required
                     autoComplete="given-name" />
          <FormField label="Last name" name="last_name" value={values.last_name}
                     onChange={onChange} error={errors.last_name} required
                     autoComplete="family-name" />
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <FormField label="Mobile" name="mobile" value={values.mobile}
                     onChange={onChange} error={errors.mobile} required
                     type="tel" inputMode="tel" placeholder="+91 98765 43210"
                     autoComplete="tel" />
          <FormField label="Department" name="department" value={values.department}
                     onChange={onChange} error={errors.department} required
                     as="select" options={DEPARTMENTS} />
        </div>

        <FormField label="Work email" name="email" value={values.email}
                   onChange={onChange} error={errors.email} required
                   type="email" autoComplete="email"
                   placeholder={`yourname@${ALLOWED_DOMAIN}`}
                   hint={`Must end with @${ALLOWED_DOMAIN}`} />

        <div className="grid gap-5 sm:grid-cols-2">
          <FormField label="Password" name="password" value={values.password}
                     onChange={onChange} error={errors.password} required
                     type="password" autoComplete="new-password"
                     hint="Min 8 chars, with a letter and a number" />
          <FormField label="Confirm password" name="confirm_password"
                     value={values.confirm_password} onChange={onChange}
                     error={errors.confirm_password} required
                     type="password" autoComplete="new-password" />
        </div>

        {serverError && (
          <div className="rounded-lg border border-rose-300 bg-rose-50 px-3 py-2 text-sm text-rose-700
                          dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-300">
            {serverError}
          </div>
        )}

        <div className="flex items-center justify-between pt-2">
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Already have an account?{' '}
            <Link to="/login" className="font-medium text-brand-600 hover:underline dark:text-brand-400">
              Sign in
            </Link>
          </p>
          <button type="submit" className="btn-primary" disabled={submitting}>
            {submitting ? 'Creating account…' : 'Create account'}
          </button>
        </div>
      </form>
    </div>
  );
}
