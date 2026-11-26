/*
 * @feature: JSON Presenters (V of MVC) & Response Envelope
 * @description: Turns the plain objects returned by the models into exactly the JSON shape
 *               the React app consumes. Sensitive fields such as passwordHash are never
 *               exposed. Every response uses {"data": ...} on success and
 *               {"error": "message"} on failure.
 */
import { dateLabel, initials, meetingUrlFor, timeLabel } from "../utils/helpers.js";
import { BOOKING, VISIT } from "../models/constants.js";

export const ok = (res, data, status = 200) => res.status(status).json({ data });

const party = (u) => ({
  id: u.id,
  fullName: u.fullName,
  role: u.role,
  initials: initials(u.fullName),
  ...(u.specialty ? { specialty: u.specialty } : {}),
});

/** The signed-in user's own profile. */
export function userView(u) {
  const p = u.profile;
  return {
    id: u.id,
    fullName: u.fullName,
    email: u.email,
    role: u.role,
    phone: u.phone,
    city: u.city,
    address: u.address,
    initials: initials(u.fullName),
    ...(u.admin && { admin: u.admin }),
    ...(p && {
      specialty: p.specialty,
      bio: p.bio,
      experienceYears: p.experienceYears,
      feeCents: p.feeCents,
      supportsVirtual: p.supportsVirtual,
      accepting: p.accepting,
      licenseNumber: p.license,
    }),
  };
}

/** Public directory card. */
export function professionalView(u) {
  const p = u.profile ?? {};
  return {
    id: u.id,
    fullName: u.fullName,
    role: u.role,
    initials: initials(u.fullName),
    specialty: p.specialty ?? "",
    bio: p.bio ?? "",
    city: u.city,
    experienceYears: p.experienceYears ?? 0,
    feeCents: p.feeCents ?? 0,
    rating: Number((p.rating ?? 0).toFixed(2)),
    reviewCount: p.reviewCount ?? 0,
    supportsVirtual: p.supportsVirtual ?? false,
  };
}

/** Booking with human labels in the app time zone; the call link is only shown for live virtual visits. */
export function bookingView(b) {
  const live = b.status === BOOKING.ACCEPTED || b.status === BOOKING.IN_PROGRESS;
  return {
    id: b.id,
    status: b.status,
    visitType: b.visitType,
    service: b.service,
    notes: b.notes,
    scheduledAt: new Date(b.scheduledAt).toISOString(),
    dateLabel: dateLabel(b.scheduledAt),
    timeLabel: timeLabel(b.scheduledAt),
    feeCents: b.feeCents,
    isEmergency: b.isEmergency,
    ...(b.serviceAddress ? { serviceAddress: b.serviceAddress } : {}),
    ...(b.visitType === VISIT.VIRTUAL && live ? { meetingUrl: meetingUrlFor(b.id) } : {}),
    patientConfirmed: b.patientConfirmed,
    validationStatus: b.validationStatus,
    patient: party(b.patient),
    professional: party(b.professional),
  };
}

export const reportView = (r, { mimeType, fileSize }) => ({
  id: r.id,
  appointmentId: r.appointmentId,
  title: r.title,
  fileName: r.fileName,
  mimeType,
  fileSize,
  patient: party(r.patient),
  uploader: party(r.uploader),
  createdAt: new Date(r.uploadedAt).toISOString(),
  dateLabel: dateLabel(r.uploadedAt),
});

export const paymentView = (p) => ({
  id: p.id,
  bookingId: p.bookingId,
  description: p.description,
  method: p.method,
  amountCents: p.amountCents,
  status: p.status,
  patient: party(p.patient),
  professional: party(p.professional),
  dateLabel: dateLabel(p.createdAt),
});

export const patientView = (row) => ({
  id: row.id,
  fullName: row.fullName,
  initials: initials(row.fullName),
  email: row.email,
  phone: "",
  visits: Number(row.visits),
  lastVisit: dateLabel(row.lastVisit),
});
