import { Role, Stream, StudentLevel, StudentProfileType } from "@prisma/client";
import { Router } from "express";
import { z } from "zod";

import { studentController } from "../controllers/student.controller";
import { authorize } from "../middlewares/authorize.middleware";
import { requireAuth } from "../middlewares/auth.middleware";
import { validateBody } from "../middlewares/validate.middleware";

const router = Router();

const studentSchema = z.object({
  schoolId: z.string().optional(),
  classId: z.string().optional(),
  preferredSubjectId: z.string().optional(),
  registrationNumber: z.string().min(2),
  fullName: z.string().min(2),
  dateOfBirth: z.string().optional(),
  profileType: z.nativeEnum(StudentProfileType).optional(),
  level: z.nativeEnum(StudentLevel),
  stream: z.nativeEnum(Stream),
  guardianPhone: z.string().optional(),
  dreamCareer: z.string().optional(),
  targetProfession: z.string().optional(),
  learningObjectives: z.string().optional(),
  admissionYear: z.number().int().optional(),
  user: z
    .object({
      email: z.string().email(),
      password: z.string().min(8)
    })
    .optional()
});

const studentUpdateSchema = studentSchema.partial();

const linkParentSchema = z.object({
  relationship: z.string().optional(),
  parentUserId: z.string().optional(),
  parent: z
    .object({
      fullName: z.string().min(2),
      email: z.string().email(),
      password: z.string().min(8)
    })
    .optional()
});

router.use(requireAuth);

router.get(
  "/",
  authorize(Role.SUPER_ADMIN, Role.SCHOOL_ADMIN, Role.COLLEGE_ADMIN, Role.HIGH_SCHOOL_ADMIN, Role.UNIVERSITY_ADMIN, Role.TEACHER, Role.PARENT, Role.STUDENT, Role.UNIVERSITY_STUDENT),
  studentController.list
);
router.get(
  "/:id",
  authorize(Role.SUPER_ADMIN, Role.SCHOOL_ADMIN, Role.COLLEGE_ADMIN, Role.HIGH_SCHOOL_ADMIN, Role.UNIVERSITY_ADMIN, Role.TEACHER, Role.PARENT, Role.STUDENT, Role.UNIVERSITY_STUDENT),
  studentController.getById
);
router.post(
  "/",
  authorize(Role.SUPER_ADMIN, Role.SCHOOL_ADMIN, Role.COLLEGE_ADMIN, Role.HIGH_SCHOOL_ADMIN, Role.UNIVERSITY_ADMIN),
  validateBody(studentSchema),
  studentController.create
);
router.patch(
  "/:id",
  authorize(Role.SUPER_ADMIN, Role.SCHOOL_ADMIN, Role.COLLEGE_ADMIN, Role.HIGH_SCHOOL_ADMIN, Role.UNIVERSITY_ADMIN),
  validateBody(studentUpdateSchema),
  studentController.update
);
router.delete(
  "/:id",
  authorize(Role.SUPER_ADMIN, Role.SCHOOL_ADMIN, Role.COLLEGE_ADMIN, Role.HIGH_SCHOOL_ADMIN, Role.UNIVERSITY_ADMIN),
  studentController.remove
);
router.post(
  "/:id/parents",
  authorize(Role.SUPER_ADMIN, Role.SCHOOL_ADMIN, Role.COLLEGE_ADMIN, Role.HIGH_SCHOOL_ADMIN, Role.UNIVERSITY_ADMIN),
  validateBody(linkParentSchema),
  studentController.linkParent
);

export default router;
