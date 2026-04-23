import { Role, Semester, Sequence } from "@prisma/client";
import { randomUUID } from "crypto";

import { prisma } from "../lib/prisma";
import { computeResultStatus } from "../utils/analytics";
import { AppError } from "../utils/app-error";
import { parseImportFile } from "../utils/import";
import { ensureSchoolScope, isSchoolAdminRole } from "../utils/tenant";
import { orientationService } from "./orientation.service";

interface AddGradePayload {
  schoolId?: string;
  studentId: string;
  classId: string;
  subjectId: string;
  semester: Semester;
  sequence?: Sequence;
  score: number;
  maxScore?: number;
  comment?: string;
  teacherId?: string;
}

interface UpdateGradePayload {
  semester?: Semester;
  sequence?: Sequence;
  score?: number;
  maxScore?: number;
  comment?: string;
}

interface ImportPayload {
  schoolId?: string;
  teacherId?: string;
}

interface GradeFilter {
  schoolId?: string;
  classId?: string;
  studentId?: string;
  subjectId?: string;
  semester?: Semester;
  sequence?: Sequence;
}

function normalizeScore(score: number, maxScore: number) {
  return (score / maxScore) * 20;
}

function assertCanWriteGrades(actor: Express.AuthUser) {
  if (!(actor.role === Role.SUPER_ADMIN || isSchoolAdminRole(actor.role) || actor.role === Role.TEACHER)) {
    throw new AppError(403, "Acces interdit");
  }
}

export class GradeService {
  private async resolveTeacherId(actor: Express.AuthUser, schoolId: string, teacherId?: string) {
    if (actor.role === Role.TEACHER) {
      const teacher = await prisma.teacher.findFirst({
        where: {
          userId: actor.id,
          schoolId
        }
      });

      if (!teacher) {
        throw new AppError(403, "Profil enseignant introuvable");
      }

      return teacher.id;
    }

    if (teacherId) {
      const teacher = await prisma.teacher.findUnique({ where: { id: teacherId } });

      if (!teacher || teacher.schoolId !== schoolId) {
        throw new AppError(400, "teacherId invalide pour cet etablissement");
      }

      return teacher.id;
    }

    throw new AppError(400, "teacherId est requis pour ce role");
  }

  private async assertAssignment(teacherId: string, classId: string, subjectId: string) {
    const assignment = await prisma.teacherClassSubject.findUnique({
      where: {
        teacherId_classId_subjectId: {
          teacherId,
          classId,
          subjectId
        }
      }
    });

    if (!assignment) {
      throw new AppError(
        403,
        "L enseignant n est pas assigne a cette classe/discpline. Faites une affectation avant la saisie"
      );
    }
  }

  async add(payload: AddGradePayload, actor: Express.AuthUser) {
    assertCanWriteGrades(actor);

    const schoolId = ensureSchoolScope(actor, payload.schoolId);
    const teacherId = await this.resolveTeacherId(actor, schoolId, payload.teacherId);

    const [student, classEntity, subject] = await Promise.all([
      prisma.student.findUnique({ where: { id: payload.studentId } }),
      prisma.class.findUnique({ where: { id: payload.classId } }),
      prisma.subject.findUnique({ where: { id: payload.subjectId } })
    ]);

    if (!student || !classEntity || !subject) {
      throw new AppError(404, "Student/Class/Subject introuvable");
    }

    if (student.schoolId !== schoolId || classEntity.schoolId !== schoolId || subject.schoolId !== schoolId) {
      throw new AppError(403, "Saisie hors perimetre de votre etablissement");
    }

    if (student.classId && student.classId !== classEntity.id) {
      throw new AppError(400, "La classe saisie ne correspond pas a la classe rattachee a l eleve");
    }

    if (actor.role === Role.TEACHER) {
      await this.assertAssignment(teacherId, classEntity.id, subject.id);
    }

    const maxScore = payload.maxScore ?? 20;

    if (payload.score < 0 || payload.score > maxScore) {
      throw new AppError(400, `La note doit etre comprise entre 0 et ${maxScore}`);
    }

    const grade = await prisma.grade.create({
      data: {
        schoolId,
        teacherId,
        studentId: student.id,
        classId: classEntity.id,
        subjectId: subject.id,
        semester: payload.semester,
        sequence: payload.sequence ?? Sequence.SEQUENCE_1,
        score: payload.score,
        maxScore,
        comment: payload.comment?.trim() || null
      },
      include: {
        student: true,
        subject: true,
        class: true,
        teacher: true
      }
    });

    await this.recomputeClassSemester(schoolId, classEntity.id, payload.semester);

    return grade;
  }

