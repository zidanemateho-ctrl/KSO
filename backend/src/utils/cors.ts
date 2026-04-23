import { env } from "../config/env";

export function isAllowedOrigin(origin: string) {
  return env.FRONTEND_ORIGINS.includes(origin);
}

export function validateCorsOrigin(origin: string | undefined, callback: (error: Error | null, allow?: boolean) => void) {
  if (!origin) {
    callback(null, true);
    return;
  }

  if (isAllowedOrigin(origin)) {
    callback(null, true);
    return;
  }

  callback(new Error("Origine CORS non autorisee"));
}
