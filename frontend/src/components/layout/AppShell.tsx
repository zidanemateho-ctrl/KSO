import clsx from "clsx";
import {
  BarChart3,
  Bell,
  BookOpen,
  CalendarDays,
  ClipboardList,
  Cpu,
  Flame,
  GraduationCap,
  LayoutDashboard,
  LogOut,
  MessageSquare,
  PlayCircle,
  School,
  Search,
  Sparkles,
  Target,
  X
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { Link, NavLink, useLocation } from "react-router-dom";

import ksoLogo from "../../assets/branding/kso-logo.jpeg";
import { Seo } from "../../components/seo/Seo";
import { useAuth } from "../../hooks/useAuth";
import { useToast } from "../../hooks/useToast";
import { Role } from "../../types/models";

interface NavItem {
  to: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  roles: Role[];
}

const navItems: NavItem[] = [
  {
    to: "/dashboard",
    label: "Dashboard",
    icon: LayoutDashboard,
    roles: [
      "SUPER_ADMIN",
      "SCHOOL_ADMIN",
      "COLLEGE_ADMIN",
      "HIGH_SCHOOL_ADMIN",
      "UNIVERSITY_ADMIN",
      "TEACHER",
      "STUDENT",
      "UNIVERSITY_STUDENT",
      "PARENT"
    ]
  },
  {
    to: "/schools",
    label: "Ecoles",
    icon: School,
    roles: ["SUPER_ADMIN"]
  },
  {
    to: "/superadmin/annonces",
    label: "Annonces",
    icon: Bell,
    roles: ["SUPER_ADMIN"]
  },
  {
    to: "/superadmin/progression",
    label: "Progression Reves",
    icon: Target,
    roles: ["SUPER_ADMIN"]
  },
  {
    to: "/students",
    label: "Eleves/Etudiants",
    icon: GraduationCap,
    roles: [
      "SUPER_ADMIN",
      "SCHOOL_ADMIN",
      "COLLEGE_ADMIN",
      "HIGH_SCHOOL_ADMIN",
      "UNIVERSITY_ADMIN",
      "TEACHER"
    ]
  },
  {
    to: "/grades",
    label: "Notes",
    icon: BookOpen,
    roles: [
      "SUPER_ADMIN",
      "SCHOOL_ADMIN",
      "COLLEGE_ADMIN",
      "HIGH_SCHOOL_ADMIN",
      "UNIVERSITY_ADMIN",
      "TEACHER"
    ]
  },
  {
    to: "/analytics",
    label: "Statistiques",
    icon: BarChart3,
    roles: [
      "SUPER_ADMIN",
      "SCHOOL_ADMIN",
      "COLLEGE_ADMIN",
      "HIGH_SCHOOL_ADMIN",
      "UNIVERSITY_ADMIN",
      "TEACHER",
      "STUDENT",
      "UNIVERSITY_STUDENT",
      "PARENT"
    ]
  },
  {
    to: "/orientation",
    label: "Orientation",
    icon: GraduationCap,
    roles: [
      "SUPER_ADMIN",
      "SCHOOL_ADMIN",
      "COLLEGE_ADMIN",
      "HIGH_SCHOOL_ADMIN",
      "UNIVERSITY_ADMIN",
      "TEACHER",
      "STUDENT",
      "UNIVERSITY_STUDENT",
      "PARENT"
    ]
  },
  {
    to: "/accompaniment",
    label: "Accompagnement",
    icon: ClipboardList,
    roles: [
      "SCHOOL_ADMIN",
      "COLLEGE_ADMIN",
      "HIGH_SCHOOL_ADMIN",
      "UNIVERSITY_ADMIN",
      "TEACHER",
      "STUDENT",
      "UNIVERSITY_STUDENT",
      "PARENT"
    ]
  },
  {
    to: "/guidance",
    label: "Parcours+",
    icon: Sparkles,
    roles: [
      "SCHOOL_ADMIN",
      "COLLEGE_ADMIN",
      "HIGH_SCHOOL_ADMIN",
      "UNIVERSITY_ADMIN",
      "TEACHER",
      "STUDENT",
      "UNIVERSITY_STUDENT",
      "PARENT"
    ]
  },
  {
    to: "/chat",
    label: "Chat Classes",
    icon: MessageSquare,
    roles: [
      "SUPER_ADMIN",
      "SCHOOL_ADMIN",
      "COLLEGE_ADMIN",
      "HIGH_SCHOOL_ADMIN",
      "UNIVERSITY_ADMIN",
      "TEACHER",
      "STUDENT",
      "UNIVERSITY_STUDENT",
      "PARENT"
    ]
  }
];

const routeMeta: Record<string, { title: string; subtitle: string }> = {
  "/dashboard": {
    title: "Dashboard",
    subtitle: "Vue d ensemble des indicateurs clefs"
  },
  "/schools": {
    title: "Etablissements",
    subtitle: "Gestion multi-ecoles et gouvernance"
  },
  "/schools/:id": {
    title: "Etablissement",
    subtitle: "Effectifs classes + classement metier de reve"
  },
  "/superadmin/annonces": {
    title: "Annonces Groupe",
    subtitle: "Communication centralisee des activites"
  },
  "/superadmin/progression": {
    title: "Progression Metier",
    subtitle: "Pilotage global du niveau de preparation des apprenants"
  },
  "/students": {
    title: "Eleves et Etudiants",
    subtitle: "Suivi academique et profil apprenant"
  },
  "/grades": {
    title: "Notes",
    subtitle: "Saisie, import et edition des evaluations"
  },
  "/analytics": {
    title: "Statistiques",
    subtitle: "Tendances, classements et niveaux de risque"
  },
  "/orientation": {
    title: "Orientation",
    subtitle: "Recommandations filieres et trajectoires metiers"
  },
  "/accompaniment": {
    title: "Accompagnement",
    subtitle: "Plans d action et alertes de suivi"
  },
  "/guidance": {
    title: "Parcours+",
    subtitle: "Pilotage academique et professionnel avance"
  },
  "/chat": {
    title: "Chat Inter-Etablissements",
    subtitle: "Echanges classes equivalentes en temps reel"
  }
};

const roleLabel: Record<Role, string> = {
  SUPER_ADMIN: "Super Admin",
  SCHOOL_ADMIN: "Admin Ecole",
  COLLEGE_ADMIN: "Admin College",
  HIGH_SCHOOL_ADMIN: "Admin Lycee",
  UNIVERSITY_ADMIN: "Admin Universite",
  TEACHER: "Enseignant",
  STUDENT: "Eleve",
  UNIVERSITY_STUDENT: "Etudiant",
  PARENT: "Parent"
};

function SidebarNav({ items }: { items: NavItem[] }) {
  return (
    <nav className="space-y-2">
      {items.map((item) => {
        const Icon = item.icon;

        return (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              clsx(
                "group flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm font-semibold transition",
                isActive
                  ? "bg-slate-900 shadow-lg shadow-blue-950/30"
                  : "text-slate-700 hover:bg-slate-100 hover:text-slate-900"
              )
            }
          >
            {({ isActive }) => (
              <>
                <span
                  className={clsx(
                    "inline-flex h-8 w-8 items-center justify-center rounded-xl border transition",
                    isActive ? "border-white/20 bg-white/10" : "border-slate-300 bg-white"
                  )}
                >
                  <Icon className={clsx("h-4 w-4", isActive ? "text-white" : "text-slate-700 group-hover:text-slate-900")} />
                </span>
                <span className={isActive ? "text-white" : "text-slate-700"}>{item.label}</span>
              </>
            )}
          </NavLink>
        );
      })}
    </nav>
  );
}

