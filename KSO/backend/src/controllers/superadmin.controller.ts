import { StudentLevel, StudentProfileType, Stream } from "@prisma/client";
import { Request, Response } from "express";

import { superAdminService } from "../services/superadmin.service";
import { asyncHandler } from "../utils/async-handler";
import { AppError } from "../utils/app-error";

function firstParam(param: string | string[]) {
  return Array.isArray(param) ? param[0] : param;
}

function parseNumber(value: unknown, fallback: number) {
  if (typeof value !== "string") {
    return fallback;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function parseLevel(value: unknown) {
  if (typeof value !== "string") {
    return undefined;
  }

  return Object.values(StudentLevel).includes(value as StudentLevel) ? (value as StudentLevel) : undefined;
}

function parseStream(value: unknown) {
  if (typeof value !== "string") {
    return undefined;
  }

  return Object.values(Stream).includes(value as Stream) ? (value as Stream) : undefined;
}

function parseProfileType(value: unknown) {
  if (typeof value !== "string") {
    return undefined;
  }

  return Object.values(StudentProfileType).includes(value as StudentProfileType)
    ? (value as StudentProfileType)
    : undefined;
}

export const superAdminController = {
  dashboard: asyncHandler(async (req: Request, res: Response) => {
    const data = await superAdminService.dashboard(req.user!);
    res.json(data);
  }),

  establishments: asyncHandler(async (req: Request, res: Response) => {
    const data = await superAdminService.establishments(req.user!);
    res.json(data);
  }),

  establishmentDetails: asyncHandler(async (req: Request, res: Response) => {
    const data = await superAdminService.establishmentDetails(firstParam(req.params.schoolId), req.user!, {
      search: typeof req.query.search === "string" ? req.query.search : undefined,
      page: parseNumber(req.query.page, 1),
      pageSize: parseNumber(req.query.pageSize, 10)
    });

    res.json(data);
  }),

  importStudents: asyncHandler(async (req: Request, res: Response) => {
    const file = req.file;
    if (!file) {
      throw new AppError(400, "Fichier requis");
    }

    const data = await superAdminService.importStudents(
      firstParam(req.params.schoolId),
      req.user!,
      file.buffer,
      file.mimetype,
      {
        defaultAcademicYear: typeof req.body.defaultAcademicYear === "string" ? req.body.defaultAcademicYear : undefined,
        defaultLevel: parseLevel(req.body.defaultLevel),
        defaultStream: parseStream(req.body.defaultStream),
        defaultProfileType: parseProfileType(req.body.defaultProfileType)
      }
    );

    res.json(data);
  }),

  listAnnouncements: asyncHandler(async (req: Request, res: Response) => {
    const data = await superAdminService.listAnnouncements(req.user!, {
      page: parseNumber(req.query.page, 1),
      pageSize: parseNumber(req.query.pageSize, 10),
      targetSchoolId: typeof req.query.targetSchoolId === "string" ? req.query.targetSchoolId : undefined,
      includeUnpublished:
        req.query.includeUnpublished === "false" || req.query.includeUnpublished === "0" ? false : true
    });

    res.json(data);
  }),

  createAnnouncement: asyncHandler(async (req: Request, res: Response) => {
    const data = await superAdminService.createAnnouncement(req.user!, req.body);
    res.status(201).json(data);
  }),

  progress: asyncHandler(async (req: Request, res: Response) => {
    const data = await superAdminService.progress(req.user!, {
      schoolId: typeof req.query.schoolId === "string" ? req.query.schoolId : undefined,
      level: parseLevel(req.query.level),
      profileType: parseProfileType(req.query.profileType),
      search: typeof req.query.search === "string" ? req.query.search : undefined,
      page: parseNumber(req.query.page, 1),
      pageSize: parseNumber(req.query.pageSize, 10)
    });

    res.json(data);
  })
};
