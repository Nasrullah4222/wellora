/*
 * @feature: Booking Controller
 * @description: Appointment lifecycle on the Appointments table:
 *   patient requests (PENDING, with a response_deadline)
 *     -> provider accepts (ACCEPTED + PAID payment + provider pending_balance)
 *        or rejects (IGNORED)  or the deadline passes (EXPIRED)
 *     -> provider optionally starts (IN_PROGRESS) and completes (COMPLETED;
 *        a Service_Validations row is REQUESTED, balance moves pending -> available)
 *     -> patient ACCEPTS the service (+ optional Ratings row) or REJECTS it with feedback.
 *   Patients may cancel while pending/accepted (an accepted booking's payment is REFUNDED).
 *   Every multi-table change runs in one transaction on locked rows.
 */
import { z } from "zod";
import { transaction } from "../config/database.js";
import { BOOKING, DAY_SLOTS, ROLES, VISIT, canTransition, fromDbStatus, isProfessional, toDbStatus, toDbVisit } from "../models/constants.js";
import {
  expireStale, findBookingById, findOrCreateService, insertAppointment, listBookings, lockAppointment,
  lockProvider, patientAddress, setStatus, slotIsTaken,
} from "../models/appointments.js";
import { balanceOnAccept, balanceOnComplete, balanceOnRefund, createPaidPayment, lockPaidAmountCents, refundPayment } from "../models/payments.js";
import { insertRating, lockValidationStatus, requestValidation, respondToValidation } from "../models/validations.js";
import { bookingView, ok } from "../views/index.js";
import { env } from "../config/env.js";
import { ApiError } from "../utils/ApiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { nowLocal, parseLocal } from "../utils/helpers.js";
import { feeCentsForRole } from "../utils/pricing.js";

export const createSchema = z.object({
  professionalId: z.number().int().positive(),
  visitType: z.enum([VISIT.VIRTUAL, VISIT.IN_PERSON, VISIT.HOME]),
  service: z.string().trim().min(1).max(100),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  time: z.string().regex(/^\d{2}:\d{2}$/),
  notes: z.string().max(1000).optional().default(""), // no column in the schema: accepted, not stored
  isEmergency: z.boolean().optional().default(false),
  serviceAddress: z.string().trim().max(255).optional(), // defaults to the patient's address for home visits
});
export const statusSchema = z.object({ status: z.enum(Object.values(BOOKING)) });
export const confirmSchema = z.object({
  rating: z.number().int().min(1).max(5).optional(),
  comment: z.string().max(1000).optional().default(""),
});
export const disputeSchema = z.object({ feedback: z.string().trim().min(1).max(1000) });

/** Returns a user-facing message when the professional/visit-type combination is invalid. */
function visitTypeError(role, visit) {
  if (role === ROLES.NURSE && visit !== VISIT.HOME) return "nurses provide home visits only";
  if (role === ROLES.DOCTOR && visit === VISIT.HOME) return "doctors offer virtual or in-person visits";
  return "";
}

/** The provider must answer before the deadline; emergencies get a much shorter window. */
function responseDeadline(scheduledAt, isEmergency) {
  const ms = isEmergency ? env.booking.emergencyResponseMinutes * 60_000 : env.booking.responseHours * 3_600_000;
  return new Date(Math.min(Date.now() + ms, scheduledAt.getTime()));
}

/*
 * @feature: Create Booking
 * @description: POST /bookings (patients only). Validates professional, visit type and
 *               time, then inserts a PENDING appointment. The provider's Users row is locked
 *               (SELECT ... FOR UPDATE) while the slot is checked so two patients cannot
 *               take the same slot. The service is looked up / created in Services.
 */
export const create = asyncHandler(async (req, res) => {
  const { professionalId, visitType, service, date, time, isEmergency } = req.body;
  const when = parseLocal(date, time);
  if (!when.isValid || !DAY_SLOTS.includes(time)) throw new ApiError(400, "invalid date or time");
  if (when <= nowLocal()) throw new ApiError(400, "please choose a time in the future");
  const scheduledAt = when.toJSDate();

  await expireStale();
  const appointmentId = await transaction(async (conn) => {
    const pro = await lockProvider(conn, professionalId);
    if (!pro || !isProfessional(pro.role) || !pro.accepting) throw new ApiError(404, "professional not available");

    const message = visitTypeError(pro.role, visitType);
    if (message) throw new ApiError(400, message);

    if (await slotIsTaken(conn, professionalId, scheduledAt)) {
      throw new ApiError(409, "that time slot was just taken, please choose another");
    }

    const serviceId = await findOrCreateService(conn, service, toDbVisit(visitType));
    const serviceAddress = visitType === VISIT.HOME ? req.body.serviceAddress || (await patientAddress(conn, req.user.id)) : null;

    return insertAppointment(conn, {
      patientId: req.user.id,
      providerId: professionalId,
      serviceId,
      serviceAddress,
      isEmergency,
      scheduledAt,
      responseDeadline: responseDeadline(scheduledAt, isEmergency),
    });
  });

  return ok(res, bookingView(await findBookingById(appointmentId)), 201);
});

