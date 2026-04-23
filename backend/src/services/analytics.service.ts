import { Role, Semester, Sequence } from "@prisma/client";

import { prisma } from "../lib/prisma";
import { AppError } from "../utils/app-error";
import { computeResultStatus, computeRiskScore, riskLevelFromScore } from "../utils/analytics";
import { ensureSchoolScope, isSchoolAdminRole } from "../utils/tenant";
import { orientationService } from "./orientation.service";

function normalize(score: number, maxScore: number) {
  return (score / maxScore) * 20;
}

function average(values: number[]) {
  if (!values.length) {
    return 0;
  }

  return values.reduce((acc, item) => acc + item, 0) / values.length;
}

export class AnalyticsService {
  private async ensureStudentScope(studentId: string, actor: Express.AuthUser) {
    const student = await prisma.student.findUnique({ where: { id: studentId } });

    if (!student) {
      throw new AppError(404, "Eleve introuvable");
    }

    if (actor.role === Role.SUPER_ADMIN || isSchoolAdminRole(actor.role)) {
      ensureSchoolScope(actor, student.schoolId);
      return student;
    }

    if (actor.role === Role.TEACHER) {
      ensureSchoolScope(actor, student.schoolId);

      const teacher = await prisma.teacher.findFirst({
        where: {
          userId: actor.id,
          schoolId: student.schoolId
        }
      });

      if (!teacher || !student.classId) {
        throw new AppError(403, "Acces interdit");
      }

      const assignment = await prisma.teacherClassSubject.findFirst({
        where: {
          teacherId: teacher.id,
          classId: student.classId
        }
      });

      if (!assignment) {
        throw new AppError(403, "Acces interdit");
      }

      return student;
    }

    if (actor.role === Role.STUDENT || actor.role === Role.UNIVERSITY_STUDENT) {
      if (student.userId !== actor.id) {
        throw new AppError(403, "Acces interdit");
      }

      return student;
    }

    if (actor.role === Role.PARENT) {
      const link = await prisma.parentStudent.findFirst({
        where: {
          studentId,
          parentUserId: actor.id
        }
      });

      if (!link) {
        throw new AppError(403, "Acces interdit");
      }

      return student;
    }

    throw new AppError(403, "Acces interdit");
  }

  async student(studentId: string, actor: Express.AuthUser) {
    await this.ensureStudentScope(studentId, actor);

    const [student, grades, results, orientation, alerts, plans] = await Promise.all([
      prisma.student.findUnique({
        where: { id: studentId },
        include: {
          class: true,
          school: true,
          preferredSubject: {
            select: {
              id: true,
              name: true
            }
          }
        }
      }),
      prisma.grade.findMany({
        where: { studentId },
        include: {
          subject: {
            select: {
              id: true,
              name: true,
              coefficient: true
            }
          }
        },
        orderBy: { recordedAt: "asc" }
      }),
      prisma.result.findMany({
        where: { studentId },
        orderBy: { computedAt: "asc" }
      }),
      orientationService.getStudentProfile(studentId, actor),
      prisma.studentAlert.findMany({
        where: {
          studentId,
          isRead: false
        },
        orderBy: [{ severity: "desc" }, { createdAt: "desc" }],
        take: 10
      }),
      prisma.studentPlan.findMany({
        where: { studentId },
        orderBy: [{ status: "asc" }, { dueDate: "asc" }],
        take: 20
      })
    ]);

    if (!student) {
      throw new AppError(404, "Eleve introuvable");
    }

    const bySubject = new Map<string, { name: string; scores: number[] }>();
    const bySequence = new Map<string, number[]>();

    for (const grade of grades) {
      const normalized = normalize(grade.score, grade.maxScore);

      if (!bySubject.has(grade.subjectId)) {
        bySubject.set(grade.subjectId, {
          name: grade.subject.name,
          scores: []
        });
      }

      bySubject.get(grade.subjectId)?.scores.push(normalized);

      const sequenceKey = `${grade.semester}_${grade.sequence}`;

      if (!bySequence.has(sequenceKey)) {
        bySequence.set(sequenceKey, []);
      }

      bySequence.get(sequenceKey)?.push(normalized);
    }

    const subjectAverages = Array.from(bySubject.values()).map((item) => ({
      subjectName: item.name,
      average: Number(average(item.scores).toFixed(2))
    }));

    const sequenceAverages = Array.from(bySequence.entries()).map(([key, values]) => {
      const [semester, sequence] = key.split("_");
      return {
        semester: semester as Semester,
        sequence: sequence as Sequence,
        average: Number(average(values).toFixed(2))
      };
    });

    const progression = results.map((result) => ({
      semester: result.semester,
      average: result.weightedAverage,
      rank: result.rank,
      trend: result.trend
    }));

    const latestResult = results.length > 0 ? results[results.length - 1] : null;

    return {
      student,
      metrics: {
        currentAverage: latestResult?.weightedAverage ?? 0,
        bestAverage: results.reduce((acc, item) => Math.max(acc, item.weightedAverage), 0),
        currentRank: latestResult?.rank ?? null,
        preferredSubject: student.preferredSubject,
        dreamCareer: student.dreamCareer,
        targetProfession: student.targetProfession,
        risk: orientation
      },
      progression,
      subjectAverages,
      sequenceAverages,
      alerts,
      plans
    };
  }

