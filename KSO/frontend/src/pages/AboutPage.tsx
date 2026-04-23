import { ArrowLeft, ArrowRight, Crown, Sparkles } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router-dom";

import arthurPhoto from "../assets/branding/arthur.jpg";
import kerianPhoto from "../assets/branding/kerian.jpg";
import ksoLogo from "../assets/branding/kso-logo.jpeg";
import { Seo } from "../components/seo/Seo";
import { Button } from "../components/ui/Button";
import { absoluteUrl } from "../seo/site";

const owners = [
  {
    name: "KERIAN",
    role: "Co-proprietaire #1",
    focus: "Vision produit et strategie orientation",
    photo: kerianPhoto,
    tone: "border-cyan-200 bg-cyan-50 text-cyan-800"
  },
  {
    name: "ARTHUR",
    role: "Co-proprietaire #2",
    focus: "Execution technique et design operationnel",
    photo: arthurPhoto,
    tone: "border-amber-200 bg-amber-50 text-amber-800"
  }
];

export function AboutPage() {
  const [showManifesto, setShowManifesto] = useState(false);
  const aboutUrl = absoluteUrl("/a-propos");

  const seoSchemas = [
    {
      "@context": "https://schema.org",
      "@type": "AboutPage",
      name: "A propos KSO",
      url: aboutUrl,
      description: "Vision, equipe et mission de la plateforme KSO."
    },
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        {
          "@type": "ListItem",
          position: 1,
          name: "Accueil",
          item: absoluteUrl("/")
        },
        {
          "@type": "ListItem",
          position: 2,
          name: "A propos",
          item: aboutUrl
        }
      ]
    }
  ];

  return (
    <>
      <Seo
        title="A propos de KSO | Orientation scolaire et suivi academique"
        description="Decouvrez la mission de KSO: aider les etablissements a mieux orienter et accompagner les eleves et etudiants avec un pilotage data-driven."
        path="/a-propos"
        keywords={["kso", "a propos kso", "orientation scolaire", "suivi academique"]}
        jsonLd={seoSchemas}
      />
      <div className="min-h-screen px-4 py-5 sm:px-6">
        <div className="mx-auto max-w-6xl">
        <header className="rounded-3xl border border-slate-200 bg-white/95 px-4 py-3 shadow-[0_26px_44px_-34px_rgba(7,21,41,0.75)] sm:px-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <Link to="/" className="flex items-center gap-3">
              <img src={ksoLogo} alt="Logo KSO" className="h-14 w-14 rounded-2xl border border-slate-300 object-cover shadow-sm" />
              <div>
                <p className="font-display text-3xl font-bold text-slate-900">KSO</p>
                <p className="text-[11px] uppercase tracking-[0.2em] text-slate-500">A propos</p>
              </div>
            </Link>

            <nav className="flex items-center gap-2">
              <Link to="/" className="premium-chip rounded-full px-4 py-2 text-sm font-semibold text-slate-700">
                Accueil
              </Link>
              <Link to="/a-propos" className="premium-chip rounded-full px-4 py-2 text-sm font-semibold text-slate-700">
                A propos
              </Link>
              <Link to="/login">
                <Button>Connexion</Button>
              </Link>
            </nav>
          </div>
        </header>

        <section className="mt-6 rounded-3xl border border-slate-200 bg-white/95 p-6 shadow-[0_26px_44px_-34px_rgba(7,21,41,0.75)] sm:p-8">
          <div className="grid gap-5 lg:grid-cols-[0.85fr_1.15fr] lg:items-center">
            <div className="flex flex-col items-center rounded-3xl border border-slate-200 bg-slate-50 p-5">
              <img src={ksoLogo} alt="Logo officiel KSO" className="h-32 w-32 rounded-3xl border border-slate-300 object-cover shadow-md" />
              <p className="mt-4 text-xs uppercase tracking-[0.2em] text-slate-500">Identite KSO</p>
              <div className="mt-3 h-24 w-24 kso-ring" />
            </div>

            <div>
              <p className="inline-flex items-center gap-2 rounded-full border border-cyan-200 bg-cyan-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-cyan-700">
                <Sparkles className="h-3.5 w-3.5" />
                Notre direction
              </p>
              <h1 className="mt-4 font-display text-4xl font-bold text-slate-900 sm:text-5xl">Une equipe proprietaire claire, une vision nette.</h1>
              <p className="mt-3 max-w-2xl text-sm text-slate-600">KSO met en avant le pilotage visuel, l orientation concrete et la collaboration ecole-famille.</p>
              <button
                type="button"
                onClick={() => setShowManifesto(true)}
                className="mt-5 inline-flex items-center gap-2 rounded-2xl border border-slate-900 bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800"
              >
                <Crown className="h-4 w-4" />
                Ouvrir le manifesto
              </button>
            </div>
          </div>
        </section>

        <section className="mt-6 grid gap-4 md:grid-cols-2">
          {owners.map((owner) => (
            <article key={owner.name} className="overflow-hidden rounded-3xl border border-slate-200 bg-white/95 shadow-[0_24px_40px_-34px_rgba(7,21,41,0.82)]">
              <div className="h-60 w-full overflow-hidden">
                <img src={owner.photo} alt={`Photo ${owner.name}`} className="h-full w-full object-cover" />
              </div>
              <div className="p-5">
                <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${owner.tone}`}>{owner.role}</span>
                <h2 className="mt-3 font-display text-3xl font-bold text-slate-900">{owner.name}</h2>
                <p className="mt-2 text-sm text-slate-600">{owner.focus}</p>
              </div>
            </article>
          ))}
        </section>

        <section className="mt-6 rounded-3xl border border-slate-200 bg-white/95 p-6 shadow-[0_26px_44px_-34px_rgba(7,21,41,0.75)] sm:p-8">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="font-display text-2xl font-bold text-slate-900">Pret a entrer dans la plateforme ?</p>
            <div className="flex flex-wrap gap-2">
              <Link to="/">
                <Button variant="ghost">
                  <ArrowLeft className="h-4 w-4" />
                  Retour accueil
                </Button>
              </Link>
              <Link to="/login">
                <Button>
                  Continuer
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            </div>
          </div>
        </section>
        </div>
      </div>

      {showManifesto ? (
        <div className="fixed inset-0 z-[130] flex items-center justify-center bg-[#071529]/64 px-4 backdrop-blur-sm">
          <div className="w-full max-w-xl rounded-3xl border border-white/45 bg-white/95 p-6 shadow-[0_36px_68px_-40px_rgba(7,21,41,0.9)]">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[11px] uppercase tracking-[0.2em] text-slate-500">Pop-up manifesto</p>
                <h2 className="mt-1 font-display text-2xl font-bold text-slate-900">ADN KSO</h2>
              </div>
              <button
                type="button"
                onClick={() => setShowManifesto(false)}
                className="rounded-full border border-slate-300 bg-white px-2.5 py-1.5 text-sm font-semibold text-slate-700"
              >
                Fermer
              </button>
            </div>

            <div className="mt-5 grid gap-3 sm:grid-cols-3">
              <article className="rounded-2xl border border-cyan-200 bg-cyan-50 p-3 text-sm font-semibold text-cyan-800">Pedagogie utile</article>
              <article className="rounded-2xl border border-blue-200 bg-blue-50 p-3 text-sm font-semibold text-blue-800">Design clair</article>
              <article className="rounded-2xl border border-amber-200 bg-amber-50 p-3 text-sm font-semibold text-amber-800">Action mesurable</article>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
