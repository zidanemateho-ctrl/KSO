import { FormEvent, useEffect, useMemo, useState } from "react";

import { academicApi, analyticsApi, guidanceApi, studentApi } from "../api/services";
import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { EmptyState } from "../components/ui/EmptyState";
import { Loader } from "../components/ui/Loader";
import { useAuth } from "../hooks/useAuth";
import { GuidanceHub, Student, StudentProjection, Subject } from "../types/models";
import { formatDate, formatDecimal } from "../utils/format";

const supervisorRoles = ["SUPER_ADMIN", "SCHOOL_ADMIN", "COLLEGE_ADMIN", "HIGH_SCHOOL_ADMIN", "UNIVERSITY_ADMIN", "TEACHER"] as const;

export function GuidancePage() {
  const { user } = useAuth();
  const [students, setStudents] = useState<Student[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [selectedStudentId, setSelectedStudentId] = useState("");
  const [hub, setHub] = useState<GuidanceHub | null>(null);
  const [projection, setProjection] = useState<StudentProjection | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const [simulateForm, setSimulateForm] = useState({
    semester: "SEMESTER_2" as "SEMESTER_1" | "SEMESTER_2",
    subjectId: "",
    score: 12
  });

  const [attendanceForm, setAttendanceForm] = useState({
    status: "PRESENT" as "PRESENT" | "ABSENT" | "RETARD",
    note: ""
  });

  const [competencyForm, setCompetencyForm] = useState({
    category: "ACADEMIQUE" as "ACADEMIQUE" | "COMMUNICATION" | "LEADERSHIP" | "COLLABORATION" | "AUTONOMIE" | "NUMERIQUE" | "CREATIVITE",
    label: "",
    score: 60
  });

  const [wellbeingForm, setWellbeingForm] = useState({
    mood: 3,
    stress: 3,
    energy: 3,
    comment: ""
  });

  const [opportunityForm, setOpportunityForm] = useState({
    title: "",
    description: "",
    type: "PROGRAMME" as "FILIERE" | "METIER" | "BOURSE" | "CONCOURS" | "PROGRAMME"
  });

  const [internshipForm, setInternshipForm] = useState({
    type: "STAGE" as "STAGE" | "ALTERNANCE",
    title: "",
    organization: ""
  });

  const [badgeForm, setBadgeForm] = useState({
    badgeType: "PROGRESSION" as "PROGRESSION" | "REGULARITE" | "EXCELLENCE" | "LEADERSHIP" | "ENTRAIDE",
    title: "",
    points: 20
  });

  const canSupervise = useMemo(() => supervisorRoles.includes((user?.role || "") as (typeof supervisorRoles)[number]), [user?.role]);

  async function loadHub(studentId: string) {
    const data = await guidanceApi.studentHub(studentId);
    setHub(data);
  }

  useEffect(() => {
    async function bootstrap() {
      if (!user) {
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const params = user.schoolId ? { schoolId: user.schoolId } : undefined;
        const studentList = await studentApi.list(params);
        const fallbackSchoolId = user.schoolId || studentList[0]?.schoolId;
        const subjectList = fallbackSchoolId ? await academicApi.listSubjects(fallbackSchoolId) : [];
        setStudents(studentList);
        setSubjects(subjectList);

        const firstStudent = studentList[0];
        if (firstStudent) {
          setSelectedStudentId(firstStudent.id);
          setSimulateForm((prev) => ({
            ...prev,
            subjectId: subjectList[0]?.id || ""
          }));
          await loadHub(firstStudent.id);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Impossible de charger le module parcours");
      } finally {
        setLoading(false);
      }
    }

    void bootstrap();
  }, [user]);

  useEffect(() => {
    async function refreshStudent() {
      if (!selectedStudentId) {
        setHub(null);
        return;
      }

      try {
        await loadHub(selectedStudentId);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Erreur de chargement du dossier");
      }
    }

    void refreshStudent();
  }, [selectedStudentId]);

  async function executeAction(action: () => Promise<unknown>, successMessage: string) {
    if (!selectedStudentId) {
      return;
    }

    setSubmitting(true);
    setError(null);
    setMessage(null);

    try {
      await action();
      await loadHub(selectedStudentId);
      setMessage(successMessage);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Action impossible");
    } finally {
      setSubmitting(false);
    }
  }

  async function onSimulate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedStudentId || !simulateForm.subjectId) {
      return;
    }

    setSubmitting(true);
    setError(null);
    setMessage(null);

    try {
      const result = await analyticsApi.simulateStudent(selectedStudentId, {
        semester: simulateForm.semester,
        subjectId: simulateForm.subjectId,
        score: simulateForm.score
      });
      setProjection(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Simulation impossible");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return <Loader label="Chargement du module Parcours+..." />;
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

      {!hub ? (
        <EmptyState title="Aucun dossier" description="Selectionnez un apprenant pour afficher le parcours." />
      ) : (
        <>
          <Card title="Indicateurs parcours">
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              <div className="rounded-xl bg-slate-50 p-3">
                <p className="text-xs uppercase tracking-wide text-slate-500">Absences 30j</p>
                <p className="mt-1 text-xl font-semibold text-rose-700">{hub.indicators.attendanceSummary.absent}</p>
              </div>
              <div className="rounded-xl bg-slate-50 p-3">
                <p className="text-xs uppercase tracking-wide text-slate-500">Retards 30j</p>
                <p className="mt-1 text-xl font-semibold text-amber-700">{hub.indicators.attendanceSummary.late}</p>
              </div>
              <div className="rounded-xl bg-slate-50 p-3">
                <p className="text-xs uppercase tracking-wide text-slate-500">Alertes ouvertes</p>
                <p className="mt-1 text-xl font-semibold text-slate-900">{hub.indicators.openAlerts}</p>
              </div>
              <div className="rounded-xl bg-slate-50 p-3">
                <p className="text-xs uppercase tracking-wide text-slate-500">Dernier stress</p>
                <p className="mt-1 text-xl font-semibold text-slate-900">{hub.indicators.wellbeing?.stress ?? "-"}/5</p>
              </div>
            </div>
          </Card>

          <Card title="Remediation et conseils">
            <div className="grid gap-4 lg:grid-cols-2">
              <div className="space-y-2">
                <p className="text-sm font-semibold text-slate-800">Lacunes detectees</p>
                {hub.remediation.length === 0 ? (
                  <p className="text-sm text-emerald-700">Aucune lacune critique detectee.</p>
                ) : (
                  hub.remediation.map((item) => (
                    <article key={item.subjectName} className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm">
                      <p className="font-semibold text-amber-900">
                        {item.subjectName} - {formatDecimal(item.average, 2)}/20
                      </p>
                      <p className="mt-1 text-amber-800">{item.recommendation}</p>
                    </article>
                  ))
                )}
              </div>

              <div className="space-y-2">
                <p className="text-sm font-semibold text-slate-800">Conseils hebdomadaires</p>
                {hub.weeklyTips.map((tip) => (
                  <p key={tip} className="rounded-xl bg-slate-50 p-3 text-sm text-slate-700">
                    {tip}
                  </p>
                ))}
              </div>
            </div>
          </Card>

          <Card title="Simulateur what-if (note projetee)">
            <form onSubmit={onSimulate} className="grid gap-3 md:grid-cols-4">
              <select
                className="rounded-xl border border-slate-300 px-3 py-2 text-sm"
                value={simulateForm.semester}
                onChange={(event) =>
                  setSimulateForm((prev) => ({ ...prev, semester: event.target.value as "SEMESTER_1" | "SEMESTER_2" }))
                }
              >
                <option value="SEMESTER_1">Semestre 1</option>
                <option value="SEMESTER_2">Semestre 2</option>
              </select>
              <select
                className="rounded-xl border border-slate-300 px-3 py-2 text-sm"
                value={simulateForm.subjectId}
                onChange={(event) => setSimulateForm((prev) => ({ ...prev, subjectId: event.target.value }))}
              >
                {subjects.map((subject) => (
                  <option key={subject.id} value={subject.id}>
                    {subject.name}
                  </option>
                ))}
              </select>
              <input
                className="rounded-xl border border-slate-300 px-3 py-2 text-sm"
                type="number"
                min={0}
                max={20}
                step="0.5"
                value={simulateForm.score}
                onChange={(event) => setSimulateForm((prev) => ({ ...prev, score: Number(event.target.value) }))}
              />
              <Button type="submit" disabled={submitting}>
                Simuler
              </Button>
            </form>

            {projection ? (
              <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <div className="rounded-xl bg-slate-50 p-3 text-sm">
                  <p className="text-slate-500">Moyenne actuelle</p>
                  <p className="font-semibold text-slate-900">{formatDecimal(projection.projection.currentAverage, 2)}/20</p>
                </div>
                <div className="rounded-xl bg-slate-50 p-3 text-sm">
                  <p className="text-slate-500">Moyenne projetee</p>
                  <p className="font-semibold text-teal-700">{formatDecimal(projection.projection.projectedAverage, 2)}/20</p>
                </div>
                <div className="rounded-xl bg-slate-50 p-3 text-sm">
                  <p className="text-slate-500">Delta</p>
                  <p className="font-semibold text-slate-900">{formatDecimal(projection.projection.deltaAverage, 2)}</p>
                </div>
                <div className="rounded-xl bg-slate-50 p-3 text-sm">
                  <p className="text-slate-500">Rang projete</p>
                  <p className="font-semibold text-slate-900">#{projection.projection.projectedRank}</p>
                </div>
              </div>
            ) : null}
          </Card>

          {canSupervise ? (
            <div className="grid gap-6 xl:grid-cols-2">
              <Card title="Actions rapides encadrant">
                <div className="space-y-4">
                  <form
                    onSubmit={(event) => {
                      event.preventDefault();
                      void executeAction(
                        () => guidanceApi.addAttendance(selectedStudentId, attendanceForm),
                        "Assiduite enregistree"
                      );
                    }}
                    className="grid gap-2 md:grid-cols-3"
                  >
                    <select
                      className="rounded-xl border border-slate-300 px-3 py-2 text-sm"
                      value={attendanceForm.status}
                      onChange={(event) =>
                        setAttendanceForm((prev) => ({ ...prev, status: event.target.value as "PRESENT" | "ABSENT" | "RETARD" }))
                      }
                    >
                      <option value="PRESENT">PRESENT</option>
                      <option value="ABSENT">ABSENT</option>
                      <option value="RETARD">RETARD</option>
                    </select>
                    <input
                      className="rounded-xl border border-slate-300 px-3 py-2 text-sm"
                      placeholder="Note"
                      value={attendanceForm.note}
                      onChange={(event) => setAttendanceForm((prev) => ({ ...prev, note: event.target.value }))}
                    />
                    <Button type="submit" disabled={submitting}>
                      Ajouter assiduite
                    </Button>
                  </form>

                  <form
                    onSubmit={(event) => {
                      event.preventDefault();
                      void executeAction(
                        () =>
                          guidanceApi.addCompetency(selectedStudentId, {
                            category: competencyForm.category,
                            label: competencyForm.label,
                            score: competencyForm.score
                          }),
                        "Evaluation competence enregistree"
                      );
                    }}
                    className="grid gap-2 md:grid-cols-4"
                  >
                    <select
                      className="rounded-xl border border-slate-300 px-3 py-2 text-sm"
                      value={competencyForm.category}
                      onChange={(event) =>
                        setCompetencyForm((prev) => ({
                          ...prev,
                          category: event.target.value as
                            | "ACADEMIQUE"
                            | "COMMUNICATION"
                            | "LEADERSHIP"
                            | "COLLABORATION"
                            | "AUTONOMIE"
                            | "NUMERIQUE"
                            | "CREATIVITE"
                        }))
                      }
                    >
                      <option value="ACADEMIQUE">ACADEMIQUE</option>
                      <option value="COMMUNICATION">COMMUNICATION</option>
                      <option value="LEADERSHIP">LEADERSHIP</option>
                      <option value="COLLABORATION">COLLABORATION</option>
                      <option value="AUTONOMIE">AUTONOMIE</option>
                      <option value="NUMERIQUE">NUMERIQUE</option>
                      <option value="CREATIVITE">CREATIVITE</option>
                    </select>
                    <input
                      className="rounded-xl border border-slate-300 px-3 py-2 text-sm"
                      placeholder="Libelle competence"
                      value={competencyForm.label}
                      onChange={(event) => setCompetencyForm((prev) => ({ ...prev, label: event.target.value }))}
                      required
                    />
                    <input
                      className="rounded-xl border border-slate-300 px-3 py-2 text-sm"
                      type="number"
                      min={0}
                      max={100}
                      value={competencyForm.score}
                      onChange={(event) => setCompetencyForm((prev) => ({ ...prev, score: Number(event.target.value) }))}
                    />
                    <Button type="submit" disabled={submitting}>
                      Evaluer
                    </Button>
                  </form>

                  <form
                    onSubmit={(event) => {
                      event.preventDefault();
                      void executeAction(
                        () =>
                          guidanceApi.addBadge(selectedStudentId, {
                            badgeType: badgeForm.badgeType,
                            title: badgeForm.title,
                            points: badgeForm.points
                          }),
                        "Badge attribue"
                      );
                    }}
                    className="grid gap-2 md:grid-cols-4"
                  >
                    <select
                      className="rounded-xl border border-slate-300 px-3 py-2 text-sm"
                      value={badgeForm.badgeType}
                      onChange={(event) =>
                        setBadgeForm((prev) => ({
                          ...prev,
                          badgeType: event.target.value as "PROGRESSION" | "REGULARITE" | "EXCELLENCE" | "LEADERSHIP" | "ENTRAIDE"
                        }))
                      }
                    >
                      <option value="PROGRESSION">PROGRESSION</option>
                      <option value="REGULARITE">REGULARITE</option>
                      <option value="EXCELLENCE">EXCELLENCE</option>
                      <option value="LEADERSHIP">LEADERSHIP</option>
                      <option value="ENTRAIDE">ENTRAIDE</option>
                    </select>
                    <input
                      className="rounded-xl border border-slate-300 px-3 py-2 text-sm"
                      placeholder="Titre badge"
                      value={badgeForm.title}
                      onChange={(event) => setBadgeForm((prev) => ({ ...prev, title: event.target.value }))}
                      required
                    />
                    <input
                      className="rounded-xl border border-slate-300 px-3 py-2 text-sm"
                      type="number"
                      min={0}
                      value={badgeForm.points}
                      onChange={(event) => setBadgeForm((prev) => ({ ...prev, points: Number(event.target.value) }))}
                    />
                    <Button type="submit" disabled={submitting}>
                      Ajouter badge
                    </Button>
                  </form>
                </div>
              </Card>

              <Card title="Bien-etre, opportunites et insertion">
                <div className="space-y-4">
                  <form
                    onSubmit={(event) => {
                      event.preventDefault();
                      void executeAction(() => guidanceApi.addWellbeing(selectedStudentId, wellbeingForm), "Check-in bien-etre ajoute");
                    }}
                    className="grid gap-2 md:grid-cols-4"
                  >
                    <input
                      className="rounded-xl border border-slate-300 px-3 py-2 text-sm"
                      type="number"
                      min={1}
                      max={5}
                      value={wellbeingForm.mood}
                      onChange={(event) => setWellbeingForm((prev) => ({ ...prev, mood: Number(event.target.value) }))}
                    />
                    <input
                      className="rounded-xl border border-slate-300 px-3 py-2 text-sm"
                      type="number"
                      min={1}
                      max={5}
                      value={wellbeingForm.stress}
                      onChange={(event) => setWellbeingForm((prev) => ({ ...prev, stress: Number(event.target.value) }))}
                    />
                    <input
                      className="rounded-xl border border-slate-300 px-3 py-2 text-sm"
                      type="number"
                      min={1}
                      max={5}
                      value={wellbeingForm.energy}
                      onChange={(event) => setWellbeingForm((prev) => ({ ...prev, energy: Number(event.target.value) }))}
                    />
                    <Button type="submit" disabled={submitting}>
                      Check-in bien-etre
                    </Button>
                  </form>

                  <form
                    onSubmit={(event) => {
                      event.preventDefault();
                      void executeAction(
                        async () => {
                          await guidanceApi.createOpportunity(opportunityForm);
                          await guidanceApi.matchOpportunities(selectedStudentId);
                        },
                        "Opportunite publiee et matching recalcule"
                      );
                    }}
                    className="grid gap-2 md:grid-cols-3"
                  >
                    <input
                      className="rounded-xl border border-slate-300 px-3 py-2 text-sm"
                      placeholder="Titre opportunite"
                      value={opportunityForm.title}
                      onChange={(event) => setOpportunityForm((prev) => ({ ...prev, title: event.target.value }))}
                      required
                    />
                    <select
                      className="rounded-xl border border-slate-300 px-3 py-2 text-sm"
                      value={opportunityForm.type}
                      onChange={(event) =>
                        setOpportunityForm((prev) => ({
                          ...prev,
                          type: event.target.value as "FILIERE" | "METIER" | "BOURSE" | "CONCOURS" | "PROGRAMME"
                        }))
                      }
                    >
                      <option value="PROGRAMME">PROGRAMME</option>
                      <option value="BOURSE">BOURSE</option>
                      <option value="CONCOURS">CONCOURS</option>
                      <option value="METIER">METIER</option>
                      <option value="FILIERE">FILIERE</option>
                    </select>
                    <Button type="submit" disabled={submitting}>
                      Publier opportunite
                    </Button>
                    <textarea
                      className="md:col-span-3 rounded-xl border border-slate-300 px-3 py-2 text-sm"
                      rows={2}
                      placeholder="Description"
                      value={opportunityForm.description}
                      onChange={(event) => setOpportunityForm((prev) => ({ ...prev, description: event.target.value }))}
                      required
                    />
                  </form>

                  <form
                    onSubmit={(event) => {
                      event.preventDefault();
                      void executeAction(() => guidanceApi.addInternship(selectedStudentId, internshipForm), "Candidature stage ajoutee");
                    }}
                    className="grid gap-2 md:grid-cols-4"
                  >
                    <select
                      className="rounded-xl border border-slate-300 px-3 py-2 text-sm"
                      value={internshipForm.type}
                      onChange={(event) => setInternshipForm((prev) => ({ ...prev, type: event.target.value as "STAGE" | "ALTERNANCE" }))}
                    >
                      <option value="STAGE">STAGE</option>
                      <option value="ALTERNANCE">ALTERNANCE</option>
                    </select>
                    <input
                      className="rounded-xl border border-slate-300 px-3 py-2 text-sm"
                      placeholder="Intitule"
                      value={internshipForm.title}
                      onChange={(event) => setInternshipForm((prev) => ({ ...prev, title: event.target.value }))}
                      required
                    />
                    <input
                      className="rounded-xl border border-slate-300 px-3 py-2 text-sm"
                      placeholder="Organisation"
                      value={internshipForm.organization}
                      onChange={(event) => setInternshipForm((prev) => ({ ...prev, organization: event.target.value }))}
                      required
                    />
                    <Button type="submit" disabled={submitting}>
                      Ajouter candidature
                    </Button>
                  </form>
                </div>
              </Card>
            </div>
          ) : null}

          <Card title="Opportunites, badges et journal">
            <div className="grid gap-4 lg:grid-cols-3">
              <div className="space-y-2">
                <p className="text-sm font-semibold text-slate-800">Opportunites match</p>
                {hub.opportunities.length === 0 ? (
                  <p className="text-sm text-slate-500">Aucune opportunite match pour le moment.</p>
                ) : (
                  hub.opportunities.map((item) => (
                    <article key={item.id} className="rounded-xl border border-slate-200 p-3 text-sm">
                      <p className="font-semibold text-slate-900">{item.opportunity.title}</p>
                      <p className="text-slate-600">Score match: {formatDecimal(item.matchScore, 0)}%</p>
                      <p className="text-slate-500">{item.rationale}</p>
                    </article>
                  ))
                )}
              </div>

              <div className="space-y-2">
                <p className="text-sm font-semibold text-slate-800">Badges gamification</p>
                {hub.badges.length === 0 ? (
                  <p className="text-sm text-slate-500">Aucun badge.</p>
                ) : (
                  hub.badges.map((badge) => (
                    <article key={badge.id} className="rounded-xl border border-slate-200 p-3 text-sm">
                      <p className="font-semibold text-slate-900">{badge.title}</p>
                      <p className="text-slate-600">
                        {badge.badgeType} - {badge.points} pts
                      </p>
                      <p className="text-slate-500">{formatDate(badge.awardedAt)}</p>
                    </article>
                  ))
                )}
              </div>

              <div className="space-y-2">
                <p className="text-sm font-semibold text-slate-800">Journal hebdo</p>
                {hub.journal.length === 0 ? (
                  <p className="text-sm text-slate-500">Aucune entree hebdomadaire.</p>
                ) : (
                  hub.journal.map((entry) => (
                    <article key={entry.id} className="rounded-xl border border-slate-200 p-3 text-sm">
                      <p className="font-semibold text-slate-900">Semaine du {formatDate(entry.weekStart)}</p>
                      <p className="text-slate-600">{entry.summary}</p>
                    </article>
                  ))
                )}
              </div>
            </div>
          </Card>
        </>
      )}
    </div>
  );
}
