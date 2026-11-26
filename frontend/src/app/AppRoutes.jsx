/*
 * @feature: Application Routing & Access Control
 * @description: Declares every route. <RequireRole> blocks unauthenticated users
 *               (redirect to /auth) and users whose role may not see the page
 *               (redirect to /dashboard). Pages are code-split with React.lazy.
 */
import { lazy, Suspense } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { Spinner } from "@/shared/components/Feedback";
import AppLayout from "@/shared/layouts/AppLayout";
import { useAuth } from "@/features/auth/hooks/AuthContext";
const LandingPage = lazy(() => import("@/features/landing/pages/LandingPage"));
const AuthPage = lazy(() => import("@/features/auth/pages/AuthPage"));
const DashboardPage = lazy(() => import("@/features/dashboard/pages/DashboardPage"));
const ProfessionalsPage = lazy(() => import("@/features/professionals/pages/ProfessionalsPage"));
const AppointmentsPage = lazy(() => import("@/features/bookings/pages/AppointmentsPage"));
const ReportsPage = lazy(() => import("@/features/reports/pages/ReportsPage"));
const PatientsPage = lazy(() => import("@/features/reports/pages/PatientsPage"));
const PaymentsPage = lazy(() => import("@/features/payments/pages/PaymentsPage"));
const SettingsPage = lazy(() => import("@/features/profile/pages/SettingsPage"));
/** Screens for patients and care professionals; administrators use their own console (/dashboard). */
const CARE_ROLES = ["patient", "doctor", "nurse"];
function RequireRole({ roles, children }) {
  const { user, loading } = useAuth();
  if (loading) return <Spinner />;
  if (!user) return <Navigate to="/auth" replace />;
  if (roles && !roles.includes(user.role)) return <Navigate to="/dashboard" replace />;
  return <>{children}</>;
}
export default function AppRoutes() {
  return (
    <Suspense fallback={<Spinner />}>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/auth" element={<AuthPage />} />

        <Route
          element={
            <RequireRole>
              <AppLayout />
            </RequireRole>
          }
        >
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route
            path="/appointments"
            element={
              <RequireRole roles={CARE_ROLES}>
                <AppointmentsPage />
              </RequireRole>
            }
          />
          <Route
            path="/reports"
            element={
              <RequireRole roles={CARE_ROLES}>
                <ReportsPage />
              </RequireRole>
            }
          />
          <Route
            path="/payments"
            element={
              <RequireRole roles={CARE_ROLES}>
                <PaymentsPage />
              </RequireRole>
            }
          />
          <Route path="/settings" element={<SettingsPage />} />

          <Route
            path="/doctors"
            element={
              <RequireRole roles={["patient"]}>
                <ProfessionalsPage role="doctor" />
              </RequireRole>
            }
          />
          <Route
            path="/nurses"
            element={
              <RequireRole roles={["patient"]}>
                <ProfessionalsPage role="nurse" />
              </RequireRole>
            }
          />
          <Route
            path="/patients"
            element={
              <RequireRole roles={["doctor", "nurse"]}>
                <PatientsPage />
              </RequireRole>
            }
          />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  );
}
