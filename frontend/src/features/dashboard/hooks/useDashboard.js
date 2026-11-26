/*
 * @feature: Dashboard Data Hook
 * @description: Loads the overview payload for the signed-in user.
 */
import { useAsync } from "@/shared/hooks/useAsync";
import { dashboardService } from "../services/dashboardService";
export const useDashboard = () => useAsync(() => dashboardService.get(), []);
