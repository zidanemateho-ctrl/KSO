import { EducationSystem, Role, SchoolType, Semester, Stream, StudentLevel, StudentProfileType } from "@prisma/client";

import { prisma } from "../lib/prisma";
import { AppError } from "../utils/app-error";
import { parseStudentImportFile } from "../utils/student-import";
import { ensureRoles } from "../utils/tenant";

interface ImportStudentsPayload {
  defaultAcademicYear?: string;
  defaultLevel?: StudentLevel;
  defaultStream?: Stream;
  defaultProfileType?: StudentProfileType;
}

interface AnnouncementPayload {
  title: string;
  content: string;
  startsAt?: string;
  endsAt?: string;
  targetSchoolId?: string;
  isPublished?: boolean;
}

interface DreamProgressFilters {
  schoolId?: string;
  level?: StudentLevel;
  profileType?: StudentProfileType;
  search?: string;
  page?: number;
  pageSize?: number;
}

interface EstablishmentDetailFilters {
  search?: string;
  page?: number;
  pageSize?: number;
}

interface StudentReadinessInput {
  latestAverage: number;
  trend: number;
  riskScore: number;
  planProgress: number;
  hasDreamCareer: boolean;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function average(values: number[]) {
  if (!values.length) {
    return 0;
  }

  return values.reduce((acc, value) => acc + value, 0) / values.length;
}

function normalizeScore(score: number, maxScore: number) {
  if (maxScore <= 0) {
    return 0;
  }

  return (score / maxScore) * 20;
}

function inferDefaultsFromSchoolType(type: SchoolType) {
  if (type === SchoolType.UNIVERSITY) {
    return {
      profileType: StudentProfileType.ETUDIANT,
      level: StudentLevel.LICENCE_1,
      stream: Stream.AUTRE
    };
  }

  return {
    profileType: StudentProfileType.ELEVE,
    level: StudentLevel.SECONDE,
    stream: Stream.SCIENTIFIQUE
  };
}

function ensureProfileMatchesSchool(profileType: StudentProfileType, schoolType: SchoolType) {
  if (schoolType === SchoolType.UNIVERSITY && profileType !== StudentProfileType.ETUDIANT) {
    throw new AppError(400, "Pour une universite, le profil doit etre ETUDIANT");
  }

  if (schoolType !== SchoolType.UNIVERSITY && profileType !== StudentProfileType.ELEVE) {
    throw new AppError(400, "Pour un college/lycee, le profil doit etre ELEVE");
  }
}

function inferEducationSystemFromLevel(level: StudentLevel) {
  return level === StudentLevel.LOWER_SIXTH || level === StudentLevel.UPPER_SIXTH
    ? EducationSystem.ANGLOPHONE
    : EducationSystem.FRANCOPHONE;
}

function defaultAcademicYear() {
  const year = new Date().getFullYear();
  return `${year}-${year + 1}`;
}

function readinessBucket(score: number) {
  if (score >= 80) {
    return "TRES_PROCHE";
  }

  if (score >= 60) {
    return "EN_BONNE_VOIE";
  }

  if (score >= 40) {
    return "A_ACCOMPAGNER";
  }

  return "CRITIQUE";
}

function computeReadiness(input: StudentReadinessInput) {
  const averageScore = clamp((input.latestAverage / 20) * 100, 0, 100);
  const riskScore = clamp(100 - input.riskScore, 0, 100);
  const trendScore = clamp(50 + input.trend * 10, 0, 100);
  const planningScore = clamp(input.planProgress, 0, 100);
  const careerBonus = input.hasDreamCareer ? 4 : 0;

  const score = Number(
    clamp(
      averageScore * 0.5 + riskScore * 0.3 + trendScore * 0.12 + planningScore * 0.08 + careerBonus,
      0,
      100
    ).toFixed(2)
  );

  return {
    score,
    bucket: readinessBucket(score),
    gapToTarget: Number((100 - score).toFixed(2))
  };
}

export class SuperAdminService {
  private assertSuperAdmin(actor: Express.AuthUser) {
    ensureRoles(actor, [Role.SUPER_ADMIN]);
  }

