/*
 * @feature: Professional Directory API Service
 * @description: Search doctors or nurses by free text and specialty.
 */
import { api, unwrap } from "@/shared/lib/api";
export const professionalService = {
  list: (params) => unwrap(api.get("/professionals", { params })),
};
