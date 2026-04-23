import { EducationSystem, Role, SchoolType, Stream, StudentLevel, StudentProfileType } from "@prisma/client";

import { prisma } from "../lib/prisma";
import { AppError } from "../utils/app-error";
import { hashPassword } from "../utils/password";
import { ensureSchoolScope, isSchoolAdminRole } from "../utils/tenant";

interface StudentPayload {
  schoolId?: string;
  classId?: string;
  preferredSubjectId?: string;
  registrationNumber: string;
  fullName: string;
  dateOfBirth?: string;
  profileType?: StudentProfileType;
  level: StudentLevel;
  stream: Stream;
  guardianPhone?: string;
  dreamCareer?: string;
  targetProfession?: string;
  learningObjectives?: string;
  admissionYear?: number;
  user?: {
    email: string;
    password: string;
  };
}

interface ParentLinkPayload {
  relationship?: string;
  parentUserId?: string;
  parent?: {
    fullName: string;
    email: string;
    password: string;
  };
}

function roleFromProfileType(profileType: StudentProfileType) {
  return profileType === StudentProfileType.ETUDIANT ? Role.UNIVERSITY_STUDENT : Role.STUDENT;
}

function ensureProfileTypeMatchesSchoolType(profileType: StudentProfileType, schoolType: SchoolType) {
  if (schoolType === SchoolType.UNIVERSITY && profileType !== StudentProfileType.ETUDIANT) {
    throw new AppError(400, "Les universites doivent utiliser le profil ETUDIANT");
  }

  if (schoolType !== SchoolType.UNIVERSITY && profileType !== StudentProfileType.ELEVE) {
    throw new AppError(400, "Les colleges/lycees doivent utiliser le profil ELEVE");
  }
}

function inferEducationSystem(level: StudentLevel) {
  return level === StudentLevel.LOWER_SIXTH || level === StudentLevel.UPPER_SIXTH
    ? EducationSystem.ANGLOPHONE
    : EducationSystem.FRANCOPHONE;
}

const studentInclude = {
  class: true,
  preferredSubject: {
    select: {
      id: true,
      name: true
    }
  },
  orientation: true,
  results: {
    orderBy: { computedAt: "desc" as const },
    take: 2
  }
};