  async class(classId: string, actor: Express.AuthUser, semester?: Semester) {
    const classEntity = await prisma.class.findUnique({
      where: { id: classId },
      include: {
        students: {
          where: { isActive: true },
          select: {
            id: true,
            fullName: true,
            registrationNumber: true
          }
        }
      }
    });

    if (!classEntity) {
      throw new AppError(404, "Classe introuvable");
    }

    ensureSchoolScope(actor, classEntity.schoolId);

    if (actor.role === Role.TEACHER) {
      const teacher = await prisma.teacher.findFirst({
        where: {
          userId: actor.id,
          schoolId: classEntity.schoolId
        }
      });

      if (!teacher) {
        throw new AppError(403, "Profil enseignant introuvable");
      }

      const assignment = await prisma.teacherClassSubject.findFirst({
        where: {
          teacherId: teacher.id,
          classId
        }
      });

      if (!assignment) {
        throw new AppError(403, "Acces interdit pour cette classe");
      }
    }

    const selectedSemester = semester ?? Semester.SEMESTER_2;

    const [results, grades] = await Promise.all([
      prisma.result.findMany({
        where: {
          classId,
          semester: selectedSemester
        },
        include: {
          student: {
            select: {
              id: true,
              fullName: true,
              registrationNumber: true
            }
          }
        },
        orderBy: { rank: "asc" }
      }),
      prisma.grade.findMany({
        where: {
          classId,
          semester: selectedSemester
        },
        include: {
          subject: {
            select: {
              id: true,
              name: true
            }
          }
        }
      })
    ]);

    const bySubject = new Map<string, { name: string; total: number; count: number }>();
    const bySequence = new Map<Sequence, number[]>();

    for (const grade of grades) {
      if (!bySubject.has(grade.subjectId)) {
        bySubject.set(grade.subjectId, {
          name: grade.subject.name,
          total: 0,
          count: 0
        });
      }

      const row = bySubject.get(grade.subjectId);

      if (!row) {
        continue;
      }

      const normalized = normalize(grade.score, grade.maxScore);
      row.total += normalized;
      row.count += 1;

      if (!bySequence.has(grade.sequence)) {
        bySequence.set(grade.sequence, []);
      }

      bySequence.get(grade.sequence)?.push(normalized);
    }

    const subjectStats = Array.from(bySubject.values()).map((item) => ({
      subjectName: item.name,
      average: Number((item.total / item.count).toFixed(2))
    }));

    const sequenceStats = Array.from(bySequence.entries()).map(([sequence, values]) => ({
      sequence,
      average: Number(average(values).toFixed(2))
    }));

    const weakestSubject =
      subjectStats.length > 0
        ? subjectStats.reduce((prev, current) => (current.average < prev.average ? current : prev), subjectStats[0])
        : null;

    const classProfiles = await prisma.orientationProfile.findMany({
      where: {
        studentId: {
          in: classEntity.students.map((student) => student.id)
        }
      }
    });

    const riskDistribution = {
      faible: classProfiles.filter((item) => item.riskLevel === "FAIBLE").length,
      moyen: classProfiles.filter((item) => item.riskLevel === "MOYEN").length,
      eleve: classProfiles.filter((item) => item.riskLevel === "ELEVE").length
    };

    const history = await prisma.result.findMany({
      where: {
        classId
      },
      include: {
        student: {
          select: {
            id: true,
            fullName: true
          }
        }
      },
      orderBy: [{ semester: "asc" }, { computedAt: "asc" }]
    });

    const evolutionByStudent = new Map<string, { studentId: string; fullName: string; points: Array<{ semester: Semester; average: number }> }>();

    for (const result of history) {
      if (!evolutionByStudent.has(result.studentId)) {
        evolutionByStudent.set(result.studentId, {
          studentId: result.studentId,
          fullName: result.student.fullName,
          points: []
        });
      }

      evolutionByStudent.get(result.studentId)?.points.push({
        semester: result.semester,
        average: result.weightedAverage
      });
    }

    return {
      class: classEntity,
      semester: selectedSemester,
      ranking: results,
      subjectStats,
      sequenceStats,
      weakestSubject,
      riskDistribution,
      evolutionByStudent: Array.from(evolutionByStudent.values())
    };
  }