  async update(id: string, payload: UpdateGradePayload, actor: Express.AuthUser) {
    assertCanWriteGrades(actor);

    const grade = await prisma.grade.findUnique({
      where: { id },
      include: {
        student: true,
        class: true,
        subject: true
      }
    });

    if (!grade) {
      throw new AppError(404, "Note introuvable");
    }

    const schoolId = ensureSchoolScope(actor, grade.schoolId);

    if (actor.role === Role.TEACHER) {
      const actorTeacherId = await this.resolveTeacherId(actor, schoolId);

      if (grade.teacherId !== actorTeacherId) {
        throw new AppError(403, "Vous ne pouvez modifier que vos propres notes");
      }

      await this.assertAssignment(actorTeacherId, grade.classId, grade.subjectId);
    }

    const nextMaxScore = payload.maxScore ?? grade.maxScore;
    const nextScore = payload.score ?? grade.score;

    if (nextScore < 0 || nextScore > nextMaxScore) {
      throw new AppError(400, `La note doit etre comprise entre 0 et ${nextMaxScore}`);
    }

    const updated = await prisma.grade.update({
      where: { id },
      data: {
        ...(payload.semester ? { semester: payload.semester } : {}),
        ...(payload.sequence ? { sequence: payload.sequence } : {}),
        ...(payload.score !== undefined ? { score: payload.score } : {}),
        ...(payload.maxScore !== undefined ? { maxScore: payload.maxScore } : {}),
        ...(payload.comment !== undefined ? { comment: payload.comment || null } : {})
      },
      include: {
        student: {
          select: { id: true, fullName: true, registrationNumber: true }
        },
        subject: {
          select: { id: true, name: true, coefficient: true }
        },
        class: {
          select: { id: true, name: true, room: true }
        },
        teacher: {
          select: { id: true, fullName: true }
        }
      }
    });

    await this.recomputeClassSemester(schoolId, grade.classId, grade.semester);

    if (payload.semester && payload.semester !== grade.semester) {
      await this.recomputeClassSemester(schoolId, grade.classId, payload.semester);
    }

    return updated;
  }

  async import(fileBuffer: Buffer, mimetype: string, payload: ImportPayload, actor: Express.AuthUser) {
    assertCanWriteGrades(actor);

    const schoolId = ensureSchoolScope(actor, payload.schoolId);
    const teacherId = await this.resolveTeacherId(actor, schoolId, payload.teacherId);

    const rows = parseImportFile(fileBuffer, mimetype);
    const errors: Array<{ row: number; message: string }> = [];
    const affectedPairs = new Set<string>();
    const importBatchId = randomUUID();
    let createdCount = 0;

    for (let index = 0; index < rows.length; index += 1) {
      const row = rows[index];

      try {
        const student = await prisma.student.findFirst({
          where: {
            schoolId,
            registrationNumber: row.registrationNumber,
            isActive: true
          }
        });

        if (!student) {
          throw new AppError(404, `Eleve introuvable: ${row.registrationNumber}`);
        }

        const classId = student.classId;

        if (!classId) {
          throw new AppError(400, `Eleve sans classe: ${student.registrationNumber}`);
        }

        const subject = await prisma.subject.findFirst({
          where: {
            schoolId,
            name: {
              equals: row.subjectName,
              mode: "insensitive"
            }
          }
        });

        if (!subject) {
          throw new AppError(404, `Matiere introuvable: ${row.subjectName}`);
        }

        if (actor.role === Role.TEACHER) {
          await this.assertAssignment(teacherId, classId, subject.id);
        }

        await prisma.grade.create({
          data: {
            schoolId,
            teacherId,
            studentId: student.id,
            classId,
            subjectId: subject.id,
            semester: row.semester,
            sequence: row.sequence,
            score: row.score,
            maxScore: 20,
            comment: row.comment,
            importBatchId
          }
        });

        createdCount += 1;
        affectedPairs.add(`${classId}_${row.semester}`);
      } catch (error) {
        const message = error instanceof Error ? error.message : "Erreur inconnue";
        errors.push({ row: index + 1, message });
      }
    }

    for (const pair of affectedPairs) {
      const [classId, semester] = pair.split("_");
      await this.recomputeClassSemester(schoolId, classId, semester as Semester);
    }

    return {
      createdCount,
      errorCount: errors.length,
      errors,
      importBatchId
    };
  }

