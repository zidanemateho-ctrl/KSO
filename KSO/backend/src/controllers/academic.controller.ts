import { Request, Response } from "express";

import { academicService } from "../services/academic.service";
import { asyncHandler } from "../utils/async-handler";

function firstParam(param: string | string[]) {
  return Array.isArray(param) ? param[0] : param;
}

export const academicController = {
  createClass: asyncHandler(async (req: Request, res: Response) => {
    const data = await academicService.createClass(req.body, req.user!);
    res.status(201).json(data);
  }),

  listClasses: asyncHandler(async (req: Request, res: Response) => {
    const schoolId = typeof req.query.schoolId === "string" ? req.query.schoolId : undefined;
    const data = await academicService.listClasses(req.user!, schoolId);
    res.json(data);
  }),

  createSubject: asyncHandler(async (req: Request, res: Response) => {
    const data = await academicService.createSubject(req.body, req.user!);
    res.status(201).json(data);
  }),

  listSubjects: asyncHandler(async (req: Request, res: Response) => {
    const schoolId = typeof req.query.schoolId === "string" ? req.query.schoolId : undefined;
    const data = await academicService.listSubjects(req.user!, schoolId);
    res.json(data);
  }),

  createTeacher: asyncHandler(async (req: Request, res: Response) => {
    const data = await academicService.createTeacher(req.body, req.user!);
    res.status(201).json(data);
  }),

  listTeachers: asyncHandler(async (req: Request, res: Response) => {
    const schoolId = typeof req.query.schoolId === "string" ? req.query.schoolId : undefined;
    const data = await academicService.listTeachers(req.user!, schoolId);
    res.json(data);
  }),

  assignTeacher: asyncHandler(async (req: Request, res: Response) => {
    const data = await academicService.assignTeacher(req.body, req.user!);
    res.status(201).json(data);
  }),

  teacherPerformance: asyncHandler(async (req: Request, res: Response) => {
    const semester =
      req.query.semester === "SEMESTER_1" || req.query.semester === "SEMESTER_2"
        ? req.query.semester
        : undefined;

    const data = await academicService.teacherClassPerformance(firstParam(req.params.teacherId), req.user!, semester);
    res.json(data);
  })
};
