import { ArrowRight, CirclePlay, Cpu, Sparkles } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router-dom";

import ksoLogo from "../assets/branding/kso-logo.jpeg";
import { Seo } from "../components/seo/Seo";
import { Button } from "../components/ui/Button";
import { absoluteUrl } from "../seo/site";

const metrics = [
  { label: "Etablissements actifs", value: "12" },
  { label: "Suivi live", value: "24/7" },
  { label: "Alertes traitees", value: "98%" }
];

const visualBlocks = [
  { title: "Risque", value: "24%", color: "bg-cyan-500" },
  { title: "Progression", value: "61%", color: "bg-blue-700" },
  { title: "Orientation", value: "15%", color: "bg-amber-500" }
];

const faqItems = [
  {
    question: "KSO prend-il en compte les eleves francophones et anglophones ?",
    answer:
      "Oui. KSO couvre les parcours francophones et anglophones, y compris Lower Sixth et Upper Sixth, avec des recommandations adaptees."
  },
  {
    question: "Les filieres techniques sont-elles incluses dans l orientation ?",
    answer:
      "Oui. La filiere TECHNIQUE est supportee au meme titre que les filieres scientifique, litteraire et economique."
  },
  {
    question: "KSO aide-t-il aussi les etudiants universitaires ?",
    answer:
      "Oui. KSO prend en charge les niveaux licence et master pour le suivi academique, l orientation et les opportunites de parcours."
  },
  {
    question: "Peut-on suivre les notes, les alertes et la progression sur une seule plateforme ?",
    answer:
      "Oui. KSO centralise notes, analytics, alertes, plans d accompagnement et communication entre ecole, enseignants, parents et apprenants."
  }
];

const landingKeywords = [
  "orientation scolaire cameroun",
  "plateforme orientation eleves",
  "suivi academique lycee",
  "orientation anglophone lower sixth upper sixth",
  "orientation filiere technique",
  "logiciel gestion eleves etudiants"
];