export class StudentService {
  private async assertStudentViewAccess(studentId: string, actor: Express.AuthUser) {
    const student = await prisma.student.findUnique({
      where: { id: studentId },
      include: {
        class: {
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

      if (!teacher) {
        throw new AppError(403, "Profil enseignant introuvable");
      }

      if (!student.classId) {
        throw new AppError(403, "Eleve sans classe rattachee");
      }

      const assignment = await prisma.teacherClassSubject.findFirst({
        where: {
          teacherId: teacher.id,
          classId: student.classId
        }
      });

      if (!assignment) {
        throw new AppError(403, "Acces interdit pour cet eleve");
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

  async create(payload: StudentPayload, actor: Express.AuthUser) {
    if (!(actor.role === Role.SUPER_ADMIN || isSchoolAdminRole(actor.role))) {
      throw new AppError(403, "Acces interdit");
    }

    const schoolId = ensureSchoolScope(actor, payload.schoolId);

    const school = await prisma.school.findUnique({
      where: { id: schoolId },
      select: { id: true, type: true }
    });

    if (!school) {
      throw new AppError(404, "Etablissement introuvable");
    }

    const profileType =
      payload.profileType ??
      (school.type === SchoolType.UNIVERSITY ? StudentProfileType.ETUDIANT : StudentProfileType.ELEVE);

    ensureProfileTypeMatchesSchoolType(profileType, school.type);

    let classEntity: { schoolId: string; educationSystem: EducationSystem } | null = null;

    if (payload.classId) {
      classEntity = await prisma.class.findUnique({
        where: { id: payload.classId },
        select: {
          schoolId: true,
          educationSystem: true
        }
      });

      if (!classEntity || classEntity.schoolId !== schoolId) {
        throw new AppError(400, "Classe invalide pour cet etablissement");
      }
    }

    if (payload.preferredSubjectId) {
      const subject = await prisma.subject.findUnique({ where: { id: payload.preferredSubjectId } });

      if (!subject || subject.schoolId !== schoolId) {
        throw new AppError(400, "Discipline preferee invalide");
      }
    }

    const studentData = {
      schoolId,
      classId: payload.classId,
      preferredSubjectId: payload.preferredSubjectId,
      registrationNumber: payload.registrationNumber.trim().toUpperCase(),
      fullName: payload.fullName.trim(),
      dateOfBirth: payload.dateOfBirth ? new Date(payload.dateOfBirth) : null,
      profileType,
      level: payload.level,
      stream: payload.stream,
      educationSystem: classEntity?.educationSystem ?? inferEducationSystem(payload.level),
      guardianPhone: payload.guardianPhone?.trim() || null,
      dreamCareer: payload.dreamCareer?.trim() || null,
      targetProfession: payload.targetProfession?.trim() || null,
      learningObjectives: payload.learningObjectives?.trim() || null,
      admissionYear: payload.admissionYear
    };

    if (!payload.user) {
      return prisma.student.create({
        data: studentData,
        include: studentInclude
      });
    }

    const userPayload = payload.user;

    const existingUser = await prisma.user.findUnique({
      where: { email: userPayload.email.toLowerCase().trim() }
    });

    if (existingUser) {
      throw new AppError(409, "Email deja utilise");
    }

    const passwordHash = await hashPassword(userPayload.password);

    return prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          fullName: payload.fullName.trim(),
          email: userPayload.email.toLowerCase().trim(),
          passwordHash,
          role: roleFromProfileType(profileType),
          schoolId
        }
      });

      const student = await tx.student.create({
        data: {
          ...studentData,
          userId: user.id
        },
        include: studentInclude
      });

      return student;
    });
  }

  async list(
    actor: Express.AuthUser,
    params: {
      schoolId?: string;
      classId?: string;
      level?: StudentLevel;
      stream?: Stream;
      profileType?: StudentProfileType;
      search?: string;
    }
  ) {
    if (actor.role === Role.STUDENT || actor.role === Role.UNIVERSITY_STUDENT) {
      return prisma.student.findMany({
        where: {
          userId: actor.id,
          isActive: true
        },
        include: studentInclude,
        orderBy: { fullName: "asc" }
      });
    }

    if (actor.role === Role.PARENT) {
      return prisma.student.findMany({
        where: {
          isActive: true,
          parents: {
            some: {
              parentUserId: actor.id
            }
          }
        },
        include: studentInclude,
        orderBy: { fullName: "asc" }
      });
    }

    const schoolId = ensureSchoolScope(actor, params.schoolId);

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

      const assignments = await prisma.teacherClassSubject.findMany({
        where: {
          teacherId: teacher.id,
          schoolId
        },
        select: {
          classId: true
        }
      });

      const classIds = Array.from(new Set(assignments.map((item) => item.classId)));

      if (!classIds.length) {
        return [];
      }

      return prisma.student.findMany({
        where: {
          schoolId,
          isActive: true,
          classId: params.classId ? params.classId : { in: classIds },
          ...(params.level ? { level: params.level } : {}),
          ...(params.stream ? { stream: params.stream } : {}),
          ...(params.profileType ? { profileType: params.profileType } : {}),
          ...(params.search
            ? {
                OR: [
                  { fullName: { contains: params.search, mode: "insensitive" } },
                  { registrationNumber: { contains: params.search, mode: "insensitive" } }
                ]
              }
            : {})
        },
        include: studentInclude,
        orderBy: { fullName: "asc" }
      });
    }

    return prisma.student.findMany({
      where: {
        schoolId,
        isActive: true,
        ...(params.classId ? { classId: params.classId } : {}),
        ...(params.level ? { level: params.level } : {}),
        ...(params.stream ? { stream: params.stream } : {}),
        ...(params.profileType ? { profileType: params.profileType } : {}),
        ...(params.search
          ? {
              OR: [
                { fullName: { contains: params.search, mode: "insensitive" } },
                { registrationNumber: { contains: params.search, mode: "insensitive" } }
              ]
            }
          : {})
      },
      include: studentInclude,
      orderBy: { fullName: "asc" }
    });
  }

  async getById(id: string, actor: Express.AuthUser) {
    await this.assertStudentViewAccess(id, actor);

    return prisma.student.findUnique({
      where: { id },
      include: {
        class: true,
        school: true,
        preferredSubject: {
          select: {
            id: true,
            name: true
          }
        },
        parents: {
          include: {
            parent: {
              select: {
                id: true,
                fullName: true,
                email: true
              }
            }
          }
        },
        orientation: true,
        results: {
          orderBy: [{ semester: "asc" }, { computedAt: "desc" }]
        },
        plans: {
          orderBy: [{ status: "asc" }, { dueDate: "asc" }]
        },
        alerts: {
          where: {
            isRead: false
          },
          orderBy: [{ severity: "desc" }, { createdAt: "desc" }],
          take: 10
        }
      }
    });
  }

