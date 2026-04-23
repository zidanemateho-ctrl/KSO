import { ChevronRight, GraduationCap, Plus, School2, University } from "lucide-react";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import { schoolApi, superAdminApi } from "../api/services";
import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { EmptyState } from "../components/ui/EmptyState";
import { Loader } from "../components/ui/Loader";
import { Pagination } from "../components/ui/Pagination";
import { useToast } from "../hooks/useToast";
import { EstablishmentCard } from "../types/models";
import { formatDecimal } from "../utils/format";

const initialForm = {
  name: "",
  code: "",
  city: "",
  country: "Cameroon",
  type: "HIGH_SCHOOL" as "COLLEGE" | "HIGH_SCHOOL" | "UNIVERSITY",
  adminName: "",
  adminEmail: "",
  adminPassword: ""
};

const schoolTypeLabel: Record<"COLLEGE" | "HIGH_SCHOOL" | "UNIVERSITY", string> = {
  COLLEGE: "College",
  HIGH_SCHOOL: "Lycee",
  UNIVERSITY: "Universite"
};

const schoolTypeIcon: Record<"COLLEGE" | "HIGH_SCHOOL" | "UNIVERSITY", React.ComponentType<{ className?: string }>> = {
  COLLEGE: School2,
  HIGH_SCHOOL: GraduationCap,
  UNIVERSITY: University
};

const pageSize = 10;

