import { useState, useEffect, useRef } from 'react';
import { api } from '../../lib/api.js';

const MAX_FILE_BYTES = 10 * 1024 * 1024; // 10 MB
const ALLOWED_TYPES  = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'];
const ALLOWED_EXT    = '.pdf, .jpg, .jpeg, .png, .webp';

// ---------------------------------------------------------------------------
// Status badge
// ---------------------------------------------------------------------------

const STATUS_STYLE = {
  Pending:  'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  Approved: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  Rejected: 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400',
};

function StatusBadge({ status }) {
  return (
    <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${STATUS_STYLE[status] || STATUS_STYLE.Pending}`}>
      {status}
    </span>
  );
}

// ---------------------------------------------------------------------------
// File picker with drag-and-drop
// ---------------------------------------------------------------------------

function FilePicker({ value, fileName, onSelect, onClear, error }) {
  const inputRef = useRef(null);
  const [dragging, setDragging] = useState(false);

  function processFile(file) {
    if (!file) return;
    if (!ALLOWED_TYPES.includes(file.type)) {
      onSelect(null, null, null, 'Only PDF, JPG, PNG, or WebP files are allowed.');
      return;
    }
    if (file.size > MAX_FILE_BYTES) {
      onSelect(null, null, null, 'File must be under 10 MB.');
      return;
    }
    const reader = new FileReader();
    reader.onload = e => onSelect(e.target.result, file.name, file.type, null);
    reader.readAsDataURL(file);
  }

  return (
    <div>
      <label className="label">Upload Certificate</label>
      <div
        onDragOver={e => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={e => { e.preventDefault(); setDragging(false); processFile(e.dataTransfer.files?.[0]); }}
        className={`relative flex flex-col items-center justify-center rounded-xl border-2 border-dashed
                    px-4 py-6 text-center transition-colors cursor-pointer
                    ${dragging ? 'border-brand-400 bg-brand-50 dark:border-brand-500 dark:bg-brand-500/10' :
                      value ? 'border-emerald-400 bg-emerald-50 dark:border-emerald-600 dark:bg-emerald-900/10' :
                      'border-slate-300 bg-slate-50 hover:border-brand-400 hover:bg-brand-50/50 dark:border-slate-700 dark:bg-slate-800/40 dark:hover:border-brand-500'}`}
        onClick={() => !value && inputRef.current?.click()}
      >
        {value ? (
          <div className="flex items-center gap-3">
            {/* File icon */}
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-emerald-100 dark:bg-emerald-900/30">
              <svg viewBox="0 0 24 24" className="h-5 w-5 text-emerald-600 dark:text-emerald-400"
                   fill="none" stroke="currentColor" strokeWidth="1.8">
                <path strokeLinecap="round" strokeLinejoin="round"
                  d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
              </svg>
            </div>
            <div className="min-w-0 text-left">
              <p className="truncate text-sm font-medium text-slate-800 dark:text-slate-200">{fileName}</p>
              <p className="text-xs text-emerald-600 dark:text-emerald-400">File attached</p>
            </div>
            <button type="button" onClick={e => { e.stopPropagation(); onClear(); }}
                    className="ml-2 rounded-lg p-1 text-slate-400 hover:bg-slate-200 hover:text-slate-600
                               dark:hover:bg-slate-700 dark:hover:text-slate-300">
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        ) : (
          <>
            <svg viewBox="0 0 24 24" className="mb-2 h-8 w-8 text-slate-400" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path strokeLinecap="round" strokeLinejoin="round"
                d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5m-13.5-9L12 3m0 0 4.5 4.5M12 3v13.5" />
            </svg>
            <p className="text-sm font-medium text-slate-600 dark:text-slate-400">
              Drag & drop or <span className="text-brand-600 dark:text-brand-400">browse</span>
            </p>
            <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">PDF · JPG · PNG · WebP · max 10 MB</p>
          </>
        )}
      </div>
      {error && <p className="mt-1 text-xs text-rose-500">{error}</p>}
      <input ref={inputRef} type="file" accept={ALLOWED_EXT} className="hidden"
             onChange={e => processFile(e.target.files?.[0])} />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Add certificate form
// ---------------------------------------------------------------------------

const EMPTY_FORM = {
  cert_name: '', issuing_org: '', issue_date: '', expiry_date: '',
  no_expiry: false, credential_id: '', credential_url: '',
  file_data: '', file_name: '', file_type: '',
};

function AddCertForm({ onAdded }) {
  const [values, setValues] = useState(EMPTY_FORM);
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [fileError, setFileError] = useState('');

  function set(k, v) {
    setValues(p => ({ ...p, [k]: v }));
    if (errors[k]) setErrors(p => { const c = { ...p }; delete c[k]; return c; });
  }

  function handleFile(data, name, type, err) {
    setFileError(err || '');
    set('file_data', data || '');
    set('file_name', name || '');
    set('file_type', type || '');
  }

  function validate() {
    const err = {};
    if (!values.cert_name.trim())  err.cert_name  = 'Certificate name is required';
    if (!values.issuing_org.trim()) err.issuing_org = 'Issuing organization is required';
    if (values.credential_url && !/^https?:\/\//i.test(values.credential_url.trim()))
      err.credential_url = 'Must start with http:// or https://';
    setErrors(err);
    return Object.keys(err).length === 0;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!validate()) return;
    setSubmitting(true);
    try {
      const data = await api.post('/users/me/certifications', {
        ...values,
        cert_name:   values.cert_name.trim(),
        issuing_org: values.issuing_org.trim(),
        issue_date:  values.issue_date  || null,
        expiry_date: values.no_expiry ? null : (values.expiry_date || null),
        credential_id:  values.credential_id.trim()  || null,
        credential_url: values.credential_url.trim() || null,
        file_data: values.file_data || null,
        file_name: values.file_name || null,
        file_type: values.file_type || null,
      });
      onAdded(data.certification);
      setValues(EMPTY_FORM);
      setErrors({});
      setFileError('');
    } catch (err) {
      setErrors({ _server: err.message });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 rounded-xl border border-slate-200 p-4 dark:border-slate-700">
      <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">Add Certificate</p>

      {errors._server && (
        <div className="rounded-lg border border-rose-300 bg-rose-50 px-3 py-2 text-sm text-rose-700
                        dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-300">
          {errors._server}
        </div>
      )}

      {/* Row 1: Name + Org */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <label className="label">Certificate Name <span className="text-rose-500">*</span></label>
          <input className={`field ${errors.cert_name ? 'border-rose-500 focus:border-rose-500 focus:ring-rose-500/30' : ''}`}
                 value={values.cert_name}
                 onChange={e => set('cert_name', e.target.value)}
                 placeholder="AWS Solutions Architect" />
          {errors.cert_name && <p className="field-error">{errors.cert_name}</p>}
        </div>
        <div>
          <label className="label">Issuing Organization <span className="text-rose-500">*</span></label>
          <input className={`field ${errors.issuing_org ? 'border-rose-500 focus:border-rose-500 focus:ring-rose-500/30' : ''}`}
                 value={values.issuing_org}
                 onChange={e => set('issuing_org', e.target.value)}
                 placeholder="Amazon Web Services" />
          {errors.issuing_org && <p className="field-error">{errors.issuing_org}</p>}
        </div>
      </div>

      {/* Row 2: Dates */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <label className="label">Issue Date</label>
          <input type="date" className="field" value={values.issue_date}
                 onChange={e => set('issue_date', e.target.value)} />
        </div>
        <div>
          <label className="label">Expiry Date</label>
          <input type="date" className="field" value={values.expiry_date}
                 disabled={values.no_expiry}
                 onChange={e => set('expiry_date', e.target.value)} />
          <label className="mt-1.5 flex cursor-pointer items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
            <input type="checkbox" className="accent-brand-600" checked={values.no_expiry}
                   onChange={e => set('no_expiry', e.target.checked)} />
            No expiry date
          </label>
        </div>
      </div>

      {/* Row 3: Credential ID + URL */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <label className="label">Credential ID</label>
          <input className="field" value={values.credential_id}
                 onChange={e => set('credential_id', e.target.value)}
                 placeholder="ABC-123-XYZ" />
        </div>
        <div>
          <label className="label">Credential URL</label>
          <input type="url" className={`field ${errors.credential_url ? 'border-rose-500 focus:border-rose-500 focus:ring-rose-500/30' : ''}`}
                 value={values.credential_url}
                 onChange={e => set('credential_url', e.target.value)}
                 placeholder="https://verify.example.com/…" />
          {errors.credential_url && <p className="field-error">{errors.credential_url}</p>}
        </div>
      </div>

      {/* File upload */}
      <FilePicker
        value={values.file_data}
        fileName={values.file_name}
        onSelect={handleFile}
        onClear={() => { set('file_data',''); set('file_name',''); set('file_type',''); }}
        error={fileError}
      />

      <div className="flex justify-end">
        <button type="submit" disabled={submitting} className="btn-primary flex items-center gap-2">
          {submitting ? (
            <>
              <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 0 1 8-8v4a4 4 0 0 0-4 4H4Z"/>
              </svg>
              Adding…
            </>
          ) : (
            <>
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
              </svg>
              Add Certificate
            </>
          )}
        </button>
      </div>
    </form>
  );
}

// ---------------------------------------------------------------------------
// Cert table row
// ---------------------------------------------------------------------------

function CertRow({ cert, onDelete }) {
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  async function handleDelete() {
    setDeleting(true);
    try {
      await api.del(`/users/me/certifications/${cert.id}`);
      onDelete(cert.id);
    } catch (err) {
      alert(err.message);
    } finally {
      setDeleting(false);
      setConfirmDelete(false);
    }
  }

  return (
    <tr className="border-b border-slate-100 last:border-0 dark:border-slate-800">
      <td className="py-3 pr-3">
        <p className="text-sm font-medium text-slate-800 dark:text-slate-200">{cert.cert_name}</p>
        <p className="text-xs text-slate-500 dark:text-slate-400">{cert.issuing_org}</p>
      </td>
      <td className="py-3 pr-3 text-xs text-slate-500 dark:text-slate-400 hidden sm:table-cell">
        {cert.issue_date || '—'}
      </td>
      <td className="py-3 pr-3 text-xs text-slate-500 dark:text-slate-400 hidden md:table-cell">
        {cert.no_expiry ? 'No expiry' : (cert.expiry_date || '—')}
      </td>
      <td className="py-3 pr-3">
        <StatusBadge status={cert.status} />
      </td>
      <td className="py-3 pr-3 text-xs text-slate-500 dark:text-slate-400 hidden lg:table-cell max-w-[160px]">
        {cert.reviewer_comment
          ? <span className="line-clamp-2 italic">"{cert.reviewer_comment}"</span>
          : <span className="text-slate-300 dark:text-slate-600">—</span>}
      </td>
      <td className="py-3 text-right">
        <div className="flex items-center justify-end gap-2">
          {cert.credential_url && (
            <a href={cert.credential_url} target="_blank" rel="noopener noreferrer"
               className="text-xs text-brand-600 hover:underline dark:text-brand-400">
              View
            </a>
          )}
          {cert.status === 'Pending' && (
            confirmDelete ? (
              <span className="flex items-center gap-1">
                <button onClick={handleDelete} disabled={deleting}
                        className="text-xs font-medium text-rose-600 hover:underline dark:text-rose-400">
                  {deleting ? '…' : 'Confirm'}
                </button>
                <button onClick={() => setConfirmDelete(false)}
                        className="text-xs text-slate-400 hover:underline">
                  Cancel
                </button>
              </span>
            ) : (
              <button onClick={() => setConfirmDelete(true)}
                      className="text-xs text-rose-500 hover:underline dark:text-rose-400">
                Delete
              </button>
            )
          )}
        </div>
      </td>
    </tr>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export default function StepCertifications({ onSave, onBack, saving }) {
  const [certs, setCerts]   = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/users/me/certifications')
      .then(d => setCerts(d.certifications || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  function handleAdded(cert) {
    setCerts(prev => [cert, ...prev]);
  }

  function handleDelete(id) {
    setCerts(prev => prev.filter(c => c.id !== id));
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-xl font-semibold tracking-tight">Certifications</h2>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Add your professional certifications. After submission, your manager or admin will review and approve them.
        </p>
      </div>

      {/* Add form */}
      <AddCertForm onAdded={handleAdded} />

      {/* Cert list */}
      {loading ? (
        <div className="space-y-2">
          {[1, 2].map(n => (
            <div key={n} className="h-14 animate-pulse rounded-xl bg-slate-100 dark:bg-slate-800" />
          ))}
        </div>
      ) : certs.length > 0 ? (
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
            Your Certificates ({certs.length})
          </p>
          <div className="rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[540px]">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-800/60">
                    <th className="py-2.5 pr-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400">Certificate</th>
                    <th className="py-2.5 pr-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 hidden sm:table-cell">Issued</th>
                    <th className="py-2.5 pr-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 hidden md:table-cell">Expiry</th>
                    <th className="py-2.5 pr-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400">Status</th>
                    <th className="py-2.5 pr-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 hidden lg:table-cell">Comment</th>
                    <th className="py-2.5 text-right text-xs font-semibold text-slate-500 dark:text-slate-400">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 px-2">
                  {certs.map(c => (
                    <CertRow key={c.id} cert={c} onDelete={handleDelete} />
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Approval hint */}
          <div className="mt-3 flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5
                          dark:border-amber-800/40 dark:bg-amber-900/10">
            <svg viewBox="0 0 24 24" className="mt-0.5 h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400"
                 fill="none" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round"
                d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
            </svg>
            <p className="text-xs text-amber-700 dark:text-amber-300">
              Pending certificates are awaiting review by your lead or manager. You'll be notified once reviewed.
            </p>
          </div>
        </div>
      ) : (
        <p className="rounded-lg border border-dashed border-slate-300 dark:border-slate-700 px-4 py-4 text-sm text-slate-400 dark:text-slate-500 text-center">
          No certificates added yet. Use the form above to add your first one.
        </p>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between border-t border-slate-100 pt-5 dark:border-slate-800">
        <button type="button" onClick={onBack}
                className="btn-ghost flex items-center gap-1.5 text-sm">
          <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18" />
          </svg>
          Back
        </button>

        <button type="button" onClick={onSave} disabled={saving}
                className="btn-primary flex items-center gap-2">
          {saving ? (
            <>
              <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 0 1 8-8v4a4 4 0 0 0-4 4H4Z"/>
              </svg>
              Saving…
            </>
          ) : (
            <>
              Complete Profile
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
              </svg>
            </>
          )}
        </button>
      </div>
    </div>
  );
}