  async teacherEvolution(teacherId: string, actor: Express.AuthUser, semester?: Semester) {
    const teacher = await prisma.teacher.findUnique({
      where: { id: teacherId }
    });

    if (!teacher) {
      throw new AppError(404, "Enseignant introuvable");
    }

    const schoolId = ensureSchoolScope(actor, teacher.schoolId);

    if (actor.role === Role.TEACHER && teacher.userId !== actor.id) {
      throw new AppError(403, "Acces interdit");
    }

    const assignments = await prisma.teacherClassSubject.findMany({
      where: {
        teacherId,
        schoolId
      },
      include: {
        class: {
          select: {
            id: true,
            name: true,
            room: true
          }
        },
        subject: {
          select: {
            id: true,
            name: true
          }
        }
      }
    });

    const assignmentViews = [] as Array<{
      assignmentId: string;
      classId: string;
      className: string;
      room: string | null;
      subjectId: string;
      subjectName: string;
      students: Array<{
        studentId: string;
        fullName: string;
        registrationNumber: string;
        semesterAverage: number;
        sequenceAverages: Array<{ sequence: Sequence; average: number }>;
      }>;
    }>;

    for (const assignment of assignments) {
      const grades = await prisma.grade.findMany({
        where: {
          teacherId,
          classId: assignment.classId,
          subjectId: assignment.subjectId,
          ...(semester ? { semester } : {})
        },
        include: {
          student: {
            select: {
              id: true,
              fullName: true,
              registrationNumber: true
            }
          }
        },
        orderBy: {
          recordedAt: "asc"
        }
      });

      const byStudent = new Map<
        string,
        {
          studentId: string;
          fullName: string;
          registrationNumber: string;
          scores: number[];
          bySequence: Map<Sequence, number[]>;
        }
      >();

      for (const grade of grades) {
        if (!byStudent.has(grade.studentId)) {
          byStudent.set(grade.studentId, {
            studentId: grade.studentId,
            fullName: grade.student.fullName,
            registrationNumber: grade.student.registrationNumber,
            scores: [],
            bySequence: new Map()
          });
        }

        const bucket = byStudent.get(grade.studentId);

        if (!bucket) {
          continue;
        }

        const normalized = normalize(grade.score, grade.maxScore);
        bucket.scores.push(normalized);

        if (!bucket.bySequence.has(grade.sequence)) {
          bucket.bySequence.set(grade.sequence, []);
        }

        bucket.bySequence.get(grade.sequence)?.push(normalized);
      }

      const students = Array.from(byStudent.values())
        .map((item) => ({
          studentId: item.studentId,
          fullName: item.fullName,
          registrationNumber: item.registrationNumber,
          semesterAverage: Number(average(item.scores).toFixed(2)),
          sequenceAverages: Array.from(item.bySequence.entries()).map(([sequence, scores]) => ({
            sequence,
            average: Number(average(scores).toFixed(2))
          }))
        }))
        .sort((a, b) => b.semesterAverage - a.semesterAverage);

      assignmentViews.push({
        assignmentId: assignment.id,
        classId: assignment.class.id,
        className: assignment.class.name,
        room: assignment.class.room,
        subjectId: assignment.subject.id,
        subjectName: assignment.subject.name,
        students
      });
    }

    return {
      teacher: {
        id: teacher.id,
        fullName: teacher.fullName,
        employeeCode: teacher.employeeCode
      },
      semester: semester ?? null,
      assignments: assignmentViews
    };
  }

