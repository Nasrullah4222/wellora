/*
 * @feature: Domain Constants & Booking Rules
 * @description: Roles, booking statuses, visit types, bookable hourly slots and the
 *               single source of truth for who may move a booking to which status.
 *               The API speaks lowercase ("patient", "rejected"); the database stores
 *               the uppercase ENUM values from the schema ("PATIENT", "IGNORED").
 *               The toDb* / fromDb* helpers below are the only place that translation happens.
 */
export const ROLES = { PATIENT: "patient", NURSE: "nurse", DOCTOR: "doctor", ADMIN: "admin" };
export const isProfessional = (role) => role === ROLES.NURSE || role === ROLES.DOCTOR;

export const toDbRole = (role) => role.toUpperCase();
export const fromDbRole = (role) => role.toLowerCase();

/** API booking statuses. "rejected" is stored as the schema's IGNORED value. */
export const BOOKING = {
  PENDING: "pending",
  ACCEPTED: "accepted",
  REJECTED: "rejected",
  EXPIRED: "expired",
  CANCELLED: "cancelled",
  IN_PROGRESS: "in_progress",
  COMPLETED: "completed",
};
export const toDbStatus = (status) => (status === BOOKING.REJECTED ? "IGNORED" : status.toUpperCase());
export const fromDbStatus = (status) => (status === "IGNORED" ? BOOKING.REJECTED : status.toLowerCase());

/** Stored in Services.service_type. */
export const VISIT = { VIRTUAL: "virtual", IN_PERSON: "in_person", HOME: "home" };
export const toDbVisit = (visit) => visit.toUpperCase();
export const fromDbVisit = (type) => String(type).toLowerCase();

/** DB-level status groups used inside SQL IN (...) lists. */
export const ACTIVE_DB_STATUSES = ["PENDING", "ACCEPTED", "IN_PROGRESS"]; // occupy a time slot
export const CARE_DB_STATUSES = ["ACCEPTED", "IN_PROGRESS", "COMPLETED"]; // provider <-> patient care relationship

/** Hourly start times of a professional's working day. */
export const DAY_SLOTS = ["09:00", "10:00", "11:00", "12:00", "14:00", "15:00", "16:00", "17:00"];

/*
 * @feature: Booking Status Transitions
 * @description: Professionals accept/reject pending requests, start and complete
 *               accepted ones; patients may cancel while pending or accepted.
 *               EXPIRED is set automatically when response_deadline passes.
 */
export function canTransition(role, from, to) {
  if (role === ROLES.PATIENT) return to === BOOKING.CANCELLED && (from === BOOKING.PENDING || from === BOOKING.ACCEPTED);
  if (!isProfessional(role)) return false;
  if (from === BOOKING.PENDING) return to === BOOKING.ACCEPTED || to === BOOKING.REJECTED;
  if (from === BOOKING.ACCEPTED) return to === BOOKING.IN_PROGRESS || to === BOOKING.COMPLETED;
  if (from === BOOKING.IN_PROGRESS) return to === BOOKING.COMPLETED;
  return false;
}
