import { Request, Response } from "express";

import { gradeService } from "../services/grade.service";
import { AppError } from "../utils/app-error";
import { asyncHandler } from "../utils/async-handler";

function firstParam(param: string | string[]) {
  return Array.isArray(param) ? param[0] : param;
}

export const gradeController = {
  create: asyncHandler(async (req: Request, res: Response) => {
    const data = await gradeService.add(req.body, req.user!);
    res.status(201).json(data);
  }),

  update: asyncHandler(async (req: Request, res: Response) => {
    const data = await gradeService.update(firstParam(req.params.id), req.body, req.user!);
    res.json(data);
  }),

  list: asyncHandler(async (req: Request, res: Response) => {
    const semester =
      req.query.semester === "SEMESTER_1" || req.query.semester === "SEMESTER_2"
        ? req.query.semester
        : undefined;

    const sequence =
      req.query.sequence === "SEQUENCE_1" || req.query.sequence === "SEQUENCE_2" || req.query.sequence === "SEQUENCE_3"
        ? req.query.sequence
        : undefined;

    const data = await gradeService.list(req.user!, {
      schoolId: typeof req.query.schoolId === "string" ? req.query.schoolId : undefined,
      classId: typeof req.query.classId === "string" ? req.query.classId : undefined,
      studentId: typeof req.query.studentId === "string" ? req.query.studentId : undefined,
      subjectId: typeof req.query.subjectId === "string" ? req.query.subjectId : undefined,
      semester,
      sequence
    });

    res.json(data);
  }),

  import: asyncHandler(async (req: Request, res: Response) => {
    if (!req.file) {
      throw new AppError(400, "Fichier requis");
    }

    const data = await gradeService.import(
      req.file.buffer,
      req.file.mimetype,
      {
        schoolId: req.body.schoolId,
        teacherId: req.body.teacherId
      },
      req.user!
    );

    res.status(201).json(data);
  })
};
