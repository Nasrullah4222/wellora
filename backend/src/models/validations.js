/*
 * @feature: Service Validation & Rating Queries (PostgreSQL)
 * @description: After a provider completes an appointment a Service_Validations row is
 *               created as REQUESTED. The patient then ACCEPTS it (optionally leaving a
 *               1-5 Rating + review) or REJECTS it with feedback. One validation and one
 *               rating per appointment (both columns are UNIQUE).
 */
import { query, exec } from "../config/database.js";

export async function requestValidation(conn, appointmentId) {
  await exec(
    "INSERT INTO Service_Validations (appointment_id, status, requested_at) VALUES ($1, 'REQUESTED', NOW()) ON CONFLICT (appointment_id) DO NOTHING",
    [appointmentId],
    conn,
  );
}

/** Current validation status (locked), or null when none exists yet. */
export async function lockValidationStatus(conn, appointmentId) {
  const rows = await query("SELECT status FROM Service_Validations WHERE appointment_id = $1 FOR UPDATE", [appointmentId], conn);
  return rows[0]?.status ?? null;
}

/** Records the patient's decision; creates the row if an older appointment never had one. */
export async function respondToValidation(conn, appointmentId, decision, feedback) {
  const updated = await exec(
    "UPDATE Service_Validations SET status = $1, responded_at = NOW(), patient_feedback = $2 WHERE appointment_id = $3",
    [decision, feedback || null, appointmentId],
    conn,
  );
  if (updated.rowCount === 0) {
    await exec(
      "INSERT INTO Service_Validations (appointment_id, status, requested_at, responded_at, patient_feedback) VALUES ($1, $2, NOW(), NOW(), $3)",
      [appointmentId, decision, feedback || null],
      conn,
    );
  }
}

export async function insertRating(conn, appointmentId, rating, review) {
  await exec(
    "INSERT INTO Ratings (appointment_id, rating, review, created_at, updated_at) VALUES ($1, $2, $3, NOW(), NOW())",
    [appointmentId, rating, review || null],
    conn,
  );
}
