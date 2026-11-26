/*
 * @feature: Medical Report Controller
 * @description: Secure upload, listing and download of medical documents. Only
 *               professionals can upload, and only for patients they care for.
 *               A Reports row belongs to an Appointment, so an upload is attached to the
 *               given appointmentId or, when omitted, to the most recent accepted /
 *               in-progress / completed appointment with that patient.
 *               File type is verified from magic bytes (not the extension) and files are
 *               stored under random names; Reports.file_path holds that random name.
 */
import fs from "node:fs/promises";
import path from "node:path";
import { z } from "zod";
import { env } from "../config/env.js";
import { ROLES, isProfessional } from "../models/constants.js";
import { careAppointmentFor, hasCareRelationship, latestCareAppointmentId } from "../models/appointments.js";
import { findReportById, insertReport, listReportsForPatient, listReportsForProfessional } from "../models/reports.js";
import { ok, reportView } from "../views/index.js";
import { ApiError } from "../utils/ApiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { randomHex } from "../utils/helpers.js";

const uploadSchema = z.object({
  patientId: z.coerce.number().int().positive(),
  appointmentId: z.coerce.number().int().positive().optional(),
  title: z.string().trim().min(1).max(200),
});

const MIME_BY_EXT = { ".pdf": "application/pdf", ".png": "image/png", ".jpg": "image/jpeg" };

/** Detects PDF/PNG/JPEG from the first bytes; returns null for anything else. */
function sniffType(buf) {
  if (buf.subarray(0, 4).toString("latin1") === "%PDF") return { mime: "application/pdf", ext: ".pdf" };
  if (buf.length > 4 && buf[0] === 0x89 && buf.subarray(1, 4).toString("latin1") === "PNG") return { mime: "image/png", ext: ".png" };
  if (buf.length > 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return { mime: "image/jpeg", ext: ".jpg" };
  return null;
}

/** Absolute path of a stored file, refusing anything that escapes UPLOAD_DIR. */
function storedPath(filePath) {
  const root = path.resolve(env.uploadDir);
  const full = path.resolve(root, filePath);
  return full.startsWith(root + path.sep) ? full : null;
}

/** mimeType comes from the stored extension; fileSize from the file on disk (the schema stores neither). */
async function present(report) {
  const full = storedPath(report.filePath);
  const size = full ? await fs.stat(full).then((s) => s.size).catch(() => 0) : 0;
  return reportView(report, { mimeType: MIME_BY_EXT[path.extname(report.filePath)] ?? "application/octet-stream", fileSize: size });
}

/*
 * @feature: List Reports
 * @description: GET /reports — own reports for patients; reports of cared-for
 *               patients for professionals.
 */
export const list = asyncHandler(async (req, res) => {
  const reports = isProfessional(req.user.role) ? await listReportsForProfessional(req.user.id) : await listReportsForPatient(req.user.id);
  return ok(res, await Promise.all(reports.map(present)));
});

/*
 * @feature: Upload Report
 * @description: POST /reports (multipart: patientId, title, file, optional appointmentId).
 *               Enforces size limit (multer), care relationship and a PDF/PNG/JPEG allow-list.
 */
export const upload = asyncHandler(async (req, res) => {
  const form = uploadSchema.safeParse(req.body ?? {});
  if (!form.success) throw new ApiError(400, "patient and report title are required");
  if (!req.file) throw new ApiError(400, "please attach a file");

  const { patientId, title } = form.data;
  let appointmentId;
  if (form.data.appointmentId) {
    const appt = await careAppointmentFor(req.user.id, form.data.appointmentId);
    if (!appt || appt.patientId !== patientId) throw new ApiError(403, "you can only upload reports for patients you care for");
    appointmentId = appt.id;
  } else {
    appointmentId = await latestCareAppointmentId(req.user.id, patientId);
    if (!appointmentId) throw new ApiError(403, "you can only upload reports for patients you care for");
  }

  const type = sniffType(req.file.buffer);
  if (!type) throw new ApiError(415, "only PDF, PNG and JPEG files are allowed");

  const storedName = `${randomHex(16)}${type.ext}`;
  await fs.mkdir(env.uploadDir, { recursive: true });
  await fs.writeFile(path.resolve(env.uploadDir, storedName), req.file.buffer, { mode: 0o640 });

  const reportId = await insertReport({
    appointmentId,
    title,
    fileName: path.basename(req.file.originalname).slice(0, 255),
    filePath: storedName,
  });
  return ok(res, await present(await findReportById(reportId)), 201);
});

/*
 * @feature: Download Report
 * @description: GET /reports/:id/download streams the file after verifying the
 *               caller is the patient or a professional who cares for them.
 */
export const download = asyncHandler(async (req, res) => {
  const report = await findReportById(Number(req.params.id));
  if (!report) throw new ApiError(404, "report not found");

  const allowed = req.user.role === ROLES.PATIENT ? report.patient.id === req.user.id : isProfessional(req.user.role) && (await hasCareRelationship(req.user.id, report.patient.id));
  const full = storedPath(report.filePath);
  if (!allowed || !full) throw new ApiError(404, "report not found");

  res.download(full, report.fileName);
});
