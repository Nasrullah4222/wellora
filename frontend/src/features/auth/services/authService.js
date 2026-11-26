/*
 * @feature: Auth API Service
 * @description: Thin wrappers around the /auth endpoints. No UI logic here;
 *               state handling lives in the AuthContext hook.
 */
import { api, unwrap } from "@/shared/lib/api";
export const authService = {
  login: (email, password, asAdmin = false) => unwrap(api.post("/auth/login", { email, password, asAdmin })),
  register: (input) => unwrap(api.post("/auth/register", input)),
  me: () => unwrap(api.get("/auth/me")),
};