  private async schoolOrThrow(schoolId: string) {
    const school = await prisma.school.findUnique({
      where: { id: schoolId },
      select: {
        id: true,
        name: true,
        code: true,
        city: true,
        type: true,
        isActive: true
      }
    });

    if (!school) {
      throw new AppError(404, "Etablissement introuvable");
    }

    return school;
  }

  async dashboard(actor: Express.AuthUser) {
    this.assertSuperAdmin(actor);

    const [totalStudents, totalTeachers, results, grades] = await Promise.all([
      prisma.student.count({
        where: { isActive: true }
      }),
      prisma.teacher.count(),
      prisma.result.findMany({
        where: {
          student: {
            isActive: true
          }
        },
        select: {
          studentId: true,
          semester: true,
          weightedAverage: true,
          computedAt: true
        },
        orderBy: [{ studentId: "asc" }, { computedAt: "desc" }]
      }),
      prisma.grade.findMany({
        where: {
          student: {
            isActive: true
          }
        },
        select: {
          score: true,
          maxScore: true,
          subject: {
            select: {
              name: true
            }
          }
        }
      })
    ]);

    const semesterMap = new Map<Semester, { total: number; count: number }>([
      [Semester.SEMESTER_1, { total: 0, count: 0 }],
      [Semester.SEMESTER_2, { total: 0, count: 0 }]
    ]);

    for (const row of results) {
      const bucket = semesterMap.get(row.semester);
      if (!bucket) {
        continue;
      }

      bucket.total += row.weightedAverage;
      bucket.count += 1;
    }

    const semesterAverages = [Semester.SEMESTER_1, Semester.SEMESTER_2].map((semester) => {
      const bucket = semesterMap.get(semester)!;
      return {
        semester,
        average: Number((bucket.count > 0 ? bucket.total / bucket.count : 0).toFixed(2)),
        students: bucket.count
      };
    });

    const disciplineMap = new Map<string, { total: number; count: number }>();

    for (const grade of grades) {
      const subjectName = grade.subject.name;
      if (!disciplineMap.has(subjectName)) {
        disciplineMap.set(subjectName, { total: 0, count: 0 });
      }

      const row = disciplineMap.get(subjectName);
      if (!row) {
        continue;
      }

      row.total += normalizeScore(grade.score, grade.maxScore);
      row.count += 1;
    }

    const disciplineAverages = Array.from(disciplineMap.entries())
      .map(([subjectName, values]) => ({
        subjectName,
        average: Number((values.count > 0 ? values.total / values.count : 0).toFixed(2)),
        gradesCount: values.count
      }))
      .sort((a, b) => b.average - a.average);

    const latestAverageByStudent = new Map<string, number>();
    for (const result of results) {
      if (!latestAverageByStudent.has(result.studentId)) {
        latestAverageByStudent.set(result.studentId, result.weightedAverage);
      }
    }

    const scoreDistribution = [
      { label: "[0 - 8[", min: 0, max: 8, count: 0 },
      { label: "[8 - 10[", min: 8, max: 10, count: 0 },
      { label: "[10 - 12[", min: 10, max: 12, count: 0 },
      { label: "[12 - 14[", min: 12, max: 14, count: 0 },
      { label: "[14 - 16[", min: 14, max: 16, count: 0 },
      { label: "[16 - 20]", min: 16, max: 20, count: 0 }
    ];

    for (const value of latestAverageByStudent.values()) {
      const bucket = scoreDistribution.find((item, index) => {
        if (index === scoreDistribution.length - 1) {
          return value >= item.min && value <= item.max;
        }

        return value >= item.min && value < item.max;
      });

      if (bucket) {
        bucket.count += 1;
      }
    }

    return {
      summary: {
        totalStudents,
        totalTeachers,
        studentsWithAverage: latestAverageByStudent.size,
        studentsWithoutAverage: Math.max(totalStudents - latestAverageByStudent.size, 0)
      },
      semesterAverages,
      disciplineAverages,
      scoreDistribution
    };
  }

