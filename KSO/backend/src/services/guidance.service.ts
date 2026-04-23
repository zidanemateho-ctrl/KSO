import {
  AlertSeverity,
  AlumniOutcomeType,
  ApplicationStatus,
  AttendanceStatus,
  BadgeType,
  CompetencyCategory,
  InternshipType,
  OpportunityType,
  PlanStatus,
  PortfolioCategory,
  Role,
  Semester,
  Sequence,
  SessionStatus,
  StudentLevel,
  StudentProfileType,
  Stream,
  SyncStatus
} from "@prisma/client";
import { randomUUID } from "crypto";

import { prisma } from "../lib/prisma";
import { AppError } from "../utils/app-error";
import { ensureSchoolScope, isSchoolAdminRole } from "../utils/tenant";
import { gradeService } from "./grade.service";

interface PlanTaskPayload {
  title: string;
  description?: string;
  status?: PlanStatus;
  dueDate?: string;
  assignedToUserId?: string;
}

interface PlanTaskUpdatePayload {
  title?: string;
  description?: string;
  status?: PlanStatus;
  dueDate?: string;
  assignedToUserId?: string | null;
}

interface PlanCollaboratorPayload {
  userId: string;
  roleLabel: string;
}

interface AttendancePayload {
  date?: string;
  status: AttendanceStatus;
  note?: string;
}

interface BehaviorPayload {
  category: string;
  severity: AlertSeverity;
  description: string;
  occurredAt?: string;
}

interface CompetencyPayload {
  category: CompetencyCategory;
  label: string;
  score: number;
  comment?: string;
}

interface OpportunityPayload {
  schoolId?: string | null;
  title: string;
  description: string;
  type: OpportunityType;
  targetStream?: Stream;
  targetLevel?: StudentLevel;
  targetProfile?: StudentProfileType;
  targetSchoolType?: "COLLEGE" | "HIGH_SCHOOL" | "UNIVERSITY";
  location?: string;
  applicationUrl?: string;
  deadline?: string;
  tags?: string;
}

interface InternshipPayload {
  type: InternshipType;
  title: string;
  organization: string;
  status?: ApplicationStatus;
  notes?: string;
}

interface MentorshipPayload {
  mentorUserId?: string;
  mentorName: string;
  topic: string;
  meetingLink?: string;
  notes?: string;
  scheduledAt: string;
  status?: SessionStatus;
}

interface JournalPayload {
  weekStart: string;
  summary: string;
  parentNote?: string;
  teacherNote?: string;
  tips?: string;
}

interface PortfolioPayload {
  title: string;
  description?: string;
  category: PortfolioCategory;
  url?: string;
  evidence?: string;
  awardedAt?: string;
}

interface WellbeingPayload {
  mood: number;
  stress: number;
  energy: number;
  comment?: string;
}

interface BadgePayload {
  badgeType: BadgeType;
  title: string;
  description?: string;
  points?: number;
}

interface AlumniPayload {
  studentId?: string;
  fullName?: string;
  graduationYear: number;
  outcomeType: AlumniOutcomeType;
  organization?: string;
  country?: string;
  isVerified?: boolean;
}

interface ExternalGradeRow {
  registrationNumber: string;
  subjectName: string;
  semester: Semester;
  sequence?: Sequence;
  score: number;
  maxScore?: number;
  comment?: string;
}

interface ExternalSyncPayload {
  schoolId?: string;
  source: string;
  teacherId?: string;
  rows: ExternalGradeRow[];
}

function normalize(score: number, maxScore: number) {
  return (score / maxScore) * 20;
}

function average(values: number[]) {
  if (!values.length) {
    return 0;
  }

  return values.reduce((acc, value) => acc + value, 0) / values.length;
}

