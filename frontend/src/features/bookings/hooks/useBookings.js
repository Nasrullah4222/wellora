/*
 * @feature: Bookings Data Hook
 * @description: Loads the caller's bookings (optionally filtered by status) and
 *               exposes action helpers that call the API, show feedback and refresh.
 */
import { useState } from "react";
import { useAsync } from "@/shared/hooks/useAsync";
import { useToast } from "@/shared/components/Toast";
import { getErrorMessage } from "@/shared/lib/api";
import { bookingService } from "../services/bookingService";
export function useBookings(status) {
  const query = useAsync(() => bookingService.list(status), [status]);
  const { notify } = useToast();
  const [busyId, setBusyId] = useState(null);
  /*
   * @feature: Booking Status Action
   * @description: Accept / reject / complete / cancel a booking, tracking which
   *               row is busy so its buttons can be disabled during the request.
   */
  async function changeStatus(id, next, successMessage) {
    setBusyId(id);
    try {
      await bookingService.updateStatus(id, next);
      notify(successMessage);
      await query.reload();
    } catch (e) {
      notify(getErrorMessage(e), "error");
    } finally {
      setBusyId(null);
    }
  }
  return { ...query, busyId, changeStatus };
}