  async school(schoolId: string, actor: Express.AuthUser) {
    const scopedSchoolId = ensureSchoolScope(actor, schoolId);

    const [results, classes, grades, profiles, alerts] = await Promise.all([
      prisma.result.findMany({
        where: { schoolId: scopedSchoolId },
        include: {
          class: {
            select: {
              id: true,
              name: true,
              room: true
            }
          }
        }
      }),
      prisma.class.findMany({
        where: { schoolId: scopedSchoolId },
        select: {
          id: true,
          name: true,
          room: true,
          _count: {
            select: {
              students: true
            }
          }
        }
      }),
      prisma.grade.findMany({
        where: { schoolId: scopedSchoolId },
        include: {
          subject: {
            select: {
              id: true,
              name: true
            }
          }
        }
      }),
      prisma.orientationProfile.findMany({
        where: { schoolId: scopedSchoolId }
      }),
      prisma.studentAlert.findMany({
        where: {
          schoolId: scopedSchoolId,
          isRead: false
        }
      })
    ]);

    const totalResults = results.length;
    const admittedCount = results.filter((item) => item.status === "ADMIS" || item.status === "EXCELLENT").length;
    const excellentCount = results.filter((item) => item.status === "EXCELLENT").length;
    const averageScore =
      totalResults > 0
        ? Number((results.reduce((acc, item) => acc + item.weightedAverage, 0) / totalResults).toFixed(2))
        : 0;

    const progressionValues = results.map((item) => item.trend).filter((item): item is number => item !== null);
    const progression =
      progressionValues.length > 0
        ? Number((progressionValues.reduce((acc, value) => acc + value, 0) / progressionValues.length).toFixed(2))
        : 0;

    const classAverageMap = new Map<string, { className: string; room: string | null; total: number; count: number }>();

    for (const result of results) {
      if (!classAverageMap.has(result.classId)) {
        classAverageMap.set(result.classId, {
          className: result.class.name,
          room: result.class.room,
          total: 0,
          count: 0
        });
      }

      const row = classAverageMap.get(result.classId);

      if (!row) {
        continue;
      }

      row.total += result.weightedAverage;
      row.count += 1;
    }

    const classPerformance = Array.from(classAverageMap.entries())
      .map(([classId, value]) => ({
        classId,
        className: value.className,
        room: value.room,
        average: Number((value.total / value.count).toFixed(2))
      }))
      .sort((a, b) => b.average - a.average);

    const subjectMap = new Map<string, { name: string; total: number; count: number }>();

    for (const grade of grades) {
      if (!subjectMap.has(grade.subjectId)) {
        subjectMap.set(grade.subjectId, {
          name: grade.subject.name,
          total: 0,
          count: 0
        });
      }

      const row = subjectMap.get(grade.subjectId);

      if (!row) {
        continue;
      }

      row.total += normalize(grade.score, grade.maxScore);
      row.count += 1;
    }

    const subjectStats = Array.from(subjectMap.values())
      .map((item) => ({
        subjectName: item.name,
        average: Number((item.total / item.count).toFixed(2))
      }))
      .sort((a, b) => a.average - b.average);

    const riskDistribution = {
      faible: profiles.filter((item) => item.riskLevel === "FAIBLE").length,
      moyen: profiles.filter((item) => item.riskLevel === "MOYEN").length,
      eleve: profiles.filter((item) => item.riskLevel === "ELEVE").length
    };

    return {
      schoolId: scopedSchoolId,
      summary: {
        successRate: totalResults > 0 ? Number(((admittedCount / totalResults) * 100).toFixed(2)) : 0,
        excellentRate: totalResults > 0 ? Number(((excellentCount / totalResults) * 100).toFixed(2)) : 0,
        averageScore,
        progression
      },
      classCount: classes.length,
      totalStudents: classes.reduce((acc, row) => acc + row._count.students, 0),
      classPerformance,
      subjectStats,
      riskDistribution,
      alertSummary: {
        totalOpen: alerts.length,
        critical: alerts.filter((item) => item.severity === "CRITIQUE").length,
        attention: alerts.filter((item) => item.severity === "ATTENTION").length
      }
    };
  }

