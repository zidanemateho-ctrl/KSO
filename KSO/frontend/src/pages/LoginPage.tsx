import { ArrowLeft, CirclePlay } from "lucide-react";
import { FormEvent, useState } from "react";
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";

import ksoLogo from "../assets/branding/kso-logo.jpeg";
import { Seo } from "../components/seo/Seo";
import { Button } from "../components/ui/Button";
import { useAuth } from "../hooks/useAuth";
import { useToast } from "../hooks/useToast";

export function LoginPage() {
  const { user, login } = useAuth();
  const { success, error: toastError, info } = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState("admin.lycee@kso.local");
  const [password, setPassword] = useState("Admin123!");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (user) {
    return <Navigate to="/dashboard" replace />;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);

    try {
      await login(email, password);
      success("Connexion reussie", "Bienvenue dans votre espace KSO.");
      const from = (location.state as { from?: { pathname?: string } } | null)?.from?.pathname;
      navigate(from || "/dashboard", { replace: true });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Connexion impossible";
      setError(message);
      toastError("Connexion impossible", message);
    } finally {
      setLoading(false);
    }
  }

  function runQuickDemo() {
    info("Demo UI", "Execution d un test de securite visuelle.");
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden px-4 py-8">
      <Seo
        title="Connexion | KSO"
        description="Connectez-vous a KSO pour acceder a votre espace securise de suivi academique et d orientation."
        path="/login"
        noindex
      />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_14%_16%,rgba(13,182,217,0.16),transparent_34%),radial-gradient(circle_at_90%_10%,rgba(243,164,65,0.2),transparent_30%),linear-gradient(160deg,#e8f0ff_0%,#f4f8ff_60%,#fff6e9_100%)]" />

      <div className="relative grid w-full max-w-6xl gap-6 lg:grid-cols-[1.05fr_0.95fr]">
        <aside className="hidden rounded-3xl border border-slate-200 bg-white/95 p-8 text-slate-900 shadow-[0_28px_48px_-36px_rgba(7,21,41,0.84)] lg:flex lg:flex-col">
          <div className="flex items-center gap-3">
            <img src={ksoLogo} alt="Logo KSO" className="h-16 w-16 rounded-2xl border border-slate-300 object-cover shadow-sm" />
            <div>
              <p className="font-display text-3xl font-bold text-slate-900">KSO</p>
              <p className="text-[11px] uppercase tracking-[0.2em] text-slate-500">Secure Access</p>
            </div>
          </div>

          <h1 className="mt-6 font-display text-4xl font-bold leading-tight text-slate-900">
            Interface pro.
            <br />
            Connexion fluide.
          </h1>

          <div className="mt-7 grid gap-3 sm:grid-cols-3">
            <article className="rounded-2xl border border-slate-200 bg-slate-50 p-3 text-center">
              <div className="mx-auto h-10 w-10 kso-ring" />
              <p className="mt-2 text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Uptime</p>
              <p className="font-display text-xl font-bold text-slate-900">99.2%</p>
            </article>
            <article className="rounded-2xl border border-slate-200 bg-slate-50 p-3 text-center">
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Auth</p>
              <p className="mt-2 font-display text-xl font-bold text-slate-900">MFA Ready</p>
            </article>
            <article className="rounded-2xl border border-slate-200 bg-slate-50 p-3 text-center">
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Sessions</p>
              <p className="mt-2 font-display text-xl font-bold text-slate-900">Live</p>
            </article>
          </div>

          <button
            type="button"
            onClick={runQuickDemo}
            className="mt-6 inline-flex w-fit items-center gap-2 rounded-2xl border border-slate-900 bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800"
          >
            <CirclePlay className="h-4 w-4" />
            Executer `security.check()`
          </button>
        </aside>

        <form
          onSubmit={handleSubmit}
          className="rounded-3xl border border-slate-200 bg-white/95 p-7 shadow-[0_28px_48px_-36px_rgba(7,21,41,0.84)]"
        >
          <Link to="/" className="inline-flex items-center gap-1 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
            <ArrowLeft className="h-3.5 w-3.5" />
            Retour presentation
          </Link>

          <div className="mt-3 flex items-center gap-3">
            <img src={ksoLogo} alt="Logo KSO" className="h-12 w-12 rounded-xl border border-slate-300 object-cover" />
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-slate-600">Connexion securisee</p>
              <h2 className="font-display text-3xl font-bold text-slate-900">Bienvenue sur KSO</h2>
            </div>
          </div>

          {error ? (
            <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800">{error}</div>
          ) : null}

          <div className="mt-5 space-y-4">
            <label className="block text-sm font-medium text-slate-700">
              Email
              <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} required className="mt-1 w-full" />
            </label>

            <label className="block text-sm font-medium text-slate-700">
              Mot de passe
              <input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
                className="mt-1 w-full"
              />
            </label>

            <div className="flex justify-end">
              <Link to="/forgot-password" className="text-xs font-semibold text-slate-700 hover:text-slate-900">
                Mot de passe oublie ?
              </Link>
            </div>
          </div>

          <Button type="submit" className="mt-6 w-full" disabled={loading}>
            {loading ? "Connexion..." : "Se connecter"}
          </Button>

          <div className="mt-4 flex items-center justify-between text-sm text-slate-600">
            <p>Pas encore de compte ?</p>
            <Link to="/register" className="font-semibold text-slate-900 hover:text-slate-700">
              Creer un compte
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}
