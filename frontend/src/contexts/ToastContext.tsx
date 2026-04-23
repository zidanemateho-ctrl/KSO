import clsx from "clsx";
import { CheckCircle2, Info, TriangleAlert, X } from "lucide-react";
import { createContext, useCallback, useContext, useMemo, useState } from "react";

type ToastTone = "success" | "error" | "info";

interface ToastItem {
  id: string;
  title: string;
  description?: string;
  tone: ToastTone;
}

interface ToastContextValue {
  show: (payload: { title: string; description?: string; tone?: ToastTone }) => void;
  success: (title: string, description?: string) => void;
  error: (title: string, description?: string) => void;
  info: (title: string, description?: string) => void;
}

const ToastContext = createContext<ToastContextValue | undefined>(undefined);

function toneStyle(tone: ToastTone) {
  if (tone === "success") {
    return {
      icon: CheckCircle2,
      className: "border-emerald-300/85 bg-emerald-50/95 text-emerald-900"
    };
  }

  if (tone === "error") {
    return {
      icon: TriangleAlert,
      className: "border-rose-300/85 bg-rose-50/95 text-rose-900"
    };
  }

  return {
    icon: Info,
    className: "border-cyan-300/85 bg-cyan-50/95 text-cyan-900"
  };
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const remove = useCallback((id: string) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const show = useCallback(
    (payload: { title: string; description?: string; tone?: ToastTone }) => {
      const id = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
      const toast: ToastItem = {
        id,
        title: payload.title,
        description: payload.description,
        tone: payload.tone || "info"
      };

      setToasts((current) => [...current, toast]);

      window.setTimeout(() => {
        remove(id);
      }, 4200);
    },
    [remove]
  );

  const value = useMemo<ToastContextValue>(
    () => ({
      show,
      success: (title, description) => show({ title, description, tone: "success" }),
      error: (title, description) => show({ title, description, tone: "error" }),
      info: (title, description) => show({ title, description, tone: "info" })
    }),
    [show]
  );

  return (
    <ToastContext.Provider value={value}>
      {children}

      <div className="pointer-events-none fixed right-4 top-4 z-[120] flex w-[min(92vw,420px)] flex-col gap-2">
        {toasts.map((toast) => {
          const tone = toneStyle(toast.tone);
          const Icon = tone.icon;

          return (
            <div
              key={toast.id}
              className={clsx(
                "pointer-events-auto rounded-2xl border bg-white/95 px-4 py-3 shadow-[0_30px_56px_-36px_rgba(7,21,41,0.95)] backdrop-blur transition animate-in slide-in-from-right-4 fade-in duration-300",
                tone.className
              )}
            >
              <div className="flex items-start gap-3">
                <Icon className="mt-0.5 h-5 w-5 shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-bold">{toast.title}</p>
                  {toast.description ? <p className="mt-0.5 text-xs opacity-90">{toast.description}</p> : null}
                </div>
                <button
                  type="button"
                  aria-label="Fermer"
                  onClick={() => remove(toast.id)}
                  className="rounded-full p-1 opacity-70 transition hover:bg-black/5 hover:opacity-100"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToastContext() {
  const context = useContext(ToastContext);

  if (!context) {
    throw new Error("useToastContext doit etre utilise avec ToastProvider");
  }

  return context;
}
