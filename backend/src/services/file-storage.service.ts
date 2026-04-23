import { createHash, randomUUID } from "crypto";
import { writeFile } from "fs/promises";
import path from "path";

import { env } from "../config/env";
import { chatUploadDir } from "../config/uploads";
import { AppError } from "../utils/app-error";

interface UploadContext {
  protocol: string;
  host: string;
}

interface UploadResult {
  fileName: string;
  key: string;
  url: string;
}

function normalizedExtension(fileName: string) {
  const extension = path.extname(fileName).toLowerCase();
  if (!extension) {
    return "";
  }

  return extension;
}

function absoluteBaseUrl(context: UploadContext) {
  const configured = env.PUBLIC_BASE_URL?.trim();
  if (configured) {
    return configured.replace(/\/+$/g, "");
  }

  return `${context.protocol}://${context.host}`;
}

async function uploadToLocal(file: Express.Multer.File, context: UploadContext): Promise<UploadResult> {
  const extension = normalizedExtension(file.originalname);
  const fileName = `${Date.now()}-${randomUUID()}${extension}`;
  const key = `chat/${fileName}`;
  const absolutePath = path.join(chatUploadDir, fileName);

  await writeFile(absolutePath, file.buffer);

  return {
    fileName,
    key,
    url: `${absoluteBaseUrl(context)}/uploads/chat/${encodeURIComponent(fileName)}`
  };
}

function cloudinarySignature(folder: string, timestamp: string) {
  const payload = `folder=${folder}&timestamp=${timestamp}${env.CLOUDINARY_API_SECRET}`;
  return createHash("sha1").update(payload).digest("hex");
}

async function uploadToCloudinary(file: Express.Multer.File): Promise<UploadResult> {
  const timestamp = Math.floor(Date.now() / 1000).toString();
  const signature = cloudinarySignature(env.CLOUDINARY_FOLDER, timestamp);
  const blob = new Blob([new Uint8Array(file.buffer)], {
    type: file.mimetype || "application/octet-stream"
  });

  const formData = new FormData();
  formData.append("file", blob, file.originalname || `attachment-${Date.now()}`);
  formData.append("folder", env.CLOUDINARY_FOLDER);
  formData.append("timestamp", timestamp);
  formData.append("api_key", env.CLOUDINARY_API_KEY || "");
  formData.append("signature", signature);

  const response = await fetch(`https://api.cloudinary.com/v1_1/${env.CLOUDINARY_CLOUD_NAME}/auto/upload`, {
    method: "POST",
    body: formData
  });

  const payload = (await response.json()) as {
    secure_url?: string;
    public_id?: string;
    original_filename?: string;
    error?: { message?: string };
  };

  if (!response.ok || !payload.secure_url || !payload.public_id) {
    throw new AppError(
      502,
      payload.error?.message || "Echec upload cloud, reessayez plus tard"
    );
  }

  const fallbackName = `${Date.now()}-${randomUUID()}`;
  return {
    fileName: payload.original_filename || fallbackName,
    key: payload.public_id,
    url: payload.secure_url
  };
}

export class FileStorageService {
  async uploadChatAttachment(file: Express.Multer.File, context: UploadContext) {
    if (env.FILE_STORAGE_DRIVER === "cloudinary") {
      return uploadToCloudinary(file);
    }

    return uploadToLocal(file, context);
  }
}

export const fileStorageService = new FileStorageService();
