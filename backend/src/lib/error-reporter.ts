import { env } from "../config/env";
import { logger } from "./logger";

interface ReportPayload {
  requestId?: string;
  route?: string;
  method?: string;
  statusCode?: number;
  message: string;
  stack?: string;
}

export async function reportError(payload: ReportPayload) {
  if (!env.OBSERVABILITY_WEBHOOK_URL) {
    return;
  }

  try {
    await fetch(env.OBSERVABILITY_WEBHOOK_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        service: "kso-backend",
        environment: env.NODE_ENV,
        timestamp: new Date().toISOString(),
        ...payload
      })
    });
  } catch (error) {
    logger.warn("error_report_failed", {
      reason: error instanceof Error ? error.message : "unknown"
    });
  }
}
