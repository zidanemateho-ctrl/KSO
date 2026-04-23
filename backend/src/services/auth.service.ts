import { createHash, randomBytes } from "crypto";

import { Role, SchoolType } from "@prisma/client";

import { env } from "../config/env";
import { logger } from "../lib/logger";
import { prisma } from "../lib/prisma";
import { AppError } from "../utils/app-error";
import { parseDurationToMs } from "../utils/duration";
import { signAccessToken } from "../utils/jwt";
import { hashPassword, verifyPassword } from "../utils/password";
import { ensureSchoolScope, isSchoolAdminRole } from "../utils/tenant";
import { emailService } from "./email.service";

export const REFRESH_COOKIE_NAME = "kso_refresh_token";

interface SessionMeta {
  ipAddress?: string;
  userAgent?: string;
}

interface AuthUserSnapshot {
  id: string;
  email: string;
  fullName: string;
  role: Role;
  schoolId: string | null;
}

export interface AuthSessionPayload {
  accessToken: string;
  token: string;
  refreshToken: string;
  refreshTokenExpiresAt: Date;
  user: AuthUserSnapshot;
}

export interface RegisterPayload {
  email: string;
  password: string;
  fullName: string;
  role: Role;
  schoolId?: string;
}

function validateRoleForSchoolType(role: Role, schoolType: SchoolType) {
  if (role === Role.COLLEGE_ADMIN && schoolType !== SchoolType.COLLEGE) {
    throw new AppError(400, "Un compte COLLEGE_ADMIN doit etre rattache a un college");
  }

  if (role === Role.HIGH_SCHOOL_ADMIN && schoolType !== SchoolType.HIGH_SCHOOL) {
    throw new AppError(400, "Un compte HIGH_SCHOOL_ADMIN doit etre rattache a un lycee");
  }

  if (role === Role.UNIVERSITY_ADMIN && schoolType !== SchoolType.UNIVERSITY) {
    throw new AppError(400, "Un compte UNIVERSITY_ADMIN doit etre rattache a une universite");
  }

  if (role === Role.STUDENT && schoolType === SchoolType.UNIVERSITY) {
    throw new AppError(400, "Un compte STUDENT est reserve au college/lycee");
  }

  if (role === Role.UNIVERSITY_STUDENT && schoolType !== SchoolType.UNIVERSITY) {
    throw new AppError(400, "Un compte UNIVERSITY_STUDENT doit etre rattache a une universite");
  }
}

function canSchoolAdminCreate(actorRole: Role, targetRole: Role) {
  const commonRoles: Role[] = [Role.TEACHER, Role.PARENT];

  if (actorRole === Role.UNIVERSITY_ADMIN) {
    const roles: Role[] = [...commonRoles, Role.UNIVERSITY_STUDENT];
    return roles.includes(targetRole);
  }

  if (actorRole === Role.COLLEGE_ADMIN || actorRole === Role.HIGH_SCHOOL_ADMIN || actorRole === Role.SCHOOL_ADMIN) {
    const roles: Role[] = [...commonRoles, Role.STUDENT];
    return roles.includes(targetRole);
  }

  return false;
}

function hashOpaqueToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

function refreshTokenTtlMs() {
  return parseDurationToMs(env.REFRESH_TOKEN_EXPIRES_IN, 30 * 24 * 60 * 60 * 1000);
}

function nowPlus(ms: number) {
  return new Date(Date.now() + ms);
}

export class AuthService {
  private createOpaqueToken() {
    return randomBytes(48).toString("hex");
  }

  private snapshotUser(user: AuthUserSnapshot) {
    return {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      role: user.role,
      schoolId: user.schoolId
    };
  }

  private async createSession(user: AuthUserSnapshot, meta?: SessionMeta): Promise<AuthSessionPayload> {
    const refreshToken = this.createOpaqueToken();
    const refreshTokenHash = hashOpaqueToken(refreshToken);
    const refreshTokenExpiresAt = nowPlus(refreshTokenTtlMs());

    await prisma.refreshToken.create({
      data: {
        userId: user.id,
        tokenHash: refreshTokenHash,
        expiresAt: refreshTokenExpiresAt,
        ipAddress: meta?.ipAddress,
        userAgent: meta?.userAgent
      }
    });

    const accessToken = signAccessToken({
      sub: user.id,
      role: user.role,
      schoolId: user.schoolId
    });

    return {
      accessToken,
      token: accessToken,
      refreshToken,
      refreshTokenExpiresAt,
      user: this.snapshotUser(user)
    };
  }

