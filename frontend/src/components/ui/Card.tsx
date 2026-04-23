import clsx from "clsx";

export function Card({
  title,
  subtitle,
  actions,
  children,
  className
}: {
  title?: string;
  subtitle?: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section
      className={clsx(
        "paper-card group overflow-hidden rounded-3xl border border-slate-200 shadow-[0_24px_44px_-34px_rgba(7,21,41,0.72)] transition duration-200",
        className
      )}
    >
      {(title || actions || subtitle) && (
        <header className="relative border-b border-slate-200 bg-gradient-to-r from-slate-50 to-white px-5 py-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              {title ? <h2 className="font-display text-lg font-bold text-slate-900">{title}</h2> : null}
              {subtitle ? <p className="mt-1 text-sm text-slate-600">{subtitle}</p> : null}
            </div>
            {actions}
          </div>
        </header>
      )}
      <div className="p-5">{children}</div>
    </section>
  );
}
