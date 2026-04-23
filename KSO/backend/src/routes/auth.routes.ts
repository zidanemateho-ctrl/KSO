import { Role } from "@prisma/client";
import { Router } from "express";
import { z } from "zod";

import { env } from "../config/env";
import { authController } from "../controllers/auth.controller";
import { requireAuth } from "../middlewares/auth.middleware";
import { createRateLimiter } from "../middlewares/rate-limit.middleware";
import { validateBody } from "../middlewares/validate.middleware";

const router = Router();

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  fullName: z.string().min(2),
  role: z.nativeEnum(Role),
  schoolId: z.string().optional()
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1)
});

const forgotPasswordSchema = z.object({
  email: z.string().email()
});

const resetPasswordSchema = z.object({
  token: z.string().min(8),
  password: z.string().min(8)
});

const authRateLimiter = createRateLimiter({
  identifier: "auth",
  max: env.RATE_LIMIT_AUTH_MAX,
  windowMs: env.RATE_LIMIT_AUTH_WINDOW_MS,
  keyGenerator: (req) => `${req.ip}:${req.path}`
});

router.post("/register", authRateLimiter, validateBody(registerSchema), authController.register);
router.post("/login", authRateLimiter, validateBody(loginSchema), authController.login);
router.post("/refresh", authRateLimiter, authController.refresh);
router.post("/logout", authController.logout);
router.post("/forgot-password", authRateLimiter, validateBody(forgotPasswordSchema), authController.forgotPassword);
router.post("/reset-password", authRateLimiter, validateBody(resetPasswordSchema), authController.resetPassword);
router.get("/me", requireAuth, authController.me);

export default router;
