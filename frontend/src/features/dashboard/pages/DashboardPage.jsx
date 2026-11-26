/*
 * @feature: Overview Dashboard Page
 * @description: Greets the user, shows role-specific stat cards, upcoming
 *               appointments and quick actions (find doctor / book nurse for
 *               patients, review requests for professionals). Administrators get a
 *               platform overview and a summary of their own CRUD permissions.
 */
import { Link } from "react-router-dom";
import { Avatar } from "@/shared/components/Avatar";
import { EmptyState, ErrorState, PageHeader, Spinner } from "@/shared/components/Feedback";
import { StatusBadge } from "@/shared/components/StatusBadge";
import { visitLabel } from "@/shared/lib/format";
import { useAuth } from "@/features/auth/hooks/AuthContext";
import { StatCard } from "../components/StatCard";
import { useDashboard } from "../hooks/useDashboard";
export default function DashboardPage() {
  const { user } = useAuth();
  const { data, loading, error, reload } = useDashboard();
  if (!user) return null;
  const isPatient = user.role === "patient";
  const isAdmin = user.role === "admin";
  const firstName = user.fullName.replace(/^Dr\.\s*/i, "").split(" ")[0];
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
  return (
    <>
      <PageHeader
        title={`${greeting}, ${firstName}`}
        subtitle={
          isAdmin
            ? "Platform overview and your administrator permissions."
            : isPatient
              ? "Here’s an overview of your care and upcoming appointments."
              : "Here’s what needs your attention today."
        }
        action={
          isAdmin ? undefined : isPatient ? (
            <div className="flex gap-2">
              <Link to="/doctors" className="btn-primary">
                Find a doctor
              </Link>
              <Link to="/nurses" className="btn-outline">
                Book a nurse
              </Link>
            </div>
          ) : (
            <Link to="/appointments" className="btn-primary">
              View requests
            </Link>
          )
        }
      />

      {loading && !data ? (
        <Spinner />
      ) : error ? (
        <ErrorState message={error} onRetry={reload} />
      ) : data ? (
        <>
          <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {data.stats.map((s) => (
              <StatCard key={s.key} stat={s} />
            ))}
          </section>

          {isAdmin && user.admin && (
            <section className="panel mt-6 p-5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 className="text-lg font-bold">Your permissions</h2>
                <span className="rounded-full bg-brand-soft px-3 py-1 text-xs font-semibold text-brand">
                  {user.admin.level.replace("_", " ")}
                </span>
              </div>
              <ul className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                {["create", "read", "update", "delete"].map((p) => (
                  <li key={p} className="flex items-center justify-between rounded-xl border border-line px-4 py-3 text-sm">
                    <span className="font-semibold capitalize">{p}</span>
                    <span className={user.admin?.permissions[p] ? "font-semibold text-brand" : "text-muted"}>
                      {user.admin?.permissions[p] ? "Allowed" : "Not allowed"}
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {!isAdmin && (
            <section className="panel mt-6 overflow-hidden">
              <div className="flex items-center justify-between border-b border-line p-5">
                <h2 className="text-lg font-bold">Upcoming appointments</h2>
                <Link to="/appointments" className="text-sm font-semibold text-brand">
                  View all
                </Link>
              </div>
              {data.upcoming.length === 0 ? (
                <EmptyState icon="calendar" title="Nothing scheduled" text="Upcoming appointments will show up here." />
              ) : (
                <ul className="divide-y divide-line">
                  {data.upcoming.map((b) => {
                    const other = isPatient ? b.professional : b.patient;
                    return (
                      <li key={b.id} className="flex flex-wrap items-center gap-4 px-5 py-4">
                        <Avatar initials={other.initials} id={other.id} />
                        <div className="min-w-48 flex-1">
                          <strong className="block text-sm text-navy">{other.fullName}</strong>
                          <span className="text-xs text-muted">
                            {b.service} · {visitLabel[b.visitType]}
                          </span>
                        </div>
                        <div className="text-sm">
                          <strong>{b.dateLabel}</strong>
                          <span className="block text-xs text-muted">{b.timeLabel}</span>
                        </div>
                        <StatusBadge status={b.status} />
                      </li>
                    );
                  })}
                </ul>
              )}
            </section>
          )}
        </>
      ) : null}
    </>
  );
}
