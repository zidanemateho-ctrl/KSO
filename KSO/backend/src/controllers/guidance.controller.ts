import { Request, Response } from "express";

import { guidanceService } from "../services/guidance.service";
import { asyncHandler } from "../utils/async-handler";

function firstParam(param: string | string[]) {
  return Array.isArray(param) ? param[0] : param;
}

export const guidanceController = {
  studentHub: asyncHandler(async (req: Request, res: Response) => {
    const data = await guidanceService.studentHub(firstParam(req.params.studentId), req.user!);
    res.json(data);
  }),

  remediation: asyncHandler(async (req: Request, res: Response) => {
    const data = await guidanceService.remediation(firstParam(req.params.studentId), req.user!);
    res.json(data);
  }),

  addPlanTask: asyncHandler(async (req: Request, res: Response) => {
    const data = await guidanceService.addPlanTask(firstParam(req.params.planId), req.body, req.user!);
    res.status(201).json(data);
  }),

  updatePlanTask: asyncHandler(async (req: Request, res: Response) => {
    const data = await guidanceService.updatePlanTask(firstParam(req.params.taskId), req.body, req.user!);
    res.json(data);
  }),

  addPlanCollaborator: asyncHandler(async (req: Request, res: Response) => {
    const data = await guidanceService.addPlanCollaborator(firstParam(req.params.planId), req.body, req.user!);
    res.status(201).json(data);
  }),

  addAttendance: asyncHandler(async (req: Request, res: Response) => {
    const data = await guidanceService.addAttendance(firstParam(req.params.studentId), req.body, req.user!);
    res.status(201).json(data);
  }),

  addIncident: asyncHandler(async (req: Request, res: Response) => {
    const data = await guidanceService.addBehaviorIncident(firstParam(req.params.studentId), req.body, req.user!);
    res.status(201).json(data);
  }),

  addCompetency: asyncHandler(async (req: Request, res: Response) => {
    const data = await guidanceService.addCompetency(firstParam(req.params.studentId), req.body, req.user!);
    res.status(201).json(data);
  }),

  createOpportunity: asyncHandler(async (req: Request, res: Response) => {
    const data = await guidanceService.createOpportunity(req.body, req.user!);
    res.status(201).json(data);
  }),

  matchOpportunities: asyncHandler(async (req: Request, res: Response) => {
    const data = await guidanceService.matchOpportunities(firstParam(req.params.studentId), req.user!);
    res.json(data);
  }),

  addInternship: asyncHandler(async (req: Request, res: Response) => {
    const data = await guidanceService.addInternship(firstParam(req.params.studentId), req.body, req.user!);
    res.status(201).json(data);
  }),

  addMentorship: asyncHandler(async (req: Request, res: Response) => {
    const data = await guidanceService.addMentorshipSession(firstParam(req.params.studentId), req.body, req.user!);
    res.status(201).json(data);
  }),

  addJournal: asyncHandler(async (req: Request, res: Response) => {
    const data = await guidanceService.addJournalEntry(firstParam(req.params.studentId), req.body, req.user!);
    res.status(201).json(data);
  }),

  addPortfolio: asyncHandler(async (req: Request, res: Response) => {
    const data = await guidanceService.addPortfolioItem(firstParam(req.params.studentId), req.body, req.user!);
    res.status(201).json(data);
  }),

  addWellbeing: asyncHandler(async (req: Request, res: Response) => {
    const data = await guidanceService.addWellbeingCheckin(firstParam(req.params.studentId), req.body, req.user!);
    res.status(201).json(data);
  }),

  addBadge: asyncHandler(async (req: Request, res: Response) => {
    const data = await guidanceService.awardBadge(firstParam(req.params.studentId), req.body, req.user!);
    res.status(201).json(data);
  }),

  addAlumniOutcome: asyncHandler(async (req: Request, res: Response) => {
    const data = await guidanceService.createAlumniOutcome(firstParam(req.params.schoolId), req.body, req.user!);
    res.status(201).json(data);
  }),

  alumniStats: asyncHandler(async (req: Request, res: Response) => {
    const data = await guidanceService.schoolAlumniStats(firstParam(req.params.schoolId), req.user!);
    res.json(data);
  }),

  syncExternalGrades: asyncHandler(async (req: Request, res: Response) => {
    const data = await guidanceService.syncExternalGrades(req.body, req.user!);
    res.status(201).json(data);
  })
};
