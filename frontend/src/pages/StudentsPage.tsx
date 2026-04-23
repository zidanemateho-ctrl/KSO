import { FormEvent, useEffect, useMemo, useState } from "react";

import { academicApi, schoolApi, studentApi } from "../api/services";
import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { EmptyState } from "../components/ui/EmptyState";
import { Loader } from "../components/ui/Loader";
import { Pagination } from "../components/ui/Pagination";
import { useAuth } from "../hooks/useAuth";
import { ClassItem, School, Student, Subject } from "../types/models";

const learnerLevels = ["SECONDE", "PREMIERE", "TERMINALE", "LOWER_SIXTH", "UPPER_SIXTH", "AUTRE"] as const;
const universityLevels = ["LICENCE_1", "LICENCE_2", "LICENCE_3", "MASTER_1", "MASTER_2", "AUTRE"] as const;
const streams = ["SCIENTIFIQUE", "LITTERAIRE", "ECONOMIQUE", "TECHNIQUE", "AUTRE"] as const;

const defaultForm = {
  registrationNumber: "",
  fullName: "",
  profileType: "ELEVE" as "ELEVE" | "ETUDIANT",
  level: "SECONDE" as
    | "SECONDE"
    | "PREMIERE"
    | "TERMINALE"
    | "LOWER_SIXTH"
    | "UPPER_SIXTH"
    | "LICENCE_1"
    | "LICENCE_2"
    | "LICENCE_3"
    | "MASTER_1"
    | "MASTER_2"
    | "AUTRE",
  stream: "SCIENTIFIQUE" as (typeof streams)[number],
  classId: "",
  preferredSubjectId: "",
  dreamCareer: "",
  targetProfession: "",
  learningObjectives: "",
  admissionYear: new Date().getFullYear()
};