export function LandingPage() {
  const [demoOpen, setDemoOpen] = useState(false);
  const landingUrl = absoluteUrl("/");

  const seoSchemas = [
    {
      "@context": "https://schema.org",
      "@type": "WebSite",
      name: "KSO",
      url: landingUrl,
      inLanguage: "fr",
      description: "Plateforme SaaS d orientation scolaire et de suivi academique multi-etablissements."
    },
    {
      "@context": "https://schema.org",
      "@type": "SoftwareApplication",
      name: "KSO",
      applicationCategory: "EducationalApplication",
      operatingSystem: "Web",
      url: landingUrl,
      offers: {
        "@type": "Offer",
        price: "0",
        priceCurrency: "XAF"
      },
      featureList: [
        "Suivi des notes et analytics",
        "Orientation scolaire et universitaire",
        "Support francophone et anglophone",
        "Prise en charge des filieres techniques"
      ]
    },
    {
      "@context": "https://schema.org",
      "@type": "Organization",
      name: "KSO",
      url: landingUrl,
      logo: absoluteUrl("/kso-logo.jpeg")
    },
    {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: faqItems.map((item) => ({
        "@type": "Question",
        name: item.question,
        acceptedAnswer: {
          "@type": "Answer",
          text: item.answer
        }
      }))
    }
  ];

  return (
    <>
      <Seo
        title="KSO | Plateforme d orientation scolaire et suivi academique"
        description="KSO est une plateforme SaaS pour l orientation scolaire et universitaire: suivi des notes, analytics, alertes et accompagnement des eleves et etudiants francophones, anglophones et techniques."
        path="/"
        keywords={landingKeywords}
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
                <p className="text-[11px] uppercase tracking-[0.2em] text-slate-500">Learning Intelligence</p>
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

        <section className="mt-6 grid gap-5 lg:grid-cols-[1.05fr_0.95fr]">
          <article className="rounded-3xl border border-slate-200 bg-white/95 p-6 shadow-[0_26px_44px_-34px_rgba(7,21,41,0.75)] sm:p-8">
            <p className="inline-flex items-center gap-2 rounded-full border border-cyan-200 bg-cyan-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-cyan-700">
              <Sparkles className="h-3.5 w-3.5" />
              Nouvelle interface KSO
            </p>

            <h1 className="mt-4 font-display text-4xl font-bold leading-tight text-slate-900 sm:text-5xl">
              Orientation plus claire.
              <br />
              Decision plus rapide.
            </h1>

            <div className="mt-6 grid gap-3 sm:grid-cols-3">
              {metrics.map((item) => (
                <article key={item.label} className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
                  <p className="font-display text-2xl font-bold text-slate-900">{item.value}</p>
                  <p className="text-xs uppercase tracking-[0.12em] text-slate-500">{item.label}</p>
                </article>
              ))}
            </div>

            <div className="mt-6 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => setDemoOpen(true)}
                className="inline-flex items-center gap-2 rounded-2xl border border-slate-900 bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800"
              >
                <CirclePlay className="h-4 w-4" />
                Executer `orientation.predict()`
              </button>

              <Link to="/register">
                <Button variant="ghost">
                  Creer un compte
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            </div>
          </article>

          <article className="rounded-3xl border border-slate-200 bg-white/95 p-6 shadow-[0_26px_44px_-34px_rgba(7,21,41,0.75)] sm:p-8">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Vue graphique</p>
            <div className="mt-4 grid gap-4 sm:grid-cols-[140px_minmax(0,1fr)] sm:items-center">
              <div className="mx-auto h-[132px] w-[132px] kso-ring sm:mx-0" />
              <div className="space-y-2">
                {visualBlocks.map((block) => (
                  <div key={block.title} className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2">
                    <div className="flex items-center justify-between text-sm font-semibold text-slate-700">
                      <span>{block.title}</span>
                      <span>{block.value}</span>
                    </div>
                    <div className="mt-2 h-2 rounded-full bg-slate-200">
                      <div className={`h-2 rounded-full ${block.color}`} style={{ width: block.value }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-sm font-semibold text-slate-900">Execution en 1 clic</p>
              <p className="mt-1 text-xs text-slate-600">Lance des fonctions pedagogiques depuis l interface sans naviguer entre plusieurs ecrans.</p>
              <span className="mt-3 inline-flex items-center gap-1 rounded-full border border-cyan-200 bg-cyan-50 px-3 py-1 text-xs font-semibold text-cyan-700">
                <Cpu className="h-3.5 w-3.5" />
                Pipeline actif
              </span>
            </div>
          </article>
        </section>

        <section className="mt-6 rounded-3xl border border-slate-200 bg-white/95 p-6 shadow-[0_26px_44px_-34px_rgba(7,21,41,0.75)] sm:p-8">
          <div className="grid gap-3 md:grid-cols-3">
            <article className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-xs uppercase tracking-[0.14em] text-slate-500">Collecte</p>
              <p className="mt-2 font-semibold text-slate-900">Notes, absences, comportements</p>
            </article>
            <article className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-xs uppercase tracking-[0.14em] text-slate-500">Analyse</p>
              <p className="mt-2 font-semibold text-slate-900">Diagrammes et score de priorite</p>
            </article>
            <article className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-xs uppercase tracking-[0.14em] text-slate-500">Action</p>
              <p className="mt-2 font-semibold text-slate-900">Orientation concrete et suivi</p>
            </article>
          </div>

          <div className="mt-5 rounded-2xl border border-slate-200 bg-white px-4 py-4 text-sm text-slate-700">
            KSO accompagne les etablissements francophones et anglophones, y compris les parcours techniques.
            <Link to="/a-propos" className="ml-1 font-semibold text-slate-900 underline-offset-2 hover:underline">
              Decouvrir l equipe et la vision KSO
            </Link>
            .
          </div>
        </section>

        <section className="mt-6 rounded-3xl border border-slate-200 bg-white/95 p-6 shadow-[0_26px_44px_-34px_rgba(7,21,41,0.75)] sm:p-8">
          <h2 className="font-display text-3xl font-bold text-slate-900">Questions frequentes sur KSO</h2>
          <p className="mt-2 text-sm text-slate-600">
            Cette FAQ couvre les points les plus recherches sur l orientation scolaire, le suivi academique et l accompagnement des apprenants.
          </p>
          <div className="mt-5 grid gap-3 md:grid-cols-2">
            {faqItems.map((item) => (
              <article key={item.question} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <h3 className="text-base font-semibold text-slate-900">{item.question}</h3>
                <p className="mt-2 text-sm text-slate-600">{item.answer}</p>
              </article>
            ))}
          </div>
        </section>
        </div>
      </div>

      {demoOpen ? (
        <div className="fixed inset-0 z-[130] flex items-center justify-center bg-[#071529]/64 px-4 backdrop-blur-sm">
          <div className="w-full max-w-xl rounded-3xl border border-white/45 bg-white/95 p-6 shadow-[0_36px_68px_-40px_rgba(7,21,41,0.9)]">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[11px] uppercase tracking-[0.2em] text-slate-500">Pop-up demo</p>
                <h2 className="mt-1 font-display text-2xl font-bold text-slate-900">Resultat `orientation.predict()`</h2>
              </div>
              <button
                type="button"
                onClick={() => setDemoOpen(false)}
                className="rounded-full border border-slate-300 bg-white px-2.5 py-1.5 text-sm font-semibold text-slate-700"
              >
                Fermer
              </button>
            </div>

            <div className="mt-5 grid gap-3 sm:grid-cols-3">
              <article className="rounded-2xl border border-cyan-200 bg-cyan-50 p-3 text-sm font-semibold text-cyan-800">Profil: Scientifique applique</article>
              <article className="rounded-2xl border border-blue-200 bg-blue-50 p-3 text-sm font-semibold text-blue-800">Niveau fit: 92%</article>
              <article className="rounded-2xl border border-amber-200 bg-amber-50 p-3 text-sm font-semibold text-amber-800">Action: mentoring</article>
            </div>

            <p className="mt-4 text-sm text-slate-600">Exemple pedagogique: le moteur propose une orientation argumentee et un plan d action lisible par equipe + parent.</p>
          </div>
        </div>
      ) : null}
    </>
  );
}