  async simulateStudentProjection(
    studentId: string,
    actor: Express.AuthUser,
    payload: {
      semester: Semester;
      sequence?: Sequence;
      subjectId: string;
      score: number;
      maxScore?: number;
    }
  ) {
    const student = await this.ensureStudentScope(studentId, actor);

    if (!student.classId) {
      throw new AppError(400, "Cet apprenant n est pas rattache a une classe");
    }

    const subject = await prisma.subject.findUnique({
      where: { id: payload.subjectId },
      select: {
        id: true,
        schoolId: true,
        name: true,
        coefficient: true,
        isCore: true
      }
    });

    if (!subject || subject.schoolId !== student.schoolId) {
      throw new AppError(400, "Matiere invalide pour cet etablissement");
    }

    const maxScore = payload.maxScore ?? 20;
    if (payload.score < 0 || payload.score > maxScore) {
      throw new AppError(400, `La note projettee doit etre comprise entre 0 et ${maxScore}`);
    }

    const [grades, classResults, currentResult, previousSemesterResult] = await Promise.all([
      prisma.grade.findMany({
        where: {
          studentId,
          semester: payload.semester
        },
        include: {
          subject: {
            select: {
              id: true,
              name: true,
              coefficient: true,
              isCore: true
            }
          }
        }
      }),
      prisma.result.findMany({
        where: {
          classId: student.classId,
          semester: payload.semester
        }
      }),
      prisma.result.findUnique({
        where: {
          studentId_classId_semester: {
            studentId,
            classId: student.classId,
            semester: payload.semester
          }
        }
      }),
      payload.semester === Semester.SEMESTER_2
        ? prisma.result.findUnique({
            where: {
              studentId_classId_semester: {
                studentId,
                classId: student.classId,
                semester: Semester.SEMESTER_1
              }
            }
          })
        : Promise.resolve(null)
    ]);

    const bySubject = new Map<
      string,
      {
        subjectName: string;
        coefficient: number;
        isCore: boolean;
        scores: number[];
      }
    >();

    for (const grade of grades) {
      if (!bySubject.has(grade.subjectId)) {
        bySubject.set(grade.subjectId, {
          subjectName: grade.subject.name,
          coefficient: grade.subject.coefficient,
          isCore: grade.subject.isCore,
          scores: []
        });
      }

      bySubject.get(grade.subjectId)?.scores.push(normalize(grade.score, grade.maxScore));
    }

    if (!bySubject.has(subject.id)) {
      bySubject.set(subject.id, {
        subjectName: subject.name,
        coefficient: subject.coefficient,
        isCore: subject.isCore,
        scores: []
      });
    }

    bySubject.get(subject.id)?.scores.push(normalize(payload.score, maxScore));

    let weightedTotal = 0;
    let totalCoefficient = 0;
    let weakCoreCount = 0;

    for (const bucket of bySubject.values()) {
      const subjectAverage = average(bucket.scores);
      weightedTotal += subjectAverage * bucket.coefficient;
      totalCoefficient += bucket.coefficient;

      if (bucket.isCore && subjectAverage < 10) {
        weakCoreCount += 1;
      }
    }

    const projectedAverage = totalCoefficient > 0 ? Number((weightedTotal / totalCoefficient).toFixed(2)) : 0;
    const currentAverage = currentResult?.weightedAverage ?? 0;

    const rankingRows = classResults.map((item) => ({
      studentId: item.studentId,
      average: item.studentId === studentId ? projectedAverage : item.weightedAverage
    }));

    if (!rankingRows.some((item) => item.studentId === studentId)) {
      rankingRows.push({
        studentId,
        average: projectedAverage
      });
    }

    rankingRows.sort((a, b) => b.average - a.average);

    let projectedRank = 0;
    let lastScore: number | null = null;
    let currentRank = 0;

    for (let index = 0; index < rankingRows.length; index += 1) {
      const row = rankingRows[index];

      if (lastScore === null || row.average < lastScore) {
        currentRank = index + 1;
        lastScore = row.average;
      }

      if (row.studentId === studentId) {
        projectedRank = currentRank;
      }
    }

    const trendBase = previousSemesterResult ? projectedAverage - previousSemesterResult.weightedAverage : 0;
    const projectedRiskScore = Number(
      computeRiskScore({
        average: projectedAverage,
        trend: trendBase,
        weakCoreCount
      }).toFixed(2)
    );

    return {
      studentId,
      semester: payload.semester,
      simulatedSubject: {
        id: subject.id,
        name: subject.name
      },
      projection: {
        currentAverage,
        projectedAverage,
        deltaAverage: Number((projectedAverage - currentAverage).toFixed(2)),
        currentRank: currentResult?.rank ?? null,
        projectedRank,
        projectedStatus: computeResultStatus(projectedAverage),
        projectedRiskScore,
        projectedRiskLevel: riskLevelFromScore(projectedRiskScore)
      }
    };
  }
}

export const analyticsService = new AnalyticsService();
