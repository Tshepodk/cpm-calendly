export function KpiTile({
  label,
  value,
  hint,
  accent,
}: {
  label: string;
  value: string | number;
  hint?: string;
  accent?: boolean;
}) {
  return (
    <div className="group relative overflow-hidden rounded-lg border border-border bg-surface p-4 transition-colors duration-150 hover:border-border-strong">
      {accent && (
        <span className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/40 to-transparent" />
      )}
      <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.12em] text-ink-muted">
        <span className={`inline-block h-1.5 w-1.5 rounded-full ${accent ? "bg-primary" : "bg-ink-faint"}`} />
        {label}
      </div>
      <div className="mt-3 font-mono text-[32px] leading-none tracking-tight tabular text-ink">
        {value}
      </div>
      {hint && <div className="mt-2 text-[11px] text-ink-muted">{hint}</div>}
    </div>
  );
}
