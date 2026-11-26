/*
 * @feature: Authentication Controller
 * @description: Registration, login and "who am I". Passwords are bcrypt-hashed;
 *               success returns { token, user } so the SPA can bootstrap in one call.
 */
import { z } from "zod";
import { transaction } from "../config/database.js";
import { ROLES } from "../models/constants.js";
import { touchLastLogin } from "../models/admins.js";
import { createAccount, emailExists, findUserByEmail, findUserById } from "../models/users.js";
import { ok, userView } from "../views/index.js";
import { ApiError } from "../utils/ApiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { checkPassword, generateToken, hashPassword } from "../utils/security.js";

export const registerSchema = z.object({
  fullName: z.string().trim().min(2).max(100),
  email: z.string().trim().toLowerCase().email().max(255),
  password: z.string().min(8).max(72),
  role: z.enum([ROLES.PATIENT, ROLES.NURSE, ROLES.DOCTOR]),
  // Doctors/nurses: medical/nursing license (the schema requires one; a placeholder is used if omitted).
  licenseNumber: z.string().trim().min(3).max(100).optional(),
});

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(1),
  // true when the person used the "Sign in as administrator" form
  asAdmin: z.boolean().optional().default(false),
});

const respondWithToken = async (res, userId, status) => {
  const user = await findUserById(userId);
  return ok(res, { token: generateToken(user), user: userView(user) }, status);
};

/*
 * @feature: User Registration
 * @description: One transaction creates Users + the role row (Patients / Doctors / Nurses).
 *               Professionals also get a User_Live_Status row (available) and a Balances row.
 */
export const register = asyncHandler(async (req, res) => {
  const { fullName, email, password, role, licenseNumber } = req.body;
  if (await emailExists(email)) throw new ApiError(409, "an account with this email already exists");

  const passwordHash = await hashPassword(password);
  let userId;
  try {
    userId = await transaction((conn) => createAccount(conn, { fullName, email, passwordHash, role, licenseNumber }));
  } catch (err) {
    if (err.code === "23505") {
      // unique_violation: the constraint name tells us which column collided
      throw new ApiError(409, /license/i.test(err.constraint ?? err.detail ?? "") ? "this license number is already registered" : "an account with this email already exists");
    }
    throw err;
  }
  return respondWithToken(res, userId, 201);
});

/*
 * @feature: User Login (patients, nurses, doctors and administrators)
 * @description: Same generic error for unknown email and wrong password so attackers cannot
 *               enumerate registered accounts. Administrators sign in through the separate
 *               "Sign in as administrator" form (asAdmin = true): an admin must use that form,
 *               and a non-admin cannot use it. An admin also needs an active Admins row.
 *               A successful admin login records Admins.last_login_at.
 */
export const login = asyncHandler(async (req, res) => {
  const { email, password, asAdmin } = req.body;
  const user = await findUserByEmail(email);
  if (!user || !(await checkPassword(user.passwordHash, password))) {
    throw new ApiError(401, "incorrect email or password");
  }

  const isAdmin = user.role === ROLES.ADMIN;
  if (asAdmin && !isAdmin) throw new ApiError(401, "incorrect email or password");
  if (isAdmin && !asAdmin) throw new ApiError(403, "administrators must use the “Sign in as administrator” form");
  if (isAdmin) {
    if (!user.admin?.active) throw new ApiError(403, "this administrator account is not active");
    await touchLastLogin(user.id);
  }
  return respondWithToken(res, user.id, 200);
});

/*
 * @feature: Current User Lookup
 * @description: Restores the session after a page refresh.
 */
export const me = asyncHandler(async (req, res) => {
  const user = await findUserById(req.user.id);
  if (!user) throw new ApiError(404, "account not found");
  return ok(res, userView(user));
});
