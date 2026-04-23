import { AlertSeverity, PlanStatus, Role } from "@prisma/client";
import { Router } from "express";
import { z } from "zod";

import { accompanimentController } from "../controllers/accompaniment.controller";
import { authorize } from "../middlewares/authorize.middleware";
import { requireAuth } from "../middlewares/auth.middleware";
import { validateBody } from "../middlewares/validate.middleware";

const router = Router();

const planSchema = z.object({
  title: z.string().min(3),
  description: z.string().optional(),
  status: z.nativeEnum(PlanStatus).optional(),
  dueDate: z.string().optional()
});

const updatePlanSchema = z
  .object({
    title: z.string().min(3).optional(),
    description: z.string().optional(),
    status: z.nativeEnum(PlanStatus).optional(),
    dueDate: z.string().optional()
  })
  .refine(
    (payload) =>
      payload.title !== undefined ||
      payload.description !== undefined ||
      payload.status !== undefined ||
      payload.dueDate !== undefined,
    {
      message: "Aucune modification fournie"
    }
  );

const alertSchema = z.object({
  severity: z.nativeEnum(AlertSeverity),
  category: z.string().min(2),
  title: z.string().min(3),
  message: z.string().min(5)
});

router.use(requireAuth);

router.get(
  "/student/:studentId/overview",
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
  accompanimentController.studentOverview
);

router.get(
  "/student/:studentId/plans",
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
  accompanimentController.listPlans
);

router.post(
  "/student/:studentId/plans",
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
  validateBody(planSchema),
  accompanimentController.createPlan
);

router.patch(
  "/plans/:planId",
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
  validateBody(updatePlanSchema),
  accompanimentController.updatePlan
);

router.get(
  "/student/:studentId/alerts",
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
  accompanimentController.listAlerts
);

router.post(
  "/student/:studentId/alerts",
  authorize(Role.SUPER_ADMIN, Role.SCHOOL_ADMIN, Role.COLLEGE_ADMIN, Role.HIGH_SCHOOL_ADMIN, Role.UNIVERSITY_ADMIN, Role.TEACHER),
  validateBody(alertSchema),
  accompanimentController.createAlert
);

router.patch(
  "/alerts/:alertId/read",
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
  accompanimentController.markAlertRead
);

export default router;
