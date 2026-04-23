import { ArrowLeft, FileUp, Search } from "lucide-react";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";

import { superAdminApi } from "../api/services";
import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { EmptyState } from "../components/ui/EmptyState";
import { Loader } from "../components/ui/Loader";
import { Pagination } from "../components/ui/Pagination";
import { useToast } from "../hooks/useToast";
import { EstablishmentDetails, StudentImportResult } from "../types/models";
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

export function SchoolDetailsPage() {
  const { id } = useParams<{ id: string }>();
  const { success, error: showError } = useToast();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [details, setDetails] = useState<EstablishmentDetails | null>(null);
  const [search, setSearch] = useState("");
  const [appliedSearch, setAppliedSearch] = useState("");
  const [rankingPage, setRankingPage] = useState(1);
  const [classPage, setClassPage] = useState(1);
  const [file, setFile] = useState<File | null>(null);
  const [importResult, setImportResult] = useState<StudentImportResult | null>(null);
  const [defaultAcademicYear, setDefaultAcademicYear] = useState(
    `${new Date().getFullYear()}-${new Date().getFullYear() + 1}`
  );

  const paginatedClasses = useMemo(() => {
    if (!details) {
      return [];
    }

    const start = (classPage - 1) * pageSize;
    return details.studentsByClass.slice(start, start + pageSize);
  }, [details, classPage]);

  async function loadData() {
    if (!id) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const data = await superAdminApi.getEstablishmentDetails(id, {
        page: rankingPage,
        pageSize,
        search: appliedSearch || undefined
      });
      setDetails(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Impossible de charger les informations");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, rankingPage, appliedSearch]);

  useEffect(() => {
    setClassPage(1);
  }, [details?.studentsByClass.length]);

  async function handleImport(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!id || !file) {
      showError("Import impossible", "Selectionne un fichier CSV ou Excel.");
      return;
    }

    setSaving(true);
    setImportResult(null);

    try {
      const result = await superAdminApi.importStudents(id, file, {
        defaultAcademicYear
      });
      setImportResult(result);
      success("Import termine", `${result.createdCount} eleves/etudiants ajoutes.`);
      setFile(null);
      await loadData();
    } catch (err) {
      showError("Import echoue", err instanceof Error ? err.message : "Erreur pendant l import.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <Loader label="Chargement de l etablissement..." />;
  }

  if (!details) {
    return <EmptyState title="Etablissement introuvable" description="Retournez a la liste des etablissements." />;
  }

  return (
    <div className="space-y-6">
      {error ? (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div>
      ) : null}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.14em] text-slate-500">Fiche etablissement</p>
          <h2 className="font-display text-2xl font-bold text-slate-900">
            {details.school.name} ({details.school.code})
          </h2>
          <p className="text-sm text-slate-600">{details.school.city}</p>
        </div>
        <Link to="/schools" className="inline-flex">
          <Button type="button" variant="ghost">
            <ArrowLeft className="h-4 w-4" />
            Retour cartes
          </Button>
        </Link>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <p className="text-xs uppercase tracking-[0.12em] text-slate-500">Eleves/Etudiants</p>
          <p className="mt-2 text-2xl font-bold text-slate-900">{details.counts.students}</p>
        </Card>
        <Card>
          <p className="text-xs uppercase tracking-[0.12em] text-slate-500">Classes</p>
          <p className="mt-2 text-2xl font-bold text-slate-900">{details.counts.classes}</p>
        </Card>
        <Card>
          <p className="text-xs uppercase tracking-[0.12em] text-slate-500">Niveaux actifs</p>
          <p className="mt-2 text-2xl font-bold text-slate-900">{details.studentsByLevel.length}</p>
        </Card>
        <Card>
          <p className="text-xs uppercase tracking-[0.12em] text-slate-500">Top progression</p>
          <p className="mt-2 text-2xl font-bold text-emerald-700">
            {details.readinessRanking.items[0] ? `${formatDecimal(details.readinessRanking.items[0].readinessScore, 1)}%` : "-"}
          </p>
        </Card>
      </div>

      <Card title="Import eleves/etudiants" subtitle="Fichier CSV/Excel avec au minimum fullName + registrationNumber">
        <form onSubmit={handleImport} className="grid gap-3 md:grid-cols-3">
          <input
            className="md:col-span-2"
            type="file"
            accept=".csv,.xlsx,.xls"
            onChange={(event) => setFile(event.target.files?.[0] || null)}
            required
          />
          <input
            placeholder="Annee academique (ex: 2026-2027)"
            value={defaultAcademicYear}
            onChange={(event) => setDefaultAcademicYear(event.target.value)}
          />
          <div className="md:col-span-3">
            <Button type="submit" disabled={saving || !file}>
              <FileUp className="h-4 w-4" />
              {saving ? "Import..." : "Importer le fichier"}
            </Button>
          </div>
        </form>

        {importResult ? (
          <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-sm font-semibold text-slate-900">
              Ajoutes: {importResult.createdCount} | Erreurs: {importResult.errorCount}
            </p>
            {importResult.errors.length > 0 ? (
              <div className="mt-2 max-h-40 overflow-auto rounded-lg border border-rose-200 bg-rose-50 p-2 text-xs text-rose-700">
                {importResult.errors.map((item) => (
                  <p key={`${item.row}-${item.message}`}>
                    Ligne {item.row}: {item.message}
                  </p>
                ))}
              </div>
            ) : null}
          </div>
        ) : null}
      </Card>

      <Card title="Effectifs par niveau">
        {details.studentsByLevel.length === 0 ? (
          <EmptyState title="Aucun niveau" description="Les niveaux apparaitront apres ajout des eleves." />
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {details.studentsByLevel.map((item) => (
              <div key={item.level} className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                <p className="text-sm font-semibold text-slate-900">{item.level}</p>
                <p className="text-xs text-slate-500">{item.count} apprenants</p>
              </div>
            ))}
          </div>
        )}
      </Card>

      <Card title="Effectifs par classe">
        {details.studentsByClass.length === 0 ? (
          <EmptyState title="Aucune classe" description="Cree des classes ou importe un fichier avec className." />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-left text-slate-500">
                    <th className="px-2 py-2">Classe</th>
                    <th className="px-2 py-2">Niveau</th>
                    <th className="px-2 py-2">Serie</th>
                    <th className="px-2 py-2">Salle</th>
                    <th className="px-2 py-2">Annee</th>
                    <th className="px-2 py-2">Effectif</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedClasses.map((row) => (
                    <tr key={row.classId} className="border-b border-slate-100">
                      <td className="px-2 py-2 font-semibold text-slate-900">{row.className}</td>
                      <td className="px-2 py-2">{row.level}</td>
                      <td className="px-2 py-2">{row.stream}</td>
                      <td className="px-2 py-2">{row.room || "-"}</td>
                      <td className="px-2 py-2">{row.academicYear}</td>
                      <td className="px-2 py-2">{row.studentsCount}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Pagination
              page={classPage}
              totalItems={details.studentsByClass.length}
              pageSize={pageSize}
              onPageChange={setClassPage}
            />
          </>
        )}
      </Card>

      <Card
        title="Classement proximite metier de reve"
        actions={
          <form
            onSubmit={(event) => {
              event.preventDefault();
              setRankingPage(1);
              setAppliedSearch(search.trim());
            }}
            className="flex items-center gap-2"
          >
            <div className="relative">
              <Search className="pointer-events-none absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                className="h-9 pl-8 text-xs"
                placeholder="Nom, matricule, metier..."
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
            </div>
            <Button type="submit" variant="ghost" className="h-9 px-3 text-xs">
              Filtrer
            </Button>
          </form>
        }
      >
        {details.readinessRanking.items.length === 0 ? (
          <EmptyState title="Aucun eleve/etudiant" description="Importe des apprenants pour obtenir le classement." />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-left text-slate-500">
                    <th className="px-2 py-2">#</th>
                    <th className="px-2 py-2">Nom</th>
                    <th className="px-2 py-2">Matricule</th>
                    <th className="px-2 py-2">Classe</th>
                    <th className="px-2 py-2">Metier de reve</th>
                    <th className="px-2 py-2">Moyenne</th>
                    <th className="px-2 py-2">Score</th>
                    <th className="px-2 py-2">Statut</th>
                  </tr>
                </thead>
                <tbody>
                  {details.readinessRanking.items.map((row, index) => (
                    <tr key={row.studentId} className="border-b border-slate-100">
                      <td className="px-2 py-2 font-semibold text-slate-900">
                        {(details.readinessRanking.page - 1) * details.readinessRanking.pageSize + index + 1}
                      </td>
                      <td className="px-2 py-2">{row.fullName}</td>
                      <td className="px-2 py-2">{row.registrationNumber}</td>
                      <td className="px-2 py-2">{row.class?.name || "-"}</td>
                      <td className="px-2 py-2">{row.dreamCareer || row.targetProfession || "-"}</td>
                      <td className="px-2 py-2">{formatDecimal(row.latestAverage, 2)}/20</td>
                      <td className="px-2 py-2 font-semibold text-slate-900">{formatDecimal(row.readinessScore, 1)}%</td>
                      <td className="px-2 py-2">
                        <span className={`inline-flex rounded-full border px-2 py-1 text-xs font-semibold ${readinessClass(row.readinessBucket)}`}>
                          {readinessLabel[row.readinessBucket] || row.readinessBucket}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Pagination
              page={details.readinessRanking.page}
              totalItems={details.readinessRanking.total}
              pageSize={details.readinessRanking.pageSize}
              onPageChange={setRankingPage}
            />
          </>
        )}
      </Card>
    </div>
  );
}