  async list(actor: Express.AuthUser, filters: GradeFilter) {
    const include = {
      student: {
        select: { id: true, fullName: true, registrationNumber: true }
      },
      subject: {
        select: { id: true, name: true, coefficient: true }
      },
      class: {
        select: { id: true, name: true, room: true }
      },
      teacher: {
        select: { id: true, fullName: true }
      }
    };

    if (actor.role === Role.STUDENT || actor.role === Role.UNIVERSITY_STUDENT) {
      const student = await prisma.student.findFirst({
        where: {
          userId: actor.id,
          isActive: true
        },
        select: { id: true }
      });

      if (!student) {
        return [];
      }

      return prisma.grade.findMany({
        where: {
          studentId: student.id,
          ...(filters.semester ? { semester: filters.semester } : {}),
          ...(filters.sequence ? { sequence: filters.sequence } : {}),
          ...(filters.subjectId ? { subjectId: filters.subjectId } : {})
        },
        include,
        orderBy: { recordedAt: "desc" }
      });
    }

    if (actor.role === Role.PARENT) {
      const links = await prisma.parentStudent.findMany({
        where: { parentUserId: actor.id },
        select: { studentId: true }
      });

      const studentIds = links.map((item) => item.studentId);

      if (!studentIds.length) {
        return [];
      }

      return prisma.grade.findMany({
        where: {
          studentId: {
            in: studentIds
          },
          ...(filters.semester ? { semester: filters.semester } : {}),
          ...(filters.sequence ? { sequence: filters.sequence } : {}),
          ...(filters.subjectId ? { subjectId: filters.subjectId } : {})
        },
        include,
        orderBy: { recordedAt: "desc" }
      });
    }

    const schoolId = ensureSchoolScope(actor, filters.schoolId);

    if (actor.role === Role.TEACHER) {
      const teacherId = await this.resolveTeacherId(actor, schoolId);

      return prisma.grade.findMany({
        where: {
          schoolId,
          teacherId,
          ...(filters.classId ? { classId: filters.classId } : {}),
          ...(filters.studentId ? { studentId: filters.studentId } : {}),
          ...(filters.subjectId ? { subjectId: filters.subjectId } : {}),
          ...(filters.semester ? { semester: filters.semester } : {}),
          ...(filters.sequence ? { sequence: filters.sequence } : {})
        },
        include,
        orderBy: { recordedAt: "desc" }
      });
    }

    return prisma.grade.findMany({
      where: {
        schoolId,
        ...(filters.classId ? { classId: filters.classId } : {}),
        ...(filters.studentId ? { studentId: filters.studentId } : {}),
        ...(filters.subjectId ? { subjectId: filters.subjectId } : {}),
        ...(filters.semester ? { semester: filters.semester } : {}),
        ...(filters.sequence ? { sequence: filters.sequence } : {})
      },
      include,
      orderBy: { recordedAt: "desc" }
    });
  }

