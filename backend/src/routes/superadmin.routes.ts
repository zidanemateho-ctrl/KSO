import { Role, StudentLevel, StudentProfileType, Stream } from "@prisma/client";
import { Router } from "express";
import multer from "multer";
import path from "path";
import { z } from "zod";

import { env } from "../config/env";
import { superAdminController } from "../controllers/superadmin.controller";
import { authorize } from "../middlewares/authorize.middleware";
import { requireAuth } from "../middlewares/auth.middleware";
import { createRateLimiter } from "../middlewares/rate-limit.middleware";
import { validateBody } from "../middlewares/validate.middleware";

const router = Router();
const allowedImportExtensions = new Set([".csv", ".xls", ".xlsx"]);
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 8 * 1024 * 1024
  },
  fileFilter: (_req, file, cb) => {
    const extension = path.extname(file.originalname).toLowerCase();
    if (!allowedImportExtensions.has(extension)) {
      cb(new Error("Format non supporte. Utilisez CSV ou Excel."));
      return;
    }

    cb(null, true);
  }
});

const uploadRateLimiter = createRateLimiter({
  identifier: "student_import",
  max: env.RATE_LIMIT_UPLOAD_MAX,
  windowMs: env.RATE_LIMIT_UPLOAD_WINDOW_MS,
  keyGenerator: (req) => req.user?.id ?? req.ip ?? "anonymous"
});

const announcementSchema = z
  .object({
    title: z.string().min(3),
    content: z.string().min(5),
    startsAt: z.string().optional(),
    endsAt: z.string().optional(),
    targetSchoolId: z.string().optional(),
    isPublished: z.boolean().optional()
  })
  .refine(
    (payload) => {
      if (!payload.startsAt || !payload.endsAt) {
        return true;
      }

      return new Date(payload.startsAt).getTime() <= new Date(payload.endsAt).getTime();
    },
    {
      message: "La date de fin doit etre posterieure a la date de debut",
      path: ["endsAt"]
    }
  );

const studentImportOptionsSchema = z.object({
  defaultAcademicYear: z.string().optional(),
  defaultLevel: z.nativeEnum(StudentLevel).optional(),
  defaultStream: z.nativeEnum(Stream).optional(),
  defaultProfileType: z.nativeEnum(StudentProfileType).optional()
});

router.use(requireAuth);
router.use(authorize(Role.SUPER_ADMIN));

router.get("/dashboard", superAdminController.dashboard);
router.get("/establishments", superAdminController.establishments);
router.get("/establishments/:schoolId", superAdminController.establishmentDetails);
router.post(
  "/establishments/:schoolId/students/import",
  uploadRateLimiter,
  upload.single("file"),
  validateBody(studentImportOptionsSchema),
  superAdminController.importStudents
);

router.get("/announcements", superAdminController.listAnnouncements);
router.post("/announcements", validateBody(announcementSchema), superAdminController.createAnnouncement);

router.get("/progression", superAdminController.progress);

export default router;
