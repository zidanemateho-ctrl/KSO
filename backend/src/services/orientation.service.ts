import { RiskLevel, Role } from "@prisma/client";

import { prisma } from "../lib/prisma";
import { computeRiskScore, recommendOrientation, riskLevelFromScore } from "../utils/analytics";
import { AppError } from "../utils/app-error";
import { ensureSchoolScope, isSchoolAdminRole } from "../utils/tenant";

function normalizedScore(score: number, maxScore: number) {
  return (score / maxScore) * 20;
}

function encodeCareers(careers: string[]) {
  return JSON.stringify(careers);
}

function encodeExplanation(payload: Record<string, unknown>) {
  return JSON.stringify(payload);
}

function decodeCareers(raw: string) {
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === "string") : [];
  } catch {
    return [];
  }
}

function decodeExplanation(raw: string | null) {
  if (!raw) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : null;
  } catch {
    return null;
  }
}

function riskAlertContent(riskLevel: RiskLevel, riskScore: number) {
  if (riskLevel === RiskLevel.ELEVE) {
    return {
      severity: "CRITIQUE" as const,
      title: "Risque academique eleve",
      message: `Le score de risque est ${riskScore}/100. Une intervention rapide est recommandee.`
    };
  }

  if (riskLevel === RiskLevel.MOYEN) {
    return {
      severity: "ATTENTION" as const,
      title: "Risque academique moyen",
      message: `Le score de risque est ${riskScore}/100. Un suivi regulier est conseille.`
    };
  }

  return {
    severity: "INFO" as const,
    title: "Situation academique stable",
    message: `Le score de risque est ${riskScore}/100. Maintenez les bonnes habitudes de travail.`
  };
}

export class OrientationService {
  private async assertStudentAccess(studentId: string, actor: Express.AuthUser) {
    const student = await prisma.student.findUnique({
      where: { id: studentId },
      include: {
        school: {
          select: { id: true, name: true }
        }
      }
    });

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
      const ownStudent = await prisma.student.findFirst({
        where: {
          id: studentId,
          userId: actor.id
        }
      });

      if (!ownStudent) {
        throw new AppError(403, "Acces interdit");
      }

      return student;
    }

    if (actor.role === Role.PARENT) {
      const linked = await prisma.parentStudent.findFirst({
        where: {
          studentId,
          parentUserId: actor.id
        }
      });

      if (!linked) {
        throw new AppError(403, "Acces interdit");
      }

      return student;
    }

