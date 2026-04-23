import { mkdirSync } from "fs";
import path from "path";

export const uploadRootDir = path.resolve(process.cwd(), "uploads");
export const chatUploadDir = path.join(uploadRootDir, "chat");

export function ensureUploadDirectories() {
  mkdirSync(chatUploadDir, { recursive: true });
}
