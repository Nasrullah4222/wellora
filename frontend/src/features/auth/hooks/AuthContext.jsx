/*
 * @feature: Session Management
 * @description: Holds the signed-in user for the whole app. On load it restores
 *               the session from the stored JWT (GET /auth/me), exposes
 *               login/register/logout, and logs the user out automatically
 *               when the API reports an expired token.
 */
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { tokenStore, UNAUTHORIZED_EVENT } from "@/shared/lib/api";
import { authService } from "../services/authService";
const AuthContext = createContext(null);
export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(Boolean(tokenStore.get()));
  // Restore session on first load.
  useEffect(() => {
    if (!tokenStore.get()) return;
    authService
      .me()
      .then(setUser)
      .catch(() => tokenStore.clear())
      .finally(() => setLoading(false));
  }, []);
  // Auto-logout when any request returns 401.
  useEffect(() => {
    const onUnauthorized = () => setUser(null);
    window.addEventListener(UNAUTHORIZED_EVENT, onUnauthorized);
    return () => window.removeEventListener(UNAUTHORIZED_EVENT, onUnauthorized);
  }, []);
  const login = useCallback(async (email, password, asAdmin = false) => {
    const result = await authService.login(email, password, asAdmin);
    tokenStore.set(result.token);
    setUser(result.user);
    return result.user;
  }, []);
  const register = useCallback(async (input) => {
    const result = await authService.register(input);
    tokenStore.set(result.token);
    setUser(result.user);
    return result.user;
  }, []);
  const logout = useCallback(() => {
    tokenStore.clear();
    setUser(null);
  }, []);
  const value = useMemo(() => ({ user, loading, login, register, logout, setUser }), [user, loading, login, register, logout]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}
