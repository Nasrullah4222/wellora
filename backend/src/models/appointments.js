/*
 * @feature: Appointment Queries (PostgreSQL)
 * @description: All SQL for the Appointments table and the joins the UI needs
 *               (service, both people, latest payment, service validation).
 *
 *   API "booking"  = one Appointments row
 *   service        -> Services.service_name   visitType -> Services.service_type
 *   status         -> Appointments.status ("rejected" is the schema's IGNORED)
 *   feeCents       -> latest Payments.amount, or the role's default fee before payment
 *   patientConfirmed -> Service_Validations.status = 'ACCEPTED'
 *   notes          -> not stored (no column)
 */
import { query, exec } from "../config/database.js";
import { ACTIVE_DB_STATUSES, CARE_DB_STATUSES, ROLES, fromDbRole, fromDbStatus, fromDbVisit } from "./constants.js";
import { feeCentsForRole, toCents } from "../utils/pricing.js";

const BOOKING_SELECT = `
  SELECT a.appointment_id, a.patient_id, a.provider_id, a.status, a.is_emergency, a.service_address,
         a.requested_at, a.response_deadline, a.accepted_at, a.scheduled_at, a.completed_at,
         s.service_name, s.service_type,
         pu.user_name AS patient_name, pu.role AS patient_role,
         pr.user_name AS provider_name, pr.role AS provider_role,
         COALESCE(d.specialization, n.qualification) AS provider_specialty,
         pay.amount AS paid_amount, pay.payment_status,
         sv.status AS validation_status
    FROM Appointments a
    JOIN Services s ON s.service_id = a.service_id
    JOIN Users pu ON pu.user_id = a.patient_id
    JOIN Users pr ON pr.user_id = a.provider_id
    LEFT JOIN Doctors d ON d.user_id = pr.user_id
    LEFT JOIN Nurses n ON n.user_id = pr.user_id
    LEFT JOIN Payments pay ON pay.payment_id =
         (SELECT MAX(p2.payment_id) FROM Payments p2 WHERE p2.appointment_id = a.appointment_id)
    LEFT JOIN Service_Validations sv ON sv.appointment_id = a.appointment_id`;

function mapBooking(r) {
  if (!r) return null;
  const providerRole = fromDbRole(r.provider_role);
  return {
    id: r.appointment_id,
    status: fromDbStatus(r.status),
    visitType: fromDbVisit(r.service_type),
    service: r.service_name,
    notes: "",
    scheduledAt: r.scheduled_at,
    feeCents: r.paid_amount != null ? toCents(r.paid_amount) : feeCentsForRole(providerRole),
    isEmergency: Boolean(r.is_emergency),
    serviceAddress: r.service_address ?? "",
    patientConfirmed: r.validation_status === "ACCEPTED",
    validationStatus: r.validation_status ? r.validation_status.toLowerCase() : null,
    patient: { id: r.patient_id, fullName: r.patient_name, role: fromDbRole(r.patient_role) },
    professional: { id: r.provider_id, fullName: r.provider_name, role: providerRole, specialty: r.provider_specialty ?? "" },
  };
}

/** Which Appointments column identifies the caller: providers see rows addressed to them. */
export const sideColumn = (role) => (role === ROLES.PATIENT ? "a.patient_id" : "a.provider_id");

export async function findBookingById(id, db) {
  const rows = await query(`${BOOKING_SELECT} WHERE a.appointment_id = $1 LIMIT 1`, [id], db);
  return mapBooking(rows[0]);
}

export async function listBookings(role, userId, dbStatus) {
  const params = [userId];
  let sql = `${BOOKING_SELECT} WHERE ${sideColumn(role)} = $1`;
  if (dbStatus) {
    params.push(dbStatus);
    sql += ` AND a.status = $${params.length}`;
  }
  const rows = await query(`${sql} ORDER BY a.scheduled_at DESC NULLS LAST, a.appointment_id DESC`, params);
  return rows.map(mapBooking);
}

export async function listUpcoming(role, userId, now, limit = 5) {
  const rows = await query(
    `${BOOKING_SELECT}
      WHERE ${sideColumn(role)} = $1 AND a.status = ANY($2::appointment_status[]) AND a.scheduled_at >= $3
      ORDER BY a.scheduled_at ASC LIMIT $4`,
    [userId, ACTIVE_DB_STATUSES, now, limit],
  );
  return rows.map(mapBooking);
}

/** COUNT(*) of the caller's appointments, optionally filtered by status list and a time window. */
export async function countBookings(role, userId, { statuses, from, to } = {}) {
  const where = [`${sideColumn(role)} = $1`];
  const params = [userId];
  if (statuses) {
    params.push(statuses);
    where.push(`a.status = ANY($${params.length}::appointment_status[])`);
  }
  if (from) {
    params.push(from);
    where.push(`a.scheduled_at >= $${params.length}`);
  }
  if (to) {
    params.push(to);
    where.push(`a.scheduled_at < $${params.length}`);
  }
  const rows = await query(`SELECT COUNT(*) AS total FROM Appointments a WHERE ${where.join(" AND ")}`, params);
  return Number(rows[0].total);
}

/**
 * Marks PENDING requests whose response_deadline has passed as EXPIRED.
 * Run on a timer and before reads/writes that depend on slot availability.
 */
