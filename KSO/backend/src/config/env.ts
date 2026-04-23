import "dotenv/config";

import { z } from "zod";

function parseBoolean(value: string | undefined, fallback: boolean) {
  if (value === undefined) {
    return fallback;
  }

  const normalized = value.trim().toLowerCase();
  if (normalized === "true" || normalized === "1" || normalized === "yes" || normalized === "on") {
    return true;
  }

  if (normalized === "false" || normalized === "0" || normalized === "no" || normalized === "off") {
    return false;
  }

  return fallback;
}

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().positive().default(4000),
  DATABASE_URL: z.string().min(1, "DATABASE_URL est requis"),
  JWT_SECRET: z.string().min(16, "JWT_SECRET doit contenir au moins 16 caracteres"),
  JWT_EXPIRES_IN: z.string().default("15m"),
  JWT_REFRESH_SECRET: z.string().min(16).optional(),
  ACCESS_TOKEN_EXPIRES_IN: z.string().optional(),
  REFRESH_TOKEN_EXPIRES_IN: z.string().default("30d"),
  FRONTEND_URL: z.string().default("http://localhost:5173"),
  PUBLIC_BASE_URL: z.string().optional(),
  AUTH_COOKIE_DOMAIN: z.string().optional(),
  AUTH_COOKIE_SAME_SITE: z.enum(["lax", "strict", "none"]).optional(),
  AUTH_COOKIE_SECURE: z.string().optional(),
  RATE_LIMIT_GLOBAL_MAX: z.coerce.number().int().positive().default(1500),
  RATE_LIMIT_GLOBAL_WINDOW_MS: z.coerce.number().int().positive().default(15 * 60 * 1000),
  RATE_LIMIT_AUTH_MAX: z.coerce.number().int().positive().default(20),
  RATE_LIMIT_AUTH_WINDOW_MS: z.coerce.number().int().positive().default(15 * 60 * 1000),
  RATE_LIMIT_UPLOAD_MAX: z.coerce.number().int().positive().default(30),
  RATE_LIMIT_UPLOAD_WINDOW_MS: z.coerce.number().int().positive().default(15 * 60 * 1000),
  FILE_STORAGE_DRIVER: z.enum(["local", "cloudinary"]).default("local"),
  CLOUDINARY_CLOUD_NAME: z.string().optional(),
  CLOUDINARY_API_KEY: z.string().optional(),
  CLOUDINARY_API_SECRET: z.string().optional(),
  CLOUDINARY_FOLDER: z.string().default("kso/chat"),
  METRICS_TOKEN: z.string().optional(),
  OBSERVABILITY_WEBHOOK_URL: z.string().optional(),
  PASSWORD_RESET_TOKEN_EXPIRES_MINUTES: z.coerce.number().int().positive().default(30),
  PASSWORD_RESET_BASE_URL: z.string().optional(),
  RESEND_API_KEY: z.string().optional(),
  MAIL_FROM: z.string().optional(),
  LOG_LEVEL: z.enum(["debug", "info", "warn", "error"]).default("info")
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error("Variables d environnement invalides:", parsed.error.flatten().fieldErrors);
  process.exit(1);
}

const raw = parsed.data;
const FRONTEND_ORIGINS = raw.FRONTEND_URL.split(",")
  .map((value) => value.trim())
  .filter(Boolean);

if (!FRONTEND_ORIGINS.length) {
  console.error("Variables d environnement invalides:", {
    FRONTEND_URL: ["Definir au moins une origine FRONTEND_URL"]
  });
  process.exit(1);
}

const AUTH_COOKIE_SECURE = parseBoolean(raw.AUTH_COOKIE_SECURE, raw.NODE_ENV === "production");
const AUTH_COOKIE_SAME_SITE = raw.AUTH_COOKIE_SAME_SITE ?? (raw.NODE_ENV === "production" ? "none" : "lax");

if (AUTH_COOKIE_SAME_SITE === "none" && !AUTH_COOKIE_SECURE) {
  console.error("Variables d environnement invalides:", {
    AUTH_COOKIE_SAME_SITE: ["sameSite=none requiert AUTH_COOKIE_SECURE=true"]
  });
  process.exit(1);
}

if (raw.NODE_ENV === "production" && raw.FILE_STORAGE_DRIVER !== "cloudinary") {
  console.error("Variables d environnement invalides:", {
    FILE_STORAGE_DRIVER: ["En production, utiliser FILE_STORAGE_DRIVER=cloudinary"]
  });
  process.exit(1);
}

if (
  raw.FILE_STORAGE_DRIVER === "cloudinary" &&
  (!raw.CLOUDINARY_CLOUD_NAME || !raw.CLOUDINARY_API_KEY || !raw.CLOUDINARY_API_SECRET)
) {
  console.error("Variables d environnement invalides:", {
    CLOUDINARY_CLOUD_NAME: ["Requis avec FILE_STORAGE_DRIVER=cloudinary"],
    CLOUDINARY_API_KEY: ["Requis avec FILE_STORAGE_DRIVER=cloudinary"],
    CLOUDINARY_API_SECRET: ["Requis avec FILE_STORAGE_DRIVER=cloudinary"]
  });
  process.exit(1);
}

export const env = {
  ...raw,
  ACCESS_TOKEN_EXPIRES_IN: raw.ACCESS_TOKEN_EXPIRES_IN ?? raw.JWT_EXPIRES_IN,
  JWT_REFRESH_SECRET: raw.JWT_REFRESH_SECRET ?? raw.JWT_SECRET,
  FRONTEND_ORIGINS,
  AUTH_COOKIE_SECURE,
  AUTH_COOKIE_SAME_SITE
};
