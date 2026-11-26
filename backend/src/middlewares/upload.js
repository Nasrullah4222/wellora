/*
 * @feature: File Upload Middleware
 * @description: multer in-memory storage with a size cap. The controller sniffs
 *               the real file type from magic bytes before writing to disk.
 */
import multer from "multer";
import { env } from "../config/env.js";

export const uploadSingleFile = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: env.maxUploadMb * 1024 * 1024, files: 1 },
}).single("file");
