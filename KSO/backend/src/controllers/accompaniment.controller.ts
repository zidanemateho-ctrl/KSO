import { Request, Response } from "express";

import { accompanimentService } from "../services/accompaniment.service";
import { asyncHandler } from "../utils/async-handler";

function firstParam(param: string | string[]) {
  return Array.isArray(param) ? param[0] : param;
}

export const accompanimentController = {
  studentOverview: asyncHandler(async (req: Request, res: Response) => {
    const data = await accompanimentService.studentOverview(firstParam(req.params.studentId), req.user!);
    res.json(data);
  }),

  listPlans: asyncHandler(async (req: Request, res: Response) => {
    const data = await accompanimentService.listPlans(firstParam(req.params.studentId), req.user!);
    res.json(data);
  }),

  createPlan: asyncHandler(async (req: Request, res: Response) => {
    const data = await accompanimentService.createPlan(firstParam(req.params.studentId), req.body, req.user!);
    res.status(201).json(data);
  }),

  updatePlan: asyncHandler(async (req: Request, res: Response) => {
    const data = await accompanimentService.updatePlan(firstParam(req.params.planId), req.body, req.user!);
    res.json(data);
  }),

  listAlerts: asyncHandler(async (req: Request, res: Response) => {
    const data = await accompanimentService.listAlerts(firstParam(req.params.studentId), req.user!);
    res.json(data);
  }),

  createAlert: asyncHandler(async (req: Request, res: Response) => {
    const data = await accompanimentService.addAlert(firstParam(req.params.studentId), req.body, req.user!);
    res.status(201).json(data);
  }),

  markAlertRead: asyncHandler(async (req: Request, res: Response) => {
    const data = await accompanimentService.markAlertAsRead(firstParam(req.params.alertId), req.user!);
    res.json(data);
  })
};
