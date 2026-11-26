/*
 * @feature: Dashboard API Service
 * @description: Fetches role-specific stats and upcoming appointments in one call.
 */
import { api, unwrap } from "@/shared/lib/api";
export const dashboardService = {
  get: () => unwrap(api.get("/dashboard")),
};