  private studentReadinessView(student: {
    id: string;
    fullName: string;
    registrationNumber: string;
    level: StudentLevel;
    stream: Stream;
    profileType: StudentProfileType;
    dreamCareer: string | null;
    targetProfession: string | null;
    class: { id: string; name: string; room: string | null } | null;
    orientation: { riskLevel: "FAIBLE" | "MOYEN" | "ELEVE"; riskScore: number } | null;
    results: Array<{ weightedAverage: number; trend: number | null; computedAt: Date }>;
    plans: Array<{ progressPercent: number }>;
    school: { id: string; name: string; code: string; type: SchoolType };
  }) {
    const latestResult = student.results[0];
    const latestAverage = latestResult?.weightedAverage ?? 0;
    const trend = latestResult?.trend ?? 0;
    const riskScore = student.orientation?.riskScore ?? 70;
    const planProgress = student.plans.length > 0 ? average(student.plans.map((plan) => plan.progressPercent)) : 0;
    const readiness = computeReadiness({
      latestAverage,
      trend,
      riskScore,
      planProgress,
      hasDreamCareer: Boolean(student.dreamCareer || student.targetProfession)
    });

    return {
      studentId: student.id,
      fullName: student.fullName,
      registrationNumber: student.registrationNumber,
      level: student.level,
      stream: student.stream,
      profileType: student.profileType,
      class: student.class,
      school: student.school,
      dreamCareer: student.dreamCareer,
      targetProfession: student.targetProfession,
      latestAverage: Number(latestAverage.toFixed(2)),
      trend: Number(trend.toFixed(2)),
      riskLevel: student.orientation?.riskLevel ?? "MOYEN",
      riskScore: Number(riskScore.toFixed(2)),
      planProgress: Number(planProgress.toFixed(2)),
      readinessScore: readiness.score,
      readinessBucket: readiness.bucket,
      gapToTarget: readiness.gapToTarget
    };
  }

  async establishments(actor: Express.AuthUser) {
    this.assertSuperAdmin(actor);

    const [schools, students] = await Promise.all([
      prisma.school.findMany({
        orderBy: { name: "asc" },
        include: {
          _count: {
            select: {
              classes: true,
              students: true,
              teachers: true
            }
          }
        }
      }),
      prisma.student.findMany({
        where: { isActive: true },
        select: {
          id: true,
          schoolId: true,
          fullName: true,
          registrationNumber: true,
          level: true,
          stream: true,
          profileType: true,
          dreamCareer: true,
          targetProfession: true,
          class: {
            select: {
              id: true,
              name: true,
              room: true
            }
          },
          school: {
            select: {
              id: true,
              name: true,
              code: true,
              type: true
            }
          },
          orientation: {
            select: {
              riskLevel: true,
              riskScore: true
            }
          },
          results: {
            select: {
              weightedAverage: true,
              trend: true,
              computedAt: true
            },
            orderBy: { computedAt: "desc" },
            take: 1
          },
          plans: {
            select: {
              progressPercent: true
            }
          }
        }
      })
    ]);

    const readinessBySchool = new Map<
      string,
      Array<{
        fullName: string;
        readinessScore: number;
      }>
    >();

    for (const student of students) {
      const view = this.studentReadinessView(student);
      if (!readinessBySchool.has(student.schoolId)) {
        readinessBySchool.set(student.schoolId, []);
      }

      readinessBySchool.get(student.schoolId)?.push({
        fullName: view.fullName,
        readinessScore: view.readinessScore
      });
    }

    return schools.map((school) => {
      const readiness = readinessBySchool.get(school.id) || [];
      const bestStudent = readiness.sort((a, b) => b.readinessScore - a.readinessScore)[0];
      const averageReadiness = readiness.length > 0 ? average(readiness.map((item) => item.readinessScore)) : 0;

      return {
        id: school.id,
        name: school.name,
        code: school.code,
        city: school.city,
        country: school.country,
        type: school.type,
        isActive: school.isActive,
        counts: {
          students: school._count.students,
          teachers: school._count.teachers,
          classes: school._count.classes
        },
        averageReadiness: Number(averageReadiness.toFixed(2)),
        topStudent:
          bestStudent?.fullName && bestStudent?.readinessScore !== undefined
            ? {
                fullName: bestStudent.fullName,
                readinessScore: Number(bestStudent.readinessScore.toFixed(2))
              }
            : null
      };
    });
  }

