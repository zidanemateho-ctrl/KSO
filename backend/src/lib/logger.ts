import { env } from "../config/env";

type LogLevel = "debug" | "info" | "warn" | "error";

const levelWeight: Record<LogLevel, number> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40
};

function canLog(level: LogLevel) {
  return levelWeight[level] >= levelWeight[env.LOG_LEVEL];
}

function serializeError(error: unknown) {
  if (!(error instanceof Error)) {
    return undefined;
  }

  return {
    name: error.name,
    message: error.message,
    stack: error.stack
  };
}

function writeLog(level: LogLevel, message: string, meta?: Record<string, unknown>) {
  if (!canLog(level)) {
    return;
  }

  const payload: Record<string, unknown> = {
    timestamp: new Date().toISOString(),
    level,
    message
  };

  if (meta) {
    for (const [key, value] of Object.entries(meta)) {
      payload[key] = value instanceof Error ? serializeError(value) : value;
    }
  }

  const line = JSON.stringify(payload);
  if (level === "error") {
    console.error(line);
    return;
  }

  if (level === "warn") {
    console.warn(line);
    return;
  }

  console.log(line);
}

export const logger = {
  debug: (message: string, meta?: Record<string, unknown>) => writeLog("debug", message, meta),
  info: (message: string, meta?: Record<string, unknown>) => writeLog("info", message, meta),
  warn: (message: string, meta?: Record<string, unknown>) => writeLog("warn", message, meta),
  error: (message: string, meta?: Record<string, unknown>) => writeLog("error", message, meta)
};
