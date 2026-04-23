import { Role } from "@prisma/client";
import { Router } from "express";

import { orientationController } from "../controllers/orientation.controller";
import { authorize } from "../middlewares/authorize.middleware";
import { requireAuth } from "../middlewares/auth.middleware";

const router = Router();

router.use(requireAuth);
router.get(
  "/student/:studentId",
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
  orientationController.studentProfile
);
router.post(
  "/student/:studentId/recompute",
  authorize(Role.SUPER_ADMIN, Role.SCHOOL_ADMIN, Role.COLLEGE_ADMIN, Role.HIGH_SCHOOL_ADMIN, Role.UNIVERSITY_ADMIN, Role.TEACHER),
  orientationController.recomputeStudent
);
router.get(
  "/school/:schoolId",
  authorize(Role.SUPER_ADMIN, Role.SCHOOL_ADMIN, Role.COLLEGE_ADMIN, Role.HIGH_SCHOOL_ADMIN, Role.UNIVERSITY_ADMIN, Role.TEACHER),
  orientationController.schoolProfiles
);

export default router;
