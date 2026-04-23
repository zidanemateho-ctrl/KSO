import { Role, Stream, StudentLevel, StudentProfileType } from "@prisma/client";
import { Router } from "express";
import multer from "multer";
import path from "path";
import { z } from "zod";

import { env } from "../config/env";
import { chatController } from "../controllers/chat.controller";
import { authorize } from "../middlewares/authorize.middleware";
import { requireAuth } from "../middlewares/auth.middleware";
import { createRateLimiter } from "../middlewares/rate-limit.middleware";
import { validateBody } from "../middlewares/validate.middleware";

const router = Router();

const createGroupSchema = z.object({
  profileType: z.nativeEnum(StudentProfileType),
  level: z.nativeEnum(StudentLevel),
  stream: z.nativeEnum(Stream),
  academicYear: z.string().min(4),
  name: z.string().optional()
});

const postMessageSchema = z.object({
  content: z.string().min(1).max(1500)
});

const allowedFileExtensions = new Set([".png", ".jpg", ".jpeg", ".gif", ".webp", ".pdf", ".doc", ".docx", ".xls", ".xlsx"]);

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024
  },
  fileFilter: (_req, file, cb) => {
    const extension = path.extname(file.originalname).toLowerCase();
    if (!allowedFileExtensions.has(extension)) {
      cb(new Error("Type de fichier non supporte. Autorises: image, pdf, doc, xls."));
      return;
    }

    cb(null, true);
  }
});

const uploadRateLimiter = createRateLimiter({
  identifier: "chat_upload",
  max: env.RATE_LIMIT_UPLOAD_MAX,
  windowMs: env.RATE_LIMIT_UPLOAD_WINDOW_MS,
  keyGenerator: (req) => req.user?.id ?? req.ip ?? "anonymous"
});

router.use(requireAuth);

router.get(
  "/groups",
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
  chatController.listGroups
);

router.get(
  "/emojis",
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
  chatController.listEmojis
);

router.post(
  "/groups",
  authorize(Role.SUPER_ADMIN, Role.SCHOOL_ADMIN, Role.COLLEGE_ADMIN, Role.HIGH_SCHOOL_ADMIN, Role.UNIVERSITY_ADMIN, Role.TEACHER),
  validateBody(createGroupSchema),
  chatController.createGroup
);

router.post(
  "/groups/auto-join",
  authorize(Role.STUDENT, Role.UNIVERSITY_STUDENT),
  chatController.autoJoin
);

router.get(
  "/groups/:groupId/messages",
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
  chatController.listMessages
);

router.post(
  "/groups/:groupId/messages",
  authorize(
    Role.SUPER_ADMIN,
    Role.SCHOOL_ADMIN,
    Role.COLLEGE_ADMIN,
    Role.HIGH_SCHOOL_ADMIN,
    Role.UNIVERSITY_ADMIN,
    Role.TEACHER,
    Role.STUDENT,
    Role.UNIVERSITY_STUDENT
  ),
  validateBody(postMessageSchema),
  chatController.postMessage
);

router.post(
  "/groups/:groupId/upload",
  authorize(
    Role.SUPER_ADMIN,
    Role.SCHOOL_ADMIN,
    Role.COLLEGE_ADMIN,
    Role.HIGH_SCHOOL_ADMIN,
    Role.UNIVERSITY_ADMIN,
    Role.TEACHER,
    Role.STUDENT,
    Role.UNIVERSITY_STUDENT
  ),
  uploadRateLimiter,
  upload.single("file"),
  chatController.uploadAttachment
);

router.delete(
  "/messages/:messageId",
  authorize(
    Role.SUPER_ADMIN,
    Role.SCHOOL_ADMIN,
    Role.COLLEGE_ADMIN,
    Role.HIGH_SCHOOL_ADMIN,
    Role.UNIVERSITY_ADMIN,
    Role.TEACHER,
    Role.STUDENT,
    Role.UNIVERSITY_STUDENT
  ),
  chatController.deleteMessage
);

export default router;