function cleanString(value?: string | null) {
  if (!value) {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function startOfWeek(input: Date) {
  const value = new Date(input);
  value.setHours(0, 0, 0, 0);

  const day = value.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  value.setDate(value.getDate() + diff);

  return value;
}

export class GuidanceService {
  private async assertStudentAccess(studentId: string, actor: Express.AuthUser) {
    const student = await prisma.student.findUnique({
      where: { id: studentId },
      include: {
        class: {
          select: {
            id: true,
            name: true,
            room: true,
            academicYear: true
          }
        },
        school: {
          select: {
            id: true,
            type: true
          }
        }
      }
    });

    if (!student) {
      throw new AppError(404, "Apprenant introuvable");
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
          parentUserId: actor.id,
          studentId
        }
      });

      if (!link) {
        throw new AppError(403, "Acces interdit");
      }

      return student;
    }

    throw new AppError(403, "Acces interdit");
  }

  private ensureSupervisor(actor: Express.AuthUser) {
    if (!(actor.role === Role.SUPER_ADMIN || isSchoolAdminRole(actor.role) || actor.role === Role.TEACHER)) {
      throw new AppError(403, "Action reservee aux encadrants");
    }
  }

  private async remediationFromGrades(studentId: string) {
    const grades = await prisma.grade.findMany({
      where: { studentId },
      include: {
        subject: {
          select: {
            id: true,
            name: true,
            isCore: true
          }
        }
      }
    });

    const bySubject = new Map<string, { name: string; isCore: boolean; values: number[] }>();

    for (const grade of grades) {
      if (!bySubject.has(grade.subjectId)) {
        bySubject.set(grade.subjectId, {
          name: grade.subject.name,
          isCore: grade.subject.isCore,
          values: []
        });
      }

      bySubject.get(grade.subjectId)?.values.push(normalize(grade.score, grade.maxScore));
    }

    const weakSubjects = Array.from(bySubject.values())
      .map((item) => ({
        subjectName: item.name,
        isCore: item.isCore,
        average: Number(average(item.values).toFixed(2))
      }))
      .filter((item) => item.average < 10)
      .sort((a, b) => a.average - b.average);

    return weakSubjects.map((item) => ({
      ...item,
      recommendation: item.isCore
        ? `Plan de remediation prioritaire en ${item.subjectName}: 3 sessions guidees/semaine + evaluation formative.`
        : `Consolider ${item.subjectName} avec 2 exercices pratiques/semaine et mentoring cible.`
    }));
  }

  private async createAcademicAlert(params: {
    schoolId: string;
    studentId: string;
    severity: AlertSeverity;
    category: string;
    title: string;
    message: string;
  }) {
    await prisma.studentAlert.create({
      data: {
        schoolId: params.schoolId,
        studentId: params.studentId,
        severity: params.severity,
        category: params.category,
        title: params.title,
        message: params.message
      }
    });
  }

  async studentHub(studentId: string, actor: Express.AuthUser) {
    const student = await this.assertStudentAccess(studentId, actor);
    const now = new Date();
    const thirtyDaysAgo = new Date(now);
    thirtyDaysAgo.setDate(now.getDate() - 30);

    const [
      plans,
      alerts,
      competencies,
      attendance,
      incidents,
      internships,
      mentorship,
      journal,
      portfolio,
      wellbeing,
      badges,
      matches,
      remediation,
      orientation
    ] = await Promise.all([
      prisma.studentPlan.findMany({
        where: { studentId },
        include: {
          tasks: {
            orderBy: [{ status: "asc" }, { dueDate: "asc" }]
          },
          collaborators: {
            include: {
              user: {
                select: {
                  id: true,
                  fullName: true,
                  role: true
                }
              }
            }
          }
        },
        orderBy: [{ status: "asc" }, { dueDate: "asc" }]
      }),
      prisma.studentAlert.findMany({
        where: { studentId },
        orderBy: [{ isRead: "asc" }, { severity: "desc" }, { createdAt: "desc" }],
        take: 30
      }),
      prisma.competencyAssessment.findMany({
        where: { studentId },
        orderBy: [{ assessedAt: "desc" }],
        take: 40
      }),
      prisma.attendanceRecord.findMany({
        where: {
          studentId,
          date: {
            gte: thirtyDaysAgo
          }
        },
        orderBy: [{ date: "desc" }]
      }),
      prisma.behaviorIncident.findMany({
        where: {
          studentId,
          occurredAt: {
            gte: thirtyDaysAgo
          }
        },
        orderBy: [{ occurredAt: "desc" }]
      }),
      prisma.internshipApplication.findMany({
        where: { studentId },
        orderBy: [{ updatedAt: "desc" }]
      }),
      prisma.mentorshipSession.findMany({
        where: { studentId },
        orderBy: [{ scheduledAt: "desc" }]
      }),
      prisma.weeklyJournalEntry.findMany({
        where: { studentId },
        orderBy: [{ weekStart: "desc" }],
        take: 16
      }),
      prisma.portfolioItem.findMany({
        where: { studentId },
        orderBy: [{ createdAt: "desc" }],
        take: 20
      }),
      prisma.wellbeingCheckin.findMany({
        where: { studentId },
        orderBy: [{ createdAt: "desc" }],
        take: 12
      }),
      prisma.studentBadge.findMany({
        where: { studentId },
        orderBy: [{ awardedAt: "desc" }]
      }),
      prisma.studentOpportunity.findMany({
        where: { studentId },
        include: {
          opportunity: true
        },
        orderBy: [{ matchScore: "desc" }],
        take: 12
      }),
      this.remediationFromGrades(studentId),
      prisma.orientationProfile.findUnique({ where: { studentId } })
    ]);

    const latestWellbeing = wellbeing[0] ?? null;
    const attendanceSummary = {
      present: attendance.filter((item) => item.status === AttendanceStatus.PRESENT).length,
      absent: attendance.filter((item) => item.status === AttendanceStatus.ABSENT).length,
      late: attendance.filter((item) => item.status === AttendanceStatus.RETARD).length
    };

    const weeklyTips = [
      ...(remediation.slice(0, 2).map((item) => `Priorite: ${item.recommendation}`) || []),
      attendanceSummary.absent > 0
        ? `Objectif presence: reduire les absences (${attendanceSummary.absent} ce mois) avec suivi parent-enseignant.`
        : "Presence stable: maintenir la regularite hebdomadaire.",
      latestWellbeing && (latestWellbeing.stress >= 4 || latestWellbeing.mood <= 2)
        ? "Bien-etre: planifier un entretien mentorat et ajuster la charge de travail."
        : "Bien-etre: conserver un rythme equilibre (sommeil, revision, pause).",
      orientation?.recommendedStream
        ? `Orientation: explorer au moins 2 opportunites liees a la filiere ${orientation.recommendedStream}.`
        : "Orientation: finaliser un mini-bilan de competences pour affiner la filiere."
    ];

    return {
      student,
      indicators: {
        attendanceSummary,
        incidentsCount: incidents.length,
        openAlerts: alerts.filter((item) => !item.isRead).length,
        wellbeing: latestWellbeing
      },
      plans,
      alerts,
      competencies,
      attendance,
      incidents,
      remediation,
      opportunities: matches,
      internships,
      mentorship,
      journal,
      portfolio,
      wellbeing,
      badges,
      weeklyTips
    };
  }

  async remediation(studentId: string, actor: Express.AuthUser) {
    await this.assertStudentAccess(studentId, actor);
    return this.remediationFromGrades(studentId);
  }

  async addPlanTask(planId: string, payload: PlanTaskPayload, actor: Express.AuthUser) {
    const plan = await prisma.studentPlan.findUnique({
      where: { id: planId }
    });

    if (!plan) {
      throw new AppError(404, "Plan introuvable");
    }

    await this.assertStudentAccess(plan.studentId, actor);

    if (payload.assignedToUserId) {
      const assigned = await prisma.user.findUnique({
        where: { id: payload.assignedToUserId }
      });

      if (!assigned || (assigned.schoolId && assigned.schoolId !== plan.schoolId)) {
        throw new AppError(400, "Utilisateur assigne invalide");
      }
    }

    return prisma.planTask.create({
      data: {
        planId,
        title: payload.title.trim(),
        description: cleanString(payload.description),
        status: payload.status ?? PlanStatus.A_FAIRE,
        dueDate: payload.dueDate ? new Date(payload.dueDate) : null,
        assignedToUserId: payload.assignedToUserId
      }
    });
  }

  async updatePlanTask(taskId: string, payload: PlanTaskUpdatePayload, actor: Express.AuthUser) {
    const task = await prisma.planTask.findUnique({
      where: { id: taskId },
      include: {
        plan: true
      }
    });

    if (!task) {
      throw new AppError(404, "Tache introuvable");
    }

    await this.assertStudentAccess(task.plan.studentId, actor);

    if (payload.assignedToUserId) {
      const assigned = await prisma.user.findUnique({
        where: { id: payload.assignedToUserId }
      });

      if (!assigned || (assigned.schoolId && assigned.schoolId !== task.plan.schoolId)) {
        throw new AppError(400, "Utilisateur assigne invalide");
      }
    }

    return prisma.planTask.update({
      where: { id: taskId },
      data: {
        ...(payload.title !== undefined ? { title: payload.title.trim() } : {}),
        ...(payload.description !== undefined ? { description: cleanString(payload.description) } : {}),
        ...(payload.status ? { status: payload.status } : {}),
        ...(payload.dueDate !== undefined ? { dueDate: payload.dueDate ? new Date(payload.dueDate) : null } : {}),
        ...(payload.assignedToUserId !== undefined ? { assignedToUserId: payload.assignedToUserId } : {}),
        ...(payload.status === PlanStatus.TERMINE ? { completedAt: new Date() } : {})
      }
    });
  }

  async addPlanCollaborator(planId: string, payload: PlanCollaboratorPayload, actor: Express.AuthUser) {
    this.ensureSupervisor(actor);

    const plan = await prisma.studentPlan.findUnique({
      where: { id: planId }
    });

    if (!plan) {
      throw new AppError(404, "Plan introuvable");
    }

    await this.assertStudentAccess(plan.studentId, actor);

    const user = await prisma.user.findUnique({
      where: { id: payload.userId }
    });

    if (!user || (user.schoolId && user.schoolId !== plan.schoolId)) {
      throw new AppError(400, "Collaborateur invalide");
    }

    return prisma.planCollaborator.upsert({
      where: {
        planId_userId: {
          planId,
          userId: payload.userId
        }
      },
      create: {
        planId,
        userId: payload.userId,
        roleLabel: payload.roleLabel.trim()
      },
      update: {
        roleLabel: payload.roleLabel.trim()
      }
    });
  }

  async addAttendance(studentId: string, payload: AttendancePayload, actor: Express.AuthUser) {
    this.ensureSupervisor(actor);
    const student = await this.assertStudentAccess(studentId, actor);

    const record = await prisma.attendanceRecord.create({
      data: {
        schoolId: student.schoolId,
        studentId,
        date: payload.date ? new Date(payload.date) : new Date(),
        status: payload.status,
        note: cleanString(payload.note)
      }
    });

    if (payload.status === AttendanceStatus.ABSENT || payload.status === AttendanceStatus.RETARD) {
      await this.createAcademicAlert({
        schoolId: student.schoolId,
        studentId,
        severity: payload.status === AttendanceStatus.ABSENT ? AlertSeverity.ATTENTION : AlertSeverity.INFO,
        category: "ASSIDUITE",
        title: payload.status === AttendanceStatus.ABSENT ? "Absence detectee" : "Retard detecte",
        message:
          payload.status === AttendanceStatus.ABSENT
            ? "Une absence a ete enregistree. Un suivi parent-enseignant est recommande."
            : "Un retard a ete enregistre. Pensez a regulariser la ponctualite."
      });
    }

    return record;
  }

  async addBehaviorIncident(studentId: string, payload: BehaviorPayload, actor: Express.AuthUser) {
    this.ensureSupervisor(actor);
    const student = await this.assertStudentAccess(studentId, actor);

    const incident = await prisma.behaviorIncident.create({
      data: {
        schoolId: student.schoolId,
        studentId,
        reportedByUserId: actor.id,
        category: payload.category.trim(),
        severity: payload.severity,
        description: payload.description.trim(),
        occurredAt: payload.occurredAt ? new Date(payload.occurredAt) : new Date()
      }
    });

    await this.createAcademicAlert({
      schoolId: student.schoolId,
      studentId,
      severity: payload.severity,
      category: "COMPORTEMENT",
      title: "Incident comportemental signale",
      message: payload.description.trim()
    });

    return incident;
  }

  async addCompetency(studentId: string, payload: CompetencyPayload, actor: Express.AuthUser) {
    this.ensureSupervisor(actor);
    const student = await this.assertStudentAccess(studentId, actor);

    if (payload.score < 0 || payload.score > 100) {
      throw new AppError(400, "Le score de competence doit etre entre 0 et 100");
    }

    const competency = await prisma.competencyAssessment.create({
      data: {
        schoolId: student.schoolId,
        studentId,
        category: payload.category,
        label: payload.label.trim(),
        score: payload.score,
        comment: cleanString(payload.comment),
        assessedByUserId: actor.id
      }
    });

    if (payload.score < 45) {
      await this.createAcademicAlert({
        schoolId: student.schoolId,
        studentId,
        severity: AlertSeverity.ATTENTION,
        category: "COMPETENCE",
        title: `Competence fragile: ${payload.label.trim()}`,
        message: "Un plan de progression cible est recommande sur cette competence."
      });
    }

    return competency;
  }

  async createOpportunity(payload: OpportunityPayload, actor: Express.AuthUser) {
    this.ensureSupervisor(actor);

    const scopedSchoolId =
      actor.role === Role.SUPER_ADMIN
        ? payload.schoolId ?? null
        : ensureSchoolScope(actor, payload.schoolId ?? actor.schoolId);

    return prisma.opportunity.create({
      data: {
        schoolId: scopedSchoolId,
        title: payload.title.trim(),
        description: payload.description.trim(),
        type: payload.type,
        targetStream: payload.targetStream,
        targetLevel: payload.targetLevel,
        targetProfile: payload.targetProfile,
        targetSchoolType: payload.targetSchoolType,
        location: cleanString(payload.location),
        applicationUrl: cleanString(payload.applicationUrl),
        deadline: payload.deadline ? new Date(payload.deadline) : null,
        tags: cleanString(payload.tags),
        createdByUserId: actor.id
      }
    });
  }

  async matchOpportunities(studentId: string, actor: Express.AuthUser) {
    const student = await this.assertStudentAccess(studentId, actor);
    const remediation = await this.remediationFromGrades(studentId);

    const opportunities = await prisma.opportunity.findMany({
      where: {
        isActive: true,
        OR: [{ schoolId: null }, { schoolId: student.schoolId }]
      },
      orderBy: [{ deadline: "asc" }, { createdAt: "desc" }]
    });

    const orientation = await prisma.orientationProfile.findUnique({
      where: { studentId }
    });

    const computedMatches = opportunities
      .map((opportunity) => {
        let score = 25;
        const reasons: string[] = [];

        if (opportunity.targetProfile && opportunity.targetProfile === student.profileType) {
          score += 20;
          reasons.push("profil correspondant");
        }

        if (opportunity.targetLevel && opportunity.targetLevel === student.level) {
          score += 20;
          reasons.push("niveau correspondant");
        }

        if (opportunity.targetStream && opportunity.targetStream === student.stream) {
          score += 25;
          reasons.push("filiere correspondante");
        }

        if (!opportunity.targetStream && orientation?.recommendedStream && orientation.recommendedStream === student.stream) {
          score += 10;
          reasons.push("alignement avec orientation");
        }

        const tags = (opportunity.tags || "").toLowerCase();
        const dreamCareer = (student.dreamCareer || "").toLowerCase();
        if (dreamCareer && (opportunity.title.toLowerCase().includes(dreamCareer) || tags.includes(dreamCareer))) {
          score += 15;
          reasons.push("proche du metier de reve");
        }

        if (remediation.length > 0 && opportunity.type === OpportunityType.PROGRAMME) {
          score += 8;
          reasons.push("utile pour plan de progression");
        }

        return {
          opportunity,
          matchScore: Math.min(100, score),
          rationale: reasons.length > 0 ? reasons.join(", ") : "pertinence generale du profil"
        };
      })
      .filter((item) => item.matchScore >= 35)
      .sort((a, b) => b.matchScore - a.matchScore);

    for (const item of computedMatches) {
      await prisma.studentOpportunity.upsert({
        where: {
          studentId_opportunityId: {
            studentId,
            opportunityId: item.opportunity.id
          }
        },
        create: {
          studentId,
          opportunityId: item.opportunity.id,
          matchScore: item.matchScore,
          rationale: item.rationale
        },
        update: {
          matchScore: item.matchScore,
          rationale: item.rationale
        }
      });
    }

    return prisma.studentOpportunity.findMany({
      where: { studentId },
      include: { opportunity: true },
      orderBy: [{ matchScore: "desc" }, { createdAt: "desc" }],
      take: 20
    });
  }

  async addInternship(studentId: string, payload: InternshipPayload, actor: Express.AuthUser) {
    const student = await this.assertStudentAccess(studentId, actor);

    return prisma.internshipApplication.create({
      data: {
        schoolId: student.schoolId,
        studentId,
        type: payload.type,
        title: payload.title.trim(),
        organization: payload.organization.trim(),
        status: payload.status ?? ApplicationStatus.EN_COURS,
        notes: cleanString(payload.notes)
      }
    });
  }

  async addMentorshipSession(studentId: string, payload: MentorshipPayload, actor: Express.AuthUser) {
    const student = await this.assertStudentAccess(studentId, actor);

    if (payload.mentorUserId) {
      const mentor = await prisma.user.findUnique({ where: { id: payload.mentorUserId } });
      if (!mentor) {
        throw new AppError(400, "Mentor introuvable");
      }
    }

    return prisma.mentorshipSession.create({
      data: {
        schoolId: student.schoolId,
        studentId,
        mentorUserId: payload.mentorUserId,
        mentorName: payload.mentorName.trim(),
        topic: payload.topic.trim(),
        meetingLink: cleanString(payload.meetingLink),
        notes: cleanString(payload.notes),
        scheduledAt: new Date(payload.scheduledAt),
        status: payload.status ?? SessionStatus.PLANIFIEE
      }
    });
  }

  async addJournalEntry(studentId: string, payload: JournalPayload, actor: Express.AuthUser) {
    const student = await this.assertStudentAccess(studentId, actor);
    const weekStart = startOfWeek(new Date(payload.weekStart));

    return prisma.weeklyJournalEntry.upsert({
      where: {
        studentId_weekStart: {
          studentId,
          weekStart
        }
      },
      create: {
        schoolId: student.schoolId,
        studentId,
        weekStart,
        summary: payload.summary.trim(),
        parentNote: cleanString(payload.parentNote),
        teacherNote: cleanString(payload.teacherNote),
        tips: cleanString(payload.tips),
        createdByUserId: actor.id
      },
      update: {
        summary: payload.summary.trim(),
        parentNote: cleanString(payload.parentNote),
        teacherNote: cleanString(payload.teacherNote),
        tips: cleanString(payload.tips),
        createdByUserId: actor.id
      }
    });
  }

  async addPortfolioItem(studentId: string, payload: PortfolioPayload, actor: Express.AuthUser) {
    const student = await this.assertStudentAccess(studentId, actor);

    return prisma.portfolioItem.create({
      data: {
        schoolId: student.schoolId,
        studentId,
        title: payload.title.trim(),
        description: cleanString(payload.description),
        category: payload.category,
        url: cleanString(payload.url),
        evidence: cleanString(payload.evidence),
        awardedAt: payload.awardedAt ? new Date(payload.awardedAt) : null
      }
    });
  }

  async addWellbeingCheckin(studentId: string, payload: WellbeingPayload, actor: Express.AuthUser) {
    const student = await this.assertStudentAccess(studentId, actor);

    if (
      payload.mood < 1 ||
      payload.mood > 5 ||
      payload.stress < 1 ||
      payload.stress > 5 ||
      payload.energy < 1 ||
      payload.energy > 5
    ) {
      throw new AppError(400, "Les indicateurs bien-etre doivent etre compris entre 1 et 5");
    }

    const checkin = await prisma.wellbeingCheckin.create({
      data: {
        schoolId: student.schoolId,
        studentId,
        mood: payload.mood,
        stress: payload.stress,
        energy: payload.energy,
        comment: cleanString(payload.comment)
      }
    });

    if (payload.stress >= 4 || payload.mood <= 2) {
      await this.createAcademicAlert({
        schoolId: student.schoolId,
        studentId,
        severity: payload.stress >= 5 || payload.mood === 1 ? AlertSeverity.CRITIQUE : AlertSeverity.ATTENTION,
        category: "BIEN_ETRE",
        title: "Signal bien-etre a surveiller",
        message: "Un accompagnement bien-etre est recommande (stress/moral detecte)."
      });
    }

    return checkin;
  }

  async awardBadge(studentId: string, payload: BadgePayload, actor: Express.AuthUser) {
    this.ensureSupervisor(actor);
    const student = await this.assertStudentAccess(studentId, actor);

    return prisma.studentBadge.create({
      data: {
        schoolId: student.schoolId,
        studentId,
        badgeType: payload.badgeType,
        title: payload.title.trim(),
        description: cleanString(payload.description),
        points: payload.points ?? 0,
        awardedByUserId: actor.id
      }
    });
  }

  async createAlumniOutcome(schoolId: string, payload: AlumniPayload, actor: Express.AuthUser) {
    this.ensureSupervisor(actor);
    const scopedSchoolId = ensureSchoolScope(actor, schoolId);

    let fullName = payload.fullName?.trim();

    if (payload.studentId) {
      const student = await prisma.student.findUnique({
        where: { id: payload.studentId },
        select: {
          id: true,
          schoolId: true,
          fullName: true
        }
      });

      if (!student || student.schoolId !== scopedSchoolId) {
        throw new AppError(400, "studentId invalide pour cet etablissement");
      }

      fullName = fullName || student.fullName;
    }

    if (!fullName) {
      throw new AppError(400, "fullName est requis");
    }

    return prisma.alumniOutcome.create({
      data: {
        schoolId: scopedSchoolId,
        studentId: payload.studentId,
        fullName,
        graduationYear: payload.graduationYear,
        outcomeType: payload.outcomeType,
        organization: cleanString(payload.organization),
        country: cleanString(payload.country),
        isVerified: payload.isVerified ?? false
      }
    });
  }

  async schoolAlumniStats(schoolId: string, actor: Express.AuthUser) {
    const scopedSchoolId = ensureSchoolScope(actor, schoolId);

    const outcomes = await prisma.alumniOutcome.findMany({
      where: {
        schoolId: scopedSchoolId
      },
      orderBy: [{ graduationYear: "desc" }, { trackedAt: "desc" }]
    });

    const byType = outcomes.reduce<Record<string, number>>((acc, item) => {
      acc[item.outcomeType] = (acc[item.outcomeType] ?? 0) + 1;
      return acc;
    }, {});

    const byYear = outcomes.reduce<Record<string, number>>((acc, item) => {
      const key = String(item.graduationYear);
      acc[key] = (acc[key] ?? 0) + 1;
      return acc;
    }, {});

    return {
      total: outcomes.length,
      verified: outcomes.filter((item) => item.isVerified).length,
      byType,
      byYear,
      latest: outcomes.slice(0, 15)
    };
  }

  async syncExternalGrades(payload: ExternalSyncPayload, actor: Express.AuthUser) {
    if (!(actor.role === Role.SUPER_ADMIN || isSchoolAdminRole(actor.role) || actor.role === Role.TEACHER)) {
      throw new AppError(403, "Acces interdit");
    }

    if (!payload.rows.length) {
      throw new AppError(400, "Aucune ligne a synchroniser");
    }

    const schoolId = ensureSchoolScope(actor, payload.schoolId);
    const importBatchId = `EXT-${randomUUID()}`;
    const errors: Array<{ row: number; message: string }> = [];
    let created = 0;
    const affectedClassSemesters = new Set<string>();

    let teacherId = payload.teacherId;

    if (actor.role === Role.TEACHER) {
      const teacher = await prisma.teacher.findFirst({
        where: {
          userId: actor.id,
          schoolId
        },
        select: { id: true }
      });

      if (!teacher) {
        throw new AppError(403, "Profil enseignant introuvable");
      }

      teacherId = teacher.id;
    } else if (!teacherId) {
      throw new AppError(400, "teacherId est requis pour cette synchronisation");
    }

    const teacher = await prisma.teacher.findUnique({
      where: { id: teacherId }
    });

    if (!teacher || teacher.schoolId !== schoolId) {
      throw new AppError(400, "teacherId invalide");
    }

    for (let index = 0; index < payload.rows.length; index += 1) {
      const row = payload.rows[index];

      try {
        const student = await prisma.student.findFirst({
          where: {
            schoolId,
            registrationNumber: row.registrationNumber.toUpperCase(),
            isActive: true
          },
          select: {
            id: true,
            classId: true
          }
        });

        if (!student || !student.classId) {
          throw new AppError(400, "Apprenant introuvable ou sans classe");
        }

        const subject = await prisma.subject.findFirst({
          where: {
            schoolId,
            name: {
              equals: row.subjectName,
              mode: "insensitive"
            }
          },
          select: {
            id: true
          }
        });

        if (!subject) {
          throw new AppError(400, `Matiere introuvable: ${row.subjectName}`);
        }

        const maxScore = row.maxScore ?? 20;

        if (row.score < 0 || row.score > maxScore) {
          throw new AppError(400, `Note invalide (${row.score}/${maxScore})`);
        }

        await prisma.grade.create({
          data: {
            schoolId,
            studentId: student.id,
            classId: student.classId,
            subjectId: subject.id,
            teacherId: teacher.id,
            semester: row.semester,
            sequence: row.sequence ?? Sequence.SEQUENCE_1,
            score: row.score,
            maxScore,
            comment: cleanString(row.comment),
            importBatchId
          }
        });

        created += 1;
        affectedClassSemesters.add(`${student.classId}_${row.semester}`);
      } catch (error) {
        errors.push({
          row: index + 1,
          message: error instanceof Error ? error.message : "Erreur inconnue"
        });
      }
    }

    for (const pair of affectedClassSemesters) {
      const [classId, semester] = pair.split("_");
      await gradeService.recomputeClassSemester(schoolId, classId, semester as Semester);
    }

    await prisma.externalSyncLog.create({
      data: {
        schoolId,
        source: payload.source.trim(),
        action: "GRADES_IMPORT",
        payloadHash: importBatchId,
        status: errors.length === payload.rows.length ? SyncStatus.FAILED : SyncStatus.SUCCESS,
        message: `Lignes creees: ${created}, erreurs: ${errors.length}`
      }
    });

    return {
      importBatchId,
      createdCount: created,
      errorCount: errors.length,
      errors
    };
  }
}

export const guidanceService = new GuidanceService();
