import { Role } from "@prisma/client";
import { NextFunction, Request, Response } from "express";

export function authorize(...roles: Role[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ message: "Authentification requise" });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ message: "Acces interdit" });
    }

    return next();
  };
}
