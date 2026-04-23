import { FormEvent, useEffect, useMemo, useState } from "react";

import { accompanimentApi, studentApi } from "../api/services";
import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { EmptyState } from "../components/ui/EmptyState";
import { Loader } from "../components/ui/Loader";
import { useAuth } from "../hooks/useAuth";
import { AccompanimentOverview, Student } from "../types/models";
import { formatDate, formatDecimal } from "../utils/format";

export function AccompanimentPage() {
  const { user } = useAuth();
  const [students, setStudents] = useState<Student[]>([]);
  const [selectedStudentId, setSelectedStudentId] = useState<string>("");
  const [overview, setOverview] = useState<AccompanimentOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [savingPlan, setSavingPlan] = useState(false);
  const [savingAlert, setSavingAlert] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const [planForm, setPlanForm] = useState({
    title: "",
    description: "",
    dueDate: ""
  });

  const [alertForm, setAlertForm] = useState({
    severity: "ATTENTION" as "INFO" | "ATTENTION" | "CRITIQUE",
    category: "ACCOMPAGNEMENT",
    title: "",
    message: ""
  });

  const canManageAlerts = useMemo(
    () =>
      ["SUPER_ADMIN", "SCHOOL_ADMIN", "COLLEGE_ADMIN", "HIGH_SCHOOL_ADMIN", "UNIVERSITY_ADMIN", "TEACHER"].includes(
        user?.role || ""
      ),
    [user?.role]
  );

  async function loadStudents() {
    if (!user) {
      return;
    }

    const params = user.schoolId ? { schoolId: user.schoolId } : undefined;
    const list = await studentApi.list(params);
    setStudents(list);

    if (!selectedStudentId && list[0]) {
      setSelectedStudentId(list[0].id);
    }
  }

  async function loadOverview(studentId: string) {
    const data = await accompanimentApi.studentOverview(studentId);
    setOverview(data);
  }

  async function bootstrap() {
    if (!user) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await loadStudents();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur de chargement");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void bootstrap();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  useEffect(() => {
    async function fetchOverview() {
      if (!selectedStudentId) {
        setOverview(null);
        return;
      }

      try {
        await loadOverview(selectedStudentId);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Erreur de chargement du suivi");
      }
    }

    void fetchOverview();
  }, [selectedStudentId]);

  async function onCreatePlan(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!selectedStudentId) {
      return;
    }

    setSavingPlan(true);
    setError(null);
    setMessage(null);

    try {
      await accompanimentApi.createPlan(selectedStudentId, {
        title: planForm.title,
        description: planForm.description || undefined,
        dueDate: planForm.dueDate || undefined
      });

      setPlanForm({ title: "", description: "", dueDate: "" });
      setMessage("Plan d accompagnement ajoute");
      await loadOverview(selectedStudentId);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Creation du plan impossible");
    } finally {
      setSavingPlan(false);
    }
  }

  async function onCreateAlert(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!selectedStudentId || !canManageAlerts) {
      return;
    }

    setSavingAlert(true);
    setError(null);
    setMessage(null);

    try {
      await accompanimentApi.createAlert(selectedStudentId, alertForm);
      setAlertForm({ severity: "ATTENTION", category: "ACCOMPAGNEMENT", title: "", message: "" });
      setMessage("Alerte ajoutee");
      await loadOverview(selectedStudentId);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Creation de l alerte impossible");
    } finally {
      setSavingAlert(false);
    }
  }

  async function onMarkAlertRead(alertId: string) {
    try {
      await accompanimentApi.markAlertAsRead(alertId);
      if (selectedStudentId) {
        await loadOverview(selectedStudentId);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Mise a jour alerte impossible");
    }
  }

  if (loading) {
    return <Loader label="Chargement du module d accompagnement..." />;
  }

  return (
    <div className="space-y-6">
      {error ? (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div>
      ) : null}
      {message ? (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{message}</div>
      ) : null}

      <Card title="Selection apprenant">
        <select
          className="rounded-xl border border-slate-300 px-3 py-2 text-sm"
          value={selectedStudentId}
          onChange={(event) => setSelectedStudentId(event.target.value)}
        >
          {students.map((student) => (
            <option key={student.id} value={student.id}>
              {student.fullName} - {student.registrationNumber}
            </option>
          ))}
        </select>
      </Card>

      {!overview ? (
        <EmptyState title="Aucun apprenant selectionne" />
      ) : (
        <>
          <Card title="Dossier apprenant">
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              <div className="rounded-xl bg-slate-50 p-3">
                <p className="text-xs uppercase tracking-wide text-slate-500">Moyenne actuelle</p>
                <p className="mt-1 text-xl font-semibold text-slate-900">{formatDecimal(overview.metrics.semesterAverage, 2)}/20</p>
              </div>
              <div className="rounded-xl bg-slate-50 p-3">
                <p className="text-xs uppercase tracking-wide text-slate-500">Rang</p>
                <p className="mt-1 text-xl font-semibold text-slate-900">#{overview.metrics.rank || "-"}</p>
              </div>
              <div className="rounded-xl bg-slate-50 p-3">
                <p className="text-xs uppercase tracking-wide text-slate-500">Discipline preferee</p>
                <p className="mt-1 text-xl font-semibold text-slate-900">{overview.metrics.preferredSubject?.name || "-"}</p>
              </div>
              <div className="rounded-xl bg-slate-50 p-3">
                <p className="text-xs uppercase tracking-wide text-slate-500">Metier de reve</p>
                <p className="mt-1 text-xl font-semibold text-slate-900">{overview.metrics.dreamCareer || "-"}</p>
              </div>
            </div>

            <div className="mt-4 rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-600">
              <p className="font-semibold text-slate-800">Objectifs d apprentissage</p>
              <p className="mt-1">{overview.metrics.learningObjectives || "Aucun objectif defini"}</p>
            </div>
          </Card>

          <Card title="Moyennes par discipline et sequence">
            <div className="grid gap-4 lg:grid-cols-2">
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 text-left text-slate-500">
                      <th className="px-2 py-2">Discipline</th>
                      <th className="px-2 py-2">Moyenne</th>
                    </tr>
                  </thead>
                  <tbody>
                    {overview.subjectAverages.map((item) => (
                      <tr key={item.subjectName} className="border-b border-slate-100">
                        <td className="px-2 py-2">{item.subjectName}</td>
                        <td className="px-2 py-2 font-semibold text-teal-700">{formatDecimal(item.average, 2)}/20</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="space-y-2">
                {overview.sequentialAverages.map((item) => (
                  <div key={`${item.semester}_${item.sequence}`} className="rounded-xl bg-slate-50 p-3 text-sm">
                    <p className="font-medium text-slate-700">
                      {item.semester} - {item.sequence}
                    </p>
                    <p className="text-lg font-semibold text-slate-900">{formatDecimal(item.average, 2)}/20</p>
                  </div>
                ))}
              </div>
            </div>
          </Card>

          <div className="grid gap-6 xl:grid-cols-2">
            <Card title="Plans d accompagnement">
              <form onSubmit={onCreatePlan} className="space-y-3 border-b border-slate-200 pb-4">
                <input
                  className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
                  placeholder="Titre du plan"
                  value={planForm.title}
                  onChange={(event) => setPlanForm((prev) => ({ ...prev, title: event.target.value }))}
                  required
                />
                <textarea
                  className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
                  placeholder="Description"
                  rows={3}
                  value={planForm.description}
                  onChange={(event) => setPlanForm((prev) => ({ ...prev, description: event.target.value }))}
                />
                <input
                  className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
                  type="date"
                  value={planForm.dueDate}
                  onChange={(event) => setPlanForm((prev) => ({ ...prev, dueDate: event.target.value }))}
                />
                <Button type="submit" disabled={savingPlan}>
                  {savingPlan ? "Ajout..." : "Ajouter un plan"}
                </Button>
              </form>

              <div className="mt-4 space-y-3">
                {overview.plans.length === 0 ? (
                  <EmptyState title="Aucun plan" description="Ajoutez un plan d accompagnement pour demarrer." />
                ) : (
                  overview.plans.map((plan) => (
                    <article key={plan.id} className="rounded-xl border border-slate-200 p-3 text-sm">
                      <p className="font-semibold text-slate-900">{plan.title}</p>
                      <p className="mt-1 text-slate-600">{plan.description || "Sans description"}</p>
                      <p className="mt-2 text-xs text-slate-500">
                        Statut: {plan.status} {plan.dueDate ? `- Echeance: ${formatDate(plan.dueDate)}` : ""}
                      </p>
                    </article>
                  ))
                )}
              </div>
            </Card>

            <Card title="Alertes et conseils">
              {canManageAlerts ? (
                <form onSubmit={onCreateAlert} className="space-y-3 border-b border-slate-200 pb-4">
                  <select
                    className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
                    value={alertForm.severity}
                    onChange={(event) =>
                      setAlertForm((prev) => ({
                        ...prev,
                        severity: event.target.value as "INFO" | "ATTENTION" | "CRITIQUE"
                      }))
                    }
                  >
                    <option value="INFO">INFO</option>
                    <option value="ATTENTION">ATTENTION</option>
                    <option value="CRITIQUE">CRITIQUE</option>
                  </select>
                  <input
                    className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
                    placeholder="Categorie"
                    value={alertForm.category}
                    onChange={(event) => setAlertForm((prev) => ({ ...prev, category: event.target.value }))}
                    required
                  />
                  <input
                    className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
                    placeholder="Titre"
                    value={alertForm.title}
                    onChange={(event) => setAlertForm((prev) => ({ ...prev, title: event.target.value }))}
                    required
                  />
                  <textarea
                    className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
                    placeholder="Message"
                    rows={3}
                    value={alertForm.message}
                    onChange={(event) => setAlertForm((prev) => ({ ...prev, message: event.target.value }))}
                    required
                  />
                  <Button type="submit" disabled={savingAlert}>
                    {savingAlert ? "Ajout..." : "Ajouter une alerte"}
                  </Button>
                </form>
              ) : null}

              <div className="mt-4 space-y-3">
                {overview.alerts.length === 0 ? (
                  <EmptyState title="Aucune alerte" description="Le suivi est stable pour le moment." />
                ) : (
                  overview.alerts.map((alert) => (
                    <article key={alert.id} className="rounded-xl border border-slate-200 p-3 text-sm">
                      <div className="flex items-center justify-between">
                        <p className="font-semibold text-slate-900">{alert.title}</p>
                        <span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-700">
                          {alert.severity}
                        </span>
                      </div>
                      <p className="mt-1 text-slate-600">{alert.message}</p>
                      <div className="mt-2 flex items-center justify-between">
                        <p className="text-xs text-slate-500">{formatDate(alert.createdAt)}</p>
                        {!alert.isRead ? (
                          <Button variant="ghost" className="px-2 py-1 text-xs" onClick={() => void onMarkAlertRead(alert.id)}>
                            Marquer lu
                          </Button>
                        ) : (
                          <span className="text-xs text-emerald-600">Lue</span>
                        )}
                      </div>
                    </article>
                  ))
                )}
              </div>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
