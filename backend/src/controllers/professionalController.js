/*
 * @feature: Professional Directory Controller
 * @description: Powers "Find Doctors" / "Book a Nurse": search, single profile and
 *               free time slots for the booking modal.
 */
import { DAY_SLOTS, isProfessional, ROLES } from "../models/constants.js";
import { bookedTimes, expireStale } from "../models/appointments.js";
import { findUserById, listProfessionals } from "../models/users.js";
import { ok, professionalView } from "../views/index.js";
import { ApiError } from "../utils/ApiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { hhmm, likeEscape, nowLocal, parseLocal, startOfLocalDay } from "../utils/helpers.js";

/*
 * @feature: Search Professionals
 * @description: GET /professionals?role=doctor|nurse&q=text&specialty=Cardiologist.
 *               Only professionals currently available, best rated first.
 */
export const list = asyncHandler(async (req, res) => {
  const role = req.query.role ?? ROLES.DOCTOR;
  if (!isProfessional(role)) throw new ApiError(400, "role must be doctor or nurse");

  const q = likeEscape(String(req.query.q ?? "").trim());
  const specialty = String(req.query.specialty ?? "").trim();
  const users = await listProfessionals({ role, q, specialty });
  return ok(res, users.map(professionalView));
});

/*
 * @feature: Professional Detail
 * @description: GET /professionals/:id returns one public profile.
 */
export const get = asyncHandler(async (req, res) => {
  const user = await findUserById(Number(req.params.id));
  if (!user || !isProfessional(user.role)) throw new ApiError(404, "professional not found");
  return ok(res, professionalView(user));
});

/*
 * @feature: Available Time Slots
 * @description: GET /professionals/:id/slots?date=YYYY-MM-DD lists the hourly
 *               slots and flags those already booked or already in the past.
 */
export const slots = asyncHandler(async (req, res) => {
  const professionalId = Number(req.params.id);
  const day = startOfLocalDay(String(req.query.date ?? ""));
  if (!Number.isInteger(professionalId) || !day.isValid) throw new ApiError(400, "date must use the YYYY-MM-DD format");

  await expireStale(); // expired requests free their slot
  const booked = await bookedTimes(professionalId, day.toJSDate(), day.plus({ days: 1 }).toJSDate());
  const taken = new Set(booked.map(hhmm));

  const now = nowLocal();
  const date = day.toFormat("yyyy-MM-dd");
  return ok(
    res,
    DAY_SLOTS.map((time) => ({ time, available: !taken.has(time) && parseLocal(date, time) > now })),
  );
});
