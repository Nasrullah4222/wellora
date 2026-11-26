/*
 * @feature: User Profile Controller
 * @description: Settings page (update own profile) and the professional's patient
 *               list used by the "Patients" screen and the report-upload form.
 */
import { z } from "zod";
import { transaction } from "../config/database.js";
import { findUserById, listCarePatients, updateProfile } from "../models/users.js";
import { ok, patientView, userView } from "../views/index.js";
import { ApiError } from "../utils/ApiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";

export const profileSchema = z.object({
  fullName: z.string().trim().min(2).max(100),
  // phone / city have no column in the schema: accepted for compatibility, not stored.
  phone: z.string().max(32).default(""),
  city: z.string().max(80).default(""),
  address: z.string().max(1000).default(""),
  // Professional-only fields (ignored for patients)
  specialty: z.string().max(100).default(""),
  bio: z.string().max(2000).default(""),
  experienceYears: z.number().int().min(0).max(70).default(0),
  feeCents: z.number().int().min(0).max(1_000_000).default(0), // no fee column: ignored
  supportsVirtual: z.boolean().optional(), // doctors are always virtual-capable: ignored
  accepting: z.boolean().optional(),
  licenseNumber: z.string().trim().min(3).max(100).optional(),
});

/*
 * @feature: Update Own Profile
 * @description: PUT /users/me. Updates Users plus the role table (Patients.address,
 *               Doctors.specialization/qualification, Nurses.qualification/experience_years)
 *               and, for professionals, User_Live_Status.is_available ("accepting bookings").
 */
export const updateMe = asyncHandler(async (req, res) => {
  const { id, role } = req.user;
  try {
    await transaction((conn) => updateProfile(conn, id, role, req.body));
  } catch (err) {
    if (err.code === "23505") throw new ApiError(409, "this license number is already registered");
    throw err;
  }
  return ok(res, userView(await findUserById(id)));
});

/*
 * @feature: My Patients
 * @description: GET /patients (professionals only): patients with an accepted, in-progress
 *               or completed appointment, with visit counts and last visit date.
 */
export const patients = asyncHandler(async (req, res) => {
  const rows = await listCarePatients(req.user.id);
  return ok(res, rows.map(patientView));
});
