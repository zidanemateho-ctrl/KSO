export function EmptyState({ title, description }: { title: string; description?: string }) {
  return (
    <div className="rounded-3xl border border-dashed border-slate-300 bg-slate-50 p-6 text-center">
      <div className="mx-auto h-12 w-12 kso-ring" />
      <p className="mt-3 font-display text-lg font-bold text-slate-800">{title}</p>
      {description ? <p className="mx-auto mt-2 max-w-xl text-sm text-slate-600">{description}</p> : null}
    </div>
  );
}
