/*
 * @feature: Auth Form Logic
 * @description: Manages field values, submit state and API errors for the
 *               sign-in / register form, keeping AuthPage purely presentational.
 */
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { getErrorMessage } from "@/shared/lib/api";
import { useAuth } from "./AuthContext";
export function useAuthForm(initialMode, initialAdmin = false) {
  const { login, register } = useAuth();
  const navigate = useNavigate();
  const [mode, setMode] = useState(initialMode);
  const [role, setRole] = useState("patient");
  // true while the "Sign in as administrator" form is shown (login mode only)
  const [adminPortal, setAdminPortal] = useState(initialAdmin);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  async function submit(e) {
    e.preventDefault();
    setError(null);
    if (mode === "register" && password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    setSubmitting(true);
    try {
      if (mode === "login") await login(email, password, adminPortal);
      else await register({ fullName, email, password, role });
      navigate("/dashboard", { replace: true });
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }
  const changeMode = (m) => {
    setMode(m);
    if (m === "register") setAdminPortal(false);
    setError(null);
  };
  return {
    mode,
    setMode: changeMode,
    adminPortal,
    setAdminPortal: (v) => {
      setAdminPortal(v);
      setError(null);
    },
    role,
    setRole,
    fullName,
    setFullName,
    email,
    setEmail,
    password,
    setPassword,
    submitting,
    error,
    submit,
  };
}
