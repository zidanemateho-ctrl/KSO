import { NextFunction, Request, Response } from "express";

import { logger } from "../lib/logger";
import { metrics } from "../lib/metrics";

function normalizeRoute(req: Request) {
  const routePath = req.route?.path;
  if (!routePath) {
    return req.path;
  }

  return `${req.baseUrl}${routePath}`;
}

export function requestLoggingMiddleware(req: Request, res: Response, next: NextFunction) {
  const startedAt = process.hrtime.bigint();

  res.on("finish", () => {
    const durationNs = process.hrtime.bigint() - startedAt;
    const durationMs = Number(durationNs) / 1_000_000;
    const route = normalizeRoute(req);

    metrics.recordRequest(req.method, route, res.statusCode);

    logger.info("http_request", {
      requestId: req.requestId,
      method: req.method,
      path: req.originalUrl,
      route,
      statusCode: res.statusCode,
      durationMs: Number(durationMs.toFixed(2)),
      ip: req.ip,
      userId: req.user?.id
    });
  });

  next();
}
