import { Request, Response } from "express";

import { orientationService } from "../services/orientation.service";
import { asyncHandler } from "../utils/async-handler";

function firstParam(param: string | string[]) {
  return Array.isArray(param) ? param[0] : param;
}

export const orientationController = {
  studentProfile: asyncHandler(async (req: Request, res: Response) => {
    const data = await orientationService.getStudentProfile(firstParam(req.params.studentId), req.user!);
    res.json(data);
  }),

  recomputeStudent: asyncHandler(async (req: Request, res: Response) => {
    const data = await orientationService.recomputeForActor(firstParam(req.params.studentId), req.user!);
    res.json(data);
  }),

  schoolProfiles: asyncHandler(async (req: Request, res: Response) => {
    const data = await orientationService.listSchoolProfiles(firstParam(req.params.schoolId), req.user!);
    res.json(data);
  })
};
