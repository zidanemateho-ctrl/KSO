import {
  AlertSeverity,
  AlumniOutcomeType,
  ApplicationStatus,
  AttendanceStatus,
  BadgeType,
  CompetencyCategory,
  InternshipType,
  OpportunityType,
  PlanStatus,
  PortfolioCategory,
  Role,
  SessionStatus,
  StudentLevel,
  StudentProfileType,
  Stream
} from "@prisma/client";
import { Router } from "express";
import { z } from "zod";

import { guidanceController } from "../controllers/guidance.controller";
import { authorize } from "../middlewares/authorize.middleware";
import { requireAuth } from "../middlewares/auth.middleware";
import { validateBody } from "../middlewares/validate.middleware";

const router = Router();

const planTaskSchema = z.object({
  title: z.string().min(2),
  description: z.string().optional(),
  status: z.nativeEnum(PlanStatus).optional(),
  dueDate: z.string().optional(),
  assignedToUserId: z.string().optional()
});

const updatePlanTaskSchema = z
  .object({
    title: z.string().min(2).optional(),
    description: z.string().optional(),
    status: z.nativeEnum(PlanStatus).optional(),
    dueDate: z.string().optional(),
    assignedToUserId: z.union([z.string(), z.null()]).optional()
  })
  .refine(
    (payload) =>
      payload.title !== undefined ||
      payload.description !== undefined ||
      payload.status !== undefined ||
      payload.dueDate !== undefined ||
      payload.assignedToUserId !== undefined,
    { message: "Aucune modification fournie" }
  );

const collaboratorSchema = z.object({
  userId: z.string().min(1),
  roleLabel: z.string().min(2)
});

const attendanceSchema = z.object({
  date: z.string().optional(),
  status: z.nativeEnum(AttendanceStatus),
  note: z.string().optional()
});

const incidentSchema = z.object({
  category: z.string().min(2),
  severity: z.nativeEnum(AlertSeverity),
  description: z.string().min(3),
  occurredAt: z.string().optional()
});

const competencySchema = z.object({
  category: z.nativeEnum(CompetencyCategory),
  label: z.string().min(2),
  score: z.number().min(0).max(100),
  comment: z.string().optional()
});

const opportunitySchema = z.object({
  schoolId: z.string().optional(),
  title: z.string().min(2),
  description: z.string().min(5),
  type: z.nativeEnum(OpportunityType),
  targetStream: z.nativeEnum(Stream).optional(),
  targetLevel: z.nativeEnum(StudentLevel).optional(),
  targetProfile: z.nativeEnum(StudentProfileType).optional(),
  targetSchoolType: z.enum(["COLLEGE", "HIGH_SCHOOL", "UNIVERSITY"]).optional(),
  location: z.string().optional(),
  applicationUrl: z.string().optional(),
  deadline: z.string().optional(),
  tags: z.string().optional()
});

const internshipSchema = z.object({
  type: z.nativeEnum(InternshipType),
  title: z.string().min(2),
  organization: z.string().min(2),
  status: z.nativeEnum(ApplicationStatus).optional(),
  notes: z.string().optional()
});

const mentorshipSchema = z.object({
  mentorUserId: z.string().optional(),
  mentorName: z.string().min(2),
  topic: z.string().min(2),
  meetingLink: z.string().optional(),
  notes: z.string().optional(),
  scheduledAt: z.string(),
  status: z.nativeEnum(SessionStatus).optional()
});

const journalSchema = z.object({
  weekStart: z.string(),
  summary: z.string().min(3),
  parentNote: z.string().optional(),
  teacherNote: z.string().optional(),
  tips: z.string().optional()
});

const portfolioSchema = z.object({
  title: z.string().min(2),
  description: z.string().optional(),
  category: z.nativeEnum(PortfolioCategory),
  url: z.string().optional(),
  evidence: z.string().optional(),
  awardedAt: z.string().optional()
});

const wellbeingSchema = z.object({
  mood: z.number().int().min(1).max(5),
  stress: z.number().int().min(1).max(5),
  energy: z.number().int().min(1).max(5),
  comment: z.string().optional()
});

const badgeSchema = z.object({
  badgeType: z.nativeEnum(BadgeType),
  title: z.string().min(2),
  description: z.string().optional(),
  points: z.number().int().optional()
});

const alumniSchema = z.object({
  studentId: z.string().optional(),
  fullName: z.string().optional(),
  graduationYear: z.number().int().min(1990).max(2100),
  outcomeType: z.nativeEnum(AlumniOutcomeType),
  organization: z.string().optional(),
  country: z.string().optional(),
  isVerified: z.boolean().optional()
});

const syncExternalGradesSchema = z.object({
  schoolId: z.string().optional(),
  source: z.string().min(2),
  teacherId: z.string().optional(),
  rows: z
    .array(
      z.object({
        registrationNumber: z.string().min(2),
        subjectName: z.string().min(2),
        semester: z.enum(["SEMESTER_1", "SEMESTER_2"]),
        sequence: z.enum(["SEQUENCE_1", "SEQUENCE_2", "SEQUENCE_3"]).optional(),
        score: z.number().min(0),
        maxScore: z.number().positive().optional(),
        comment: z.string().optional()
      })
    )
    .min(1)
});

