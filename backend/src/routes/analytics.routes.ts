import { Role } from "@prisma/client";
import { Router } from "express";
import { z } from "zod";

import { analyticsController } from "../controllers/analytics.controller";
import { authorize } from "../middlewares/authorize.middleware";
import { requireAuth } from "../middlewares/auth.middleware";
import { validateBody } from "../middlewares/validate.middleware";

const router = Router();

const simulateSchema = z.object({
  semester: z.enum(["SEMESTER_1", "SEMESTER_2"]),
  sequence: z.enum(["SEQUENCE_1", "SEQUENCE_2", "SEQUENCE_3"]).optional(),
  subjectId: z.string().min(1),
  score: z.number().min(0),
  maxScore: z.number().positive().optional()
});

router.use(requireAuth);
router.get(
  "/student/:id",
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
  analyticsController.student
);
router.post(
  "/student/:id/simulate",
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
  validateBody(simulateSchema),
  analyticsController.simulateStudent
);
router.get(
  "/class/:id",
  authorize(Role.SUPER_ADMIN, Role.SCHOOL_ADMIN, Role.COLLEGE_ADMIN, Role.HIGH_SCHOOL_ADMIN, Role.UNIVERSITY_ADMIN, Role.TEACHER),
  analyticsController.class
);
router.get(
  "/teacher/:id/evolution",
  authorize(Role.SUPER_ADMIN, Role.SCHOOL_ADMIN, Role.COLLEGE_ADMIN, Role.HIGH_SCHOOL_ADMIN, Role.UNIVERSITY_ADMIN, Role.TEACHER),
  analyticsController.teacherEvolution
);
router.get(
  "/school/:id",
  authorize(Role.SUPER_ADMIN, Role.SCHOOL_ADMIN, Role.COLLEGE_ADMIN, Role.HIGH_SCHOOL_ADMIN, Role.UNIVERSITY_ADMIN),
  analyticsController.school
);

export default router;
