/*
 * @feature: Payment Controller
 * @description: Read-only ledger for "Payments" (patients) and "Earnings"
 *               (professionals) with lifetime / this-month totals. Providers also get
 *               their Balances row (available / pending / total earnings).
 */
import { isProfessional } from "../models/constants.js";
import { getBalance, listPayments } from "../models/payments.js";
import { ok, paymentView } from "../views/index.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { nowLocal } from "../utils/helpers.js";

/*
 * @feature: Payment History
 * @description: GET /payments. Only PAID payments count toward the totals (REFUNDED ones are
 *               listed but not counted). "This month" is evaluated in the application time zone.
 */
export const list = asyncHandler(async (req, res) => {
  const payments = await listPayments(req.user.role, req.user.id);

  const monthStart = nowLocal().startOf("month").toMillis();
  let totalCents = 0;
  let thisMonthCents = 0;
  for (const p of payments) {
    if (p.status !== "paid") continue;
    totalCents += p.amountCents;
    if (new Date(p.createdAt).getTime() >= monthStart) thisMonthCents += p.amountCents;
  }
  const balance = isProfessional(req.user.role) ? { balance: await getBalance(req.user.id) } : {};
  return ok(res, { totalCents, thisMonthCents, count: payments.length, transactions: payments.map(paymentView), ...balance });
});
