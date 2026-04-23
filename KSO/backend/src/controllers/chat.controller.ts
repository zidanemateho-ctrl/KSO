import { Request, Response } from "express";

import { fileStorageService } from "../services/file-storage.service";
import { chatService } from "../services/chat.service";
import { chatEmojiCatalog } from "../utils/chat-emoji";
import { asyncHandler } from "../utils/async-handler";
import { AppError } from "../utils/app-error";

function firstParam(param: string | string[]) {
  return Array.isArray(param) ? param[0] : param;
}

export const chatController = {
  createGroup: asyncHandler(async (req: Request, res: Response) => {
    const data = await chatService.createGroup(req.body, req.user!);
    res.status(201).json(data);
  }),

  autoJoin: asyncHandler(async (req: Request, res: Response) => {
    const data = await chatService.autoJoin(req.user!);
    res.json(data);
  }),

  listGroups: asyncHandler(async (req: Request, res: Response) => {
    const profileType =
      req.query.profileType === "ELEVE" || req.query.profileType === "ETUDIANT"
        ? req.query.profileType
        : undefined;
    const level = typeof req.query.level === "string" ? req.query.level : undefined;
    const stream = typeof req.query.stream === "string" ? req.query.stream : undefined;
    const academicYear = typeof req.query.academicYear === "string" ? req.query.academicYear : undefined;

    const data = await chatService.listGroups(req.user!, {
      profileType: profileType as "ELEVE" | "ETUDIANT" | undefined,
      level: level as
        | "SECONDE"
        | "PREMIERE"
        | "TERMINALE"
        | "LOWER_SIXTH"
        | "UPPER_SIXTH"
        | "LICENCE_1"
        | "LICENCE_2"
        | "LICENCE_3"
        | "MASTER_1"
        | "MASTER_2"
        | "AUTRE"
        | undefined,
      stream: stream as "SCIENTIFIQUE" | "LITTERAIRE" | "ECONOMIQUE" | "TECHNIQUE" | "AUTRE" | undefined,
      academicYear
    });

    res.json(data);
  }),

  listMessages: asyncHandler(async (req: Request, res: Response) => {
    const limit = typeof req.query.limit === "string" ? Number(req.query.limit) : undefined;
    const data = await chatService.listMessages(firstParam(req.params.groupId), req.user!, limit);
    res.json(data);
  }),

  postMessage: asyncHandler(async (req: Request, res: Response) => {
    const data = await chatService.postMessage(firstParam(req.params.groupId), req.body, req.user!);
    res.status(201).json(data);
  }),

  uploadAttachment: asyncHandler(async (req: Request, res: Response) => {
    const groupId = firstParam(req.params.groupId);
    await chatService.assertCanPost(groupId, req.user!);

    const file = req.file;
    if (!file) {
      throw new AppError(400, "Fichier requis");
    }

    const originalName = file.originalname.replace(/[\r\n]/g, " ").trim() || "piece-jointe";
    const storage = await fileStorageService.uploadChatAttachment(file, {
      protocol: req.protocol,
      host: req.get("host") || "localhost"
    });
    const fileUrl = storage.url;
    const messageTemplate = `📎 ${originalName}\n${fileUrl}`;

    res.status(201).json({
      fileName: storage.fileName,
      originalName,
      mimeType: file.mimetype,
      size: file.size,
      key: storage.key,
      url: fileUrl,
      messageTemplate
    });
  }),

  listEmojis: asyncHandler(async (_req: Request, res: Response) => {
    res.json(chatEmojiCatalog);
  }),

  deleteMessage: asyncHandler(async (req: Request, res: Response) => {
    const data = await chatService.deleteMessage(firstParam(req.params.messageId), req.user!);
    res.json(data);
  })
};
