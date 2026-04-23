import { Role, SchoolType } from "@prisma/client";

import { prisma } from "../lib/prisma";
import { AppError } from "../utils/app-error";
import { hashPassword } from "../utils/password";
import { canManageSchool, ensureRoles } from "../utils/tenant";

export interface CreateSchoolPayload {
  name: string;
  code: string;
  city: string;
  country?: string;
  type?: SchoolType;
  admin?: {
    fullName: string;
    email: string;
    password: string;
  };
}

function adminRoleFromSchoolType(type: SchoolType) {
  if (type === SchoolType.COLLEGE) {
    return Role.COLLEGE_ADMIN;
  }

  if (type === SchoolType.UNIVERSITY) {
    return Role.UNIVERSITY_ADMIN;
  }

  return Role.HIGH_SCHOOL_ADMIN;
}

export class SchoolService {
  async create(payload: CreateSchoolPayload, actor: Express.AuthUser) {
    ensureRoles(actor, [Role.SUPER_ADMIN]);

    const schoolType = payload.type ?? SchoolType.HIGH_SCHOOL;

    const school = await prisma.school.create({
      data: {
        name: payload.name.trim(),
        code: payload.code.trim().toUpperCase(),
        city: payload.city.trim(),
        country: payload.country?.trim() || "Cameroon",
        type: schoolType
      }
    });

    if (payload.admin) {
      const existingAdmin = await prisma.user.findUnique({ where: { email: payload.admin.email } });

      if (existingAdmin) {
        throw new AppError(409, "Email admin deja utilise");
      }

      const passwordHash = await hashPassword(payload.admin.password);

      await prisma.user.create({
        data: {
          fullName: payload.admin.fullName,
          email: payload.admin.email.toLowerCase().trim(),
          passwordHash,
          role: adminRoleFromSchoolType(schoolType),
          schoolId: school.id
        }
      });
    }

    return school;
  }

  async list(actor: Express.AuthUser) {
    if (actor.role === Role.SUPER_ADMIN) {
      return prisma.school.findMany({
        orderBy: { createdAt: "desc" },
        include: {
          _count: {
            select: {
              users: true,
              students: true,
              teachers: true,
              classes: true
            }
          }
        }
      });
    }

    if (!actor.schoolId) {
      throw new AppError(403, "Utilisateur sans ecole attachee");
    }

    return prisma.school.findMany({
      where: { id: actor.schoolId },
      include: {
        _count: {
          select: {
            users: true,
            students: true,
            teachers: true,
            classes: true
          }
        }
      }
    });
  }

  async getById(id: string, actor: Express.AuthUser) {
    if (!canManageSchool(actor, id)) {
      throw new AppError(403, "Acces interdit");
    }

    const school = await prisma.school.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            users: true,
            students: true,
            teachers: true,
            classes: true,
            subjects: true
          }
        }
      }
    });

    if (!school) {
      throw new AppError(404, "Ecole introuvable");
    }

    return school;
  }

  async update(
    id: string,
    payload: Partial<Omit<CreateSchoolPayload, "admin">> & { isActive?: boolean },
    actor: Express.AuthUser
  ) {
    if (!canManageSchool(actor, id)) {
      throw new AppError(403, "Acces interdit");
    }

    return prisma.school.update({
      where: { id },
      data: {
        ...(payload.name ? { name: payload.name.trim() } : {}),
        ...(payload.code ? { code: payload.code.trim().toUpperCase() } : {}),
        ...(payload.city ? { city: payload.city.trim() } : {}),
        ...(payload.country ? { country: payload.country.trim() } : {}),
        ...(payload.type ? { type: payload.type } : {}),
        ...(payload.isActive !== undefined ? { isActive: payload.isActive } : {})
      }
    });
  }

  async remove(id: string, actor: Express.AuthUser) {
    ensureRoles(actor, [Role.SUPER_ADMIN]);

    await prisma.school.update({
      where: { id },
      data: { isActive: false }
    });

    await prisma.user.updateMany({
      where: { schoolId: id },
      data: { isActive: false }
    });

    return { success: true };
  }
}

export const schoolService = new SchoolService();