  async register(payload: RegisterPayload, actor?: Express.AuthUser, meta?: SessionMeta) {
    const existing = await prisma.user.findUnique({ where: { email: payload.email.toLowerCase().trim() } });

    if (existing) {
      throw new AppError(409, "Email deja utilise");
    }

    if (!actor) {
      const superAdminCount = await prisma.user.count({ where: { role: Role.SUPER_ADMIN } });

      if (superAdminCount > 0 || payload.role !== Role.SUPER_ADMIN) {
        throw new AppError(403, "Creation d utilisateur interdite sans authentification");
      }
    }

    let schoolId: string | null = payload.schoolId ?? null;

    if (actor?.role === Role.SUPER_ADMIN) {
      if (payload.role !== Role.SUPER_ADMIN) {
        schoolId = ensureSchoolScope(actor, payload.schoolId);
      }
    } else if (actor && isSchoolAdminRole(actor.role)) {
      if (!canSchoolAdminCreate(actor.role, payload.role)) {
        throw new AppError(403, "Ce role admin ne peut creer que teacher/student-parent selon son etablissement");
      }

      schoolId = ensureSchoolScope(actor, payload.schoolId ?? actor.schoolId);
    }

    if (payload.role !== Role.SUPER_ADMIN && !schoolId) {
      throw new AppError(400, "schoolId est requis pour ce role");
    }

    if (schoolId) {
      const school = await prisma.school.findUnique({
        where: { id: schoolId },
        select: { id: true, type: true }
      });

      if (!school) {
        throw new AppError(404, "Etablissement introuvable");
      }

      validateRoleForSchoolType(payload.role, school.type);
    }

    const passwordHash = await hashPassword(payload.password);

    const user = await prisma.user.create({
      data: {
        email: payload.email.toLowerCase().trim(),
        fullName: payload.fullName.trim(),
        role: payload.role,
        schoolId,
        passwordHash
      }
    });

    return this.createSession(
      {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        role: user.role,
        schoolId: user.schoolId
      },
      meta
    );
  }

