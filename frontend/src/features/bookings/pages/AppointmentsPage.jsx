/*
 * @feature: Appointments Page
 * @description: "My Appointments" (patient), "Appointments" (doctor) and
 *               "My Assignments" (nurse). Status tabs filter the list; actions
 *               follow the booking lifecycle for the signed-in role.
 */
import { useState } from "react";
import { Link } from "react-router-dom";
import { EmptyState, ErrorState, PageHeader, Spinner } from "@/shared/components/Feedback";
import { useAuth } from "@/features/auth/hooks/AuthContext";
import { BookingTable } from "../components/BookingTable";
import { ReviewModal } from "../components/ReviewModal";
import { useBookings } from "../hooks/useBookings";
const tabs = [
  { label: "All" },
  { label: "Pending", value: "pending" },
  { label: "Accepted", value: "accepted" },
  { label: "Completed", value: "completed" },
  { label: "Rejected", value: "rejected" },
  { label: "Cancelled", value: "cancelled" },
];
export default function AppointmentsPage() {
  const { user } = useAuth();
  const [status, setStatus] = useState();
  const [reviewing, setReviewing] = useState(null);
  const { data, loading, error, reload, busyId, changeStatus } = useBookings(status);
  if (!user) return null;
  const title = user.role === "nurse" ? "My Assignments" : user.role === "doctor" ? "Appointments" : "My Appointments";
  return (
    <>
      <PageHeader
        title={title}
        subtitle={user.role === "patient" ? "Track and manage your upcoming and past care." : "Review requests and manage your schedule."}
        action={
          user.role === "patient" ? (
            <Link to="/doctors" className="btn-primary">
              Book a visit
            </Link>
          ) : undefined
        }
      />

      <div className="panel overflow-hidden">
        <div className="flex gap-1 overflow-x-auto border-b border-line p-3">
          {tabs.map((t) => (
            <button
              key={t.label}
              onClick={() => setStatus(t.value)}
              className={`whitespace-nowrap rounded-lg px-3.5 py-2 text-sm font-semibold ${status === t.value ? "bg-brand text-white" : "text-muted hover:bg-paper"}`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {loading && !data ? (
          <Spinner />
        ) : error ? (
          <div className="p-6">
            <ErrorState message={error} onRetry={reload} />
          </div>
        ) : data && data.length > 0 ? (
          <BookingTable bookings={data} role={user.role} busyId={busyId} onStatus={changeStatus} onReview={setReviewing} />
        ) : (
          <EmptyState icon="calendar" title="No appointments here" text="Appointments matching this filter will appear here." />
        )}
      </div>

      {reviewing && (
        <ReviewModal
          booking={reviewing}
          onClose={() => setReviewing(null)}
          onDone={() => {
            setReviewing(null);
            void reload();
          }}
        />
      )}
    </>
  );
}