export async function expireStale() {
  const result = await exec(
    "UPDATE Appointments SET status = 'EXPIRED' WHERE status = 'PENDING' AND response_deadline IS NOT NULL AND response_deadline < NOW()",
  );
  return result.rowCount;
}

/** Locks the appointment row for the rest of the transaction and returns the raw columns. */
export async function lockAppointment(conn, id) {
  const rows = await query(
    `SELECT appointment_id, patient_id, provider_id, status, response_deadline
       FROM Appointments WHERE appointment_id = $1 FOR UPDATE`,
    [id],
    conn,
  );
  return rows[0] ?? null;
}

/** Locks the provider's Users row (serialises concurrent bookings) and reads availability.
 *  `FOR UPDATE OF u` is required in PostgreSQL because User_Live_Status is on the nullable side of the join. */
export async function lockProvider(conn, providerId) {
  const rows = await query(
    `SELECT u.user_id, u.role, COALESCE(ls.is_available, false) AS is_available
       FROM Users u LEFT JOIN User_Live_Status ls ON ls.user_id = u.user_id
      WHERE u.user_id = $1 FOR UPDATE OF u`,
    [providerId],
    conn,
  );
  return rows[0] ? { id: rows[0].user_id, role: fromDbRole(rows[0].role), accepting: Boolean(rows[0].is_available) } : null;
}

export async function slotIsTaken(conn, providerId, when) {
  const rows = await query(
    "SELECT COUNT(*) AS total FROM Appointments WHERE provider_id = $1 AND scheduled_at = $2 AND status = ANY($3::appointment_status[])",
    [providerId, when, ACTIVE_DB_STATUSES],
    conn,
  );
  return Number(rows[0].total) > 0;
}

/** Scheduled times of a provider's active appointments inside [from, to). */
export async function bookedTimes(providerId, from, to) {
  const rows = await query(
    "SELECT scheduled_at FROM Appointments WHERE provider_id = $1 AND status = ANY($2::appointment_status[]) AND scheduled_at >= $3 AND scheduled_at < $4",
    [providerId, ACTIVE_DB_STATUSES, from, to],
  );
  return rows.map((r) => r.scheduled_at);
}

/** Services is a small catalogue; a (name, type) pair is created the first time it is booked. */
export async function findOrCreateService(conn, name, type) {
  const rows = await query("SELECT service_id FROM Services WHERE service_name = $1 AND service_type = $2 LIMIT 1", [name, type], conn);
  if (rows[0]) return rows[0].service_id;
  const { rows: created } = await exec("INSERT INTO Services (service_name, service_type) VALUES ($1, $2) RETURNING service_id", [name, type], conn);
  return created[0].service_id;
}

export async function patientAddress(conn, patientId) {
  const rows = await query("SELECT address FROM Patients WHERE user_id = $1", [patientId], conn);
  return rows[0]?.address ?? null;
}

export async function insertAppointment(conn, a) {
  const { rows } = await exec(
    `INSERT INTO Appointments
       (patient_id, provider_id, service_id, service_address, is_emergency, status,
        requested_at, response_deadline, scheduled_at)
     VALUES ($1, $2, $3, $4, $5, 'PENDING', NOW(), $6, $7)
     RETURNING appointment_id`,
    [a.patientId, a.providerId, a.serviceId, a.serviceAddress, Boolean(a.isEmergency), a.responseDeadline, a.scheduledAt],
    conn,
  );
  return rows[0].appointment_id;
}

/** Sets the new status and the matching timestamp column. */
export async function setStatus(conn, id, dbStatus) {
  const stamp = dbStatus === "ACCEPTED" ? ", accepted_at = NOW()" : dbStatus === "COMPLETED" ? ", completed_at = NOW()" : "";
  await exec(`UPDATE Appointments SET status = $1${stamp} WHERE appointment_id = $2`, [dbStatus, id], conn);
}

/** A professional may view/upload records for a patient only after accepting at least one appointment. */
export async function hasCareRelationship(providerId, patientId, db) {
  const rows = await query(
    "SELECT 1 FROM Appointments WHERE provider_id = $1 AND patient_id = $2 AND status = ANY($3::appointment_status[]) LIMIT 1",
    [providerId, patientId, CARE_DB_STATUSES],
    db,
  );
  return rows.length > 0;
}

/** Most recent accepted/in-progress/completed appointment between the two people (reports attach to it). */
export async function latestCareAppointmentId(providerId, patientId) {
  const rows = await query(
    `SELECT appointment_id FROM Appointments
      WHERE provider_id = $1 AND patient_id = $2 AND status = ANY($3::appointment_status[])
      ORDER BY scheduled_at DESC NULLS LAST, appointment_id DESC LIMIT 1`,
    [providerId, patientId, CARE_DB_STATUSES],
  );
  return rows[0]?.appointment_id ?? null;
}

/** Verifies the appointment belongs to this provider (and is a care appointment) and returns its patient. */
export async function careAppointmentFor(providerId, appointmentId) {
  const rows = await query(
    "SELECT appointment_id, patient_id FROM Appointments WHERE appointment_id = $1 AND provider_id = $2 AND status = ANY($3::appointment_status[])",
    [appointmentId, providerId, CARE_DB_STATUSES],
  );
  return rows[0] ? { id: rows[0].appointment_id, patientId: rows[0].patient_id } : null;
}
