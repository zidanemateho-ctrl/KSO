import { Role, SchoolType } from "@prisma/client";
import { Router } from "express";
import { z } from "zod";

import { schoolController } from "../controllers/school.controller";
import { authorize } from "../middlewares/authorize.middleware";
import { requireAuth } from "../middlewares/auth.middleware";
import { validateBody } from "../middlewares/validate.middleware";

const router = Router();

const createSchoolSchema = z.object({
  name: z.string().min(2),
  code: z.string().min(2),
  city: z.string().min(2),
  country: z.string().optional(),
  type: z.nativeEnum(SchoolType).optional(),
  admin: z
    .object({
      fullName: z.string().min(2),
      email: z.string().email(),
      password: z.string().min(8)
    })
    .optional()
});

const updateSchoolSchema = createSchoolSchema.partial().extend({
  isActive: z.boolean().optional()
});

router.use(requireAuth);
router.get("/", schoolController.list);
router.get("/:id", schoolController.getById);
router.post("/", authorize(Role.SUPER_ADMIN), validateBody(createSchoolSchema), schoolController.create);
router.patch(
  "/:id",
  authorize(Role.SUPER_ADMIN, Role.SCHOOL_ADMIN, Role.COLLEGE_ADMIN, Role.HIGH_SCHOOL_ADMIN, Role.UNIVERSITY_ADMIN),
  validateBody(updateSchoolSchema),
  schoolController.update
);
router.delete("/:id", authorize(Role.SUPER_ADMIN), schoolController.remove);

export default router;