/*
 * @feature: List My Bookings
 * @description: GET /bookings?status=pending. Patients get their own appointments;
 *               providers get requests/assignments addressed to them.
 */
export const list = asyncHandler(async (req, res) => {
  await expireStale();
  const status = req.query.status ? String(req.query.status) : null;
  if (status && !Object.values(BOOKING).includes(status)) throw new ApiError(400, "unknown status filter");
  const bookings = await listBookings(req.user.role, req.user.id, status && toDbStatus(status));
  return ok(res, bookings.map(bookingView));
});

/** Locks :id and verifies the caller is the patient/provider on it (404 otherwise, so ids are not discoverable). */
async function loadOwned(conn, req) {
  const row = await lockAppointment(conn, Number(req.params.id));
  const ownerId = row && (isProfessional(req.user.role) ? row.provider_id : row.patient_id);
  if (!row || ownerId !== req.user.id) throw new ApiError(404, "booking not found");
  return row;
}

/*
 * @feature: Update Booking Status
 * @description: PATCH /bookings/:id/status. Enforces ownership and canTransition, then
 *               applies the money / validation side effects described at the top of this file.
 */
export const updateStatus = asyncHandler(async (req, res) => {
  const next = req.body.status;
  await expireStale();

  await transaction(async (conn) => {
    const row = await loadOwned(conn, req);
    const current = fromDbStatus(row.status);
    if (!canTransition(req.user.role, current, next)) {
      throw new ApiError(422, `this booking is ${current.replace("_", " ")} and cannot be changed to ${next.replace("_", " ")}`);
    }
    await setStatus(conn, row.appointment_id, toDbStatus(next));

    if (next === BOOKING.ACCEPTED) {
      const pro = await findFee(conn, row.provider_id);
      await createPaidPayment(conn, { appointmentId: row.appointment_id, amountCents: pro });
      await balanceOnAccept(conn, row.provider_id, pro);
    } else if (next === BOOKING.COMPLETED) {
      await requestValidation(conn, row.appointment_id);
      const paid = await lockPaidAmountCents(conn, row.appointment_id);
      if (paid != null) await balanceOnComplete(conn, row.provider_id, paid);
    } else if (next === BOOKING.CANCELLED) {
      const paid = await lockPaidAmountCents(conn, row.appointment_id);
      if (paid != null) {
        await refundPayment(conn, row.appointment_id);
        await balanceOnRefund(conn, row.provider_id, paid);
      }
    }
  });
  return ok(res, bookingView(await findBookingById(Number(req.params.id))));
});

/** Fee charged when a provider accepts: the provider's role default (the schema stores no fee). */
async function findFee(conn, providerId) {
  const pro = await lockProvider(conn, providerId);
  return feeCentsForRole(pro.role);
}

/** Shared guard for the two patient responses to a completed service. */
async function loadCompletedForPatient(conn, req) {
  const row = await loadOwned(conn, req);
  if (fromDbStatus(row.status) !== BOOKING.COMPLETED) throw new ApiError(422, "only completed services can be confirmed");
  if ((await lockValidationStatus(conn, row.appointment_id)) === "ACCEPTED") throw new ApiError(409, "this service was already confirmed");
  return row;
}

/*
 * @feature: Service Confirmation & Review
 * @description: POST /bookings/:id/confirm (patients only). Marks the Service_Validations
 *               row ACCEPTED and, when a rating is given, inserts the Ratings row. The
 *               provider's average rating is computed from Ratings, so nothing else to update.
 */
export const confirm = asyncHandler(async (req, res) => {
  await transaction(async (conn) => {
    const row = await loadCompletedForPatient(conn, req);
    await respondToValidation(conn, row.appointment_id, "ACCEPTED", req.body.comment);
    if (req.body.rating) await insertRating(conn, row.appointment_id, req.body.rating, req.body.comment);
  });
  return ok(res, bookingView(await findBookingById(Number(req.params.id))));
});

/*
 * @feature: Dispute Service
 * @description: POST /bookings/:id/dispute (patients only). The patient rejects the
 *               provider's completion with written feedback (Service_Validations REJECTED).
 */
export const dispute = asyncHandler(async (req, res) => {
  await transaction(async (conn) => {
    const row = await loadCompletedForPatient(conn, req);
    await respondToValidation(conn, row.appointment_id, "REJECTED", req.body.feedback);
  });
  return ok(res, bookingView(await findBookingById(Number(req.params.id))));
});
