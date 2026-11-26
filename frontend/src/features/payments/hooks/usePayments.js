/*
 * @feature: Payments Data Hook
 * @description: Loads payment totals and transactions for the current user.
 */
import { useAsync } from "@/shared/hooks/useAsync";
import { paymentService } from "../services/paymentService";
export const usePayments = () => useAsync(() => paymentService.get(), []);
