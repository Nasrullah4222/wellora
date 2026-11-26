/*
 * @feature: HTTP Routing
 * @description: Wires middleware and controllers to URLs under /api/v1.
 *               Public: health, register, login (patients/professionals and administrators).
 *               Everything else needs a JWT and write actions are further restricted by role.
 */
import { Router } from "express";
import { authRequired, requireRoles } from "../middlewares/auth.js";
import { uploadSingleFile } from "../middlewares/upload.js";
import { validate } from "../middlewares/validate.js";
import { ROLES } from "../models/constants.js";
import * as auth from "../controllers/authController.js";
import * as bookings from "../controllers/bookingController.js";
import * as dashboard from "../controllers/dashboardController.js";
import * as payments from "../controllers/paymentController.js";
import * as pros from "../controllers/professionalController.js";
import * as reports from "../controllers/reportController.js";
import * as users from "../controllers/userController.js";

const router = Router();
const { PATIENT, NURSE, DOCTOR } = ROLES;
const CARE_ROLES = requireRoles(PATIENT, DOCTOR, NURSE); // admins have their own console; these screens are for care users

router.get("/health", (_req, res) => res.json({ status: "ok" }));
router.post("/auth/register", validate(auth.registerSchema, "please provide a valid name, email, role and a password of at least 8 characters"), auth.register);
router.post("/auth/login", validate(auth.loginSchema, "email and password are required"), auth.login);

router.use(authRequired);

router.get("/auth/me", auth.me);
router.put("/users/me", validate(users.profileSchema, "please check the highlighted profile fields"), users.updateMe);
router.get("/dashboard", dashboard.show);

// Directory (any signed-in user may browse)
router.get("/professionals", pros.list);
router.get("/professionals/:id", pros.get);
router.get("/professionals/:id/slots", pros.slots);

// Bookings
router.get("/bookings", CARE_ROLES, bookings.list);
router.post("/bookings", requireRoles(PATIENT), validate(bookings.createSchema, "please complete all booking details"), bookings.create);
router.patch("/bookings/:id/status", CARE_ROLES, validate(bookings.statusSchema, "status is required"), bookings.updateStatus);
router.post("/bookings/:id/confirm", requireRoles(PATIENT), validate(bookings.confirmSchema, "rating must be between 1 and 5"), bookings.confirm);
router.post("/bookings/:id/dispute", requireRoles(PATIENT), validate(bookings.disputeSchema, "please describe what went wrong"), bookings.dispute);

// Reports
router.get("/reports", CARE_ROLES, reports.list);
router.get("/reports/:id/download", CARE_ROLES, reports.download);
router.post("/reports", requireRoles(DOCTOR, NURSE), uploadSingleFile, reports.upload);

// Payments & patients
router.get("/payments", CARE_ROLES, payments.list);
router.get("/patients", requireRoles(DOCTOR, NURSE), users.patients);

export default router;
