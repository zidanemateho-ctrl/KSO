import { Role, Stream, StudentLevel } from "@prisma/client";
import { Router } from "express";
import { z } from "zod";

import { academicController } from "../controllers/academic.controller";
import { authorize } from "../middlewares/authorize.middleware";
import { requireAuth } from "../middlewares/auth.middleware";
import { validateBody } from "../middlewares/validate.middleware";

const router = Router();

const classSchema = z.object({
  schoolId: z.string().optional(),
  name: z.string().min(2),
  room: z.string().optional(),
  level: z.nativeEnum(StudentLevel),
  stream: z.nativeEnum(Stream),
  academicYear: z.string().min(4)
});

const subjectSchema = z.object({
  schoolId: z.string().optional(),
  name: z.string().min(2),
  coefficient: z.number().positive(),
  isCore: z.boolean().optional()
});

const teacherSchema = z.object({
  schoolId: z.string().optional(),
  fullName: z.string().min(2),
  employeeCode: z.string().min(2),
  speciality: z.string().optional(),
  user: z
    .object({
      email: z.string().email(),
      password: z.string().min(8)
    })
    .optional()
});

const assignmentSchema = z.object({
  schoolId: z.string().optional(),
  teacherId: z.string().min(1),
  classId: z.string().min(1),
  subjectId: z.string().min(1)
});

router.use(requireAuth);

router.get(
  "/classes",
  authorize(Role.SUPER_ADMIN, Role.SCHOOL_ADMIN, Role.COLLEGE_ADMIN, Role.HIGH_SCHOOL_ADMIN, Role.UNIVERSITY_ADMIN, Role.TEACHER),
  academicController.listClasses
);
router.post(
  "/classes",
  authorize(Role.SUPER_ADMIN, Role.SCHOOL_ADMIN, Role.COLLEGE_ADMIN, Role.HIGH_SCHOOL_ADMIN, Role.UNIVERSITY_ADMIN),
  validateBody(classSchema),
  academicController.createClass
);

router.get(
  "/subjects",
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
  academicController.listSubjects
);
router.post(
  "/subjects",
  authorize(Role.SUPER_ADMIN, Role.SCHOOL_ADMIN, Role.COLLEGE_ADMIN, Role.HIGH_SCHOOL_ADMIN, Role.UNIVERSITY_ADMIN),
  validateBody(subjectSchema),
  academicController.createSubject
);

router.get(
  "/teachers",
  authorize(Role.SUPER_ADMIN, Role.SCHOOL_ADMIN, Role.COLLEGE_ADMIN, Role.HIGH_SCHOOL_ADMIN, Role.UNIVERSITY_ADMIN),
  academicController.listTeachers
);
router.post(
  "/teachers",
  authorize(Role.SUPER_ADMIN, Role.SCHOOL_ADMIN, Role.COLLEGE_ADMIN, Role.HIGH_SCHOOL_ADMIN, Role.UNIVERSITY_ADMIN),
  validateBody(teacherSchema),
  academicController.createTeacher
);
router.post(
  "/teachers/assignments",
  authorize(Role.SUPER_ADMIN, Role.SCHOOL_ADMIN, Role.COLLEGE_ADMIN, Role.HIGH_SCHOOL_ADMIN, Role.UNIVERSITY_ADMIN),
  validateBody(assignmentSchema),
  academicController.assignTeacher
);
router.get(
  "/teachers/:teacherId/performance",
  authorize(Role.SUPER_ADMIN, Role.SCHOOL_ADMIN, Role.COLLEGE_ADMIN, Role.HIGH_SCHOOL_ADMIN, Role.UNIVERSITY_ADMIN, Role.TEACHER),
  academicController.teacherPerformance
);

export default router;
