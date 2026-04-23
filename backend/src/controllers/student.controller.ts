import { StudentLevel, Stream, StudentProfileType } from "@prisma/client";
import { Request, Response } from "express";

import { studentService } from "../services/student.service";
import { asyncHandler } from "../utils/async-handler";

function firstParam(param: string | string[]) {
  return Array.isArray(param) ? param[0] : param;
}

export const studentController = {
  create: asyncHandler(async (req: Request, res: Response) => {
    const data = await studentService.create(req.body, req.user!);
    res.status(201).json(data);
  }),

  list: asyncHandler(async (req: Request, res: Response) => {
    const level =
      typeof req.query.level === "string" && Object.values(StudentLevel).includes(req.query.level as StudentLevel)
        ? (req.query.level as StudentLevel)
        : undefined;

    const stream =
      typeof req.query.stream === "string" && Object.values(Stream).includes(req.query.stream as Stream)
        ? (req.query.stream as Stream)
        : undefined;

    const profileType =
      typeof req.query.profileType === "string" &&
      Object.values(StudentProfileType).includes(req.query.profileType as StudentProfileType)
        ? (req.query.profileType as StudentProfileType)
        : undefined;

    const data = await studentService.list(req.user!, {
      schoolId: typeof req.query.schoolId === "string" ? req.query.schoolId : undefined,
      classId: typeof req.query.classId === "string" ? req.query.classId : undefined,
      level,
      stream,
      profileType,
      search: typeof req.query.search === "string" ? req.query.search : undefined
    });

    res.json(data);
  }),

  getById: asyncHandler(async (req: Request, res: Response) => {
    const data = await studentService.getById(firstParam(req.params.id), req.user!);
    res.json(data);
  }),

  update: asyncHandler(async (req: Request, res: Response) => {
    const data = await studentService.update(firstParam(req.params.id), req.body, req.user!);
    res.json(data);
  }),

  remove: asyncHandler(async (req: Request, res: Response) => {
    const data = await studentService.remove(firstParam(req.params.id), req.user!);
    res.json(data);
  }),

  linkParent: asyncHandler(async (req: Request, res: Response) => {
    const data = await studentService.linkParent(firstParam(req.params.id), req.body, req.user!);
    res.status(201).json(data);
  })
};
