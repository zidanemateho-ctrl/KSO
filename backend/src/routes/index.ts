import { Router } from "express";

import academicRoutes from "./academic.routes";
import accompanimentRoutes from "./accompaniment.routes";
import analyticsRoutes from "./analytics.routes";
import authRoutes from "./auth.routes";
import chatRoutes from "./chat.routes";
import gradeRoutes from "./grade.routes";
import guidanceRoutes from "./guidance.routes";
import orientationRoutes from "./orientation.routes";
import schoolRoutes from "./school.routes";
import studentRoutes from "./student.routes";
import superAdminRoutes from "./superadmin.routes";

const router = Router();

router.use("/auth", authRoutes);
router.use("/schools", schoolRoutes);
router.use("/academic", academicRoutes);
router.use("/students", studentRoutes);
router.use("/grades", gradeRoutes);
router.use("/analytics", analyticsRoutes);
router.use("/orientation", orientationRoutes);
router.use("/accompaniment", accompanimentRoutes);
router.use("/guidance", guidanceRoutes);
router.use("/chat", chatRoutes);
router.use("/superadmin", superAdminRoutes);

export default router;