function CommandModal({
  open,
  status,
  onClose,
  onRun
}: {
  open: boolean;
  status: "idle" | "running" | "done";
  onClose: () => void;
  onRun: () => void;
}) {
  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-[130] flex items-center justify-center bg-[#071529]/64 px-4 backdrop-blur-sm">
      <div className="w-full max-w-lg rounded-3xl border border-white/40 bg-white/96 p-6 shadow-[0_38px_80px_-42px_rgba(7,21,41,0.85)]">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-slate-500">Function Runner</p>
            <h3 className="mt-1 font-display text-2xl font-bold text-slate-900">Executer `KSO.scan()`</h3>
          </div>
          <button
            onClick={onClose}
            type="button"
            className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-slate-300 bg-white text-slate-700 transition hover:bg-slate-50"
            aria-label="Fermer la fenetre"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-5 grid gap-4 sm:grid-cols-[130px_minmax(0,1fr)] sm:items-center">
          <div className="mx-auto h-[118px] w-[118px] kso-ring sm:mx-0" />
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-sm font-semibold text-slate-900">Diagnostic express</p>
            <p className="mt-1 text-xs text-slate-600">
              Cette execution simule un controle rapide de disponibilite, data et securite de la plateforme.
            </p>
            <div className="mt-3 flex flex-wrap gap-2 text-xs font-semibold">
              <span className="rounded-full border border-cyan-200 bg-cyan-50 px-2.5 py-1 text-cyan-700">API live</span>
              <span className="rounded-full border border-blue-200 bg-blue-50 px-2.5 py-1 text-blue-700">Cache stable</span>
              <span className="rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-amber-700">0 alertes critiques</span>
            </div>
          </div>
        </div>

        <div className="mt-6 flex flex-wrap justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="inline-flex items-center justify-center rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            Annuler
          </button>
          <button
            type="button"
            onClick={status === "done" ? onClose : onRun}
            disabled={status === "running"}
            className={clsx(
              "inline-flex min-w-36 items-center justify-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold text-white transition disabled:cursor-not-allowed disabled:opacity-60",
              status === "done" ? "bg-emerald-700 hover:bg-emerald-800" : "bg-slate-900 hover:bg-slate-800"
            )}
          >
            <PlayCircle className="h-4 w-4" />
            {status === "idle" ? "Executer" : status === "running" ? "Execution..." : "Fermer"}
          </button>
        </div>
      </div>
    </div>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();
  const { info } = useToast();
  const location = useLocation();
  const menuSearchRef = useRef<HTMLInputElement | null>(null);
  const [menuQuery, setMenuQuery] = useState("");
  const [commandOpen, setCommandOpen] = useState(false);
  const [commandStatus, setCommandStatus] = useState<"idle" | "running" | "done">("idle");

  const availableItems = user ? navItems.filter((item) => item.roles.includes(user.role)) : [];
  const filteredItems = availableItems.filter((item) => item.label.toLowerCase().includes(menuQuery.toLowerCase().trim()));
  const activeItems = filteredItems.length ? filteredItems : availableItems;

  const dynamicRouteKey = location.pathname.startsWith("/schools/") ? "/schools/:id" : location.pathname;
  const currentMeta = routeMeta[dynamicRouteKey] || {
    title: "Espace KSO",
    subtitle: "Pilotage intelligent du parcours academique"
  };

  const nowLabel = useMemo(
    () =>
      new Intl.DateTimeFormat("fr-FR", {
        weekday: "long",
        day: "2-digit",
        month: "long",
        year: "numeric"
      }).format(new Date()),
    []
  );

  useEffect(() => {
    if (commandStatus !== "running") {
      return;
    }

    const timer = window.setTimeout(() => {
      setCommandStatus("done");
      info("Scan termine", "Tous les modules de base sont operationnels.");
    }, 1450);

    return () => {
      window.clearTimeout(timer);
    };
  }, [commandStatus, info]);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        menuSearchRef.current?.focus();
      }

      if (event.key === "Escape") {
        setCommandOpen(false);
        setCommandStatus("idle");
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
    };
  }, []);

  function onLogout() {
    logout();
    info("Session fermee", "A bientot sur KSO.");
  }

  function runFunctionCommand() {
    if (commandStatus === "running") {
      return;
    }

    info("Scan lance", "Verification en cours sur la plateforme...");
    setCommandStatus("running");
  }

  if (!user) {
    return null;
  }

  return (
    <>
      <Seo
        title={`${currentMeta.title} | KSO`}
        description={`${currentMeta.subtitle}. Interface privee KSO pour le suivi academique et l orientation.`}
        path={location.pathname}
        noindex
      />
      <div className="relative min-h-screen w-full text-slate-900">
        <div className="pointer-events-none absolute -left-24 top-0 h-64 w-64 rounded-full bg-cyan-300/30 blur-3xl" />
        <div className="pointer-events-none absolute right-0 top-32 h-72 w-72 rounded-full bg-amber-200/45 blur-3xl" />
        <div className="relative grid min-h-screen w-full grid-cols-1 lg:grid-cols-[306px_minmax(0,1fr)]">
        <aside className="hidden h-screen border-r border-slate-200 bg-slate-50/85 p-4 lg:flex lg:flex-col">
          <div className="rounded-3xl border border-slate-300 bg-gradient-to-br from-[#0c2447] via-[#163b67] to-[#1b5b90] p-4 text-white shadow-[0_28px_46px_-30px_rgba(12,36,71,0.85)]">
            <Link to="/dashboard" className="flex items-center gap-3">
              <img src={ksoLogo} alt="Logo KSO" className="h-16 w-16 rounded-2xl border border-white/35 object-cover shadow-md" />
              <div>
                <span className="font-display text-[2rem] font-bold tracking-tight text-white">KSO</span>
                <p className="text-[11px] uppercase tracking-[0.2em] text-white/76">Smart Learning Core</p>
              </div>
            </Link>

            <div className="mt-4 flex items-center justify-between rounded-2xl border border-white/18 bg-white/12 px-3 py-2 text-xs font-semibold text-white/90 backdrop-blur-sm">
              <span className="inline-flex items-center gap-1">
                <Flame className="h-3.5 w-3.5" />
                Live workspace
              </span>
              <span>96%</span>
            </div>
          </div>

          <div className="mt-4 rounded-2xl border border-slate-200 bg-white/96 p-3 shadow-sm">
            <label className="relative block">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                ref={menuSearchRef}
                value={menuQuery}
                onChange={(event) => setMenuQuery(event.target.value)}
                className="w-full pl-9"
                placeholder="Rechercher un module..."
              />
            </label>
          </div>

          <div className="mt-4 flex-1 overflow-y-auto pr-1 pb-4">
            <SidebarNav items={activeItems} />
          </div>

          <div className="mt-2 rounded-2xl border border-slate-200 bg-white/95 p-3 shadow-sm">
            <div className="flex items-center gap-3">
              <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-slate-900 text-sm font-bold text-white">
                {user.fullName.slice(0, 2).toUpperCase()}
              </span>
              <div className="min-w-0">
                <p className="truncate font-semibold text-slate-900">{user.fullName}</p>
                <p className="text-xs text-slate-500">{roleLabel[user.role]}</p>
              </div>
            </div>

            <button
              onClick={onLogout}
              className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-xl border border-slate-300 bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
            >
              <LogOut className="h-4 w-4" />
              Deconnexion
            </button>
          </div>
        </aside>

        <section className="flex min-h-screen flex-col">
          <header className="sticky top-0 z-30 border-b border-slate-200 bg-slate-50/90 px-4 py-3 backdrop-blur sm:px-5">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="max-w-3xl">
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500">{currentMeta.title}</p>
                <h1 className="font-display text-2xl font-bold leading-tight text-slate-900">{currentMeta.subtitle}</h1>
              </div>

              <div className="flex flex-wrap items-center justify-end gap-2">
                <button
                  onClick={() => setCommandOpen(true)}
                  className="inline-flex items-center gap-2 rounded-xl border border-slate-900 bg-slate-900 px-3 py-2 text-xs font-semibold text-white transition hover:bg-slate-800"
                >
                  <PlayCircle className="h-4 w-4" />
                  Executer `KSO.scan()`
                </button>
                <span className="inline-flex items-center gap-1 rounded-full border border-slate-300 bg-white px-3 py-1 text-xs font-semibold text-slate-700">
                  <CalendarDays className="h-3.5 w-3.5" />
                  {nowLabel}
                </span>
                <span className="hidden items-center gap-1 rounded-full border border-cyan-200 bg-cyan-50 px-3 py-1 text-xs font-semibold text-cyan-700 lg:inline-flex">
                  <Cpu className="h-3.5 w-3.5" />
                  Runtime stable
                </span>
                <span className="hidden rounded-full border border-slate-300 bg-white px-3 py-1 text-xs font-semibold text-slate-700 sm:inline-flex">
                  {roleLabel[user.role]}
                </span>
              </div>
            </div>

            <div className="mt-3 lg:hidden">
              <label className="relative block">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  value={menuQuery}
                  onChange={(event) => setMenuQuery(event.target.value)}
                  className="w-full pl-9"
                  placeholder="Rechercher un module..."
                />
              </label>
            </div>
          </header>

          <main className="flex-1 px-4 py-4 pb-24 sm:px-5 lg:px-6 lg:pb-6">
            <div className="min-h-full rounded-3xl border border-slate-200 bg-white/94 p-4 shadow-[0_24px_44px_-36px_rgba(7,21,41,0.75)] sm:p-5 lg:p-6">
              {children}
            </div>
          </main>

          <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-slate-200 bg-white/96 px-2 py-2 backdrop-blur lg:hidden">
            <div className="flex items-center gap-2 overflow-x-auto">
              {activeItems.map((item) => {
                const Icon = item.icon;

                return (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    className={({ isActive }) =>
                      clsx(
                        "inline-flex shrink-0 items-center gap-1 rounded-xl border px-3 py-2 text-xs font-semibold",
                        isActive
                          ? "border-slate-900 bg-slate-900 text-white"
                          : "border-slate-300 bg-slate-50 text-slate-700"
                      )
                    }
                  >
                    {({ isActive }) => (
                      <>
                        <Icon className={clsx("h-3.5 w-3.5", isActive ? "text-white" : "")} />
                        <span className={isActive ? "text-white" : ""}>{item.label}</span>
                      </>
                    )}
                  </NavLink>
                );
              })}

              <button
                onClick={onLogout}
                className="inline-flex shrink-0 items-center gap-1 rounded-xl border border-slate-300 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-700"
              >
                <LogOut className="h-3.5 w-3.5" />
                Sortir
              </button>
            </div>
          </nav>
        </section>
        </div>

        <CommandModal
          open={commandOpen}
          status={commandStatus}
          onRun={runFunctionCommand}
          onClose={() => {
            setCommandOpen(false);
            setCommandStatus("idle");
          }}
        />
      </div>
    </>
  );
}
