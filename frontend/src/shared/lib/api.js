/*
 * @feature: HTTP Client
 * @description: Preconfigured axios instance. Automatically attaches the JWT
 *               to every request and signals the app when the session expires
 *               (HTTP 401) so the user is returned to the login screen.
 */
import axios from "axios";
const TOKEN_KEY = "wellora.token";
export const UNAUTHORIZED_EVENT = "wellora:unauthorized";
export const tokenStore = {
  get: () => localStorage.getItem(TOKEN_KEY),
  set: (token) => localStorage.setItem(TOKEN_KEY, token),
  clear: () => localStorage.removeItem(TOKEN_KEY),
};
export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? "http://localhost:8080/api/v1",
  timeout: 15000,
});
api.interceptors.request.use((config) => {
  const token = tokenStore.get();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const isAuthCall = error.config?.url?.startsWith("/auth/login") || error.config?.url?.startsWith("/auth/register");
    if (error.response?.status === 401 && !isAuthCall) {
      tokenStore.clear();
      window.dispatchEvent(new Event(UNAUTHORIZED_EVENT));
    }
    return Promise.reject(error);
  },
);
/*
 * @feature: API Error Message Extraction
 * @description: Converts any thrown value into a friendly string, preferring the
 *               {"error": "..."} message produced by the Go backend.
 */
export function getErrorMessage(error, fallback = "Something went wrong. Please try again.") {
  if (axios.isAxiosError(error)) {
    const message = error.response?.data?.error;
    if (message) return message;
    if (!error.response) return "Cannot reach the server. Check your connection.";
  }
  return fallback;
}
/** Unwraps the backend's {"data": ...} envelope. */
export async function unwrap(request) {
  return (await request).data.data;
}
