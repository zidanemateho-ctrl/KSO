import { ArrowLeft } from "lucide-react";
import { FormEvent, useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";

import ksoLogo from "../assets/branding/kso-logo.jpeg";
import { authApi } from "../api/services";
import { Seo } from "../components/seo/Seo";
import { Button } from "../components/ui/Button";
import { useToast } from "../hooks/useToast";

export function ResetPasswordPage() {
  const { success, error: toastError } = useToast();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = useMemo(() => searchParams.get("token")?.trim() || "", [searchParams]);

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);

    if (!token) {
      setFormError("Lien invalide: token manquant.");
      return;
    }

    if (password.length < 8) {
      setFormError("Le mot de passe doit contenir au moins 8 caracteres.");
      return;
    }

    if (password !== confirmPassword) {
      setFormError("Les mots de passe ne correspondent pas.");
      return;
    }

    setLoading(true);
    try {
      await authApi.resetPassword(token, password);
      success("Mot de passe mis a jour", "Connectez-vous avec votre nouveau mot de passe.");
      navigate("/login", { replace: true });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Reinitialisation impossible";
      setFormError(message);
      toastError("Echec reinitialisation", message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden px-4 py-8">
      <Seo
        title="Reinitialisation mot de passe | KSO"
        description="Mettez a jour votre mot de passe KSO via un lien de reinitialisation securise."
        path="/reset-password"
        noindex
      />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_14%_16%,rgba(13,182,217,0.16),transparent_34%),radial-gradient(circle_at_90%_10%,rgba(243,164,65,0.2),transparent_30%),linear-gradient(160deg,#e8f0ff_0%,#f4f8ff_60%,#fff6e9_100%)]" />

      <form
        onSubmit={handleSubmit}
        className="relative w-full max-w-xl rounded-3xl border border-slate-200 bg-white/95 p-7 shadow-[0_28px_48px_-36px_rgba(7,21,41,0.84)]"
      >
        <Link to="/login" className="inline-flex items-center gap-1 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
          <ArrowLeft className="h-3.5 w-3.5" />
          Retour connexion
        </Link>

        <div className="mt-3 flex items-center gap-3">
          <img src={ksoLogo} alt="Logo KSO" className="h-12 w-12 rounded-xl border border-slate-300 object-cover" />
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-slate-600">Securite compte</p>
            <h1 className="font-display text-3xl font-bold text-slate-900">Reinitialiser le mot de passe</h1>
          </div>
        </div>

        {!token ? (
          <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800">
            Lien invalide ou incomplet. Demandez un nouveau lien de reinitialisation.
          </div>
        ) : null}

        {formError ? <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800">{formError}</div> : null}

        <div className="mt-5 space-y-4">
          <label className="block text-sm font-medium text-slate-700">
            Nouveau mot de passe
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
              minLength={8}
              className="mt-1 w-full"
            />
          </label>

          <label className="block text-sm font-medium text-slate-700">
            Confirmer le mot de passe
            <input
              type="password"
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              required
              minLength={8}
              className="mt-1 w-full"
            />
          </label>
        </div>

        <Button type="submit" className="mt-6 w-full" disabled={loading || !token}>
          {loading ? "Mise a jour..." : "Mettre a jour"}
        </Button>
      </form>
    </div>
  );
}
