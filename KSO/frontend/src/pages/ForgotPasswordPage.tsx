import { ArrowLeft } from "lucide-react";
import { FormEvent, useState } from "react";
import { Link } from "react-router-dom";

import ksoLogo from "../assets/branding/kso-logo.jpeg";
import { Seo } from "../components/seo/Seo";
import { Button } from "../components/ui/Button";
import { authApi } from "../api/services";
import { useToast } from "../hooks/useToast";

export function ForgotPasswordPage() {
  const { success, error: toastError } = useToast();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setMessage(null);

    try {
      const result = await authApi.forgotPassword(email);
      setMessage(result.message);
      success("Demande envoyee", "Si le compte existe, un email de reinitialisation est parti.");
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Impossible d'envoyer le lien";
      toastError("Erreur", errorMessage);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden px-4 py-8">
      <Seo
        title="Mot de passe oublie | KSO"
        description="Demandez un lien de reinitialisation de mot de passe pour votre compte KSO."
        path="/forgot-password"
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
            <h1 className="font-display text-3xl font-bold text-slate-900">Mot de passe oublie</h1>
          </div>
        </div>

        <p className="mt-3 text-sm text-slate-600">Entrez votre email. Si le compte existe, vous recevrez un lien de reinitialisation.</p>

        {message ? <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">{message}</div> : null}

        <label className="mt-5 block text-sm font-medium text-slate-700">
          Email
          <input
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
            className="mt-1 w-full"
            placeholder="vous@ecole.com"
          />
        </label>

        <Button type="submit" className="mt-6 w-full" disabled={loading}>
          {loading ? "Envoi..." : "Envoyer le lien"}
        </Button>
      </form>
    </div>
  );
}
