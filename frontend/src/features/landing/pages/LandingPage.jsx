/*
 * @feature: Public Landing Page
 * @description: Marketing entry page with navigation to sign-in / registration
 *               and a short explanation of the three roles. Signed-in users are
 *               redirected straight to their dashboard.
 */
import { Link, Navigate } from "react-router-dom";
import { Icon } from "@/shared/components/Icon";
import { useAuth } from "@/features/auth/hooks/AuthContext";
const features = [
  { icon: "doctor", title: "Consult trusted doctors", text: "Search specialists and book virtual or in-person visits in minutes." },
  { icon: "nurse", title: "Nursing care at home", text: "Verified nurses who come to you for wound care, medication support and more." },
  { icon: "file", title: "Reports in one place", text: "Receive and download medical documents securely from your care team." },
  { icon: "shield", title: "Private by design", text: "Role-based access and encrypted sessions protect every record." },
];
export default function LandingPage() {
  const { user } = useAuth();
  if (user) return <Navigate to="/dashboard" replace />;
  return (
    <div className="min-h-screen">
      <header className="mx-auto flex max-w-6xl items-center justify-between p-5">
        <span className="font-display text-xl font-extrabold text-navy">Wellora</span>
        <nav className="flex items-center gap-2">
          <Link to="/auth" className="btn-outline">
            Sign in
          </Link>
          <Link to="/auth?mode=register" className="btn-primary">
            Get started
          </Link>
        </nav>
      </header>

      <section className="mx-auto max-w-6xl px-5 py-16 text-center sm:py-24">
        <span className="inline-flex items-center gap-2 rounded-full bg-brand-soft px-3.5 py-1.5 text-sm font-semibold text-brand">
          <Icon name="shield" size={16} /> Connected care, made simpler
        </span>
        <h1 className="mx-auto mt-6 max-w-3xl text-4xl font-extrabold leading-tight sm:text-6xl">Healthcare that moves with you.</h1>
        <p className="mx-auto mt-5 max-w-xl text-lg text-muted">
          Find trusted professionals, manage your care and keep your health records in one secure place.
        </p>
        <div className="mt-8 flex justify-center gap-3">
          <Link to="/auth?mode=register" className="btn-primary !px-6 !py-3">
            Create an account <Icon name="arrow" size={17} />
          </Link>
          <Link to="/auth" className="btn-outline !px-6 !py-3">
            Sign in
          </Link>
        </div>
      </section>

      <section className="mx-auto grid max-w-6xl gap-5 px-5 pb-20 sm:grid-cols-2 lg:grid-cols-4">
        {features.map((f) => (
          <div key={f.title} className="panel p-6">
            <span className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-brand-soft text-brand">
              <Icon name={f.icon} />
            </span>
            <h3 className="font-bold">{f.title}</h3>
            <p className="mt-1.5 text-sm text-muted">{f.text}</p>
          </div>
        ))}
      </section>
    </div>
  );
}
