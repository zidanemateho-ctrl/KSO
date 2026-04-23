import clsx from "clsx";

export function Button({
  children,
  className,
  variant = "primary",
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost";
}) {
  return (
    <button
      className={clsx(
        "inline-flex items-center justify-center gap-2 rounded-2xl px-4 py-2.5 text-sm font-semibold transition duration-200 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60",
        variant === "primary" &&
          "bg-gradient-to-r from-[#0c2447] via-[#12396a] to-[#1a578e] text-white shadow-[0_16px_28px_-16px_rgba(12,36,71,0.88)] hover:brightness-[1.05]",
        variant === "secondary" &&
          "bg-gradient-to-r from-[#b56d1b] to-[#d2882e] text-white shadow-[0_14px_24px_-14px_rgba(181,109,27,0.85)] hover:brightness-[1.05]",
        variant === "ghost" &&
          "border border-slate-300 bg-white/95 text-slate-700 hover:bg-slate-50 hover:text-slate-900",
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
}
