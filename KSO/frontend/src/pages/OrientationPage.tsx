import clsx from "clsx";
import { useEffect, useMemo, useState } from "react";

import { orientationApi, schoolApi, studentApi } from "../api/services";
import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { EmptyState } from "../components/ui/EmptyState";
import { Loader } from "../components/ui/Loader";
import { Pagination } from "../components/ui/Pagination";
import { useAuth } from "../hooks/useAuth";
import { OrientationProfile, School, Student } from "../types/models";
import { formatDecimal } from "../utils/format";

function riskClass(level: string) {
  if (level === "ELEVE") {
    return "bg-rose-100 text-rose-700";
  }

  if (level === "MOYEN") {
    return "bg-slate-200 text-slate-700";
  }

  return "bg-emerald-100 text-emerald-700";
}

export function OrientationPage() {
  const { user } = useAuth();
  const [schools, setSchools] = useState<School[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [profiles, setProfiles] = useState<OrientationProfile[]>([]);
  const [studentProfile, setStudentProfile] = useState<OrientationProfile | null>(null);
  const [selectedSchoolId, setSelectedSchoolId] = useState<string>(user?.schoolId ?? "");
  const [selectedStudentId, setSelectedStudentId] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const pageSize = 10;
  const paginatedProfiles = useMemo(() => {
    const start = (page - 1) * pageSize;
    return profiles.slice(start, start + pageSize);
  }, [page, profiles]);

  const isSchoolScope = useMemo(
    () =>
      [
        "SUPER_ADMIN",
        "SCHOOL_ADMIN",
        "COLLEGE_ADMIN",
        "HIGH_SCHOOL_ADMIN",
        "UNIVERSITY_ADMIN",
        "TEACHER"
      ].includes(user?.role || ""),
    [user]
  );

  async function loadBase() {
    if (!user) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      if (user.role === "SUPER_ADMIN") {
        const schoolList = await schoolApi.list();
        setSchools(schoolList);
        if (!selectedSchoolId && schoolList[0]) {
          setSelectedSchoolId(schoolList[0].id);
        }
      }

      const schoolId = user.role === "SUPER_ADMIN" ? selectedSchoolId : user.schoolId || undefined;

      if (isSchoolScope && schoolId) {
        const [schoolProfiles, studentList] = await Promise.all([orientationApi.school(schoolId), studentApi.list({ schoolId })]);

        setProfiles(schoolProfiles);
        setStudents(studentList);

        if (!selectedStudentId && studentList[0]) {
          setSelectedStudentId(studentList[0].id);
        }
      }

      if (!isSchoolScope) {
        const studentList = await studentApi.list(user.schoolId ? { schoolId: user.schoolId } : undefined);
        setStudents(studentList);

        const studentId = selectedStudentId || studentList[0]?.id;
        if (studentId) {
          setSelectedStudentId(studentId);
          const profile = await orientationApi.student(studentId);
          setStudentProfile(profile);
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur orientation");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadBase();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, selectedSchoolId]);

  useEffect(() => {
    setPage(1);
  }, [profiles.length, selectedSchoolId]);

  useEffect(() => {
    async function loadSelected() {
      if (!selectedStudentId || isSchoolScope) {
        return;
      }

      try {
        const profile = await orientationApi.student(selectedStudentId);
        setStudentProfile(profile);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Erreur profil");
      }
    }

    void loadSelected();
  }, [selectedStudentId, isSchoolScope]);

  async function refreshStudentProfile(studentId: string) {
    setRefreshing(true);
    setError(null);

    try {
      const profile = await orientationApi.recomputeStudent(studentId);
      setStudentProfile(profile);

      if (isSchoolScope) {
        const schoolId = user?.role === "SUPER_ADMIN" ? selectedSchoolId : user?.schoolId;
        if (schoolId) {
          const schoolProfiles = await orientationApi.school(schoolId);
          setProfiles(schoolProfiles);
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Recalcul impossible");
    } finally {
      setRefreshing(false);
    }
  }

  if (loading) {
    return <Loader label="Chargement des orientations..." />;
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

      {isSchoolScope ? (
        <Card title="Profils orientation de l etablissement">
          {profiles.length === 0 ? (
            <EmptyState title="Aucun profil" description="Ajoutez des notes pour declencher les recommandations." />
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 text-left text-slate-500">
                      <th className="px-2 py-2">Apprenant</th>
                      <th className="px-2 py-2">Classe/Salle</th>
                      <th className="px-2 py-2">Risque</th>
                      <th className="px-2 py-2">Score</th>
                      <th className="px-2 py-2">Filiere</th>
                      <th className="px-2 py-2">Metier de reve</th>
                      <th className="px-2 py-2">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedProfiles.map((profile) => (
                      <tr key={profile.id} className="border-b border-slate-100">
                        <td className="px-2 py-2 font-medium text-slate-800">{profile.student?.fullName}</td>
                        <td className="px-2 py-2">
                          {profile.student?.class?.name || "-"}
                          {profile.student?.class?.room ? ` / ${profile.student.class.room}` : ""}
                        </td>
                        <td className="px-2 py-2">
                          <span className={clsx("rounded-full px-3 py-1 text-xs font-semibold", riskClass(profile.riskLevel))}>
                            {profile.riskLevel}
                          </span>
                        </td>
                        <td className="px-2 py-2">{formatDecimal(profile.riskScore, 2)}</td>
                        <td className="px-2 py-2">{profile.recommendedStream || "-"}</td>
                        <td className="px-2 py-2">{profile.student?.dreamCareer || "-"}</td>
                        <td className="px-2 py-2">
                          <Button
                            variant="ghost"
                            className="px-3 py-1 text-xs"
                            disabled={refreshing}
                            onClick={() => void refreshStudentProfile(profile.studentId)}
                          >
                            Recalculer
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <Pagination page={page} totalItems={profiles.length} pageSize={pageSize} onPageChange={setPage} />
            </>
          )}
        </Card>
      ) : (
        <Card
          title="Profil d orientation"
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
          {studentProfile ? (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center gap-3">
                <span className={clsx("rounded-full px-3 py-1 text-xs font-semibold", riskClass(studentProfile.riskLevel))}>
                  Risque {studentProfile.riskLevel}
                </span>
                <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                  Score: {formatDecimal(studentProfile.riskScore, 2)}
                </span>
                <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700">
                  Filiere: {studentProfile.recommendedStream || "Non definie"}
                </span>
              </div>

              <div>
                <p className="text-sm font-semibold text-slate-800">Metiers recommandes</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {studentProfile.recommendedCareers.map((career) => (
                    <span key={career} className="rounded-full bg-slate-200 px-3 py-1 text-xs font-semibold text-slate-700">
                      {career}
                    </span>
                  ))}
                </div>
              </div>

              <div className="rounded-xl bg-slate-50 p-4 text-sm text-slate-600">
                {studentProfile.insights || "Aucune recommendation detaillee."}
              </div>
            </div>
          ) : (
            <EmptyState title="Aucun profil disponible" />
          )}
        </Card>
      )}
    </div>
  );
}
