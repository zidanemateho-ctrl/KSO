import cors from "cors";
import cookieParser from "cookie-parser";
import express from "express";
import helmet from "helmet";

import { env } from "./config/env";
import { ensureUploadDirectories, uploadRootDir } from "./config/uploads";
import { logger } from "./lib/logger";
import { metrics } from "./lib/metrics";
import { prisma } from "./lib/prisma";
import { adminAuditMiddleware } from "./middlewares/audit.middleware";
import { authenticate } from "./middlewares/auth.middleware";
import { errorHandler, notFound } from "./middlewares/error.middleware";
import { createRateLimiter } from "./middlewares/rate-limit.middleware";
import { requestIdMiddleware } from "./middlewares/request-id.middleware";
import { requestLoggingMiddleware } from "./middlewares/request-logging.middleware";
import routes from "./routes";
import { validateCorsOrigin } from "./utils/cors";

export function createApp() {
  const app = express();
  ensureUploadDirectories();
  app.set("trust proxy", 1);

  app.use(
    cors({
      origin: validateCorsOrigin,
      credentials: true,
      exposedHeaders: ["x-request-id"]
    })
  );
  app.use(
    helmet({
      crossOriginResourcePolicy: {
        policy: "cross-origin"
      }
    })
  );
  app.use(requestIdMiddleware);
  app.use(requestLoggingMiddleware);
  app.use(express.json({ limit: "2mb" }));
  app.use(express.urlencoded({ extended: true }));
  app.use(cookieParser());
  app.use("/uploads", express.static(uploadRootDir));

  app.get("/health/live", (_req, res) => {
    res.json({
      ok: true,
      service: "kso-backend",
      status: "live",
      date: new Date().toISOString()
    });
  });

  async function readinessHandler(req: express.Request, res: express.Response) {
    try {
      await prisma.$queryRaw`SELECT 1`;

      res.json({
        ok: true,
        service: "kso-backend",
        status: "ready",
        date: new Date().toISOString()
      });
    } catch (error) {
      logger.error("health_readiness_failed", {
        requestId: req.requestId,
        reason: error instanceof Error ? error.message : "unknown"
      });

      res.status(503).json({
        ok: false,
        service: "kso-backend",
        status: "not_ready",
        date: new Date().toISOString()
      });
    }
  }

  app.get("/health/ready", readinessHandler);
  app.get("/health", readinessHandler);

  app.get("/metrics", (req, res) => {
    if (env.METRICS_TOKEN) {
      const token =
        typeof req.query.token === "string"
          ? req.query.token
          : Array.isArray(req.query.token)
            ? req.query.token[0]
            : undefined;

      if (!token || token !== env.METRICS_TOKEN) {
        res.status(401).json({ message: "Token metrics invalide" });
        return;
      }
    }

    res.type("text/plain").send(metrics.toPrometheus());
  });

  const globalRateLimiter = createRateLimiter({
    identifier: "global_api",
    max: env.RATE_LIMIT_GLOBAL_MAX,
    windowMs: env.RATE_LIMIT_GLOBAL_WINDOW_MS
  });

  app.use("/api", globalRateLimiter, authenticate, adminAuditMiddleware, routes);

  app.use(notFound);
  app.use(errorHandler);

  return app;
}
