import { NextFunction, Request, Response } from "express";
import { ZodTypeAny } from "zod";

export function validateBody(schema: ZodTypeAny) {
  return (req: Request, res: Response, next: NextFunction) => {
    const parsed = schema.safeParse(req.body);

    if (!parsed.success) {
      return res.status(400).json({
        message: "Validation echouee",
        errors: parsed.error.flatten().fieldErrors
      });
    }

    req.body = parsed.data;
    return next();
  };
}

export function validateQuery(schema: ZodTypeAny) {
  return (req: Request, res: Response, next: NextFunction) => {
    const parsed = schema.safeParse(req.query);

    if (!parsed.success) {
      return res.status(400).json({
        message: "Validation echouee",
        errors: parsed.error.flatten().fieldErrors
      });
    }

    (req as any).query = parsed.data;
    return next();
  };
}
