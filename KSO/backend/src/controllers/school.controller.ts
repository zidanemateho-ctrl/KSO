import { Request, Response } from "express";

import { schoolService } from "../services/school.service";
import { asyncHandler } from "../utils/async-handler";

function firstParam(param: string | string[]) {
  return Array.isArray(param) ? param[0] : param;
}

export const schoolController = {
  create: asyncHandler(async (req: Request, res: Response) => {
    const data = await schoolService.create(req.body, req.user!);
    res.status(201).json(data);
  }),

  list: asyncHandler(async (req: Request, res: Response) => {
    const data = await schoolService.list(req.user!);
    res.json(data);
  }),

  getById: asyncHandler(async (req: Request, res: Response) => {
    const data = await schoolService.getById(firstParam(req.params.id), req.user!);
    res.json(data);
  }),

  update: asyncHandler(async (req: Request, res: Response) => {
    const data = await schoolService.update(firstParam(req.params.id), req.body, req.user!);
    res.json(data);
  }),

  remove: asyncHandler(async (req: Request, res: Response) => {
    const data = await schoolService.remove(firstParam(req.params.id), req.user!);
    res.json(data);
  })
};
