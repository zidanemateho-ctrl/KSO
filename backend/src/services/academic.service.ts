import { Role, Stream, StudentLevel } from "@prisma/client";

import { prisma } from "../lib/prisma";
import { AppError } from "../utils/app-error";
import { hashPassword } from "../utils/password";
import { ensureSchoolScope, isSchoolAdminRole } from "../utils/tenant";

interface ClassPayload {
  schoolId?: string;
  name: string;
  room?: string;
  level: StudentLevel;
  stream: Stream;
  academicYear: string;
}

interface SubjectPayload {
  schoolId?: string;
  name: string;
  coefficient: number;
  isCore?: boolean;
}

interface TeacherPayload {
  schoolId?: string;
  fullName: string;
  employeeCode: string;
  speciality?: string;
  user?: {
    email: string;
    password: string;
  };
}

interface AssignmentPayload {
  schoolId?: string;
  teacherId: string;
  classId: string;
  subjectId: string;
}

function assertCanManageAcademic(actor: Express.AuthUser) {
  if (!(actor.role === Role.SUPER_ADMIN || isSchoolAdminRole(actor.role))) {
    throw new AppError(403, "Acces interdit");
  }
}

export class AcademicService {
  async createClass(payload: ClassPayload, actor: Express.AuthUser) {
    assertCanManageAcademic(actor);
    const schoolId = ensureSchoolScope(actor, payload.schoolId);

    return prisma.class.create({
      data: {
        schoolId,
        name: payload.name.trim(),
        room: payload.room?.trim() || null,
        level: payload.level,
        stream: payload.stream,
        academicYear: payload.academicYear.trim()
      }
    });
  }

  async listClasses(actor: Express.AuthUser, schoolId?: string) {
    const scopedSchoolId = ensureSchoolScope(actor, schoolId);

    return prisma.class.findMany({
      where: { schoolId: scopedSchoolId },
      include: {
        _count: {
          select: {
            students: true,
            assignments: true
          }
        }
      },
      orderBy: { name: "asc" }
    });
  }

  async createSubject(payload: SubjectPayload, actor: Express.AuthUser) {
    assertCanManageAcademic(actor);
    const schoolId = ensureSchoolScope(actor, payload.schoolId);

    return prisma.subject.create({
      data: {
        schoolId,
        name: payload.name.trim(),
        coefficient: payload.coefficient,
        isCore: payload.isCore ?? true
      }
    });
  }

  async listSubjects(actor: Express.AuthUser, schoolId?: string) {
    const scopedSchoolId = ensureSchoolScope(actor, schoolId);

    return prisma.subject.findMany({
      where: { schoolId: scopedSchoolId },
      orderBy: { name: "asc" }
    });
  }

  async createTeacher(payload: TeacherPayload, actor: Express.AuthUser) {
    assertCanManageAcademic(actor);
    const schoolId = ensureSchoolScope(actor, payload.schoolId);

    const teacherData = {
      schoolId,
      fullName: payload.fullName.trim(),
      employeeCode: payload.employeeCode.trim().toUpperCase(),
      speciality: payload.speciality?.trim() || null
    };

    if (!payload.user) {
      return prisma.teacher.create({ data: teacherData });
    }

    const userPayload = payload.user;

    const existingUser = await prisma.user.findUnique({
      where: { email: userPayload.email.toLowerCase().trim() }
    });

    if (existingUser) {
      throw new AppError(409, "Email enseignant deja utilise");
    }

    const passwordHash = await hashPassword(userPayload.password);

    return prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          fullName: payload.fullName.trim(),
          email: userPayload.email.toLowerCase().trim(),
          passwordHash,
          role: Role.TEACHER,
          schoolId
        }
      });

      const teacher = await tx.teacher.create({
        data: {
          ...teacherData,
          userId: user.id
        }
      });

      return teacher;
    });
  }

  async listTeachers(actor: Express.AuthUser, schoolId?: string) {
    const scopedSchoolId = ensureSchoolScope(actor, schoolId);

    return prisma.teacher.findMany({
      where: { schoolId: scopedSchoolId },
      include: {
        assignments: {
          include: {
            class: true,
            subject: true
          }
        }
      },
      orderBy: { fullName: "asc" }
    });
  }

  async assignTeacher(payload: AssignmentPayload, actor: Express.AuthUser) {
    assertCanManageAcademic(actor);
    const schoolId = ensureSchoolScope(actor, payload.schoolId);

    const [teacher, classEntity, subject] = await Promise.all([
      prisma.teacher.findUnique({ where: { id: payload.teacherId } }),
      prisma.class.findUnique({ where: { id: payload.classId } }),
      prisma.subject.findUnique({ where: { id: payload.subjectId } })
    ]);

    if (!teacher || !classEntity || !subject) {
      throw new AppError(404, "Teacher/Class/Subject introuvable");
    }

    if (teacher.schoolId !== schoolId || classEntity.schoolId !== schoolId || subject.schoolId !== schoolId) {
      throw new AppError(403, "Affectation hors de votre etablissement");
    }

    return prisma.teacherClassSubject.upsert({
      where: {
        teacherId_classId_subjectId: {
          teacherId: payload.teacherId,
          classId: payload.classId,
          subjectId: payload.subjectId
        }
      },
      create: {
        schoolId,
        teacherId: payload.teacherId,
        classId: payload.classId,
        subjectId: payload.subjectId
      },
      update: {}
    });
  }

  async teacherClassPerformance(teacherId: string, actor: Express.AuthUser, semester?: "SEMESTER_1" | "SEMESTER_2") {
    const teacher = await prisma.teacher.findUnique({ where: { id: teacherId } });

    if (!teacher) {
      throw new AppError(404, "Enseignant introuvable");
    }

    const schoolId = ensureSchoolScope(actor, teacher.schoolId);

    const assignments = await prisma.teacherClassSubject.findMany({
      where: {
        teacherId,
        schoolId
      },
      include: {
        class: true,
        subject: true
      }
    });

    const result = [] as Array<{
      classId: string;
      className: string;
      room: string | null;
      subjectId: string;
      subjectName: string;
      average: number;
      gradesCount: number;
    }>;

    for (const assignment of assignments) {
      const grades = await prisma.grade.findMany({
        where: {
          teacherId,
          classId: assignment.classId,
          subjectId: assignment.subjectId,
          ...(semester ? { semester } : {})
        }
      });

      const average =
        grades.length > 0
          ? grades.reduce((acc, item) => acc + (item.score / item.maxScore) * 20, 0) / grades.length
          : 0;

      result.push({
        classId: assignment.classId,
        className: assignment.class.name,
        room: assignment.class.room,
        subjectId: assignment.subjectId,
        subjectName: assignment.subject.name,
        average: Number(average.toFixed(2)),
        gradesCount: grades.length
      });
    }

    return result;
  }
}

export const academicService = new AcademicService();
