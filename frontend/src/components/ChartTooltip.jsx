export default function ChartTooltip({ active, payload, label, formatter }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2.5 shadow-lg text-sm">
      {label && (
        <p className="font-semibold text-slate-700 dark:text-slate-200 mb-1.5 text-xs uppercase tracking-wide">
          {label}
        </p>
      )}
      {payload.map((p, i) => (
        <p key={i} className="flex items-center gap-2">
          <span className="inline-block w-2.5 h-2.5 rounded-full shrink-0" style={{ background: p.color || p.fill }} />
          <span className="text-slate-600 dark:text-slate-300">{p.name !== 'count' && p.name !== 'value' ? p.name + ': ' : ''}</span>
          <span className="font-bold text-slate-900 dark:text-white">
            {formatter ? formatter(p.value) : p.value}
          </span>
        </p>
      ))}
    </div>
  );
}
