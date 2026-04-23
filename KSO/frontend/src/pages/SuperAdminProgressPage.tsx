import { Filter, Search, Target } from "lucide-react";
import { FormEvent, useEffect, useState } from "react";

import { schoolApi, superAdminApi } from "../api/services";
import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { EmptyState } from "../components/ui/EmptyState";
import { KpiCard } from "../components/ui/KpiCard";
import { Loader } from "../components/ui/Loader";
import { Pagination } from "../components/ui/Pagination";
import { DreamProgressReport, School } from "../types/models";
import { formatDecimal } from "../utils/format";

const pageSize = 10;

const readinessLabel: Record<string, string> = {
  TRES_PROCHE: "Tres proche",
  EN_BONNE_VOIE: "Bonne voie",
  A_ACCOMPAGNER: "A accompagner",
  CRITIQUE: "Critique"
};

function readinessClass(bucket: string) {
  if (bucket === "TRES_PROCHE") {
    return "bg-emerald-100 text-emerald-800 border-emerald-200";
  }

  if (bucket === "EN_BONNE_VOIE") {
    return "bg-lime-100 text-lime-800 border-lime-200";
  }

  if (bucket === "A_ACCOMPAGNER") {
    return "bg-amber-100 text-amber-800 border-amber-200";
  }

  return "bg-rose-100 text-rose-800 border-rose-200";
}

export function SuperAdminProgressPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [report, setReport] = useState<DreamProgressReport | null>(null);
  const [schools, setSchools] = useState<School[]>([]);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [appliedSearch, setAppliedSearch] = useState("");
  const [schoolId, setSchoolId] = useState("");
  const [level, setLevel] = useState("");
  const [profileType, setProfileType] = useState("");

  async function loadData(currentPage = page) {
    setLoading(true);
    setError(null);

    try {
      const [progressData, schoolsData] = await Promise.all([
        superAdminApi.dreamProgress({
          page: currentPage,
          pageSize,
          search: appliedSearch || undefined,
          schoolId: schoolId || undefined,
          level: level || undefined,
          profileType: profileType === "ELEVE" || profileType === "ETUDIANT" ? profileType : undefined
        }),
        schoolApi.list()
      ]);

      setReport(progressData);
      setSchools(schoolsData);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Impossible de charger la progression");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadData(page);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, appliedSearch, schoolId, level, profileType]);

  function applySearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPage(1);
    setAppliedSearch(search.trim());
  }

  if (loading) {
    return <Loader label="Chargement de la progression..." />;
  }

  if (!report) {
    return <EmptyState title="Aucune donnee" description="La progression apparaitra apres collecte des resultats." />;
  }

  return (
    <div className="space-y-6">
      {error ? (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <KpiCard label="Apprenants suivis" value={report.summary.totalStudents} />
        <KpiCard label="Score moyen readiness" value={`${formatDecimal(report.summary.averageReadiness, 1)}%`} />
        <KpiCard label="Tres proches" value={report.summary.veryClose} />
        <KpiCard label="Bonne voie" value={report.summary.inGoodTrack} />
        <KpiCard label="Critiques" value={report.summary.critical} />
      </div>

      <Card
        title="Progression vers le metier de reve"
        subtitle="Classement global des eleves et etudiants selon le niveau de preparation"
        actions={
          <form onSubmit={applySearch} className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <Search className="pointer-events-none absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                className="h-9 pl-8 text-xs"
                placeholder="Nom, matricule, metier..."
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
            </div>

            <select className="h-9 text-xs" value={schoolId} onChange={(event) => setSchoolId(event.target.value)}>
              <option value="">Tous etablissements</option>
              {schools.map((school) => (
                <option key={school.id} value={school.id}>
                  {school.name}
                </option>
              ))}
            </select>

            <select className="h-9 text-xs" value={profileType} onChange={(event) => setProfileType(event.target.value)}>
              <option value="">Tous profils</option>
              <option value="ELEVE">Eleve</option>
              <option value="ETUDIANT">Etudiant</option>
            </select>

            <select className="h-9 text-xs" value={level} onChange={(event) => setLevel(event.target.value)}>
              <option value="">Tous niveaux</option>
              <option value="SECONDE">SECONDE</option>
              <option value="PREMIERE">PREMIERE</option>
              <option value="TERMINALE">TERMINALE</option>
              <option value="LOWER_SIXTH">LOWER_SIXTH</option>
              <option value="UPPER_SIXTH">UPPER_SIXTH</option>
              <option value="LICENCE_1">LICENCE_1</option>
              <option value="LICENCE_2">LICENCE_2</option>
              <option value="LICENCE_3">LICENCE_3</option>
              <option value="MASTER_1">MASTER_1</option>
              <option value="MASTER_2">MASTER_2</option>
              <option value="AUTRE">AUTRE</option>
            </select>

            <Button type="submit" variant="ghost" className="h-9 px-3 text-xs">
              <Filter className="h-4 w-4" />
              Filtrer
            </Button>
          </form>
        }
      >
        {report.ranking.items.length === 0 ? (
          <EmptyState title="Aucun apprenant" description="Ajuste les filtres ou ajoute des eleves/etudiants." />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-left text-slate-500">
                    <th className="px-2 py-2">#</th>
                    <th className="px-2 py-2">Nom</th>
                    <th className="px-2 py-2">Etablissement</th>
                    <th className="px-2 py-2">Niveau</th>
                    <th className="px-2 py-2">Classe</th>
                    <th className="px-2 py-2">Metier cible</th>
                    <th className="px-2 py-2">Moyenne</th>
                    <th className="px-2 py-2">Readiness</th>
                    <th className="px-2 py-2">Ecart</th>
                    <th className="px-2 py-2">Statut</th>
                  </tr>
                </thead>
                <tbody>
                  {report.ranking.items.map((item, index) => (
                    <tr key={item.studentId} className="border-b border-slate-100">
                      <td className="px-2 py-2 font-semibold text-slate-900">
                        {(report.ranking.page - 1) * report.ranking.pageSize + index + 1}
                      </td>
                      <td className="px-2 py-2">{item.fullName}</td>
                      <td className="px-2 py-2">{item.school.name}</td>
                      <td className="px-2 py-2">{item.level}</td>
                      <td className="px-2 py-2">{item.class?.name || "-"}</td>
                      <td className="px-2 py-2">{item.dreamCareer || item.targetProfession || "-"}</td>
                      <td className="px-2 py-2">{formatDecimal(item.latestAverage, 2)}/20</td>
                      <td className="px-2 py-2 font-semibold text-slate-900">{formatDecimal(item.readinessScore, 1)}%</td>
                      <td className="px-2 py-2">{formatDecimal(item.gapToTarget, 1)} pts</td>
                      <td className="px-2 py-2">
                        <span className={`inline-flex rounded-full border px-2 py-1 text-xs font-semibold ${readinessClass(item.readinessBucket)}`}>
                          <Target className="mr-1 h-3.5 w-3.5" />
                          {readinessLabel[item.readinessBucket] || item.readinessBucket}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Pagination
              page={report.ranking.page}
              totalItems={report.ranking.total}
              pageSize={report.ranking.pageSize}
              onPageChange={setPage}
            />
          </>
        )}
      </Card>
    </div>
  );
}
