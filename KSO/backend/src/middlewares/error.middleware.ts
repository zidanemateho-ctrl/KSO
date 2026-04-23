import { Prisma } from "@prisma/client";
import { NextFunction, Request, Response } from "express";
import { MulterError } from "multer";
import { ZodError } from "zod";

import { reportError } from "../lib/error-reporter";
import { logger } from "../lib/logger";
import { metrics } from "../lib/metrics";
import { AppError } from "../utils/app-error";

export function notFound(req: Request, res: Response) {
  metrics.recordError("not_found");
  logger.warn("http_not_found", {
    requestId: req.requestId,
    method: req.method,
    path: req.originalUrl
  });

  return res.status(404).json({ message: "Route introuvable", requestId: req.requestId });
}

function errorPayload(error: unknown) {
  if (error instanceof AppError) {
    return {
      statusCode: error.statusCode,
      body: {
        message: error.message,
        details: error.details
      },
      kind: "app_error"
    };
  }

  if (error instanceof ZodError) {
    return {
      statusCode: 400,
      body: {
        message: "Validation echouee",
        errors: error.flatten().fieldErrors
      },
      kind: "validation_error"
    };
  }

  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    return {
      statusCode: 400,
      body: {
        message: "Erreur base de donnees",
        code: error.code,
        meta: error.meta
      },
      kind: "prisma_known_error"
    };
  }

  if (error instanceof MulterError) {
    return {
      statusCode: 400,
      body: {
        message: error.message
      },
      kind: "upload_error"
    };
  }

  if (error instanceof Error && error.message.toLowerCase().includes("fichier")) {
    return {
      statusCode: 400,
      body: {
        message: error.message
      },
      kind: "file_error"
    };
  }

  return {
    statusCode: 500,
    body: {
      message: "Erreur interne du serveur"
    },
    kind: "internal_error"
  };
}

export function errorHandler(
  error: unknown,
  req: Request,
  res: Response,
  _next: NextFunction
) {
  void _next;
  const payload = errorPayload(error);

  metrics.recordError(payload.kind);
  logger.error("http_error", {
    requestId: req.requestId,
    method: req.method,
    path: req.originalUrl,
    statusCode: payload.statusCode,
    kind: payload.kind,
    error: error instanceof Error ? { name: error.name, message: error.message, stack: error.stack } : error
  });

  void reportError({
    requestId: req.requestId,
    route: req.originalUrl,
    method: req.method,
    statusCode: payload.statusCode,
    message: error instanceof Error ? error.message : "Unknown error",
    stack: error instanceof Error ? error.stack : undefined
  });

  return res.status(payload.statusCode).json({
    ...payload.body,
    requestId: req.requestId
  });
}
