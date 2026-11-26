/*
 * @feature: Payments API Service
 * @description: Fetches the transaction ledger and totals.
 */
import { api, unwrap } from "@/shared/lib/api";
export const paymentService = { get: () => unwrap(api.get("/payments")) };
