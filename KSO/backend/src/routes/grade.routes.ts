import { Role, Semester, Sequence } from "@prisma/client";
import { Router } from "express";
import multer from "multer";
import path from "path";
import { z } from "zod";

import { env } from "../config/env";
import { gradeController } from "../controllers/grade.controller";
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
  identifier: "grade_import",
  max: env.RATE_LIMIT_UPLOAD_MAX,
  windowMs: env.RATE_LIMIT_UPLOAD_WINDOW_MS,
  keyGenerator: (req) => req.user?.id ?? req.ip ?? "anonymous"
});

const gradeSchema = z.object({
  schoolId: z.string().optional(),
  studentId: z.string().min(1),
  classId: z.string().min(1),
  subjectId: z.string().min(1),
  semester: z.nativeEnum(Semester),
  sequence: z.nativeEnum(Sequence).optional(),
  score: z.number().min(0),
  maxScore: z.number().positive().optional(),
  comment: z.string().optional(),
  teacherId: z.string().optional()
});

const gradeUpdateSchema = z
  .object({
    semester: z.nativeEnum(Semester).optional(),
    sequence: z.nativeEnum(Sequence).optional(),
    score: z.number().min(0).optional(),
    maxScore: z.number().positive().optional(),
    comment: z.string().optional()
  })
  .refine(
    (payload) =>
      payload.semester !== undefined ||
      payload.sequence !== undefined ||
      payload.score !== undefined ||
      payload.maxScore !== undefined ||
      payload.comment !== undefined,
    {
      message: "Aucune modification fournie"
    }
  );

router.use(requireAuth);

router.get(
  "/",
  authorize(
    Role.SUPER_ADMIN,
    Role.SCHOOL_ADMIN,
    Role.COLLEGE_ADMIN,
    Role.HIGH_SCHOOL_ADMIN,
    Role.UNIVERSITY_ADMIN,
    Role.TEACHER,
    Role.STUDENT,
    Role.UNIVERSITY_STUDENT,
    Role.PARENT
  ),
  gradeController.list
);
router.post(
  "/",
  authorize(Role.SUPER_ADMIN, Role.SCHOOL_ADMIN, Role.COLLEGE_ADMIN, Role.HIGH_SCHOOL_ADMIN, Role.UNIVERSITY_ADMIN, Role.TEACHER),
  validateBody(gradeSchema),
  gradeController.create
);
router.patch(
  "/:id",
  authorize(Role.SUPER_ADMIN, Role.SCHOOL_ADMIN, Role.COLLEGE_ADMIN, Role.HIGH_SCHOOL_ADMIN, Role.UNIVERSITY_ADMIN, Role.TEACHER),
  validateBody(gradeUpdateSchema),
  gradeController.update
);
router.post(
  "/import",
  authorize(Role.SUPER_ADMIN, Role.SCHOOL_ADMIN, Role.COLLEGE_ADMIN, Role.HIGH_SCHOOL_ADMIN, Role.UNIVERSITY_ADMIN, Role.TEACHER),
  uploadRateLimiter,
  upload.single("file"),
  gradeController.import
);

export default router;
