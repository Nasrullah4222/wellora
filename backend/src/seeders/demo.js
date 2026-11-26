/*
 * @feature: Demo Data Seeder
 * @description: Fills an empty database with the people from the Figma design plus sample
 *               appointments so every screen has content on first run. Uses the same SQL
 *               model functions as the API. Also creates one demo administrator (admin@example.com).
 *               All demo accounts share the password "Password123!".
 */
import { query, exec, transaction } from "../config/database.js";
import { BOOKING, ROLES, VISIT, toDbStatus, toDbVisit } from "../models/constants.js";
import { findOrCreateService } from "../models/appointments.js";
import { balanceOnAccept, balanceOnComplete, createPaidPayment } from "../models/payments.js";
import { insertRating, requestValidation, respondToValidation } from "../models/validations.js";
import { createAdminAccount } from "../models/admins.js";
import { createAccount } from "../models/users.js";
import { nowLocal } from "../utils/helpers.js";
import { feeCentsForRole } from "../utils/pricing.js";
import { hashPassword } from "../utils/security.js";

const PASSWORD = "Password123!";

// [name, email, specialty, bio, role, years (nurses), virtual-capable is implied for doctors]
const PROFESSIONALS = [
  ["Dr. Ethan Williams", "ethan.williams@example.com", "Cardiologist", "Interventional cardiology and preventive heart care.", ROLES.DOCTOR, 0],
  ["Dr. Ethan Ross", "ethan.ross@example.com", "Cardiologist", "Heart health, hypertension and follow-up care.", ROLES.DOCTOR, 0],
  ["Dr. Julia Morgan", "julia.morgan@example.com", "General Physician", "Family medicine and preventive check-ups.", ROLES.DOCTOR, 0],
  ["Dr. Amara Patel", "amara.patel@example.com", "Dermatologist", "Medical and cosmetic dermatology.", ROLES.DOCTOR, 0],
  ["Dr. Marcus Lee", "marcus.lee@example.com", "Neurologist", "Headache, stroke and movement disorders.", ROLES.DOCTOR, 0],
  ["Ava Thompson", "ava.thompson@example.com", "Registered Nurse", "", ROLES.NURSE, 8],
  ["Sarah Chen, RN", "sarah.chen@example.com", "Home care specialist", "", ROLES.NURSE, 7],
  ["Maya Rodriguez, RN", "maya.rodriguez@example.com", "Elder care & rehabilitation", "", ROLES.NURSE, 10],
  ["James Wilson, LPN", "james.wilson@example.com", "Post-operative care", "", ROLES.NURSE, 6],
];

export async function seedDemoData() {
  const [{ total }] = await query("SELECT COUNT(*) AS total FROM Users");
  if (Number(total) > 0) return;
  const passwordHash = await hashPassword(PASSWORD);

  await transaction(async (conn) => {
    // Demo administrator (full CRUD). Sign in through "Sign in as administrator".
    await createAdminAccount(conn, { fullName: "Wellora Admin", email: "admin@example.com", passwordHash, level: "SUPER_ADMIN" });

    const patientId = await createAccount(conn, {
      fullName: "Olivia Martin", email: "olivia@example.com", passwordHash, role: ROLES.PATIENT, address: "728 Valencia Street",
    });

    const byEmail = {};
    let n = 1;
    for (const [fullName, email, specialty, bio, role, experienceYears] of PROFESSIONALS) {
      const id = await createAccount(conn, {
        fullName, email, passwordHash, role, specialty, bio, experienceYears, licenseNumber: `DEMO-${role.toUpperCase()}-${String(n++).padStart(3, "0")}`,
      });
      byEmail[email] = { id, role };
    }

    /** HH:00 local time, `days` days from today, as a JS Date (stored as UTC). */
    const at = (days, hour) => nowLocal().plus({ days }).set({ hour, minute: 0, second: 0, millisecond: 0 }).toJSDate();

    // [professional email, visit, service, when, status, paid]
    const appointments = [
      ["ethan.williams@example.com", VISIT.VIRTUAL, "Virtual cardiology follow-up", at(1, 10), BOOKING.ACCEPTED, true],
      ["sarah.chen@example.com", VISIT.HOME, "Home nursing visit", at(3, 14), BOOKING.PENDING, false],
      ["julia.morgan@example.com", VISIT.VIRTUAL, "Report review", at(-5, 9), BOOKING.COMPLETED, true],
      ["ava.thompson@example.com", VISIT.HOME, "Medication support", at(-9, 11), BOOKING.REJECTED, false],
    ];
    for (const [email, visit, service, scheduledAt, status, paid] of appointments) {
      const pro = byEmail[email];
      const serviceId = await findOrCreateService(conn, service, toDbVisit(visit));
      const {
        rows: [{ appointment_id: insertId }],
      } = await exec(
        `INSERT INTO Appointments (patient_id, provider_id, service_id, service_address, status, requested_at, response_deadline, accepted_at, scheduled_at, completed_at)
         VALUES ($1, $2, $3, $4, $5, NOW(), $6, $7, $8, $9)
         RETURNING appointment_id`,
        [
          patientId, pro.id, serviceId, visit === VISIT.HOME ? "728 Valencia Street" : null, toDbStatus(status),
          scheduledAt, paid ? new Date() : null, scheduledAt, status === BOOKING.COMPLETED ? scheduledAt : null,
        ],
        conn,
      );
      if (paid) {
        const cents = feeCentsForRole(pro.role);
        await createPaidPayment(conn, { appointmentId: insertId, amountCents: cents, method: "Visa •••• 4821" });
        await balanceOnAccept(conn, pro.id, cents);
        if (status === BOOKING.COMPLETED) {
          await balanceOnComplete(conn, pro.id, cents);
          await requestValidation(conn, insertId);
          await respondToValidation(conn, insertId, "ACCEPTED", "Very helpful, thank you.");
          await insertRating(conn, insertId, 5, "Very helpful, thank you.");
        }
      }
    }
  });
  console.log(`seed: demo data created (password for all accounts: ${PASSWORD})`);
}
