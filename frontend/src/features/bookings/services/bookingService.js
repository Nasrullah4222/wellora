/*
 * @feature: Booking API Service
 * @description: All HTTP calls for appointments: list, create, status changes,
 *               patient confirmation/review and free-slot lookup.
 */
import { api, unwrap } from "@/shared/lib/api";
export const bookingService = {
  list: (status) => unwrap(api.get("/bookings", { params: status ? { status } : {} })),
  create: (input) => unwrap(api.post("/bookings", input)),
  updateStatus: (id, status) => unwrap(api.patch(`/bookings/${id}/status`, { status })),
  confirm: (id, rating, comment) => unwrap(api.post(`/bookings/${id}/confirm`, { rating, comment })),
  slots: (professionalId, date) => unwrap(api.get(`/professionals/${professionalId}/slots`, { params: { date } })),
};
