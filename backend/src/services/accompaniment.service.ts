import { AlertSeverity, PlanStatus, Role } from "@prisma/client";

import { prisma } from "../lib/prisma";
import { AppError } from "../utils/app-error";
import { ensureSchoolScope, isSchoolAdminRole } from "../utils/tenant";

interface PlanPayload {
  title: string;
  description?: string;
  status?: PlanStatus;
  dueDate?: string;
}

interface UpdatePlanPayload {
  title?: string;
  description?: string;
  status?: PlanStatus;
  dueDate?: string;
}

interface ManualAlertPayload {
  severity: AlertSeverity;
  category: string;
  title: string;
  message: string;
}

function normalize(score: number, maxScore: number) {
  return (score / maxScore) * 20;
}

function average(values: number[]) {
  if (!values.length) {
    return 0;
  }

  return values.reduce((acc, item) => acc + item, 0) / values.length;
}

export class AccompanimentService {
  private async assertStudentAccess(studentId: string, actor: Express.AuthUser) {
    const student = await prisma.student.findUnique({
      where: { id: studentId }
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

  async studentOverview(studentId: string, actor: Express.AuthUser) {
    await this.assertStudentAccess(studentId, actor);

    const [student, grades, results, orientation, plans, alerts] = await Promise.all([
      prisma.student.findUnique({
        where: { id: studentId },
        include: {
          school: {
            select: {
              id: true,
              name: true,
              type: true
            }
          },
          class: {
            select: {
              id: true,
              name: true,
              room: true,
              academicYear: true
            }
          },
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
        orderBy: [{ semester: "asc" }, { sequence: "asc" }, { recordedAt: "asc" }]
      }),
      prisma.result.findMany({
        where: { studentId },
        orderBy: [{ semester: "asc" }, { computedAt: "asc" }]
      }),
      prisma.orientationProfile.findUnique({
        where: { studentId }
      }),
      prisma.studentPlan.findMany({
        where: { studentId },
        orderBy: [{ status: "asc" }, { dueDate: "asc" }]
      }),
      prisma.studentAlert.findMany({
        where: { studentId },
        orderBy: [{ isRead: "asc" }, { severity: "desc" }, { createdAt: "desc" }],
        take: 50
      })
    ]);

    if (!student) {
      throw new AppError(404, "Eleve introuvable");
    }

    const subjectMap = new Map<string, { subjectName: string; values: number[] }>();
    const sequenceMap = new Map<string, number[]>();

    for (const grade of grades) {
      const normalized = normalize(grade.score, grade.maxScore);

      if (!subjectMap.has(grade.subjectId)) {
        subjectMap.set(grade.subjectId, {
          subjectName: grade.subject.name,
          values: []
        });
      }

      subjectMap.get(grade.subjectId)?.values.push(normalized);

      const sequenceKey = `${grade.semester}_${grade.sequence}`;

      if (!sequenceMap.has(sequenceKey)) {
        sequenceMap.set(sequenceKey, []);
      }

      sequenceMap.get(sequenceKey)?.push(normalized);
    }

    const subjectAverages = Array.from(subjectMap.values())
      .map((item) => ({
        subjectName: item.subjectName,
        average: Number(average(item.values).toFixed(2))
      }))
      .sort((a, b) => b.average - a.average);

    const sequentialAverages = Array.from(sequenceMap.entries()).map(([key, values]) => {
      const [semester, sequence] = key.split("_");
      return {
        semester,
        sequence,
        average: Number(average(values).toFixed(2))
      };
    });

    const latestResult = results.length ? results[results.length - 1] : null;

    return {
      student,
      metrics: {
        semesterAverage: latestResult?.weightedAverage ?? 0,
        rank: latestResult?.rank ?? null,
        preferredSubject: student.preferredSubject,
        dreamCareer: student.dreamCareer,
        targetProfession: student.targetProfession,
        learningObjectives: student.learningObjectives,
        orientation
      },
      subjectAverages,
      sequentialAverages,
      progression: results,
      plans,
      alerts
    };
  }

  async listPlans(studentId: string, actor: Express.AuthUser) {
    await this.assertStudentAccess(studentId, actor);

    return prisma.studentPlan.findMany({
      where: {
        studentId
      },
      orderBy: [{ status: "asc" }, { dueDate: "asc" }]
    });
  }

  async createPlan(studentId: string, payload: PlanPayload, actor: Express.AuthUser) {
    const student = await this.assertStudentAccess(studentId, actor);

    return prisma.studentPlan.create({
      data: {
        schoolId: student.schoolId,
        studentId,
        title: payload.title.trim(),
        description: payload.description?.trim() || null,
        status: payload.status ?? PlanStatus.A_FAIRE,
        dueDate: payload.dueDate ? new Date(payload.dueDate) : null,
        createdByUserId: actor.id
      }
    });
  }

  async updatePlan(planId: string, payload: UpdatePlanPayload, actor: Express.AuthUser) {
    const plan = await prisma.studentPlan.findUnique({
      where: { id: planId }
    });

    if (!plan) {
      throw new AppError(404, "Plan introuvable");
    }

    await this.assertStudentAccess(plan.studentId, actor);

    return prisma.studentPlan.update({
      where: { id: planId },
      data: {
        ...(payload.title !== undefined ? { title: payload.title.trim() } : {}),
        ...(payload.description !== undefined ? { description: payload.description || null } : {}),
        ...(payload.status ? { status: payload.status } : {}),
        ...(payload.dueDate !== undefined ? { dueDate: payload.dueDate ? new Date(payload.dueDate) : null } : {})
      }
    });
  }

  async listAlerts(studentId: string, actor: Express.AuthUser) {
    await this.assertStudentAccess(studentId, actor);

    return prisma.studentAlert.findMany({
      where: {
        studentId
      },
      orderBy: [{ isRead: "asc" }, { severity: "desc" }, { createdAt: "desc" }]
    });
  }

  async addAlert(studentId: string, payload: ManualAlertPayload, actor: Express.AuthUser) {
    const student = await this.assertStudentAccess(studentId, actor);

    if (!(actor.role === Role.SUPER_ADMIN || isSchoolAdminRole(actor.role) || actor.role === Role.TEACHER)) {
      throw new AppError(403, "Seuls les encadrants peuvent creer une alerte");
    }

    return prisma.studentAlert.create({
      data: {
        schoolId: student.schoolId,
        studentId,
        severity: payload.severity,
        category: payload.category.trim(),
        title: payload.title.trim(),
        message: payload.message.trim()
      }
    });
  }

  async markAlertAsRead(alertId: string, actor: Express.AuthUser) {
    const alert = await prisma.studentAlert.findUnique({
      where: { id: alertId }
    });

    if (!alert) {
      throw new AppError(404, "Alerte introuvable");
    }

    await this.assertStudentAccess(alert.studentId, actor);

    return prisma.studentAlert.update({
      where: { id: alertId },
      data: {
        isRead: true
      }
    });
  }
}

export const accompanimentService = new AccompanimentService();
