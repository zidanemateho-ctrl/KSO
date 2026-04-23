export function Loader({ label = "Chargement..." }: { label?: string }) {
  return (
    <div className="inline-flex items-center gap-3 rounded-2xl border border-slate-200 bg-white/95 px-4 py-3 text-sm font-medium text-slate-700 shadow-[0_18px_36px_-26px_rgba(12,36,71,0.7)]">
      <span className="relative inline-flex h-4 w-4 items-center justify-center">
        <span className="absolute h-4 w-4 animate-[glow-pulse_1.1s_ease-in-out_infinite] rounded-full bg-cyan-500/30" />
        <span className="h-3 w-3 animate-spin rounded-full border-2 border-slate-300 border-t-[#12396a]" />
      </span>
      {label}
    </div>
  );
}