  async establishmentDetails(schoolId: string, actor: Express.AuthUser, filters: EstablishmentDetailFilters) {
    this.assertSuperAdmin(actor);
    const school = await this.schoolOrThrow(schoolId);

    const page = Math.max(1, filters.page ?? 1);
    const pageSize = clamp(filters.pageSize ?? 10, 1, 50);
    const search = filters.search?.trim().toLowerCase();

    const [classes, students] = await Promise.all([
      prisma.class.findMany({
        where: { schoolId },
        include: {
          _count: {
            select: {
              students: true
            }
          }
        },
        orderBy: [{ level: "asc" }, { name: "asc" }]
      }),
      prisma.student.findMany({
        where: {
          schoolId,
          isActive: true
        },
        select: {
          id: true,
          fullName: true,
          registrationNumber: true,
          level: true,
          stream: true,
          profileType: true,
          dreamCareer: true,
          targetProfession: true,
          class: {
            select: {
              id: true,
              name: true,
              room: true
            }
          },
          school: {
            select: {
              id: true,
              name: true,
              code: true,
              type: true
            }
          },
          orientation: {
            select: {
              riskLevel: true,
              riskScore: true
            }
          },
          results: {
            select: {
              weightedAverage: true,
              trend: true,
              computedAt: true
            },
            orderBy: { computedAt: "desc" },
            take: 1
          },
          plans: {
            select: {
              progressPercent: true
            }
          }
        }
      })
    ]);

    const levelMap = new Map<StudentLevel, number>();
    for (const student of students) {
      levelMap.set(student.level, (levelMap.get(student.level) ?? 0) + 1);
    }

    const studentsByReadiness = students
      .map((student) => this.studentReadinessView(student))
      .filter((item) => {
        if (!search) {
          return true;
        }

        return (
          item.fullName.toLowerCase().includes(search) ||
          item.registrationNumber.toLowerCase().includes(search) ||
          (item.dreamCareer || "").toLowerCase().includes(search) ||
          (item.targetProfession || "").toLowerCase().includes(search)
        );
      })
      .sort((a, b) => {
        if (b.readinessScore !== a.readinessScore) {
          return b.readinessScore - a.readinessScore;
        }

        return b.latestAverage - a.latestAverage;
      });

    const totalStudents = studentsByReadiness.length;
    const start = (page - 1) * pageSize;
    const paginated = studentsByReadiness.slice(start, start + pageSize);

    return {
      school,
      counts: {
        students: students.length,
        classes: classes.length
      },
      studentsByLevel: Array.from(levelMap.entries())
        .map(([level, count]) => ({ level, count }))
        .sort((a, b) => b.count - a.count),
      studentsByClass: classes.map((classItem) => ({
        classId: classItem.id,
        className: classItem.name,
        room: classItem.room,
        level: classItem.level,
        stream: classItem.stream,
        academicYear: classItem.academicYear,
        studentsCount: classItem._count.students
      })),
      readinessRanking: {
        page,
        pageSize,
        total: totalStudents,
        items: paginated
      }
    };
  }

