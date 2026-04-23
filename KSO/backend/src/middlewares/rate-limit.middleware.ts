import { NextFunction, Request, Response } from "express";

import { logger } from "../lib/logger";
import { metrics } from "../lib/metrics";

interface RateLimitOptions {
  identifier: string;
  max: number;
  windowMs: number;
  keyGenerator?: (req: Request) => string;
}

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

export function createRateLimiter(options: RateLimitOptions) {
  const entries = new Map<string, RateLimitEntry>();
  const pruneIntervalMs = Math.max(10_000, Math.floor(options.windowMs / 2));

  const interval = setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of entries.entries()) {
      if (entry.resetAt <= now) {
        entries.delete(key);
      }
    }
  }, pruneIntervalMs);

  interval.unref();

  return (req: Request, res: Response, next: NextFunction) => {
    const now = Date.now();
    const rawKey = options.keyGenerator ? options.keyGenerator(req) : req.ip;
    const key = `${options.identifier}:${rawKey || "unknown"}`;
    const current = entries.get(key);

    let entry: RateLimitEntry;
    if (!current || current.resetAt <= now) {
      entry = {
        count: 0,
        resetAt: now + options.windowMs
      };
      entries.set(key, entry);
    } else {
      entry = current;
    }

    entry.count += 1;
    const remaining = Math.max(0, options.max - entry.count);

    res.setHeader("RateLimit-Limit", options.max.toString());
    res.setHeader("RateLimit-Remaining", remaining.toString());
    res.setHeader("RateLimit-Reset", Math.ceil(entry.resetAt / 1000).toString());

    if (entry.count <= options.max) {
      next();
      return;
    }

    const retryAfterSeconds = Math.max(1, Math.ceil((entry.resetAt - now) / 1000));
    res.setHeader("Retry-After", retryAfterSeconds.toString());

    metrics.recordRateLimited(req.method, req.path);
    logger.warn("rate_limit_triggered", {
      requestId: req.requestId,
      limiter: options.identifier,
      ip: req.ip,
      path: req.originalUrl
    });

    res.status(429).json({
      message: "Trop de requetes. Reessayez plus tard.",
      retryAfterSeconds
    });
  };
}