  async update(id: string, payload: Partial<StudentPayload>, actor: Express.AuthUser) {
    if (!(actor.role === Role.SUPER_ADMIN || isSchoolAdminRole(actor.role))) {
      throw new AppError(403, "Acces interdit");
    }

    const student = await prisma.student.findUnique({
      where: { id },
      include: {
        school: {
          select: {
            type: true
          }
        }
      }
    });

    if (!student) {
      throw new AppError(404, "Eleve introuvable");
    }

    const schoolId = ensureSchoolScope(actor, payload.schoolId ?? student.schoolId);

    if (student.schoolId !== schoolId) {
      throw new AppError(403, "Acces interdit");
    }

    let classEntity: { schoolId: string; educationSystem: EducationSystem } | null = null;

    if (payload.classId) {
      classEntity = await prisma.class.findUnique({
        where: { id: payload.classId },
        select: {
          schoolId: true,
          educationSystem: true
        }
      });

      if (!classEntity || classEntity.schoolId !== schoolId) {
        throw new AppError(400, "Classe invalide");
      }
    }

    if (payload.preferredSubjectId) {
      const subject = await prisma.subject.findUnique({ where: { id: payload.preferredSubjectId } });

      if (!subject || subject.schoolId !== schoolId) {
        throw new AppError(400, "Discipline preferee invalide");
      }
    }

    const nextProfileType = payload.profileType ?? student.profileType;
    ensureProfileTypeMatchesSchoolType(nextProfileType, student.school.type);
    const nextEducationSystem =
      classEntity?.educationSystem ?? (payload.level ? inferEducationSystem(payload.level) : undefined);

    const updated = await prisma.student.update({
      where: { id },
      data: {
        ...(payload.registrationNumber
          ? { registrationNumber: payload.registrationNumber.trim().toUpperCase() }
          : {}),
        ...(payload.fullName ? { fullName: payload.fullName.trim() } : {}),
        ...(payload.dateOfBirth ? { dateOfBirth: new Date(payload.dateOfBirth) } : {}),
        ...(payload.profileType ? { profileType: payload.profileType } : {}),
        ...(payload.level ? { level: payload.level } : {}),
        ...(payload.stream ? { stream: payload.stream } : {}),
        ...(nextEducationSystem ? { educationSystem: nextEducationSystem } : {}),
        ...(payload.classId !== undefined ? { classId: payload.classId || null } : {}),
        ...(payload.preferredSubjectId !== undefined
          ? { preferredSubjectId: payload.preferredSubjectId || null }
          : {}),
        ...(payload.guardianPhone !== undefined ? { guardianPhone: payload.guardianPhone || null } : {}),
        ...(payload.dreamCareer !== undefined ? { dreamCareer: payload.dreamCareer || null } : {}),
        ...(payload.targetProfession !== undefined ? { targetProfession: payload.targetProfession || null } : {}),
        ...(payload.learningObjectives !== undefined
          ? { learningObjectives: payload.learningObjectives || null }
          : {}),
        ...(payload.admissionYear !== undefined ? { admissionYear: payload.admissionYear } : {})
      },
      include: studentInclude
    });

    if (student.userId && payload.profileType && payload.profileType !== student.profileType) {
      await prisma.user.update({
        where: { id: student.userId },
        data: {
          role: roleFromProfileType(payload.profileType)
        }
      });
    }

    return updated;
  }

  async remove(id: string, actor: Express.AuthUser) {
    if (!(actor.role === Role.SUPER_ADMIN || isSchoolAdminRole(actor.role))) {
      throw new AppError(403, "Acces interdit");
    }

    const student = await prisma.student.findUnique({ where: { id } });

    if (!student) {
      throw new AppError(404, "Eleve introuvable");
    }

    ensureSchoolScope(actor, student.schoolId);

    const updated = await prisma.student.update({
      where: { id },
      data: { isActive: false }
    });

    if (student.userId) {
      await prisma.user.update({
        where: { id: student.userId },
        data: { isActive: false }
      });
    }

    return updated;
  }

  async linkParent(studentId: string, payload: ParentLinkPayload, actor: Express.AuthUser) {
    if (!(actor.role === Role.SUPER_ADMIN || isSchoolAdminRole(actor.role))) {
      throw new AppError(403, "Acces interdit");
    }

    const student = await prisma.student.findUnique({ where: { id: studentId } });

    if (!student) {
      throw new AppError(404, "Eleve introuvable");
    }

    const schoolId = ensureSchoolScope(actor, student.schoolId);

    let parentUserId = payload.parentUserId;

    if (!parentUserId && payload.parent) {
      const existing = await prisma.user.findUnique({
        where: { email: payload.parent.email.toLowerCase().trim() }
      });

      if (existing) {
        parentUserId = existing.id;
      } else {
        const passwordHash = await hashPassword(payload.parent.password);
        const parent = await prisma.user.create({
          data: {
            fullName: payload.parent.fullName.trim(),
            email: payload.parent.email.toLowerCase().trim(),
            passwordHash,
            role: Role.PARENT,
            schoolId
          }
        });

        parentUserId = parent.id;
      }
    }

    if (!parentUserId) {
      throw new AppError(400, "parentUserId ou parent est requis");
    }

    return prisma.parentStudent.upsert({
      where: {
        parentUserId_studentId: {
          parentUserId,
          studentId
        }
      },
      create: {
        parentUserId,
        studentId,
        relationship: payload.relationship
      },
      update: {
        relationship: payload.relationship
      }
    });
  }
}

export const studentService = new StudentService();