  async importStudents(
    schoolId: string,
    actor: Express.AuthUser,
    fileBuffer: Buffer,
    mimetype: string,
    payload: ImportStudentsPayload
  ) {
    this.assertSuperAdmin(actor);
    const school = await this.schoolOrThrow(schoolId);
    const rows = parseStudentImportFile(fileBuffer, mimetype);

    if (!rows.length) {
      throw new AppError(400, "Le fichier est vide");
    }

    const defaults = inferDefaultsFromSchoolType(school.type);
    const fallbackAcademicYear = payload.defaultAcademicYear || defaultAcademicYear();
    const fallbackLevel = payload.defaultLevel ?? defaults.level;
    const fallbackStream = payload.defaultStream ?? defaults.stream;
    const fallbackProfileType = payload.defaultProfileType ?? defaults.profileType;

    ensureProfileMatchesSchool(fallbackProfileType, school.type);

    const errors: Array<{ row: number; message: string }> = [];
    let createdCount = 0;
    const seenInBatch = new Set<string>();

    for (let index = 0; index < rows.length; index += 1) {
      const row = rows[index];

      try {
        const registrationNumber = row.registrationNumber.toUpperCase();
        if (seenInBatch.has(registrationNumber)) {
          throw new AppError(400, `Matricule en doublon dans le fichier: ${registrationNumber}`);
        }
        seenInBatch.add(registrationNumber);

        const existing = await prisma.student.findUnique({
          where: { registrationNumber },
          select: { id: true }
        });

        if (existing) {
          throw new AppError(409, `Matricule deja utilise: ${registrationNumber}`);
        }

        const profileType = row.profileType ?? fallbackProfileType;
        ensureProfileMatchesSchool(profileType, school.type);

        const level = row.level ?? fallbackLevel;
        const stream = row.stream ?? fallbackStream;
        const academicYear = row.academicYear || fallbackAcademicYear;
        let classId: string | null = null;
        let classEducationSystem: EducationSystem | null = null;

        if (row.className?.trim()) {
          const className = row.className.trim();
          const existingClass = await prisma.class.findUnique({
            where: {
              schoolId_name_academicYear: {
                schoolId,
                name: className,
                academicYear
              }
            },
            select: {
              id: true,
              educationSystem: true
            }
          });

          if (existingClass) {
            classId = existingClass.id;
            classEducationSystem = existingClass.educationSystem;
          } else {
            const classEntity = await prisma.class.create({
              data: {
                schoolId,
                name: className,
                academicYear,
                level,
                stream,
                educationSystem: inferEducationSystemFromLevel(level)
              },
              select: {
                id: true,
                educationSystem: true
              }
            });
            classId = classEntity.id;
            classEducationSystem = classEntity.educationSystem;
          }
        }

        await prisma.student.create({
          data: {
            schoolId,
            classId,
            registrationNumber,
            fullName: row.fullName.trim(),
            profileType,
            level,
            stream,
            educationSystem: classEducationSystem ?? inferEducationSystemFromLevel(level),
            guardianPhone: row.guardianPhone?.trim() || null,
            dreamCareer: row.dreamCareer?.trim() || null,
            targetProfession: row.targetProfession?.trim() || null,
            admissionYear: new Date().getFullYear()
          }
        });

        createdCount += 1;
      } catch (error) {
        errors.push({
          row: index + 1,
          message: error instanceof Error ? error.message : "Erreur inconnue"
        });
      }
    }

    return {
      createdCount,
      errorCount: errors.length,
      errors
    };
  }

  async listAnnouncements(
    actor: Express.AuthUser,
    filters: {
      page?: number;
      pageSize?: number;
      targetSchoolId?: string;
      includeUnpublished?: boolean;
    }
  ) {
    this.assertSuperAdmin(actor);

    const page = Math.max(1, filters.page ?? 1);
    const pageSize = clamp(filters.pageSize ?? 10, 1, 50);
    const includeUnpublished = filters.includeUnpublished ?? true;

    const where = {
      ...(filters.targetSchoolId ? { targetSchoolId: filters.targetSchoolId } : {}),
      ...(includeUnpublished ? {} : { isPublished: true })
    };

    const [total, items] = await Promise.all([
      prisma.announcement.count({ where }),
      prisma.announcement.findMany({
        where,
        include: {
          targetSchool: {
            select: {
              id: true,
              name: true,
              code: true,
              type: true
            }
          },
          createdByUser: {
            select: {
              id: true,
              fullName: true
            }
          }
        },
        orderBy: [{ startsAt: "asc" }, { createdAt: "desc" }],
        skip: (page - 1) * pageSize,
        take: pageSize
      })
    ]);

    return {
      page,
      pageSize,
      total,
      items
    };
  }

