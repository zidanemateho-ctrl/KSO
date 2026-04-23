import { NextFunction, Request, Response } from "express";

import { verifyToken } from "../utils/jwt";

export function authenticate(req: Request, _res: Response, next: NextFunction) {
  const authorization = req.headers.authorization;

  if (!authorization || !authorization.startsWith("Bearer ")) {
    return next();
  }

  const token = authorization.slice("Bearer ".length);

  try {
    const payload = verifyToken(token);

    req.user = {
      id: payload.sub,
      role: payload.role as Express.AuthUser["role"],
      schoolId: payload.schoolId
    };

    next();
  } catch {
    next();
  }
}

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (!req.user) {
    return res.status(401).json({ message: "Authentification requise" });
  }

  return next();
}