router.use(requireAuth);

router.get(
  "/student/:studentId/hub",
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
  guidanceController.studentHub
);

router.get(
  "/student/:studentId/remediation",
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
  guidanceController.remediation
);

router.post(
  "/plans/:planId/tasks",
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
  validateBody(planTaskSchema),
  guidanceController.addPlanTask
);

router.patch(
  "/plans/tasks/:taskId",
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
  validateBody(updatePlanTaskSchema),
  guidanceController.updatePlanTask
);

router.post(
  "/plans/:planId/collaborators",
  authorize(Role.SUPER_ADMIN, Role.SCHOOL_ADMIN, Role.COLLEGE_ADMIN, Role.HIGH_SCHOOL_ADMIN, Role.UNIVERSITY_ADMIN, Role.TEACHER),
  validateBody(collaboratorSchema),
  guidanceController.addPlanCollaborator
);

router.post(
  "/student/:studentId/attendance",
  authorize(Role.SUPER_ADMIN, Role.SCHOOL_ADMIN, Role.COLLEGE_ADMIN, Role.HIGH_SCHOOL_ADMIN, Role.UNIVERSITY_ADMIN, Role.TEACHER),
  validateBody(attendanceSchema),
  guidanceController.addAttendance
);

router.post(
  "/student/:studentId/incidents",
  authorize(Role.SUPER_ADMIN, Role.SCHOOL_ADMIN, Role.COLLEGE_ADMIN, Role.HIGH_SCHOOL_ADMIN, Role.UNIVERSITY_ADMIN, Role.TEACHER),
  validateBody(incidentSchema),
  guidanceController.addIncident
);

router.post(
  "/student/:studentId/competencies",
  authorize(Role.SUPER_ADMIN, Role.SCHOOL_ADMIN, Role.COLLEGE_ADMIN, Role.HIGH_SCHOOL_ADMIN, Role.UNIVERSITY_ADMIN, Role.TEACHER),
  validateBody(competencySchema),
  guidanceController.addCompetency
);

router.post(
  "/opportunities",
  authorize(Role.SUPER_ADMIN, Role.SCHOOL_ADMIN, Role.COLLEGE_ADMIN, Role.HIGH_SCHOOL_ADMIN, Role.UNIVERSITY_ADMIN, Role.TEACHER),
  validateBody(opportunitySchema),
  guidanceController.createOpportunity
);

router.get(
  "/student/:studentId/opportunities/matches",
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
  guidanceController.matchOpportunities
);

router.post(
  "/student/:studentId/internships",
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
  validateBody(internshipSchema),
  guidanceController.addInternship
);

router.post(
  "/student/:studentId/mentorship",
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
  validateBody(mentorshipSchema),
  guidanceController.addMentorship
);

router.post(
  "/student/:studentId/journal",
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
  validateBody(journalSchema),
  guidanceController.addJournal
);

router.post(
  "/student/:studentId/portfolio",
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
  validateBody(portfolioSchema),
  guidanceController.addPortfolio
);

router.post(
  "/student/:studentId/wellbeing",
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
  validateBody(wellbeingSchema),
  guidanceController.addWellbeing
);

router.post(
  "/student/:studentId/badges",
  authorize(Role.SUPER_ADMIN, Role.SCHOOL_ADMIN, Role.COLLEGE_ADMIN, Role.HIGH_SCHOOL_ADMIN, Role.UNIVERSITY_ADMIN, Role.TEACHER),
  validateBody(badgeSchema),
  guidanceController.addBadge
);

router.post(
  "/school/:schoolId/alumni",
  authorize(Role.SUPER_ADMIN, Role.SCHOOL_ADMIN, Role.COLLEGE_ADMIN, Role.HIGH_SCHOOL_ADMIN, Role.UNIVERSITY_ADMIN, Role.TEACHER),
  validateBody(alumniSchema),
  guidanceController.addAlumniOutcome
);

router.get(
  "/school/:schoolId/alumni-stats",
  authorize(Role.SUPER_ADMIN, Role.SCHOOL_ADMIN, Role.COLLEGE_ADMIN, Role.HIGH_SCHOOL_ADMIN, Role.UNIVERSITY_ADMIN, Role.TEACHER),
  guidanceController.alumniStats
);

router.post(
  "/integrations/grades-sync",
  authorize(Role.SUPER_ADMIN, Role.SCHOOL_ADMIN, Role.COLLEGE_ADMIN, Role.HIGH_SCHOOL_ADMIN, Role.UNIVERSITY_ADMIN, Role.TEACHER),
  validateBody(syncExternalGradesSchema),
  guidanceController.syncExternalGrades
);

export default router;
