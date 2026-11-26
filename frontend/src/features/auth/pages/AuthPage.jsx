/*
 * @feature: Sign In / Register Page
 * @description: Split-screen authentication screen from the design. A single
 *               page toggles between sign-in and registration (with role selection).
 *               Administrators use the "Sign in as administrator" form (also reachable
 *               directly at /auth?portal=admin); admin accounts cannot self-register.
 */
import { Navigate, useSearchParams } from "react-router-dom";
import { Icon } from "@/shared/components/Icon";
import { Spinner } from "@/shared/components/Feedback";
import { RolePicker } from "../components/RolePicker";
import { useAuth } from "../hooks/AuthContext";
import { useAuthForm } from "../hooks/useAuthForm";
export default function AuthPage() {
  const { user, loading } = useAuth();
  const [params] = useSearchParams();
  const form = useAuthForm(params.get("mode") === "register" ? "register" : "login", params.get("portal") === "admin");
  const isRegister = form.mode === "register";
  const isAdminLogin = !isRegister && form.adminPortal;
  if (loading) return <Spinner />;
  if (user) return <Navigate to="/dashboard" replace />;
  return (
    <main className="grid min-h-screen lg:grid-cols-2">
      <section className="hidden flex-col justify-between bg-navy p-12 text-white lg:flex">
        <div className="font-display text-2xl font-extrabold">Wellora</div>
        <div>
          <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-sm">
            <Icon name="shield" size={16} /> Connected care, made simpler
          </span>
          <h1 className="mt-5 text-4xl font-extrabold leading-tight !text-white">Healthcare that moves with you.</h1>
          <p className="mt-4 max-w-md text-white/75">
            Find trusted professionals, manage your care, and understand your health—all in one secure place.
          </p>
          <div className="mt-8 grid max-w-md gap-4">
            <div className="rounded-xl bg-white/10 p-4">
              <strong>Care on your schedule</strong>
              <p className="mt-1 text-sm text-white/70">Book virtual or in-person care in minutes.</p>
            </div>
            <div className="rounded-xl bg-white/10 p-4">
              <strong>Private by design</strong>
              <p className="mt-1 text-sm text-white/70">Your personal health information stays protected.</p>
            </div>
          </div>
        </div>
        <small className="text-white/60">Trusted care for patients and professionals.</small>
      </section>

      <section className="flex items-center justify-center p-6">
        <form onSubmit={form.submit} className="flex w-full max-w-md flex-col gap-4">
          <span className="text-xs font-bold uppercase tracking-wider text-brand">
            {isRegister ? "Create your account" : isAdminLogin ? "Administrator access" : "Welcome back"}
          </span>
          <h2 className="text-3xl font-extrabold">
            {isRegister ? "Join Wellora" : isAdminLogin ? "Administrator sign-in" : "Sign in to your workspace"}
          </h2>

          <div className="grid grid-cols-2 rounded-xl bg-white p-1 ring-1 ring-line">
            {["login", "register"].map((m) => (
              <button
                type="button"
                key={m}
                onClick={() => form.setMode(m)}
                className={`rounded-lg py-2 text-sm font-semibold ${form.mode === m ? "bg-brand text-white" : "text-muted"}`}
              >
                {m === "login" ? "Sign in" : "Register"}
              </button>
            ))}
          </div>

          {isRegister && <RolePicker value={form.role} onChange={form.setRole} />}
          {isRegister && (
            <label className="field-label">
              Full name
              <input
                className="input"
                required
                value={form.fullName}
                onChange={(e) => form.setFullName(e.target.value)}
                placeholder="Enter your full name"
              />
            </label>
          )}
          <label className="field-label">
            Email address
            <input
              className="input"
              type="email"
              required
              autoComplete="email"
              value={form.email}
              onChange={(e) => form.setEmail(e.target.value)}
            />
          </label>
          <label className="field-label">
            Password
            <input
              className="input"
              type="password"
              required
              autoComplete={isRegister ? "new-password" : "current-password"}
              value={form.password}
              onChange={(e) => form.setPassword(e.target.value)}
              placeholder={isRegister ? "At least 8 characters" : ""}
            />
          </label>

          {form.error && (
            <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
              {form.error}
            </p>
          )}

          <button className="btn-primary" disabled={form.submitting}>
            {form.submitting
              ? "Please wait..."
              : isRegister
                ? "Create secure account"
                : isAdminLogin
                  ? "Sign in as administrator"
                  : "Sign in securely"}
            <Icon name="arrow" size={17} />
          </button>

          {import.meta.env.DEV && !isRegister && !isAdminLogin && (
            <p className="rounded-lg bg-brand-soft px-3 py-2 text-xs text-brand">
              Demo: olivia@example.com (patient), ethan.williams@example.com (doctor), ava.thompson@example.com (nurse) — password{" "}
              <b>Password123!</b>
            </p>
          )}

          {isAdminLogin && (
            <p className="rounded-lg bg-brand-soft px-3 py-2 text-xs text-brand">
              Restricted area for platform administrators.
              {import.meta.env.DEV && (
                <>
                  {" "}
                  Demo: admin@example.com — password <b>Password123!</b>
                </>
              )}
            </p>
          )}

          {!isRegister && (
            <button
              type="button"
              onClick={() => form.setAdminPortal(!form.adminPortal)}
              className="inline-flex items-center justify-center gap-1.5 text-sm font-semibold text-brand hover:underline"
            >
              <Icon name="shield" size={15} />
              {isAdminLogin ? "Back to regular sign-in" : "Administrator? Sign in here"}
            </button>
          )}
        </form>
      </section>
    </main>
  );
}