  async recomputeClassSemester(schoolId: string, classId: string, semester: Semester) {
    const grades = await prisma.grade.findMany({
      where: {
        schoolId,
        classId,
        semester
      },
      include: {
        subject: {
          select: { id: true, name: true, coefficient: true, isCore: true }
        }
      }
    });

    if (!grades.length) {
      await prisma.result.deleteMany({ where: { schoolId, classId, semester } });
      return;
    }

    const byStudent = new Map<
      string,
      {
        bySubject: Map<string, { subjectName: string; coefficient: number; isCore: boolean; scores: number[] }>;
      }
    >();

    for (const grade of grades) {
      if (!byStudent.has(grade.studentId)) {
        byStudent.set(grade.studentId, { bySubject: new Map() });
      }

      const studentBucket = byStudent.get(grade.studentId);

      if (!studentBucket) {
        continue;
      }

      if (!studentBucket.bySubject.has(grade.subjectId)) {
        studentBucket.bySubject.set(grade.subjectId, {
          subjectName: grade.subject.name,
          coefficient: grade.subject.coefficient,
          isCore: grade.subject.isCore,
          scores: []
        });
      }

      const subjectBucket = studentBucket.bySubject.get(grade.subjectId);

      if (!subjectBucket) {
        continue;
      }

      subjectBucket.scores.push(normalizeScore(grade.score, grade.maxScore));
    }

    const rawResults: Array<{
      studentId: string;
      weightedAverage: number;
      totalCoefficient: number;
      status: ReturnType<typeof computeResultStatus>;
    }> = [];

    for (const [studentId, value] of byStudent.entries()) {
      let totalWeighted = 0;
      let totalCoefficient = 0;

      for (const subjectBucket of value.bySubject.values()) {
        const subjectAverage =
          subjectBucket.scores.reduce((acc, score) => acc + score, 0) / subjectBucket.scores.length;
        totalWeighted += subjectAverage * subjectBucket.coefficient;
        totalCoefficient += subjectBucket.coefficient;
      }

      const weightedAverage = totalCoefficient > 0 ? totalWeighted / totalCoefficient : 0;

      rawResults.push({
        studentId,
        weightedAverage: Number(weightedAverage.toFixed(2)),
        totalCoefficient: Number(totalCoefficient.toFixed(2)),
        status: computeResultStatus(weightedAverage)
      });
    }

    rawResults.sort((a, b) => b.weightedAverage - a.weightedAverage);

    let lastScore: number | null = null;
    let currentRank = 0;

    for (let index = 0; index < rawResults.length; index += 1) {
      const row = rawResults[index];

      if (lastScore === null || row.weightedAverage < lastScore) {
        currentRank = index + 1;
        lastScore = row.weightedAverage;
      }

      const previousSemester = semester === Semester.SEMESTER_2 ? Semester.SEMESTER_1 : null;
      let trend: number | null = null;

      if (previousSemester) {
        const previous = await prisma.result.findUnique({
          where: {
            studentId_classId_semester: {
              studentId: row.studentId,
              classId,
              semester: previousSemester
            }
          }
        });

        if (previous) {
          trend = Number((row.weightedAverage - previous.weightedAverage).toFixed(2));
        }
      }

      await prisma.result.upsert({
        where: {
          studentId_classId_semester: {
            studentId: row.studentId,
            classId,
            semester
          }
        },
        create: {
          schoolId,
          classId,
          studentId: row.studentId,
          semester,
          weightedAverage: row.weightedAverage,
          totalCoefficient: row.totalCoefficient,
          rank: currentRank,
          trend,
          status: row.status
        },
        update: {
          weightedAverage: row.weightedAverage,
          totalCoefficient: row.totalCoefficient,
          rank: currentRank,
          trend,
          status: row.status,
          computedAt: new Date()
        }
      });
    }

    await orientationService.recomputeMany(rawResults.map((result) => result.studentId));
  }
}

export const gradeService = new GradeService();
