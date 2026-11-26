/*
 * @feature: My Patients Page
 * @description: Doctor/nurse view listing patients they have an accepted or
 *               completed booking with, including visit count and last visit.
 */
import { Avatar } from "@/shared/components/Avatar";
import { EmptyState, ErrorState, PageHeader, Spinner } from "@/shared/components/Feedback";
import { useAsync } from "@/shared/hooks/useAsync";
import { reportService } from "../services/reportService";
export default function PatientsPage() {
  const { data, loading, error, reload } = useAsync(() => reportService.patients(), []);
  return (
    <>
      <PageHeader title="Patients" subtitle="People you are currently caring for." />
      <div className="panel overflow-hidden">
        {loading && !data ? (
          <Spinner />
        ) : error ? (
          <div className="p-6">
            <ErrorState message={error} onRetry={reload} />
          </div>
        ) : data && data.length > 0 ? (
          <ul className="divide-y divide-line">
            {data.map((p) => (
              <li key={p.id} className="flex flex-wrap items-center gap-4 px-5 py-4">
                <Avatar initials={p.initials} id={p.id} />
                <div className="min-w-48 flex-1">
                  <strong className="block text-sm text-navy">{p.fullName}</strong>
                  <span className="text-xs text-muted">
                    {p.email}
                    {p.phone ? ` · ${p.phone}` : ""}
                  </span>
                </div>
                <div className="text-sm">
                  <strong>
                    {p.visits} visit{p.visits === 1 ? "" : "s"}
                  </strong>
                  <span className="block text-xs text-muted">Last: {p.lastVisit}</span>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState icon="users" title="No patients yet" text="Patients appear here after you accept their booking." />
        )}
      </div>
    </>
  );
}
