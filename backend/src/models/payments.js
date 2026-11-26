/*
 * @feature: Payment & Balance Queries (PostgreSQL)
 * @description: Payments has no patient/provider columns, so every ledger query joins
 *               through Appointments. Money lives in DECIMAL(10,2) and is exposed as cents.
 *               Balances (one row per provider) tracks the provider's money:
 *                 accept   -> pending_balance   += amount
 *                 complete -> pending -= amount, available += amount, total_earnings += amount
 *                 cancel   -> pending_balance   -= amount (and the Payment becomes REFUNDED)
 *               There is no payout table, so available_balance simply accumulates.
 */
import { query, exec } from "../config/database.js";
import { fromDbRole } from "./constants.js";
import { sideColumn } from "./appointments.js";
import { randomHex } from "../utils/helpers.js";
import { toAmount, toCents } from "../utils/pricing.js";

/** The card is "captured" when a provider accepts: a PAID payment with a generated transaction id. */
export async function createPaidPayment(conn, { appointmentId, amountCents, method = "Card" }) {
  await exec(
    `INSERT INTO Payments (appointment_id, amount, payment_method, transaction_id, payment_status, paid_at, created_at)
     VALUES ($1, $2, $3, $4, 'PAID', NOW(), NOW())`,
    [appointmentId, toAmount(amountCents), method, `TXN-${randomHex(8).toUpperCase()}`],
    conn,
  );
}

/** Returns the amount (cents) of the appointment's PAID payment, locking it, or null. */
export async function lockPaidAmountCents(conn, appointmentId) {
  const rows = await query(
    "SELECT payment_id, amount FROM Payments WHERE appointment_id = $1 AND payment_status = 'PAID' ORDER BY payment_id DESC LIMIT 1 FOR UPDATE",
    [appointmentId],
    conn,
  );
  return rows[0] ? toCents(rows[0].amount) : null;
}

export async function refundPayment(conn, appointmentId) {
  await exec(
    "UPDATE Payments SET payment_status = 'REFUNDED' WHERE appointment_id = $1 AND payment_status = 'PAID'",
    [appointmentId],
    conn,
  );
}

/** Newest first. `role` decides whether to match the patient or the provider side. */
export async function listPayments(role, userId) {
  const rows = await query(
    `SELECT p.payment_id, p.appointment_id, p.amount, p.payment_method, p.payment_status, p.created_at,
            s.service_name,
            a.patient_id, pu.user_name AS patient_name, pu.role AS patient_role,
            a.provider_id, pr.user_name AS provider_name, pr.role AS provider_role
       FROM Payments p
       JOIN Appointments a ON a.appointment_id = p.appointment_id
       JOIN Services s ON s.service_id = a.service_id
       JOIN Users pu ON pu.user_id = a.patient_id
       JOIN Users pr ON pr.user_id = a.provider_id
      WHERE ${sideColumn(role)} = $1
      ORDER BY p.created_at DESC, p.payment_id DESC`,
    [userId],
  );
  return rows.map((r) => ({
    id: r.payment_id,
    bookingId: r.appointment_id,
    description: r.service_name,
    method: r.payment_method,
    amountCents: toCents(r.amount),
    status: r.payment_status.toLowerCase(),
    createdAt: r.created_at,
    patient: { id: r.patient_id, fullName: r.patient_name, role: fromDbRole(r.patient_role) },
    professional: { id: r.provider_id, fullName: r.provider_name, role: fromDbRole(r.provider_role) },
  }));
}

/** Sum of PAID payments for a patient ("total spent") or provider ("total earned"), in cents. */
export async function sumPaidCents(role, userId) {
  const rows = await query(
    `SELECT COALESCE(SUM(p.amount), 0) AS total
       FROM Payments p JOIN Appointments a ON a.appointment_id = p.appointment_id
      WHERE ${sideColumn(role)} = $1 AND p.payment_status = 'PAID'`,
    [userId],
  );
  return toCents(rows[0].total);
}

// ---- Balances -------------------------------------------------------------------------

async function ensureBalance(conn, userId) {
  await exec("INSERT INTO Balances (user_id, updated_at) VALUES ($1, NOW()) ON CONFLICT (user_id) DO NOTHING", [userId], conn);
}

export async function balanceOnAccept(conn, providerId, cents) {
  await ensureBalance(conn, providerId);
  await exec(
    "UPDATE Balances SET pending_balance = pending_balance + $1, updated_at = NOW() WHERE user_id = $2",
    [toAmount(cents), providerId],
    conn,
  );
}

export async function balanceOnComplete(conn, providerId, cents) {
  await ensureBalance(conn, providerId);
  await exec(
    `UPDATE Balances
        SET pending_balance   = GREATEST(pending_balance - $1, 0),
            available_balance = available_balance + $1,
            total_earnings    = total_earnings + $1,
            updated_at        = NOW()
      WHERE user_id = $2`,
    [toAmount(cents), providerId],
    conn,
  );
}

export async function balanceOnRefund(conn, providerId, cents) {
  await ensureBalance(conn, providerId);
  await exec(
    "UPDATE Balances SET pending_balance = GREATEST(pending_balance - $1, 0), updated_at = NOW() WHERE user_id = $2",
    [toAmount(cents), providerId],
    conn,
  );
}

export async function getBalance(userId) {
  const rows = await query("SELECT available_balance, pending_balance, total_earnings FROM Balances WHERE user_id = $1", [userId]);
  const r = rows[0];
  return {
    availableCents: r ? toCents(r.available_balance) : 0,
    pendingCents: r ? toCents(r.pending_balance) : 0,
    totalEarningsCents: r ? toCents(r.total_earnings) : 0,
  };
}
