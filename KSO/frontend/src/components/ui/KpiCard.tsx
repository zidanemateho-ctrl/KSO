import { formatNumber } from "../../utils/format";

export function KpiCard({ label, value, subtitle }: { label: string; value: number | string; subtitle?: string }) {
  return (
    <article className="relative overflow-hidden rounded-3xl border border-slate-200 bg-white p-4 shadow-[0_20px_36px_-30px_rgba(12,36,71,0.82)]">
      <div className="pointer-events-none absolute -right-8 -top-8 h-24 w-24 rounded-full bg-cyan-200/45 blur-2xl" />
      <div className="relative flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">{label}</p>
          <p className="mt-2 font-display text-3xl font-bold text-slate-900">
            {typeof value === "number" ? formatNumber(value) : value}
          </p>
        </div>
        <span className="kso-ring inline-block h-10 w-10 shrink-0" />
      </div>
      {subtitle ? <p className="relative mt-1 text-sm text-slate-600">{subtitle}</p> : null}
    </article>
  );
}