    throw new AppError(403, "Acces interdit");
  }

  private async syncRiskAlert(params: { studentId: string; schoolId: string; riskLevel: RiskLevel; riskScore: number }) {
    const content = riskAlertContent(params.riskLevel, params.riskScore);

    const existing = await prisma.studentAlert.findFirst({
      where: {
        studentId: params.studentId,
        category: "RISQUE_ACADEMIQUE",
        isRead: false
      },
      orderBy: {
        createdAt: "desc"
      }
    });

    if (!existing) {
      await prisma.studentAlert.create({
        data: {
          schoolId: params.schoolId,
          studentId: params.studentId,
          category: "RISQUE_ACADEMIQUE",
          severity: content.severity,
          title: content.title,
          message: content.message
        }
      });

      return;
    }

    await prisma.studentAlert.update({
      where: { id: existing.id },
      data: {
        severity: content.severity,
        title: content.title,
        message: content.message,
        isRead: false
      }
    });
  }

  async recompute(studentId: string) {
    const student = await prisma.student.findUnique({
      where: { id: studentId },
      include: {
        preferredSubject: {
          select: {
            id: true,
            name: true
          }
        }
      }
    });

    if (!student) {
      throw new AppError(404, "Eleve introuvable");
    }

    const grades = await prisma.grade.findMany({
      where: { studentId },
      include: {
        subject: {
          select: {
            name: true,
            isCore: true
          }
        }
      }
    });

    const subjectMap = new Map<string, { total: number; count: number; isCore: boolean }>();

    for (const grade of grades) {
      if (!subjectMap.has(grade.subject.name)) {
        subjectMap.set(grade.subject.name, {
          total: 0,
          count: 0,
          isCore: grade.subject.isCore
        });
      }

      const row = subjectMap.get(grade.subject.name);

      if (!row) {
        continue;
      }

      row.total += normalizedScore(grade.score, grade.maxScore);
      row.count += 1;
    }

    const subjectAverages = Array.from(subjectMap.entries()).map(([subjectName, value]) => ({
      subjectName,
      average: value.count > 0 ? value.total / value.count : 0,
      isCore: value.isCore
    }));

    const weakCoreCount = subjectAverages.filter((item) => item.isCore && item.average < 10).length;

    const latestResult = await prisma.result.findFirst({
      where: { studentId },
      orderBy: [{ computedAt: "desc" }]
    });

    const average = latestResult?.weightedAverage ?? 0;
    const trend = latestResult?.trend ?? 0;
    const riskScore = Number(computeRiskScore({ average, trend, weakCoreCount }).toFixed(2));
    const riskLevel = riskLevelFromScore(riskScore);

    const recommendation = recommendOrientation(subjectAverages);
    const topSubjects = [...subjectAverages].sort((a, b) => b.average - a.average).slice(0, 3);
    const weakSubjects = [...subjectAverages].filter((item) => item.average < 10).slice(0, 3);
    const preferredSubjectHint = student.preferredSubject?.name
      ? `Discipline preferee: ${student.preferredSubject.name}.`
      : "";
    const dreamCareerHint = student.dreamCareer
      ? `Metier de reve: ${student.dreamCareer}.`
      : "";

    const insights =
      riskLevel === "ELEVE"
        ? `Risque eleve detecte: renforcer les matieres fondamentales et suivre un plan de remediation. ${preferredSubjectHint} ${dreamCareerHint}`.trim()
        : riskLevel === "MOYEN"
          ? `Risque moyen: suivi regulier conseille et consolidation des points faibles. ${preferredSubjectHint} ${dreamCareerHint}`.trim()
          : `Risque faible: maintenir la dynamique actuelle avec des objectifs progressifs. ${preferredSubjectHint} ${dreamCareerHint}`.trim();

    const profile = await prisma.orientationProfile.upsert({
      where: {
        studentId
      },
      create: {
        schoolId: student.schoolId,
        studentId,
        riskScore,
        riskLevel,
        recommendedStream: recommendation.stream,
        recommendedCareers: encodeCareers(recommendation.careers),
        explanation: encodeExplanation({
          factors: {
            average,
            trend,
            weakCoreCount
          },
          strengths: topSubjects,
          weaknesses: weakSubjects,
          recommendationReason: `La filiere ${recommendation.stream} est proposee selon les performances dominantes.`
        }),
        insights
      },
      update: {
        riskScore,
        riskLevel,
        recommendedStream: recommendation.stream,
        recommendedCareers: encodeCareers(recommendation.careers),
        explanation: encodeExplanation({
          factors: {
            average,
            trend,
            weakCoreCount
          },
          strengths: topSubjects,
          weaknesses: weakSubjects,
          recommendationReason: `La filiere ${recommendation.stream} est proposee selon les performances dominantes.`
        }),
        insights
      }
    });

    await this.syncRiskAlert({
      studentId,
      schoolId: student.schoolId,
      riskLevel,
      riskScore
    });

    return {
      ...profile,
      recommendedCareers: decodeCareers(profile.recommendedCareers),
      explanation: decodeExplanation(profile.explanation)
    };
  }

  async recomputeForActor(studentId: string, actor: Express.AuthUser) {
    await this.assertStudentAccess(studentId, actor);
    return this.recompute(studentId);
  }

  async recomputeMany(studentIds: string[]) {
    const uniqueIds = Array.from(new Set(studentIds));

    for (const studentId of uniqueIds) {
      await this.recompute(studentId);
    }
  }

  async getStudentProfile(studentId: string, actor: Express.AuthUser) {
    await this.assertStudentAccess(studentId, actor);

    const profile = await prisma.orientationProfile.findUnique({
      where: { studentId },
      include: {
        student: {
          select: {
            id: true,
            fullName: true,
            registrationNumber: true,
            dreamCareer: true,
            targetProfession: true,
            class: {
              select: {
                id: true,
                name: true,
                room: true
              }
            }
          }
        }
      }
    });

    if (!profile) {
      return this.recompute(studentId);
    }

    return {
      ...profile,
      recommendedCareers: decodeCareers(profile.recommendedCareers),
      explanation: decodeExplanation(profile.explanation)
    };
  }

  async listSchoolProfiles(schoolId: string, actor: Express.AuthUser) {
    const scopedSchoolId = ensureSchoolScope(actor, schoolId);

    const profiles = await prisma.orientationProfile.findMany({
      where: { schoolId: scopedSchoolId },
      include: {
        student: {
          select: {
            id: true,
            fullName: true,
            registrationNumber: true,
            dreamCareer: true,
            targetProfession: true,
            class: {
              select: {
                id: true,
                name: true,
                room: true
              }
            }
          }
        }
      },
      orderBy: [{ riskScore: "desc" }, { updatedAt: "desc" }]
    });

    return profiles.map((profile) => ({
      ...profile,
      recommendedCareers: decodeCareers(profile.recommendedCareers),
      explanation: decodeExplanation(profile.explanation)
    }));
  }
}

export const orientationService = new OrientationService();
