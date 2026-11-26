/*
 * @feature: Report Queries (PostgreSQL)
 * @description: Reports belongs to an Appointment (there is no patient_id / uploader_id column):
 *               the patient is Appointments.patient_id and the uploader is Appointments.provider_id.
 *               file_path holds the random stored file name inside UPLOAD_DIR.
 */
import { query, exec } from "../config/database.js";
import { CARE_DB_STATUSES, fromDbRole } from "./constants.js";

const REPORT_SELECT = `
  SELECT r.report_id, r.report_title, r.file_name, r.file_path, r.uploaded_at,
         a.appointment_id, a.patient_id, pu.user_name AS patient_name, pu.role AS patient_role,
         a.provider_id, pr.user_name AS provider_name, pr.role AS provider_role
    FROM Reports r
    JOIN Appointments a ON a.appointment_id = r.appointment_id
    JOIN Users pu ON pu.user_id = a.patient_id
    JOIN Users pr ON pr.user_id = a.provider_id`;

const mapReport = (r) =>
  r && {
    id: r.report_id,
    title: r.report_title,
    fileName: r.file_name,
    filePath: r.file_path,
    uploadedAt: r.uploaded_at,
    appointmentId: r.appointment_id,
    patient: { id: r.patient_id, fullName: r.patient_name, role: fromDbRole(r.patient_role) },
    uploader: { id: r.provider_id, fullName: r.provider_name, role: fromDbRole(r.provider_role) },
  };

/** Patients see their own reports; professionals see reports of every patient they care for. */
export async function listReportsForPatient(patientId) {
  const rows = await query(`${REPORT_SELECT} WHERE a.patient_id = $1 ORDER BY r.uploaded_at DESC, r.report_id DESC`, [patientId]);
  return rows.map(mapReport);
}

export async function listReportsForProfessional(providerId) {
  const rows = await query(
    `${REPORT_SELECT}
      WHERE EXISTS (SELECT 1 FROM Appointments c
                     WHERE c.provider_id = $1 AND c.patient_id = a.patient_id AND c.status = ANY($2::appointment_status[]))
      ORDER BY r.uploaded_at DESC, r.report_id DESC`,
    [providerId, CARE_DB_STATUSES],
  );
  return rows.map(mapReport);
}

export async function findReportById(id) {
  const rows = await query(`${REPORT_SELECT} WHERE r.report_id = $1 LIMIT 1`, [id]);
  return mapReport(rows[0]);
}

export async function insertReport({ appointmentId, title, fileName, filePath }) {
  const { rows } = await exec(
    "INSERT INTO Reports (appointment_id, report_title, file_name, file_path, uploaded_at) VALUES ($1, $2, $3, $4, NOW()) RETURNING report_id",
    [appointmentId, title, fileName, filePath],
  );
  return rows[0].report_id;
}

export async function countReportsForPatient(patientId) {
  const rows = await query(
    "SELECT COUNT(*) AS total FROM Reports r JOIN Appointments a ON a.appointment_id = r.appointment_id WHERE a.patient_id = $1",
    [patientId],
  );
  return Number(rows[0].total);
}
