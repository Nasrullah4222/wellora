/*
 * @feature: Dashboard Controller
 * @description: Aggregates the numbers and upcoming appointments for each role's
 *               Overview page.
 */
import { ACTIVE_DB_STATUSES, ROLES } from "../models/constants.js";
import { getAdminAccess, platformStats } from "../models/admins.js";
import { countBookings, expireStale, listUpcoming } from "../models/appointments.js";
import { sumPaidCents } from "../models/payments.js";
import { countReportsForPatient } from "../models/reports.js";
import { bookingView, ok } from "../views/index.js";
import { ApiError } from "../utils/ApiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { nowLocal } from "../utils/helpers.js";
import { toCents } from "../utils/pricing.js";

/*
 * @feature: Role-based Dashboard
 * @description: GET /dashboard. Patients: upcoming visits, completed, reports, spend.
 *               Providers: new requests, today's appointments, completed, earnings.
 *               Administrators: platform totals (needs an active admin with can_read).
 */
export const show = asyncHandler(async (req, res) => {
  const { id, role } = req.user;
  if (role === ROLES.ADMIN) return adminOverview(id, res);
  await expireStale();
  const now = new Date();
  const dayStart = nowLocal().startOf("day");
  const total = await sumPaidCents(role, id);

  let stats;
  if (role === ROLES.PATIENT) {
    stats = [
      { key: "upcoming", label: "Upcoming appointments", value: await countBookings(role, id, { statuses: ACTIVE_DB_STATUSES, from: now }), kind: "count" },
      { key: "completed", label: "Completed visits", value: await countBookings(role, id, { statuses: ["COMPLETED"] }), kind: "count" },
      { key: "reports", label: "Medical reports", value: await countReportsForPatient(id), kind: "count" },
      { key: "spent", label: "Total spent", value: total, kind: "money" },
    ];
  } else {
    stats = [
      { key: "pending", label: "New requests", value: await countBookings(role, id, { statuses: ["PENDING"] }), kind: "count" },
      {
        key: "today",
        label: "Today's appointments",
        value: await countBookings(role, id, { statuses: ["ACCEPTED", "IN_PROGRESS"], from: dayStart.toJSDate(), to: dayStart.plus({ days: 1 }).toJSDate() }),
        kind: "count",
      },
      { key: "completed", label: "Completed visits", value: await countBookings(role, id, { statuses: ["COMPLETED"] }), kind: "count" },
      { key: "earned", label: "Total earnings", value: total, kind: "money" },
    ];
  }

  const upcoming = await listUpcoming(role, id, now, 5);
  return ok(res, { stats, upcoming: upcoming.map(bookingView) });
});

async function adminOverview(adminId, res) {
  const access = await getAdminAccess(adminId);
  if (!access?.active) throw new ApiError(403, "this administrator account is not active");
  if (!access.permissions.read) throw new ApiError(403, "your admin account is not allowed to read");

  await expireStale();
  const s = await platformStats();
  const stats = [
    { key: "patients", label: "Patients", value: Number(s.patients), kind: "count" },
    { key: "providers", label: "Doctors & nurses", value: Number(s.providers), kind: "count" },
    { key: "appointments", label: "Appointments", value: Number(s.appointments), kind: "count" },
    { key: "revenue", label: "Paid revenue", value: toCents(s.revenue), kind: "money" },
  ];
  return ok(res, { stats, upcoming: [] });
}