  async login(email: string, password: string, meta?: SessionMeta) {
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase().trim() }
    });

    if (!user || !user.isActive) {
      throw new AppError(401, "Identifiants invalides");
    }

    const passwordValid = await verifyPassword(password, user.passwordHash);

    if (!passwordValid) {
      throw new AppError(401, "Identifiants invalides");
    }

    return this.createSession(
      {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        role: user.role,
        schoolId: user.schoolId
      },
      meta
    );
  }

  async refresh(refreshToken: string, meta?: SessionMeta) {
    if (!refreshToken) {
      throw new AppError(401, "Session invalide");
    }

    const tokenHash = hashOpaqueToken(refreshToken);
    const existing = await prisma.refreshToken.findUnique({
      where: { tokenHash },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            fullName: true,
            role: true,
            schoolId: true,
            isActive: true
          }
        }
      }
    });

    if (!existing || !existing.user || !existing.user.isActive) {
      throw new AppError(401, "Session invalide");
    }

    if (existing.revokedAt) {
      await prisma.refreshToken.updateMany({
        where: {
          userId: existing.userId,
          revokedAt: null
        },
        data: {
          revokedAt: new Date()
        }
      });

      throw new AppError(401, "Session invalide");
    }

    if (existing.expiresAt.getTime() <= Date.now()) {
      throw new AppError(401, "Session expiree");
    }

    const nextRefreshToken = this.createOpaqueToken();
    const nextRefreshTokenHash = hashOpaqueToken(nextRefreshToken);
    const nextRefreshExpiresAt = nowPlus(refreshTokenTtlMs());

    await prisma.$transaction([
      prisma.refreshToken.update({
        where: { tokenHash },
        data: {
          revokedAt: new Date(),
          replacedByTokenHash: nextRefreshTokenHash
        }
      }),
      prisma.refreshToken.create({
        data: {
          userId: existing.userId,
          tokenHash: nextRefreshTokenHash,
          expiresAt: nextRefreshExpiresAt,
          ipAddress: meta?.ipAddress,
          userAgent: meta?.userAgent
        }
      })
    ]);

    const accessToken = signAccessToken({
      sub: existing.user.id,
      role: existing.user.role,
      schoolId: existing.user.schoolId
    });

    return {
      accessToken,
      token: accessToken,
      refreshToken: nextRefreshToken,
      refreshTokenExpiresAt: nextRefreshExpiresAt,
      user: this.snapshotUser(existing.user)
    };
  }

  async logout(refreshToken?: string) {
    if (!refreshToken) {
      return;
    }

    const tokenHash = hashOpaqueToken(refreshToken);
    await prisma.refreshToken.updateMany({
      where: {
        tokenHash,
        revokedAt: null
      },
      data: {
        revokedAt: new Date()
      }
    });
  }

  async forgotPassword(email: string) {
    const normalizedEmail = email.toLowerCase().trim();
    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
      select: {
        id: true,
        email: true,
        fullName: true,
        isActive: true
      }
    });

    if (!user || !user.isActive) {
      return {
        message: "Si ce compte existe, un email de reinitialisation a ete envoye."
      };
    }

    const token = randomBytes(40).toString("hex");
    const tokenHash = hashOpaqueToken(token);
    const expiresAt = nowPlus(env.PASSWORD_RESET_TOKEN_EXPIRES_MINUTES * 60 * 1000);

    await prisma.$transaction([
      prisma.passwordResetToken.updateMany({
        where: {
          userId: user.id,
          usedAt: null
        },
        data: {
          usedAt: new Date()
        }
      }),
      prisma.passwordResetToken.create({
        data: {
          userId: user.id,
          tokenHash,
          expiresAt
        }
      })
    ]);

    const baseUrl = env.PASSWORD_RESET_BASE_URL;
    const resetUrl = baseUrl ? `${baseUrl}${baseUrl.includes("?") ? "&" : "?"}token=${encodeURIComponent(token)}` : null;

    let sent = false;
    if (resetUrl) {
      sent = await emailService.sendPasswordResetEmail({
        to: user.email,
        fullName: user.fullName,
        resetUrl
      });
    }

    if (!sent) {
      logger.warn("password_reset_link_generated", {
        userId: user.id,
        email: user.email,
        resetUrl
      });
    }

    return {
      message: "Si ce compte existe, un email de reinitialisation a ete envoye."
    };
  }

  async resetPassword(token: string, newPassword: string) {
    const tokenHash = hashOpaqueToken(token);

    const record = await prisma.passwordResetToken.findUnique({
      where: { tokenHash },
      include: {
        user: {
          select: {
            id: true,
            isActive: true
          }
        }
      }
    });

    if (!record || !record.user || !record.user.isActive || record.usedAt || record.expiresAt.getTime() <= Date.now()) {
      throw new AppError(400, "Lien de reinitialisation invalide ou expire");
    }

    const passwordHash = await hashPassword(newPassword);

    await prisma.$transaction([
      prisma.user.update({
        where: { id: record.userId },
        data: { passwordHash }
      }),
      prisma.passwordResetToken.update({
        where: { tokenHash },
        data: { usedAt: new Date() }
      }),
      prisma.refreshToken.updateMany({
        where: {
          userId: record.userId,
          revokedAt: null
        },
        data: {
          revokedAt: new Date()
        }
      })
    ]);

    return {
      message: "Mot de passe reinitialise avec succes"
    };
  }

  async me(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        fullName: true,
        role: true,
        schoolId: true,
        school: {
          select: {
            id: true,
            name: true,
            code: true,
            type: true
          }
        },
        student: {
          select: {
            id: true,
            registrationNumber: true,
            classId: true,
            profileType: true
          }
        },
        teacher: {
          select: {
            id: true,
            employeeCode: true
          }
        }
      }
    });

    if (!user) {
      throw new AppError(404, "Utilisateur introuvable");
    }

    return user;
  }
}

export const authService = new AuthService();
