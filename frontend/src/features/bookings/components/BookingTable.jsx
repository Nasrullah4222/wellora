/*
 * @feature: Appointments Table
 * @description: Role-aware list of bookings. Shows the *other* party (patient
 *               for professionals, professional for patients) and only the
 *               actions the current role is allowed to take on each status.
 */
import { Avatar } from "@/shared/components/Avatar";
import { Icon } from "@/shared/components/Icon";
import { StatusBadge } from "@/shared/components/StatusBadge";
import { visitLabel } from "@/shared/lib/format";
export function BookingTable({ bookings, role, busyId, onStatus, onReview }) {
  const isPro = role !== "patient";
  return (
    <ul className="divide-y divide-line">
      {bookings.map((b) => {
        const other = isPro ? b.patient : b.professional;
        const busy = busyId === b.id;
        return (
          <li key={b.id} className="flex flex-wrap items-center gap-4 p-4 sm:px-6">
            <div className="flex min-w-56 flex-1 items-center gap-3">
              <Avatar initials={other.initials} id={other.id} />
              <div className="min-w-0">
                <strong className="block truncate text-sm text-navy">{other.fullName}</strong>
                <span className="block truncate text-xs text-muted">{b.service}</span>
              </div>
            </div>

            <div className="w-40 text-sm">
              <strong className="block">{b.dateLabel}</strong>
              <span className="text-xs text-muted">
                {b.timeLabel} · {visitLabel[b.visitType]}
              </span>
            </div>

            <StatusBadge status={b.status} />

            <div className="flex flex-wrap items-center gap-2">
              {b.meetingUrl && (
                <a className="btn-primary !px-3 !py-2" href={b.meetingUrl} target="_blank" rel="noreferrer">
                  <Icon name="video" size={16} /> Join call
                </a>
              )}
              {isPro && b.status === "pending" && (
                <>
                  <button
                    className="btn-primary !px-3 !py-2"
                    disabled={busy}
                    onClick={() => onStatus(b.id, "accepted", "Booking accepted")}
                  >
                    Accept
                  </button>
                  <button className="btn-danger" disabled={busy} onClick={() => onStatus(b.id, "rejected", "Booking rejected")}>
                    Reject
                  </button>
                </>
              )}
              {isPro && (b.status === "accepted" || b.status === "in_progress") && (
                <button
                  className="btn-outline !px-3 !py-2"
                  disabled={busy}
                  onClick={() => onStatus(b.id, "completed", "Marked as completed")}
                >
                  Mark completed
                </button>
              )}
              {!isPro && (b.status === "pending" || b.status === "accepted") && (
                <button
                  className="btn-danger"
                  disabled={busy}
                  onClick={() => window.confirm("Cancel this appointment?") && onStatus(b.id, "cancelled", "Appointment cancelled")}
                >
                  Cancel
                </button>
              )}
              {!isPro && b.status === "completed" && !b.patientConfirmed && (
                <button className="btn-primary !px-3 !py-2" onClick={() => onReview(b)}>
                  Confirm & review
                </button>
              )}
              {!isPro && b.status === "completed" && b.patientConfirmed && (
                <span className="text-xs font-semibold text-green">Service confirmed</span>
              )}
            </div>
          </li>
        );
      })}
    </ul>
  );
}
