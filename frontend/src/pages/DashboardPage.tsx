import { useEffect, useMemo, useState } from "react";
import { Bar, BarChart, CartesianGrid, Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import { academicApi, analyticsApi, schoolApi, studentApi, superAdminApi } from "../api/services";
import { Card } from "../components/ui/Card";
import { EmptyState } from "../components/ui/EmptyState";
import { KpiCard } from "../components/ui/KpiCard";
import { Loader } from "../components/ui/Loader";
import { useAuth } from "../hooks/useAuth";
import { ClassAnalytics, School, SchoolAnalytics, Student, StudentAnalytics, SuperAdminDashboardAnalytics } from "../types/models";
import { formatDecimal, formatNumber, formatPercent } from "../utils/format";

const adminRoles = ["SUPER_ADMIN", "SCHOOL_ADMIN", "COLLEGE_ADMIN", "HIGH_SCHOOL_ADMIN", "UNIVERSITY_ADMIN"] as const;
const scoreRangeColors = ["#0f766e", "#0369a1", "#7c3aed", "#c2410c", "#be123c", "#334155"];

export function DashboardPage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [schools, setSchools] = useState<School[]>([]);
  const [superAdminDashboard, setSuperAdminDashboard] = useState<SuperAdminDashboardAnalytics | null>(null);
  const [schoolAnalytics, setSchoolAnalytics] = useState<SchoolAnalytics | null>(null);
  const [classAnalytics, setClassAnalytics] = useState<ClassAnalytics | null>(null);
  const [studentAnalytics, setStudentAnalytics] = useState<StudentAnalytics | null>(null);
  const [studentList, setStudentList] = useState<Student[]>([]);

  const isAdmin = adminRoles.includes((user?.role || "") as (typeof adminRoles)[number]);

  useEffect(() => {
    async function loadData() {
      if (!user) {
        return;
      }

      setLoading(true);
      setError(null);

      try {
        if (user.role === "SUPER_ADMIN") {
          const [schoolsData, dashboardData] = await Promise.all([schoolApi.list(), superAdminApi.dashboard()]);
          setSchools(schoolsData);
          setSuperAdminDashboard(dashboardData);
        }

        if (isAdmin && user.role !== "SUPER_ADMIN" && user.schoolId) {
          const analytics = await analyticsApi.school(user.schoolId);
          setSchoolAnalytics(analytics);

          const students = await studentApi.list({ schoolId: user.schoolId });
          setStudentList(students);
        }

        if (user.role === "TEACHER") {
          const classes = await academicApi.listClasses(user.schoolId || undefined);

          if (classes[0]) {
            const analytics = await analyticsApi.class(classes[0].id, "SEMESTER_2");
            setClassAnalytics(analytics);
          }
        }

        if (user.role === "STUDENT" || user.role === "UNIVERSITY_STUDENT" || user.role === "PARENT") {
          const students = await studentApi.list(user.schoolId ? { schoolId: user.schoolId } : undefined);
          setStudentList(students);

          if (students[0]) {
            const analytics = await analyticsApi.student(students[0].id);
            setStudentAnalytics(analytics);
          }
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Impossible de charger le dashboard");
      } finally {
        setLoading(false);
      }
    }

    void loadData();
  }, [user, isAdmin]);

  const cards = useMemo(() => {
    if (!user) {
      return [];
    }

    if (user.role === "SUPER_ADMIN") {
      const semester1 = superAdminDashboard?.semesterAverages.find((item) => item.semester === "SEMESTER_1");
      const semester2 = superAdminDashboard?.semesterAverages.find((item) => item.semester === "SEMESTER_2");

      return [
        {
          label: "Eleves et etudiants enregistres",
          value: superAdminDashboard?.summary.totalStudents ?? 0,
          subtitle: `${formatNumber(schools.length)} etablissements`
        },
        {
          label: "Enseignants enregistres",
          value: superAdminDashboard?.summary.totalTeachers ?? 0,
          subtitle: "Comptes enseignants"
        },
        {
          label: "Moyenne generale S1",
          value: semester1 ? `${formatDecimal(semester1.average, 2)}/20` : "-",
          subtitle: semester1 ? `${formatNumber(semester1.students)} resultats` : "Pas de resultats"
        },
        {
          label: "Moyenne generale S2",
          value: semester2 ? `${formatDecimal(semester2.average, 2)}/20` : "-",
          subtitle: semester2 ? `${formatNumber(semester2.students)} resultats` : "Pas de resultats"
        }
      ];
    }

    if (isAdmin) {
      return [
        { label: "Apprenants", value: studentList.length },
        { label: "Taux de reussite", value: schoolAnalytics ? formatPercent(schoolAnalytics.summary.successRate) : "-" },
        { label: "Risque eleve", value: schoolAnalytics?.riskDistribution.eleve ?? 0 },
        { label: "Alertes ouvertes", value: schoolAnalytics?.alertSummary.totalOpen ?? 0 }
      ];
    }

    if (user.role === "TEACHER") {
      return [
        { label: "Classe analysee", value: classAnalytics?.class.name || "-" },
        { label: "Semestre", value: classAnalytics?.semester === "SEMESTER_1" ? "S1" : "S2" },
        { label: "Eleves classes", value: classAnalytics?.ranking.length ?? 0 },
        { label: "Matiere la plus faible", value: classAnalytics?.weakestSubject?.subjectName || "-" }
      ];
    }

    return [
      { label: "Profil", value: user.role === "PARENT" ? "Parent" : user.role === "UNIVERSITY_STUDENT" ? "Etudiant" : "Eleve" },
      { label: "Moyenne courante", value: studentAnalytics ? `${formatDecimal(studentAnalytics.metrics.currentAverage, 2)}/20` : "-" },
      { label: "Rang", value: studentAnalytics?.metrics.currentRank ?? "-" },
      { label: "Risque", value: studentAnalytics?.metrics.risk?.riskLevel || "-" }
    ];
  }, [user, schools.length, superAdminDashboard, schoolAnalytics, studentList.length, classAnalytics, studentAnalytics, isAdmin]);

  const topDisciplineData = useMemo(
    () => (superAdminDashboard ? superAdminDashboard.disciplineAverages.slice(0, 10) : []),
    [superAdminDashboard]
  );

  const scoreDistributionData = useMemo(
    () => (superAdminDashboard ? superAdminDashboard.scoreDistribution.filter((item) => item.count > 0) : []),
    [superAdminDashboard]
  );

  if (loading) {
    return <Loader label="Chargement du dashboard..." />;
  }

  return (
    <div className="space-y-6">
      {error ? (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map((card) => (
          <KpiCard key={card.label} label={card.label} value={card.value} subtitle={"subtitle" in card ? card.subtitle : undefined} />
        ))}
      </div>

      {user?.role === "SUPER_ADMIN" && superAdminDashboard ? (
        <>
          <Card
            title="Couverture globale de la plateforme"
            subtitle="Synthese de la qualite des donnees pour les indicateurs Super Admin"
          >
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                <p className="text-xs uppercase tracking-[0.14em] text-slate-500">Etablissements suivis</p>
                <p className="mt-1 text-2xl font-bold text-slate-900">{formatNumber(schools.length)}</p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                <p className="text-xs uppercase tracking-[0.14em] text-slate-500">Apprenants avec moyenne</p>
                <p className="mt-1 text-2xl font-bold text-emerald-700">
                  {formatNumber(superAdminDashboard.summary.studentsWithAverage)}
                </p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                <p className="text-xs uppercase tracking-[0.14em] text-slate-500">Apprenants sans moyenne</p>
                <p className="mt-1 text-2xl font-bold text-amber-700">
                  {formatNumber(superAdminDashboard.summary.studentsWithoutAverage)}
                </p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                <p className="text-xs uppercase tracking-[0.14em] text-slate-500">Disciplines mesurees</p>
                <p className="mt-1 text-2xl font-bold text-slate-900">
                  {formatNumber(superAdminDashboard.disciplineAverages.length)}
                </p>
              </div>
            </div>
          </Card>

          <div className="grid gap-6 xl:grid-cols-2">
            <Card
              title="Diagramme des disciplines et notes"
              subtitle="Top 10 des disciplines selon la moyenne generale"
              className="h-full"
            >
              {topDisciplineData.length ? (
                <div className="h-[360px] min-h-[360px] min-w-fit">
                  <ResponsiveContainer width="100%" height="100%" minWidth={200}>
                    <BarChart data={topDisciplineData} margin={{ top: 10, right: 16, left: 0, bottom: 72 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                      <XAxis dataKey="subjectName" angle={-24} textAnchor="end" interval={0} height={74} stroke="#64748b" fontSize={12} />
                      <YAxis domain={[0, 20]} stroke="#64748b" fontSize={12} />
                      <Tooltip
                        contentStyle={{ borderRadius: "12px", borderColor: "#dbe3ef" }}
                        formatter={(value) => [`${formatDecimal(Number(value ?? 0), 2)}/20`, "Moyenne"]}
                      />
                      <Bar dataKey="average" fill="#0f766e" radius={[8, 8, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <EmptyState title="Aucune note disponible" description="Ajoute des notes pour alimenter ce graphique." />
              )}
            </Card>

            <Card
              title="Diagramme circulaire des tranches de note"
              subtitle="Repartition des apprenants selon leur moyenne generale la plus recente"
              className="h-full"
            >
              {scoreDistributionData.length ? (
                <div className="space-y-4">
                  <div className="h-[320px] min-h-[320px] min-w-fit">
                    <ResponsiveContainer width="100%" height="100%" minWidth={200}>
                      <PieChart>
                        <Pie
                          data={scoreDistributionData}
                          dataKey="count"
                          nameKey="label"
                          cx="50%"
                          cy="50%"
                          innerRadius={58}
                          outerRadius={108}
                          paddingAngle={2}
                        >
                          {scoreDistributionData.map((item, index) => (
                            <Cell key={item.label} fill={scoreRangeColors[index % scoreRangeColors.length]} />
                          ))}
                        </Pie>
                        <Tooltip
                          contentStyle={{ borderRadius: "12px", borderColor: "#dbe3ef" }}
                          formatter={(value) => [formatNumber(Number(value ?? 0)), "Apprenants"]}
                        />
                        <Legend verticalAlign="bottom" />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>

                  <div className="grid gap-2 sm:grid-cols-2">
                    {superAdminDashboard.scoreDistribution.map((item, index) => (
                      <div key={item.label} className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
                        <div className="flex items-center gap-2">
                          <span
                            className="inline-block h-2.5 w-2.5 rounded-full"
                            style={{ backgroundColor: scoreRangeColors[index % scoreRangeColors.length] }}
                          />
                          <span className="text-sm text-slate-700">{item.label}</span>
                        </div>
                        <span className="text-sm font-semibold text-slate-900">{formatNumber(item.count)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <EmptyState title="Aucune moyenne disponible" description="Les tranches apparaissent des que des resultats existent." />
              )}
            </Card>
          </div>
        </>
      ) : null}

      {isAdmin && user?.role !== "SUPER_ADMIN" && schoolAnalytics ? (
        <Card title="Matieres a surveiller">
          <div className="space-y-3">
            {schoolAnalytics.subjectStats.slice(0, 6).map((item) => (
              <div key={item.subjectName} className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2">
                <span className="text-slate-700">{item.subjectName}</span>
                <span className="font-semibold text-amber-700">{formatDecimal(item.average, 2)}/20</span>
              </div>
            ))}
          </div>
        </Card>
      ) : null}

      {user?.role === "TEACHER" && classAnalytics ? (
        <Card title={`Classement ${classAnalytics.class.name}`}>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-left text-slate-500">
                  <th className="px-2 py-2">Rang</th>
                  <th className="px-2 py-2">Eleve</th>
                  <th className="px-2 py-2">Moyenne</th>
                  <th className="px-2 py-2">Statut</th>
                </tr>
              </thead>
              <tbody>
                {classAnalytics.ranking.slice(0, 8).map((item) => (
                  <tr key={item.student.id} className="border-b border-slate-100">
                    <td className="px-2 py-2">#{item.rank}</td>
                    <td className="px-2 py-2">{item.student.fullName}</td>
                    <td className="px-2 py-2">{formatDecimal(item.weightedAverage, 2)}/20</td>
                    <td className="px-2 py-2">{item.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      ) : null}

      {(user?.role === "STUDENT" || user?.role === "UNIVERSITY_STUDENT" || user?.role === "PARENT") && studentAnalytics ? (
        <Card title="Synthese apprenant">
          <div className="grid gap-3 md:grid-cols-2">
            <div className="rounded-xl bg-slate-50 p-4">
              <p className="text-sm text-slate-500">Apprenant</p>
              <p className="font-semibold text-slate-900">{studentAnalytics.student.fullName}</p>
              <p className="mt-1 text-sm text-slate-500">Matricule: {studentAnalytics.student.registrationNumber}</p>
            </div>
            <div className="rounded-xl bg-slate-50 p-4">
              <p className="text-sm text-slate-500">Orientation conseillee</p>
              <p className="font-semibold text-slate-900">{studentAnalytics.metrics.risk?.recommendedStream || "Non definie"}</p>
              <p className="mt-1 text-sm text-slate-500">Risque: {studentAnalytics.metrics.risk?.riskLevel}</p>
            </div>
          </div>
        </Card>
      ) : null}

      {!error && cards.length === 0 ? (
        <EmptyState title="Aucune donnee disponible" description="Commencez par ajouter un etablissement et des apprenants." />
      ) : null}
    </div>
  );
}