export function SchoolsPage() {
  const navigate = useNavigate();
  const { success, error: showError } = useToast();

  const [schools, setSchools] = useState<EstablishmentCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState(initialForm);
  const [page, setPage] = useState(1);

  const paginatedSchools = useMemo(() => {
    const start = (page - 1) * pageSize;
    return schools.slice(start, start + pageSize);
  }, [page, schools]);

  async function loadSchools() {
    setLoading(true);
    setError(null);

    try {
      const data = await superAdminApi.listEstablishments();
      setSchools(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Impossible de charger les etablissements");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadSchools();
  }, []);

  useEffect(() => {
    setPage(1);
  }, [schools.length]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError(null);

    try {
      await schoolApi.create({
        name: form.name,
        code: form.code,
        city: form.city,
        country: form.country,
        type: form.type,
        admin:
          form.adminName && form.adminEmail && form.adminPassword
            ? {
                fullName: form.adminName,
                email: form.adminEmail,
                password: form.adminPassword
              }
            : undefined
      });

      setForm(initialForm);
      success("Etablissement cree", "Tu peux maintenant ajouter les apprenants.");
      await loadSchools();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Creation impossible";
      setError(message);
      showError("Creation impossible", message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      {error ? (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div>
      ) : null}

      <Card title="Creer un etablissement" subtitle="Le super admin peut enregistrer colleges, lycees et universites">
        <form onSubmit={handleSubmit} className="grid gap-3 md:grid-cols-2">
          <input
            className="rounded-xl border border-slate-300 px-3 py-2 text-sm"
            placeholder="Nom"
            value={form.name}
            onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
            required
          />
          <input
            className="rounded-xl border border-slate-300 px-3 py-2 text-sm"
            placeholder="Code"
            value={form.code}
            onChange={(event) => setForm((prev) => ({ ...prev, code: event.target.value }))}
            required
          />
          <input
            className="rounded-xl border border-slate-300 px-3 py-2 text-sm"
            placeholder="Ville"
            value={form.city}
            onChange={(event) => setForm((prev) => ({ ...prev, city: event.target.value }))}
            required
          />
          <select
            className="rounded-xl border border-slate-300 px-3 py-2 text-sm"
            value={form.type}
            onChange={(event) =>
              setForm((prev) => ({ ...prev, type: event.target.value as "COLLEGE" | "HIGH_SCHOOL" | "UNIVERSITY" }))
            }
          >
            <option value="COLLEGE">College</option>
            <option value="HIGH_SCHOOL">Lycee</option>
            <option value="UNIVERSITY">Universite</option>
          </select>

          <input
            className="rounded-xl border border-slate-300 px-3 py-2 text-sm"
            placeholder="Nom admin (optionnel)"
            value={form.adminName}
            onChange={(event) => setForm((prev) => ({ ...prev, adminName: event.target.value }))}
          />
          <input
            className="rounded-xl border border-slate-300 px-3 py-2 text-sm"
            placeholder="Email admin"
            value={form.adminEmail}
            onChange={(event) => setForm((prev) => ({ ...prev, adminEmail: event.target.value }))}
          />
          <input
            className="rounded-xl border border-slate-300 px-3 py-2 text-sm"
            placeholder="Mot de passe admin"
            type="password"
            value={form.adminPassword}
            onChange={(event) => setForm((prev) => ({ ...prev, adminPassword: event.target.value }))}
          />

          <div className="md:col-span-2">
            <Button type="submit" disabled={saving}>
              <Plus className="h-4 w-4" />
              {saving ? "Creation..." : "Creer l etablissement"}
            </Button>
          </div>
        </form>
      </Card>

      <Card title="Ecoles & universites" subtitle="Clique une card pour ouvrir la page detail de l etablissement">
        {loading ? (
          <Loader label="Chargement des etablissements..." />
        ) : schools.length === 0 ? (
          <EmptyState title="Aucun etablissement" description="Cree ton premier etablissement pour demarrer." />
        ) : (
          <>
            <div className="grid gap-4 lg:grid-cols-2">
              {paginatedSchools.map((school) => {
                const Icon = schoolTypeIcon[school.type];

                return (
                  <button
                    key={school.id}
                    type="button"
                    onClick={() => navigate(`/schools/${school.id}`)}
                    className="group rounded-2xl border border-slate-200 bg-slate-50 p-4 text-left transition hover:border-slate-400 hover:bg-white"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-300 bg-white text-slate-700">
                        <Icon className="h-5 w-5" />
                      </div>
                      <span className="inline-flex items-center gap-1 rounded-full border border-slate-300 bg-white px-2 py-1 text-[11px] font-semibold text-slate-700">
                        {schoolTypeLabel[school.type]}
                      </span>
                    </div>

                    <h3 className="mt-3 font-display text-lg font-bold text-slate-900">{school.name}</h3>
                    <p className="text-sm text-slate-500">
                      {school.code} - {school.city}
                    </p>

                    <div className="mt-4 grid grid-cols-3 gap-2 text-center">
                      <div className="rounded-xl border border-slate-200 bg-white p-2">
                        <p className="text-[11px] uppercase tracking-[0.08em] text-slate-500">Apprenants</p>
                        <p className="text-base font-bold text-slate-900">{school.counts.students}</p>
                      </div>
                      <div className="rounded-xl border border-slate-200 bg-white p-2">
                        <p className="text-[11px] uppercase tracking-[0.08em] text-slate-500">Classes</p>
                        <p className="text-base font-bold text-slate-900">{school.counts.classes}</p>
                      </div>
                      <div className="rounded-xl border border-slate-200 bg-white p-2">
                        <p className="text-[11px] uppercase tracking-[0.08em] text-slate-500">Enseignants</p>
                        <p className="text-base font-bold text-slate-900">{school.counts.teachers}</p>
                      </div>
                    </div>

                    <div className="mt-4 flex items-center justify-between rounded-xl border border-slate-200 bg-white px-3 py-2">
                      <div>
                        <p className="text-[11px] uppercase tracking-[0.08em] text-slate-500">Proximite metier de reve</p>
                        <p className="font-semibold text-emerald-700">{formatDecimal(school.averageReadiness, 1)}%</p>
                      </div>
                      <div className="text-right">
                        <p className="text-[11px] text-slate-500">Top apprenant</p>
                        <p className="text-xs font-semibold text-slate-900">{school.topStudent?.fullName || "-"}</p>
                      </div>
                    </div>

                    <div className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-slate-700 group-hover:text-slate-900">
                      Ouvrir la fiche
                      <ChevronRight className="h-4 w-4" />
                    </div>
                  </button>
                );
              })}
            </div>
            <Pagination page={page} totalItems={schools.length} pageSize={pageSize} onPageChange={setPage} />
          </>
        )}
      </Card>
    </div>
  );
}
