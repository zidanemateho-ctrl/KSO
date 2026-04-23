import { useEffect, useMemo, useState } from "react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import { academicApi, analyticsApi, schoolApi, studentApi } from "../api/services";
import { ProgressChart } from "../components/charts/ProgressChart";
import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { EmptyState } from "../components/ui/EmptyState";
import { Loader } from "../components/ui/Loader";
import { useAuth } from "../hooks/useAuth";
import {
  ClassAnalytics,
  ClassItem,
  School,
  SchoolAnalytics,
  Student,
  StudentAnalytics,
  TeacherEvolution
} from "../types/models";
import { formatDecimal, formatPercent, formatSemester } from "../utils/format";

const adminRoles = ["SUPER_ADMIN", "SCHOOL_ADMIN", "COLLEGE_ADMIN", "HIGH_SCHOOL_ADMIN", "UNIVERSITY_ADMIN"] as const;

export function AnalyticsPage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [schools, setSchools] = useState<School[]>([]);
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [selectedSchoolId, setSelectedSchoolId] = useState<string>(user?.schoolId ?? "");
  const [selectedClassId, setSelectedClassId] = useState<string>("");
  const [selectedStudentId, setSelectedStudentId] = useState<string>("");
  const [semester, setSemester] = useState<"SEMESTER_1" | "SEMESTER_2">("SEMESTER_2");

  const [schoolAnalytics, setSchoolAnalytics] = useState<SchoolAnalytics | null>(null);
  const [classAnalytics, setClassAnalytics] = useState<ClassAnalytics | null>(null);
  const [studentAnalytics, setStudentAnalytics] = useState<StudentAnalytics | null>(null);
  const [teacherEvolution, setTeacherEvolution] = useState<TeacherEvolution | null>(null);

  const isAdmin = useMemo(() => adminRoles.includes((user?.role || "") as (typeof adminRoles)[number]), [user?.role]);

  async function loadContext() {
    if (!user) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      if (user.role === "SUPER_ADMIN") {
        const schoolsData = await schoolApi.list();
        setSchools(schoolsData);
        const schoolId = selectedSchoolId || schoolsData[0]?.id;

        if (schoolId) {
          setSelectedSchoolId(schoolId);
          const [schoolResult, classItems, studentItems] = await Promise.all([
            analyticsApi.school(schoolId),
            academicApi.listClasses(schoolId),
            studentApi.list({ schoolId })
          ]);

          setSchoolAnalytics(schoolResult);
          setClasses(classItems);
          setStudents(studentItems);

          if (!selectedClassId && classItems[0]) {
            setSelectedClassId(classItems[0].id);
          }

          if (!selectedStudentId && studentItems[0]) {
            setSelectedStudentId(studentItems[0].id);
          }
        }
      }

      if (isAdmin && user.role !== "SUPER_ADMIN" && user.schoolId) {
        const [schoolResult, classItems, studentItems] = await Promise.all([
          analyticsApi.school(user.schoolId),
          academicApi.listClasses(user.schoolId),
          studentApi.list({ schoolId: user.schoolId })
        ]);

        setSchoolAnalytics(schoolResult);
        setClasses(classItems);
        setStudents(studentItems);

        if (!selectedClassId && classItems[0]) {
          setSelectedClassId(classItems[0].id);
        }

        if (!selectedStudentId && studentItems[0]) {
          setSelectedStudentId(studentItems[0].id);
        }
      }

      if (user.role === "TEACHER") {
        const [classItems, studentItems] = await Promise.all([
          academicApi.listClasses(user.schoolId || undefined),
          studentApi.list(user.schoolId ? { schoolId: user.schoolId } : undefined)
        ]);

        setClasses(classItems);
        setStudents(studentItems);

        if (!selectedClassId && classItems[0]) {
          setSelectedClassId(classItems[0].id);
        }

        if (!selectedStudentId && studentItems[0]) {
          setSelectedStudentId(studentItems[0].id);
        }

        if (user.teacher?.id) {
          const teacherResult = await analyticsApi.teacherEvolution(user.teacher.id, semester);
          setTeacherEvolution(teacherResult);
        }
      }

      if (user.role === "STUDENT" || user.role === "UNIVERSITY_STUDENT" || user.role === "PARENT") {
        const studentItems = await studentApi.list(user.schoolId ? { schoolId: user.schoolId } : undefined);
        setStudents(studentItems);
        if (!selectedStudentId && studentItems[0]) {
          setSelectedStudentId(studentItems[0].id);
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Impossible de charger les statistiques");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadContext();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, selectedSchoolId]);

  useEffect(() => {
    async function loadClassAnalytics() {
      if (!selectedClassId || !user) {
        setClassAnalytics(null);
        return;
      }

      if (!isAdmin && user.role !== "TEACHER") {
        return;
      }

      try {
        const data = await analyticsApi.class(selectedClassId, semester);
        setClassAnalytics(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Erreur analytics classe");
      }
    }

    void loadClassAnalytics();
  }, [selectedClassId, semester, user, isAdmin]);

  useEffect(() => {
    async function loadStudentAnalytics() {
      if (!selectedStudentId || !user) {
        setStudentAnalytics(null);
        return;
      }

      try {
        const data = await analyticsApi.student(selectedStudentId);
        setStudentAnalytics(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Erreur analytics eleve");
      }
    }

    void loadStudentAnalytics();
  }, [selectedStudentId, user]);

  useEffect(() => {
    async function loadTeacherEvolution() {
      if (user?.role !== "TEACHER" || !user.teacher?.id) {
        return;
      }

      try {
        const data = await analyticsApi.teacherEvolution(user.teacher.id, semester);
        setTeacherEvolution(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Erreur evolution enseignant");
      }
    }

    void loadTeacherEvolution();
  }, [user, semester]);

  if (loading) {
    return <Loader label="Chargement des statistiques..." />;
  }

  return (
    <div className="space-y-6">
      {error ? (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div>
      ) : null}

      {user?.role === "SUPER_ADMIN" ? (
        <Card title="Contexte etablissement">
          <select
            className="rounded-xl border border-slate-300 px-3 py-2 text-sm"
            value={selectedSchoolId}
            onChange={(event) => setSelectedSchoolId(event.target.value)}
          >
            {schools.map((school) => (
              <option key={school.id} value={school.id}>
                {school.name}
              </option>
            ))}
          </select>
        </Card>
      ) : null}

      {schoolAnalytics ? (
        <Card title="Statistiques globales etablissement">
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-xl bg-slate-50 p-4">
              <p className="text-xs uppercase tracking-wide text-slate-500">Taux de reussite</p>
              <p className="mt-1 text-2xl font-bold text-teal-700">{formatPercent(schoolAnalytics.summary.successRate)}</p>
            </div>
            <div className="rounded-xl bg-slate-50 p-4">
              <p className="text-xs uppercase tracking-wide text-slate-500">Moyenne ecole</p>
              <p className="mt-1 text-2xl font-bold text-teal-700">{formatDecimal(schoolAnalytics.summary.averageScore, 2)}/20</p>
            </div>
            <div className="rounded-xl bg-slate-50 p-4">
              <p className="text-xs uppercase tracking-wide text-slate-500">Risque eleve</p>
              <p className="mt-1 text-2xl font-bold text-rose-700">{schoolAnalytics.riskDistribution.eleve}</p>
            </div>
            <div className="rounded-xl bg-slate-50 p-4">
              <p className="text-xs uppercase tracking-wide text-slate-500">Alertes ouvertes</p>
              <p className="mt-1 text-2xl font-bold text-amber-700">{schoolAnalytics.alertSummary.totalOpen}</p>
            </div>
          </div>
        </Card>
      ) : null}

      {(isAdmin || user?.role === "TEACHER") ? (
        <Card
          title="Analyse de classe"
          actions={
            <div className="flex gap-2">
              <select
                className="rounded-xl border border-slate-300 px-3 py-2 text-sm"
                value={selectedClassId}
                onChange={(event) => setSelectedClassId(event.target.value)}
              >
                {classes.map((classItem) => (
                  <option key={classItem.id} value={classItem.id}>
                    {classItem.name}
                  </option>
                ))}
              </select>
              <select
                className="rounded-xl border border-slate-300 px-3 py-2 text-sm"
                value={semester}
                onChange={(event) => setSemester(event.target.value as "SEMESTER_1" | "SEMESTER_2")}
              >
                <option value="SEMESTER_1">S1</option>
                <option value="SEMESTER_2">S2</option>
              </select>
            </div>
          }
        >
          {classAnalytics ? (
            <div className="space-y-4">
              <p className="text-sm text-slate-500">{formatSemester(classAnalytics.semester)}</p>
              <div className="h-64 min-h-64 min-w-fit">
                <ResponsiveContainer width="100%" height="100%" minWidth={200}>
                  <BarChart data={classAnalytics.subjectStats}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="subjectName" stroke="#64748b" fontSize={12} />
                    <YAxis domain={[0, 20]} stroke="#64748b" fontSize={12} />
                    <Tooltip formatter={(value) => `${Number(value ?? 0).toFixed(2)}/20`} />
                    <Bar dataKey="average" fill="#0f766e" radius={[8, 8, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <p className="text-sm text-slate-600">
                Matiere la plus faible: <strong>{classAnalytics.weakestSubject?.subjectName || "-"}</strong>
              </p>
              <div className="grid gap-2 sm:grid-cols-3">
                {classAnalytics.sequenceStats.map((item) => (
                  <div key={item.sequence} className="rounded-xl bg-slate-50 p-3 text-sm">
                    <p className="font-medium text-slate-700">{item.sequence}</p>
                    <p className="text-lg font-semibold text-slate-900">{formatDecimal(item.average, 2)}/20</p>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <EmptyState title="Selectionnez une classe" />
          )}
        </Card>
      ) : null}

      {teacherEvolution && teacherEvolution.assignments.length > 0 ? (
        <Card title="Evolution des classes enseignant">
          <div className="space-y-4">
            {teacherEvolution.assignments.map((assignment) => (
              <article key={assignment.assignmentId} className="rounded-xl border border-slate-200 p-3">
                <p className="font-semibold text-slate-900">
                  {assignment.className} {assignment.room ? `(${assignment.room})` : ""} - {assignment.subjectName}
                </p>
                <div className="mt-2 overflow-x-auto">
                  <table className="min-w-full text-sm">
                    <thead>
                      <tr className="border-b border-slate-200 text-left text-slate-500">
                        <th className="px-2 py-2">Apprenant</th>
                        <th className="px-2 py-2">Moyenne semestre</th>
                        <th className="px-2 py-2">Sequences</th>
                      </tr>
                    </thead>
                    <tbody>
                      {assignment.students.map((student) => (
                        <tr key={student.studentId} className="border-b border-slate-100">
                          <td className="px-2 py-2">{student.fullName}</td>
                          <td className="px-2 py-2 font-semibold text-teal-700">{formatDecimal(student.semesterAverage, 2)}/20</td>
                          <td className="px-2 py-2">
                            {student.sequenceAverages.map((item) => `${item.sequence}: ${formatDecimal(item.average, 2)}`).join(" | ")}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </article>
            ))}
          </div>
        </Card>
      ) : null}

      <Card
        title="Analyse apprenant"
        actions={
          <select
            className="rounded-xl border border-slate-300 px-3 py-2 text-sm"
            value={selectedStudentId}
            onChange={(event) => setSelectedStudentId(event.target.value)}
          >
            {students.map((student) => (
              <option key={student.id} value={student.id}>
                {student.fullName}
              </option>
            ))}
          </select>
        }
      >
        {studentAnalytics ? (
          <div className="space-y-4">
            <div className="grid gap-3 md:grid-cols-3">
              <div className="rounded-xl bg-slate-50 p-3">
                <p className="text-xs uppercase tracking-wide text-slate-500">Moyenne</p>
                <p className="mt-1 text-xl font-semibold text-slate-900">{formatDecimal(studentAnalytics.metrics.currentAverage, 2)}/20</p>
              </div>
              <div className="rounded-xl bg-slate-50 p-3">
                <p className="text-xs uppercase tracking-wide text-slate-500">Rang</p>
                <p className="mt-1 text-xl font-semibold text-slate-900">#{studentAnalytics.metrics.currentRank || "-"}</p>
              </div>
              <div className="rounded-xl bg-slate-50 p-3">
                <p className="text-xs uppercase tracking-wide text-slate-500">Risque</p>
                <p className="mt-1 text-xl font-semibold text-slate-900">{studentAnalytics.metrics.risk.riskLevel}</p>
              </div>
            </div>

            <ProgressChart data={studentAnalytics.progression} />
          </div>
        ) : (
          <EmptyState title="Aucun apprenant selectionne" />
        )}
      </Card>

      <div className="flex justify-end">
        <Button variant="ghost" onClick={() => void loadContext()}>
          Rafraichir
        </Button>
      </div>
    </div>
  );
}