  async createAnnouncement(actor: Express.AuthUser, payload: AnnouncementPayload) {
    this.assertSuperAdmin(actor);

    if (payload.targetSchoolId) {
      await this.schoolOrThrow(payload.targetSchoolId);
    }

    const startsAt = payload.startsAt ? new Date(payload.startsAt) : null;
    const endsAt = payload.endsAt ? new Date(payload.endsAt) : null;

    if (startsAt && endsAt && startsAt.getTime() > endsAt.getTime()) {
      throw new AppError(400, "La date de fin doit etre posterieure a la date de debut");
    }

    return prisma.announcement.create({
      data: {
        title: payload.title.trim(),
        content: payload.content.trim(),
        startsAt,
        endsAt,
        targetSchoolId: payload.targetSchoolId || null,
        createdByUserId: actor.id,
        isPublished: payload.isPublished ?? true
      }
    });
  }

  async progress(actor: Express.AuthUser, filters: DreamProgressFilters) {
    this.assertSuperAdmin(actor);

    const page = Math.max(1, filters.page ?? 1);
    const pageSize = clamp(filters.pageSize ?? 10, 1, 50);
    const search = filters.search?.trim().toLowerCase();

    const students = await prisma.student.findMany({
      where: {
        isActive: true,
        ...(filters.schoolId ? { schoolId: filters.schoolId } : {}),
        ...(filters.level ? { level: filters.level } : {}),
        ...(filters.profileType ? { profileType: filters.profileType } : {})
      },
      select: {
        id: true,
        fullName: true,
        registrationNumber: true,
        level: true,
        stream: true,
        profileType: true,
        dreamCareer: true,
        targetProfession: true,
        class: {
          select: {
            id: true,
            name: true,
            room: true
          }
        },
        school: {
          select: {
            id: true,
            name: true,
            code: true,
            type: true
          }
        },
        orientation: {
          select: {
            riskLevel: true,
            riskScore: true
          }
        },
        results: {
          select: {
            weightedAverage: true,
            trend: true,
            computedAt: true
          },
          orderBy: { computedAt: "desc" },
          take: 1
        },
        plans: {
          select: {
            progressPercent: true
          }
        }
      }
    });

    const rows = students
      .map((student) => this.studentReadinessView(student))
      .filter((item) => {
        if (!search) {
          return true;
        }

        return (
          item.fullName.toLowerCase().includes(search) ||
          item.registrationNumber.toLowerCase().includes(search) ||
          item.school.name.toLowerCase().includes(search) ||
          (item.dreamCareer || "").toLowerCase().includes(search) ||
          (item.targetProfession || "").toLowerCase().includes(search)
        );
      })
      .sort((a, b) => {
        if (b.readinessScore !== a.readinessScore) {
          return b.readinessScore - a.readinessScore;
        }

        return b.latestAverage - a.latestAverage;
      });

    const total = rows.length;
    const start = (page - 1) * pageSize;
    const items = rows.slice(start, start + pageSize);

    return {
      summary: {
        totalStudents: total,
        averageReadiness: Number((total > 0 ? average(rows.map((item) => item.readinessScore)) : 0).toFixed(2)),
        veryClose: rows.filter((item) => item.readinessBucket === "TRES_PROCHE").length,
        inGoodTrack: rows.filter((item) => item.readinessBucket === "EN_BONNE_VOIE").length,
        toSupport: rows.filter((item) => item.readinessBucket === "A_ACCOMPAGNER").length,
        critical: rows.filter((item) => item.readinessBucket === "CRITIQUE").length
      },
      ranking: {
        page,
        pageSize,
        total,
        items
      }
    };
  }
}

export const superAdminService = new SuperAdminService();
