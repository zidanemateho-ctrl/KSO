import { Role } from "@prisma/client";

import { AppError } from "./app-error";

interface Actor {
  id: string;
  role: Role;
  schoolId: string | null;
}

export function isSchoolAdminRole(role: Role) {
  return (
    role === Role.SCHOOL_ADMIN ||
    role === Role.COLLEGE_ADMIN ||
    role === Role.HIGH_SCHOOL_ADMIN ||
    role === Role.UNIVERSITY_ADMIN
  );
}

export function ensureSchoolScope(actor: Actor, requestedSchoolId?: string | null) {
  if (actor.role === Role.SUPER_ADMIN) {
    if (!requestedSchoolId) {
      throw new AppError(400, "schoolId est requis pour cette operation");
    }

    return requestedSchoolId;
  }

  if (!actor.schoolId) {
    throw new AppError(403, "Utilisateur sans ecole attachee");
  }

  if (requestedSchoolId && requestedSchoolId !== actor.schoolId) {
    throw new AppError(403, "Acces interdit pour cette ecole");
  }

  return actor.schoolId;
}

export function canManageSchool(actor: Actor, schoolId: string) {
  return actor.role === Role.SUPER_ADMIN || (isSchoolAdminRole(actor.role) && actor.schoolId === schoolId);
}

export function ensureRoles(actor: Actor, roles: Role[]) {
  if (!roles.includes(actor.role)) {
    throw new AppError(403, "Acces interdit");
  }
}