export function StudentsPage() {
  const { user } = useAuth();
  const [students, setStudents] = useState<Student[]>([]);
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [schools, setSchools] = useState<School[]>([]);
  const [selectedSchoolId, setSelectedSchoolId] = useState<string>(user?.schoolId ?? "");
  const [search, setSearch] = useState("");
  const [form, setForm] = useState(defaultForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);

  const canCreate =
    user?.role === "SUPER_ADMIN" ||
    user?.role === "SCHOOL_ADMIN" ||
    user?.role === "COLLEGE_ADMIN" ||
    user?.role === "HIGH_SCHOOL_ADMIN" ||
    user?.role === "UNIVERSITY_ADMIN";

  const scopedSchoolId = useMemo(() => {
    if (!user) {
      return "";
    }

    return user.role === "SUPER_ADMIN" ? selectedSchoolId : user.schoolId || "";
  }, [user, selectedSchoolId]);

  const levelOptions = form.profileType === "ETUDIANT" ? universityLevels : learnerLevels;
  const pageSize = 10;
  const paginatedStudents = useMemo(() => {
    const start = (page - 1) * pageSize;
    return students.slice(start, start + pageSize);
  }, [page, students]);

  async function loadDependencies() {
    if (!user) {
      return;
    }

    try {
      if (user.role === "SUPER_ADMIN") {
        const schoolsData = await schoolApi.list();
        setSchools(schoolsData);
        if (!selectedSchoolId && schoolsData[0]) {
          setSelectedSchoolId(schoolsData[0].id);
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur de chargement");
    }
  }

  async function loadStudentsAndClasses() {
    if (!user) {
      return;
    }

    const schoolId = user.role === "SUPER_ADMIN" ? selectedSchoolId : user.schoolId || undefined;

    if (user.role === "SUPER_ADMIN" && !schoolId) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const [studentsData, classesData, subjectsData] = await Promise.all([
        studentApi.list({ ...(schoolId ? { schoolId } : {}), ...(search ? { search } : {}) }),
        academicApi.listClasses(schoolId),
        academicApi.listSubjects(schoolId)
      ]);

      setStudents(studentsData);
      setClasses(classesData);
      setSubjects(subjectsData);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Impossible de charger les apprenants");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadDependencies();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  useEffect(() => {
    void loadStudentsAndClasses();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, selectedSchoolId]);

  useEffect(() => {
    setPage(1);
  }, [students.length, search, selectedSchoolId]);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canCreate) {
      return;
    }

    setSaving(true);
    setError(null);

    try {
      await studentApi.create({
        schoolId: user?.role === "SUPER_ADMIN" ? scopedSchoolId : undefined,
        classId: form.classId || undefined,
        preferredSubjectId: form.preferredSubjectId || undefined,
        registrationNumber: form.registrationNumber,
        fullName: form.fullName,
        profileType: form.profileType,
        level: form.level,
        stream: form.stream,
        dreamCareer: form.dreamCareer || undefined,
        targetProfession: form.targetProfession || undefined,
        learningObjectives: form.learningObjectives || undefined,
        admissionYear: Number(form.admissionYear)
      });

      setForm(defaultForm);
      await loadStudentsAndClasses();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Creation impossible");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      {error ? (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div>
      ) : null}

      <Card
        title="Filtres"
        actions={
          <Button variant="ghost" onClick={() => void loadStudentsAndClasses()}>
            Actualiser
          </Button>
        }
      >
        <div className="grid gap-3 md:grid-cols-3">
          {user?.role === "SUPER_ADMIN" ? (
            <select
              className="rounded-xl border border-slate-300 px-3 py-2 text-sm"
              value={selectedSchoolId}
              onChange={(event) => setSelectedSchoolId(event.target.value)}
            >
              <option value="">Choisir un etablissement</option>
              {schools.map((school) => (
                <option key={school.id} value={school.id}>
                  {school.name}
                </option>
              ))}
            </select>
          ) : null}

          <input
            className="rounded-xl border border-slate-300 px-3 py-2 text-sm"
            placeholder="Rechercher par nom ou matricule"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />

          <Button variant="secondary" onClick={() => void loadStudentsAndClasses()}>
            Filtrer
          </Button>
        </div>
      </Card>

      {canCreate ? (
        <Card title="Ajouter un eleve/etudiant">
          <form onSubmit={onSubmit} className="grid gap-3 md:grid-cols-2">
            <input
              className="rounded-xl border border-slate-300 px-3 py-2 text-sm"
              placeholder="Matricule"
              value={form.registrationNumber}
              onChange={(event) => setForm((prev) => ({ ...prev, registrationNumber: event.target.value }))}
              required
            />
            <input
              className="rounded-xl border border-slate-300 px-3 py-2 text-sm"
              placeholder="Nom complet"
              value={form.fullName}
              onChange={(event) => setForm((prev) => ({ ...prev, fullName: event.target.value }))}
              required
            />

            <select
              className="rounded-xl border border-slate-300 px-3 py-2 text-sm"
              value={form.profileType}
              onChange={(event) =>
                setForm((prev) => ({
                  ...prev,
                  profileType: event.target.value as "ELEVE" | "ETUDIANT",
                  level: event.target.value === "ETUDIANT" ? "LICENCE_1" : "SECONDE"
                }))
              }
            >
              <option value="ELEVE">Eleve</option>
              <option value="ETUDIANT">Etudiant</option>
            </select>

            <select
              className="rounded-xl border border-slate-300 px-3 py-2 text-sm"
              value={form.level}
              onChange={(event) =>
                setForm((prev) => ({
                  ...prev,
                  level: event.target.value as
                    | "SECONDE"
                    | "PREMIERE"
                    | "TERMINALE"
                    | "LOWER_SIXTH"
                    | "UPPER_SIXTH"
                    | "LICENCE_1"
                    | "LICENCE_2"
                    | "LICENCE_3"
                    | "MASTER_1"
                    | "MASTER_2"
                    | "AUTRE"
                }))
              }
            >
              {levelOptions.map((level) => (
                <option key={level} value={level}>
                  {level}
                </option>
              ))}
            </select>

            <select
              className="rounded-xl border border-slate-300 px-3 py-2 text-sm"
              value={form.stream}
              onChange={(event) => setForm((prev) => ({ ...prev, stream: event.target.value as (typeof streams)[number] }))}
            >
              {streams.map((stream) => (
                <option key={stream} value={stream}>
                  {stream}
                </option>
              ))}
            </select>

            <select
              className="rounded-xl border border-slate-300 px-3 py-2 text-sm"
              value={form.classId}
              onChange={(event) => setForm((prev) => ({ ...prev, classId: event.target.value }))}
            >
              <option value="">Sans classe</option>
              {classes.map((classItem) => (
                <option key={classItem.id} value={classItem.id}>
                  {classItem.name} {classItem.room ? `(${classItem.room})` : ""}
                </option>
              ))}
            </select>

            <select
              className="rounded-xl border border-slate-300 px-3 py-2 text-sm"
              value={form.preferredSubjectId}
              onChange={(event) => setForm((prev) => ({ ...prev, preferredSubjectId: event.target.value }))}
            >
              <option value="">Discipline preferee</option>
              {subjects.map((subject) => (
                <option key={subject.id} value={subject.id}>
                  {subject.name}
                </option>
              ))}
            </select>

            <input
              className="rounded-xl border border-slate-300 px-3 py-2 text-sm"
              placeholder="Metier de reve"
              value={form.dreamCareer}
              onChange={(event) => setForm((prev) => ({ ...prev, dreamCareer: event.target.value }))}
            />

            <input
              className="rounded-xl border border-slate-300 px-3 py-2 text-sm"
              placeholder="Profession cible"
              value={form.targetProfession}
              onChange={(event) => setForm((prev) => ({ ...prev, targetProfession: event.target.value }))}
            />

            <input
              className="rounded-xl border border-slate-300 px-3 py-2 text-sm"
              type="number"
              placeholder="Annee d admission"
              value={form.admissionYear}
              onChange={(event) => setForm((prev) => ({ ...prev, admissionYear: Number(event.target.value) }))}
            />

            <textarea
              className="rounded-xl border border-slate-300 px-3 py-2 text-sm md:col-span-2"
              rows={3}
              placeholder="Objectifs d apprentissage"
              value={form.learningObjectives}
              onChange={(event) => setForm((prev) => ({ ...prev, learningObjectives: event.target.value }))}
            />

            <div className="md:col-span-2">
              <Button type="submit" disabled={saving}>
                {saving ? "Ajout..." : "Ajouter"}
              </Button>
            </div>
          </form>
        </Card>
      ) : null}

      <Card title="Liste des apprenants">
        {loading ? (
          <Loader label="Chargement des apprenants..." />
        ) : students.length === 0 ? (
          <EmptyState title="Aucun apprenant" description="Ajoutez un eleve ou etudiant pour demarrer le suivi." />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-left text-slate-500">
                    <th className="px-2 py-2">Matricule</th>
                    <th className="px-2 py-2">Nom</th>
                    <th className="px-2 py-2">Profil</th>
                    <th className="px-2 py-2">Classe/Salle</th>
                    <th className="px-2 py-2">Discipline preferee</th>
                    <th className="px-2 py-2">Metier de reve</th>
                    <th className="px-2 py-2">Risque</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedStudents.map((student) => (
                    <tr key={student.id} className="border-b border-slate-100">
                      <td className="px-2 py-2">{student.registrationNumber}</td>
                      <td className="px-2 py-2 font-medium text-slate-800">{student.fullName}</td>
                      <td className="px-2 py-2">{student.profileType}</td>
                      <td className="px-2 py-2">
                        {student.class?.name || "-"}
                        {student.class?.room ? ` / ${student.class.room}` : ""}
                      </td>
                      <td className="px-2 py-2">{student.preferredSubject?.name || "-"}</td>
                      <td className="px-2 py-2">{student.dreamCareer || "-"}</td>
                      <td className="px-2 py-2">
                        {student.orientation?.riskLevel ? (
                          <span
                            className={
                              student.orientation.riskLevel === "ELEVE"
                                ? "rounded-full bg-rose-100 px-2.5 py-1 text-xs font-semibold text-rose-700"
                                : student.orientation.riskLevel === "FAIBLE"
                                  ? "rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-semibold text-emerald-700"
                                  : "rounded-full bg-slate-200 px-2.5 py-1 text-xs font-semibold text-slate-700"
                            }
                          >
                            {student.orientation.riskLevel}
                          </span>
                        ) : (
                          "-"
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Pagination page={page} totalItems={students.length} pageSize={pageSize} onPageChange={setPage} />
          </>
        )}
      </Card>
    </div>
  );
}
