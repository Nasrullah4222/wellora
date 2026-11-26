/*
 * @feature: Central Error Handling
 * @description: notFound handles unknown routes; errorHandler converts ApiError,
 *               upload-size errors and unexpected exceptions into the
 *               {"error": "..."} envelope. Internal details are never leaked.
 */
import multer from "multer";
import { env } from "../config/env.js";

export const notFound = (_req, res) => res.status(404).json({ error: "route not found" });

// eslint-disable-next-line no-unused-vars
export function errorHandler(err, _req, res, _next) {
  if (err instanceof multer.MulterError) {
    const tooLarge = err.code === "LIMIT_FILE_SIZE";
    return res.status(tooLarge ? 413 : 400).json({ error: tooLarge ? `file exceeds the ${env.maxUploadMb} MB limit` : "invalid upload" });
  }
  if (err.status) return res.status(err.status).json({ error: err.message });
  if (err.type === "entity.parse.failed") return res.status(400).json({ error: "invalid JSON body" });

  console.error(err);
  return res.status(500).json({ error: "internal server error" });
}
