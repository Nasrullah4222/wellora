/*
 * @feature: Root Providers
 * @description: Composes global providers: router, toast notifications and the
 *               authentication session. Everything else lives in /features.
 */
import { BrowserRouter } from "react-router-dom";
import AppRoutes from "@/app/AppRoutes";
import { ToastProvider } from "@/shared/components/Toast";
import { AuthProvider } from "@/features/auth/hooks/AuthContext";
export default function App() {
  return (
    <BrowserRouter>
      <ToastProvider>
        <AuthProvider>
          <AppRoutes />
        </AuthProvider>
      </ToastProvider>
    </BrowserRouter>
  );
}
