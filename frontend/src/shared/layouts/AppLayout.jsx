/*
 * @feature: Application Shell
 * @description: Authenticated layout: fixed sidebar (role-based menu, profile,
 *               logout) plus a top bar with a mobile menu toggle. Pages render
 *               inside <Outlet />.
 */
import { useState } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { Avatar } from "@/shared/components/Avatar";
import { Icon } from "@/shared/components/Icon";
import { useAuth } from "@/features/auth/hooks/AuthContext";
import { navigation } from "./navigation";
export default function AppLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  if (!user) return null;
  const detail =
    user.role === "patient"
      ? "Patient"
      : user.role === "admin"
        ? "Administrator"
        : user.specialty || (user.role === "doctor" ? "Doctor" : "Nurse");
  return (
    <div className="min-h-screen">
      {open && <button className="fixed inset-0 z-30 bg-navy/40 lg:hidden" aria-label="Close navigation" onClick={() => setOpen(false)} />}

      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-64 flex-col border-r border-line bg-white px-3.5 transition-transform lg:translate-x-0 ${open ? "translate-x-0" : "-translate-x-full"}`}
      >
        <div className="flex h-[76px] items-center gap-2.5 px-2.5 font-display text-xl font-extrabold text-navy">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand text-white">
            <Icon name="shield" size={18} />
          </span>
          Wellora
        </div>
        <div className="px-2.5 pb-2 text-xs font-bold uppercase tracking-wider text-muted">{user.role} workspace</div>

        <nav className="flex flex-1 flex-col gap-1 overflow-y-auto">
          {navigation[user.role].map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              onClick={() => setOpen(false)}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition ${isActive ? "bg-brand-soft text-brand" : "text-ink hover:bg-paper"}`
              }
            >
              <Icon name={item.icon} size={19} />
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="my-3 flex items-center gap-3 rounded-xl bg-brand-soft p-3 text-brand">
          <Icon name="shield" size={19} />
          <div className="text-xs">
            <strong className="block text-sm">Your data is protected</strong>
            Encrypted & role-restricted
          </div>
        </div>

        <div className="flex items-center gap-2 border-t border-line py-3">
          <button className="flex min-w-0 flex-1 items-center gap-2.5 text-left" onClick={() => navigate("/settings")}>
            <Avatar initials={user.initials} id={user.id} size="sm" />
            <span className="min-w-0">
              <strong className="block truncate text-sm text-navy">{user.fullName}</strong>
              <small className="block truncate text-xs text-muted">{detail}</small>
            </span>
          </button>
          <button
            className="rounded-lg p-2 text-muted hover:bg-paper"
            aria-label="Log out"
            title="Log out"
            onClick={() => {
              logout();
              navigate("/", { replace: true });
            }}
          >
            <Icon name="logout" size={17} />
          </button>
        </div>
      </aside>

      <div className="lg:pl-64">
        <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b border-line bg-paper/90 px-4 backdrop-blur lg:hidden">
          <button onClick={() => setOpen(true)} aria-label="Open navigation" className="rounded-lg p-2 hover:bg-white">
            <Icon name="menu" />
          </button>
          <span className="font-display text-lg font-extrabold text-navy">Wellora</span>
        </header>
        <main className="mx-auto max-w-6xl p-5 sm:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
