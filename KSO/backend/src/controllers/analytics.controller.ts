import { Request, Response } from "express";

import { analyticsService } from "../services/analytics.service";
import { asyncHandler } from "../utils/async-handler";

function firstParam(param: string | string[]) {
  return Array.isArray(param) ? param[0] : param;
}

export const analyticsController = {
  student: asyncHandler(async (req: Request, res: Response) => {
    const data = await analyticsService.student(firstParam(req.params.id), req.user!);
    res.json(data);
  }),

  class: asyncHandler(async (req: Request, res: Response) => {
    const semester =
      req.query.semester === "SEMESTER_1" || req.query.semester === "SEMESTER_2"
        ? req.query.semester
        : undefined;

    const data = await analyticsService.class(firstParam(req.params.id), req.user!, semester);
    res.json(data);
  }),

  teacherEvolution: asyncHandler(async (req: Request, res: Response) => {
    const semester =
      req.query.semester === "SEMESTER_1" || req.query.semester === "SEMESTER_2"
        ? req.query.semester
        : undefined;

    const data = await analyticsService.teacherEvolution(firstParam(req.params.id), req.user!, semester);
    res.json(data);
  }),

  simulateStudent: asyncHandler(async (req: Request, res: Response) => {
    const data = await analyticsService.simulateStudentProjection(firstParam(req.params.id), req.user!, req.body);
    res.json(data);
  }),

  school: asyncHandler(async (req: Request, res: Response) => {
    const data = await analyticsService.school(firstParam(req.params.id), req.user!);
    res.json(data);
  })
};
