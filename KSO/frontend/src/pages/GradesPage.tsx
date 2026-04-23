import { FormEvent, useEffect, useMemo, useState } from "react";

import { academicApi, gradeApi, schoolApi, studentApi } from "../api/services";
import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { EmptyState } from "../components/ui/EmptyState";
import { Loader } from "../components/ui/Loader";
import { Pagination } from "../components/ui/Pagination";
import { useAuth } from "../hooks/useAuth";
import { ClassItem, Grade, School, Student, Subject } from "../types/models";
import { formatDate, formatDecimal, formatSemester } from "../utils/format";

const defaultForm = {
  studentId: "",
  classId: "",
  subjectId: "",
  semester: "SEMESTER_1" as "SEMESTER_1" | "SEMESTER_2",
  sequence: "SEQUENCE_1" as "SEQUENCE_1" | "SEQUENCE_2" | "SEQUENCE_3",
  score: 0,
  maxScore: 20,
  comment: ""
};

export function GradesPage() {
  const { user } = useAuth();
  const [schools, setSchools] = useState<School[]>([]);
  const [selectedSchoolId, setSelectedSchoolId] = useState<string>(user?.schoolId ?? "");
  const [students, setStudents] = useState<Student[]>([]);
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [grades, setGrades] = useState<Grade[]>([]);
  const [form, setForm] = useState(defaultForm);
  const [selectedGrade, setSelectedGrade] = useState<Grade | null>(null);
  const [editForm, setEditForm] = useState({
    semester: "SEMESTER_1" as "SEMESTER_1" | "SEMESTER_2",
    sequence: "SEQUENCE_1" as "SEQUENCE_1" | "SEQUENCE_2" | "SEQUENCE_3",
    score: 0,
    maxScore: 20,
    comment: ""
  });
  const [importFile, setImportFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [page, setPage] = useState(1);

  const scopedSchoolId = useMemo(() => {
    if (!user) {
      return "";
    }

    return user.role === "SUPER_ADMIN" ? selectedSchoolId : user.schoolId || "";
  }, [user, selectedSchoolId]);
  const pageSize = 10;
  const paginatedGrades = useMemo(() => {
    const start = (page - 1) * pageSize;
    return grades.slice(start, start + pageSize);
  }, [grades, page]);

  async function loadDependencies() {
    if (!user) {
      return;
    }

    try {
      if (user.role === "SUPER_ADMIN") {
        const schoolList = await schoolApi.list();
        setSchools(schoolList);
        if (!selectedSchoolId && schoolList[0]) {
          setSelectedSchoolId(schoolList[0].id);
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur de chargement des ecoles");
    }
  }

  async function loadData() {
    if (!user) {
      return;
    }

    if (user.role === "SUPER_ADMIN" && !scopedSchoolId) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const params = scopedSchoolId ? { schoolId: scopedSchoolId } : undefined;

      const [studentsData, classesData, subjectsData, gradesData] = await Promise.all([
        studentApi.list(params),
        academicApi.listClasses(scopedSchoolId || undefined),
        academicApi.listSubjects(scopedSchoolId || undefined),
        gradeApi.list(params)
      ]);

      setStudents(studentsData);
      setClasses(classesData);
      setSubjects(subjectsData);
      setGrades(gradesData);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Impossible de charger les notes");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadDependencies();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  useEffect(() => {
    void loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, scopedSchoolId]);

  useEffect(() => {
    setPage(1);
  }, [grades.length, scopedSchoolId]);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setSaving(true);
    setError(null);
    setMessage(null);

    try {
      await gradeApi.create({
        schoolId: user?.role === "SUPER_ADMIN" ? scopedSchoolId : undefined,
        studentId: form.studentId,
        classId: form.classId,
        subjectId: form.subjectId,
        semester: form.semester,
        sequence: form.sequence,
        score: Number(form.score),
        maxScore: Number(form.maxScore),
        comment: form.comment || undefined
      });

      setForm(defaultForm);
      setMessage("Note enregistree avec succes");
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Enregistrement impossible");
    } finally {
      setSaving(false);
    }
  }

  function startEdit(grade: Grade) {
    setSelectedGrade(grade);
    setEditForm({
      semester: grade.semester,
      sequence: grade.sequence,
      score: grade.score,
      maxScore: grade.maxScore,
      comment: grade.comment || ""
    });
  }

  async function onUpdateGrade(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!selectedGrade) {
      return;
    }

    setUpdating(true);
    setError(null);
    setMessage(null);

    try {
      await gradeApi.update(selectedGrade.id, {
        semester: editForm.semester,
        sequence: editForm.sequence,
        score: Number(editForm.score),
        maxScore: Number(editForm.maxScore),
        comment: editForm.comment
      });

      setSelectedGrade(null);
      setMessage("Note modifiee avec succes");
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Modification impossible");
    } finally {
      setUpdating(false);
    }
  }

  async function onImport() {
    if (!importFile) {
      return;
    }

    setImporting(true);
    setError(null);
    setMessage(null);

    try {
      const result = await gradeApi.import(importFile, user?.role === "SUPER_ADMIN" ? scopedSchoolId : undefined);
      setMessage(`Import termine: ${result.createdCount} lignes creees, ${result.errorCount} erreurs`);
      setImportFile(null);
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Import impossible");
    } finally {
      setImporting(false);
    }
  }

  return (
    <div className="space-y-6">
      {error ? (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div>
      ) : null}
      {message ? (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{message}</div>
      ) : null}

      <Card title="Saisie des notes">
        <form onSubmit={onSubmit} className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {user?.role === "SUPER_ADMIN" ? (
            <select
              className="rounded-xl border border-slate-300 px-3 py-2 text-sm"
              value={selectedSchoolId}
              onChange={(event) => setSelectedSchoolId(event.target.value)}
              required
            >
              <option value="">Choisir un etablissement</option>
              {schools.map((school) => (
                <option key={school.id} value={school.id}>
                  {school.name}
                </option>
              ))}
            </select>
          ) : null}

          <select
            className="rounded-xl border border-slate-300 px-3 py-2 text-sm"
            value={form.studentId}
            onChange={(event) => {
              const student = students.find((item) => item.id === event.target.value);
              setForm((prev) => ({
                ...prev,
                studentId: event.target.value,
                classId: student?.classId || prev.classId
              }));
            }}
            required
          >
            <option value="">Eleve/Etudiant</option>
            {students.map((student) => (
              <option key={student.id} value={student.id}>
                {student.fullName}
              </option>
            ))}
          </select>

          <select
            className="rounded-xl border border-slate-300 px-3 py-2 text-sm"
            value={form.classId}
            onChange={(event) => setForm((prev) => ({ ...prev, classId: event.target.value }))}
            required
          >
            <option value="">Classe</option>
            {classes.map((classItem) => (
              <option key={classItem.id} value={classItem.id}>
                {classItem.name}
              </option>
            ))}
          </select>

          <select
            className="rounded-xl border border-slate-300 px-3 py-2 text-sm"
            value={form.subjectId}
            onChange={(event) => setForm((prev) => ({ ...prev, subjectId: event.target.value }))}
            required
          >
            <option value="">Discipline</option>
            {subjects.map((subject) => (
              <option key={subject.id} value={subject.id}>
                {subject.name}
              </option>
            ))}
          </select>

          <select
            className="rounded-xl border border-slate-300 px-3 py-2 text-sm"
            value={form.semester}
            onChange={(event) => setForm((prev) => ({ ...prev, semester: event.target.value as "SEMESTER_1" | "SEMESTER_2" }))}
          >
            <option value="SEMESTER_1">Semestre 1</option>
            <option value="SEMESTER_2">Semestre 2</option>
          </select>

          <select
            className="rounded-xl border border-slate-300 px-3 py-2 text-sm"
            value={form.sequence}
            onChange={(event) =>
              setForm((prev) => ({
                ...prev,
                sequence: event.target.value as "SEQUENCE_1" | "SEQUENCE_2" | "SEQUENCE_3"
              }))
            }
          >
            <option value="SEQUENCE_1">Sequence 1</option>
            <option value="SEQUENCE_2">Sequence 2</option>
            <option value="SEQUENCE_3">Sequence 3</option>
          </select>

          <input
            className="rounded-xl border border-slate-300 px-3 py-2 text-sm"
            type="number"
            step="0.01"
            min="0"
            max={form.maxScore}
            placeholder="Note"
            value={form.score}
            onChange={(event) => setForm((prev) => ({ ...prev, score: Number(event.target.value) }))}
            required
          />

          <input
            className="rounded-xl border border-slate-300 px-3 py-2 text-sm"
            type="number"
            min="1"
            placeholder="Note maximale"
            value={form.maxScore}
            onChange={(event) => setForm((prev) => ({ ...prev, maxScore: Number(event.target.value) }))}
            required
          />

          <input
            className="rounded-xl border border-slate-300 px-3 py-2 text-sm md:col-span-2"
            placeholder="Commentaire"
            value={form.comment}
            onChange={(event) => setForm((prev) => ({ ...prev, comment: event.target.value }))}
          />

          <div className="xl:col-span-3">
            <Button type="submit" disabled={saving}>
              {saving ? "Enregistrement..." : "Enregistrer la note"}
            </Button>
          </div>
        </form>
      </Card>

      {selectedGrade ? (
        <Card title={`Modifier note: ${selectedGrade.student.fullName} - ${selectedGrade.subject.name}`}>
          <form onSubmit={onUpdateGrade} className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            <select
              className="rounded-xl border border-slate-300 px-3 py-2 text-sm"
              value={editForm.semester}
              onChange={(event) =>
                setEditForm((prev) => ({ ...prev, semester: event.target.value as "SEMESTER_1" | "SEMESTER_2" }))
              }
            >
              <option value="SEMESTER_1">Semestre 1</option>
              <option value="SEMESTER_2">Semestre 2</option>
            </select>

            <select
              className="rounded-xl border border-slate-300 px-3 py-2 text-sm"
              value={editForm.sequence}
              onChange={(event) =>
                setEditForm((prev) => ({
                  ...prev,
                  sequence: event.target.value as "SEQUENCE_1" | "SEQUENCE_2" | "SEQUENCE_3"
                }))
              }
            >
              <option value="SEQUENCE_1">Sequence 1</option>
              <option value="SEQUENCE_2">Sequence 2</option>
              <option value="SEQUENCE_3">Sequence 3</option>
            </select>

            <input
              className="rounded-xl border border-slate-300 px-3 py-2 text-sm"
              type="number"
              step="0.01"
              min="0"
              max={editForm.maxScore}
              value={editForm.score}
              onChange={(event) => setEditForm((prev) => ({ ...prev, score: Number(event.target.value) }))}
            />

            <input
              className="rounded-xl border border-slate-300 px-3 py-2 text-sm"
              type="number"
              min="1"
              value={editForm.maxScore}
              onChange={(event) => setEditForm((prev) => ({ ...prev, maxScore: Number(event.target.value) }))}
            />

            <input
              className="rounded-xl border border-slate-300 px-3 py-2 text-sm md:col-span-2"
              value={editForm.comment}
              onChange={(event) => setEditForm((prev) => ({ ...prev, comment: event.target.value }))}
              placeholder="Commentaire"
            />

            <div className="xl:col-span-3 flex gap-2">
              <Button type="submit" disabled={updating}>
                {updating ? "Mise a jour..." : "Mettre a jour"}
              </Button>
              <Button variant="ghost" onClick={() => setSelectedGrade(null)}>
                Annuler
              </Button>
            </div>
          </form>
        </Card>
      ) : null}

      <Card title="Import CSV / Excel">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <input
            type="file"
            accept=".csv,.xlsx,.xls"
            onChange={(event) => setImportFile(event.target.files?.[0] || null)}
            className="text-sm"
          />
          <Button onClick={() => void onImport()} disabled={!importFile || importing}>
            {importing ? "Import..." : "Importer"}
          </Button>
        </div>
        <p className="mt-3 text-sm text-slate-500">
          Colonnes attendues: `registrationNumber`, `subjectName`, `score`, `semester`, `sequence` (optionnel).
        </p>
      </Card>

      <Card title="Historique des notes">
        {loading ? (
          <Loader label="Chargement des notes..." />
        ) : grades.length === 0 ? (
          <EmptyState title="Aucune note" description="Saisissez ou importez les notes pour demarrer." />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-left text-slate-500">
                    <th className="px-2 py-2">Date</th>
                    <th className="px-2 py-2">Eleve</th>
                    <th className="px-2 py-2">Classe</th>
                    <th className="px-2 py-2">Discipline</th>
                    <th className="px-2 py-2">Semestre</th>
                    <th className="px-2 py-2">Sequence</th>
                    <th className="px-2 py-2">Note</th>
                    <th className="px-2 py-2">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedGrades.map((grade) => {
                    const normalized = (grade.score / grade.maxScore) * 20;
                    const noteClass = normalized >= 10 ? "text-emerald-700" : "text-rose-700";

                    return (
                      <tr key={grade.id} className="border-b border-slate-100">
                        <td className="px-2 py-2">{formatDate(grade.recordedAt)}</td>
                        <td className="px-2 py-2">{grade.student.fullName}</td>
                        <td className="px-2 py-2">{grade.class.name}</td>
                        <td className="px-2 py-2">{grade.subject.name}</td>
                        <td className="px-2 py-2">{formatSemester(grade.semester)}</td>
                        <td className="px-2 py-2">{grade.sequence}</td>
                        <td className={`px-2 py-2 font-semibold ${noteClass}`}>{formatDecimal(normalized, 2)}/20</td>
                        <td className="px-2 py-2">
                          <Button variant="ghost" className="px-2 py-1 text-xs" onClick={() => startEdit(grade)}>
                            Modifier
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <Pagination page={page} totalItems={grades.length} pageSize={pageSize} onPageChange={setPage} />
          </>
        )}
      </Card>
    </div>
  );
}
