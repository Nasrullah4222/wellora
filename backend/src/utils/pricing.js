/*
 * @feature: Pricing & Money Helpers
 * @description: The schema has no fee column on Doctors/Nurses/Services, so the price of a
 *               visit is a per-role default from env.js. Once a fee column exists, change
 *               feeCentsForRole (and users.js) only — nothing else needs to know.
 *               Payments.amount is DECIMAL(10,2); the API works in integer cents.
 */
import { env } from "../config/env.js";
import { ROLES } from "../models/constants.js";

export const feeCentsForRole = (role) => (role === ROLES.DOCTOR ? env.pricing.doctorFeeCents : env.pricing.nurseFeeCents);
export const toCents = (amount) => Math.round(Number(amount ?? 0) * 100);
export const toAmount = (cents) => (cents / 100).toFixed(2);
