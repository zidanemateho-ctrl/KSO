import { Role } from "@prisma/client";
import { NextFunction, Request, Response } from "express";

import { logger } from "../lib/logger";

const ADMIN_ROLES = new Set<Role>([
  Role.SUPER_ADMIN,
  Role.SCHOOL_ADMIN,
  Role.COLLEGE_ADMIN,
  Role.HIGH_SCHOOL_ADMIN,
  Role.UNIVERSITY_ADMIN
]);

const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);
const SENSITIVE_KEYS = new Set(["password", "passwordhash", "token", "refreshtoken", "authorization"]);

function bodyKeysForAudit(req: Request) {
  if (!req.body || typeof req.body !== "object" || Array.isArray(req.body)) {
    return [] as string[];
  }

  return Object.keys(req.body)
    .filter((key) => !SENSITIVE_KEYS.has(key.toLowerCase()))
    .slice(0, 20);
}

function targetResourceId(req: Request) {
  return (
    req.params.id ||
    req.params.schoolId ||
    req.params.studentId ||
    req.params.groupId ||
    req.params.planId ||
    undefined
  );
}

export function adminAuditMiddleware(req: Request, res: Response, next: NextFunction) {
  const actor = req.user;

  if (!actor || SAFE_METHODS.has(req.method) || !ADMIN_ROLES.has(actor.role)) {
    next();
    return;
  }

  const startedAt = Date.now();
  const payloadKeys = bodyKeysForAudit(req);
  const resourceId = targetResourceId(req);

  res.on("finish", () => {
    if (res.statusCode >= 400) {
      return;
    }

    logger.info("admin_audit", {
      requestId: req.requestId,
      actorUserId: actor.id,
      actorRole: actor.role,
      actorSchoolId: actor.schoolId,
      method: req.method,
      path: req.originalUrl,
      statusCode: res.statusCode,
      durationMs: Date.now() - startedAt,
      resourceId,
      payloadKeys,
      ip: req.ip,
      userAgent: req.get("user-agent")
    });
  });

  next();
}
