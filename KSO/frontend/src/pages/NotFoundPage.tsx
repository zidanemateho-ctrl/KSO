import { Link } from "react-router-dom";

import ksoLogo from "../assets/branding/kso-logo.jpeg";
import { Seo } from "../components/seo/Seo";
import { Button } from "../components/ui/Button";

export function NotFoundPage() {
  return (
    <div className="relative flex min-h-screen items-center justify-center px-4 py-10">
      <Seo title="Page introuvable | KSO" description="La page demandee est introuvable sur KSO." path="/404" noindex />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_16%_12%,rgba(13,182,217,0.18),transparent_34%),radial-gradient(circle_at_88%_8%,rgba(243,164,65,0.2),transparent_30%),linear-gradient(160deg,#e8f0ff_0%,#f4f8ff_60%,#fff6e9_100%)]" />

      <div className="relative w-full max-w-xl rounded-3xl border border-slate-200 bg-white/96 p-8 text-center shadow-[0_30px_56px_-36px_rgba(7,21,41,0.85)]">
        <img src={ksoLogo} alt="Logo KSO" className="mx-auto h-20 w-20 rounded-2xl border border-slate-300 object-cover shadow-sm" />
        <p className="mt-4 text-xs uppercase tracking-[0.2em] text-slate-500">Erreur 404</p>
        <h1 className="mt-2 font-display text-3xl font-extrabold text-slate-900">Page introuvable</h1>
        <p className="mt-3 text-sm text-slate-600">Le lien est invalide ou vous n avez pas encore acces a ce module.</p>
        <div className="mx-auto mt-5 h-14 w-14 kso-ring" />
        <Link to="/" className="mt-6 inline-block">
          <Button>Retour a l accueil</Button>
        </Link>
      </div>
    </div>
  );
}
