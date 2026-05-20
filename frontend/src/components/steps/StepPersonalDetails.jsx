import { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext.jsx';
import { api } from '../../lib/api.js';
import FormField from '../FormField.jsx';

const DEPARTMENTS = [
  'Engineering', 'Design', 'Product', 'Data', 'DevOps',
  'QA', 'AI/ML', 'Marketing', 'Sales', 'Operations', 'HR', 'Finance',
];

const LOCATIONS = [
  'Jaipur', 'Delhi', 'Bangalore', 'Mumbai', 'Hyderabad',
  'Pune', 'Chennai', 'Remote', 'Other',
];

const DESIGNATIONS = [
  'Intern', 'Trainee', 'Junior Developer', 'Developer',
  'Senior Developer', 'Lead Developer', 'Principal Engineer',
  'Engineering Manager', 'Architect', 'VP Engineering',
  'Designer', 'Senior Designer', 'Product Manager', 'QA Engineer',
  'DevOps Engineer', 'Data Analyst', 'Data Scientist', 'Other',
];

// ---------------------------------------------------------------------------
// Manager search with debounce
// ---------------------------------------------------------------------------

function ManagerPicker({ value, onChange }) {
  const [query, setQuery]       = useState('');
  const [results, setResults]   = useState([]);
  const [open, setOpen]         = useState(false);
  const [display, setDisplay]   = useState('');   // shown in input
  const containerRef            = useRef(null);

  // Close on outside click
  useEffect(() => {
    function handler(e) {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Debounced search
  useEffect(() => {
    if (!open) return;
    const t = setTimeout(async () => {
      if (query.length < 1) { setResults([]); return; }
      try {
        const data = await api.get(`/users/search?q=${encodeURIComponent(query)}`);
        setResults(data.users || []);
      } catch { setResults([]); }
    }, 280);
    return () => clearTimeout(t);
  }, [query, open]);

  function select(user) {
    onChange(user.id);
    setDisplay(`${user.first_name} ${user.last_name}`);
    setOpen(false);
    setQuery('');
    setResults([]);
  }

  function clear() {
    onChange(null);
    setDisplay('');
    setQuery('');
    setResults([]);
  }

  return (
    <div ref={containerRef} className="relative w-full">
      <label className="label">Reporting Manager</label>
      <div className="relative">
        <input
          type="text"
          className="field pr-8"
          placeholder="Search by name or email…"
          value={display || query}
          onFocus={() => setOpen(true)}
          onChange={e => {
            setDisplay('');
            setQuery(e.target.value);
            setOpen(true);
          }}
        />
        {(value || display) && (
          <button
            type="button"
            onClick={clear}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
          >
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      {open && results.length > 0 && (
        <ul className="absolute z-20 mt-1 w-full rounded-xl border border-slate-200 bg-white shadow-lg
                       dark:border-slate-700 dark:bg-slate-900 overflow-hidden">
          {results.map(u => (
            <li key={u.id}>
              <button
                type="button"
                onMouseDown={() => select(u)}
                className="flex w-full items-center gap-3 px-3 py-2.5 text-left text-sm hover:bg-slate-50
                           dark:hover:bg-slate-800 transition-colors"
              >
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full
                                 bg-brand-100 text-xs font-semibold text-brand-700
                                 dark:bg-brand-500/20 dark:text-brand-300">
                  {u.first_name[0]}{u.last_name[0]}
                </span>
                <span>
                  <span className="font-medium text-slate-800 dark:text-slate-200">
                    {u.first_name} {u.last_name}
                  </span>
                  <span className="ml-2 text-xs text-slate-500 dark:text-slate-400">
                    {u.designation || u.department} · {u.email}
                  </span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Avatar upload
// ---------------------------------------------------------------------------

function AvatarUpload({ value, onChange }) {
  const [preview, setPreview] = useState(value || null);
  const [error, setError]     = useState('');
  const inputRef              = useRef(null);

  function handleFile(file) {
    setError('');
    if (!file) return;
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      setError('Only JPEG, PNG, or WebP images are allowed.');
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      setError('Image must be under 2 MB.');
      return;
    }
    const reader = new FileReader();
    reader.onload = e => {
      const dataUrl = e.target.result;
      setPreview(dataUrl);
      onChange(dataUrl);
    };
    reader.readAsDataURL(file);
  }

  return (
    <div>
      <label className="label">Profile Photo</label>
      <div className="flex items-center gap-4">
        {/* Avatar preview */}
        <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-full
                        bg-slate-100 ring-2 ring-slate-200 dark:bg-slate-800 dark:ring-slate-700">
          {preview ? (
            <img src={preview} alt="avatar" className="h-full w-full object-cover" />
          ) : (
            <svg viewBox="0 0 24 24" className="absolute inset-0 m-auto h-8 w-8 text-slate-400"
                 fill="none" stroke="currentColor" strokeWidth="1.5">
              <path strokeLinecap="round" strokeLinejoin="round"
                d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0" />
            </svg>
          )}
        </div>

        <div className="flex flex-col gap-1.5">
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="btn-outline text-sm"
          >
            {preview ? 'Change photo' : 'Upload photo'}
          </button>
          {preview && (
            <button
              type="button"
              onClick={() => { setPreview(null); onChange(''); }}
              className="text-xs text-rose-500 hover:underline"
            >
              Remove
            </button>
          )}
          <p className="text-xs text-slate-400 dark:text-slate-500">JPEG · PNG · WebP · max 2 MB</p>
        </div>
      </div>
      {error && <p className="mt-1 text-xs text-rose-500">{error}</p>}
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={e => handleFile(e.target.files?.[0])}
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

function validate(v) {
  const err = {};
  if (!v.first_name.trim())  err.first_name  = 'First name is required';
  if (!v.last_name.trim())   err.last_name   = 'Last name is required';
  if (!v.mobile.trim())      err.mobile      = 'Mobile number is required';
  else if (!/^\+?[0-9\s\-(]{10,15}$/.test(v.mobile.trim()))
    err.mobile = 'Enter a valid mobile number (10–15 digits)';
  if (!v.department)         err.department  = 'Department is required';
  if (!v.designation)        err.designation = 'Designation is required';
  if (v.work_email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.work_email.trim()))
    err.work_email = 'Enter a valid email address';
  if (v.linkedin_url && !/^https?:\/\//i.test(v.linkedin_url.trim()))
    err.linkedin_url = 'Must start with http:// or https://';
  return err;
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export default function StepPersonalDetails({ onSave, saving }) {
  const { user } = useAuth();

  const [values, setValues] = useState({
    first_name:           user?.first_name          || '',
    last_name:            user?.last_name           || '',
    email:                user?.email               || '',   // read-only
    work_email:           user?.work_email          || '',
    mobile:               user?.mobile              || '',
    department:           user?.department          || '',
    designation:          user?.designation         || '',
    location:             user?.location            || '',
    date_of_joining:      user?.date_of_joining     || '',
    linkedin_url:         user?.linkedin_url        || '',
    reporting_manager_id: user?.reporting_manager_id || null,
    avatar_url:           user?.avatar_url          || '',
  });
  const [errors, setErrors] = useState({});

  function set(name, value) {
    setValues(v => ({ ...v, [name]: value }));
    if (errors[name]) setErrors(e => { const c = { ...e }; delete c[name]; return c; });
  }

  function onChange(e) {
    set(e.target.name, e.target.value);
  }

  function handleSubmit() {
    const err = validate(values);
    if (Object.keys(err).length > 0) { setErrors(err); return; }

    const payload = { ...values };
    // Don't send read-only email through patch
    delete payload.email;
    // Convert empty strings to null for optional fields
    for (const key of ['work_email', 'designation', 'location', 'date_of_joining', 'linkedin_url', 'avatar_url']) {
      if (payload[key] === '') payload[key] = null;
    }

    onSave(payload);
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold tracking-tight">Personal Details</h2>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Your basic info is pre-filled from registration. Review and complete any missing fields.
        </p>
      </div>

      {/* Avatar */}
      <AvatarUpload
        value={values.avatar_url}
        onChange={v => set('avatar_url', v)}
      />

      {/* Section: Name */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <FormField
          label="First Name" name="first_name" required
          value={values.first_name} onChange={onChange} error={errors.first_name}
          autoComplete="given-name"
        />
        <FormField
          label="Last Name" name="last_name" required
          value={values.last_name} onChange={onChange} error={errors.last_name}
          autoComplete="family-name"
        />
      </div>

      {/* Section: Contact */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <FormField
          label="Login Email" name="email" type="email"
          value={values.email} onChange={() => {}}
          hint="This is your login email and cannot be changed here."
        />
        <FormField
          label="Work Email" name="work_email" type="email"
          value={values.work_email} onChange={onChange} error={errors.work_email}
          placeholder="work@company.com"
          hint="If different from your login email."
        />
      </div>

      <FormField
        label="Mobile Number" name="mobile" type="tel" required
        value={values.mobile} onChange={onChange} error={errors.mobile}
        autoComplete="tel" inputMode="tel"
        placeholder="+91 98765 43210"
      />

      {/* Section: Professional */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <FormField
          label="Department" name="department" as="select" required
          value={values.department} onChange={onChange} error={errors.department}
          options={DEPARTMENTS}
        />
        <FormField
          label="Designation" name="designation" as="select" required
          value={values.designation} onChange={onChange} error={errors.designation}
          options={DESIGNATIONS}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <FormField
          label="Location / Office" name="location" as="select"
          value={values.location} onChange={onChange} error={errors.location}
          options={LOCATIONS}
        />
        <FormField
          label="Date of Joining" name="date_of_joining" type="date"
          value={values.date_of_joining} onChange={onChange} error={errors.date_of_joining}
        />
      </div>

      {/* Manager picker */}
      <ManagerPicker
        value={values.reporting_manager_id}
        onChange={v => set('reporting_manager_id', v)}
      />

      {/* LinkedIn */}
      <FormField
        label="LinkedIn Profile" name="linkedin_url" type="url"
        value={values.linkedin_url} onChange={onChange} error={errors.linkedin_url}
        placeholder="https://linkedin.com/in/your-profile"
        hint="Optional — helps teammates find your profile."
      />

      {/* Footer */}
      <div className="flex items-center justify-end border-t border-slate-100 pt-5 dark:border-slate-800">
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
