export default function FormField({
  label, name, type = 'text', value, onChange, error, placeholder,
  autoComplete, required = false, hint, as = 'input', options = [], inputMode,
}) {
  const isSelect = as === 'select';
  const id = `f-${name}`;
  return (
    <div className="w-full">
      <label htmlFor={id} className="label">
        {label}{required && <span className="ml-0.5 text-rose-500">*</span>}
      </label>
      {isSelect ? (
        <select
          id={id}
          name={name}
          value={value}
          onChange={onChange}
          className="field"
          required={required}
        >
          <option value="">Select {label.toLowerCase()}…</option>
          {options.map(opt => (
            <option key={opt.value ?? opt} value={opt.value ?? opt}>
              {opt.label ?? opt}
            </option>
          ))}
        </select>
      ) : (
        <input
          id={id}
          name={name}
          type={type}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          autoComplete={autoComplete}
          inputMode={inputMode}
          required={required}
          className="field"
        />
      )}
      {hint && !error && (
        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{hint}</p>
      )}
      {error && <p className="field-error">{error}</p>}
    </div>
  );
}
