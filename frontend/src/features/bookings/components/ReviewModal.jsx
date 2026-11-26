/*
 * @feature: Service Confirmation & Review Modal
 * @description: After a visit is completed the patient confirms the service
 *               happened and may leave a 1-5 star rating and comment, which
 *               updates the professional's public rating.
 */
import { useState } from "react";
import { Icon } from "@/shared/components/Icon";
import { Modal } from "@/shared/components/Modal";
import { useToast } from "@/shared/components/Toast";
import { getErrorMessage } from "@/shared/lib/api";
import { bookingService } from "../services/bookingService";
export function ReviewModal({ booking, onClose, onDone }) {
  const { notify } = useToast();
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [saving, setSaving] = useState(false);
  async function submit() {
    setSaving(true);
    try {
      await bookingService.confirm(booking.id, rating, comment);
      notify("Thanks! Your confirmation was saved.");
      onDone();
    } catch (e) {
      notify(getErrorMessage(e), "error");
    } finally {
      setSaving(false);
    }
  }
  return (
    <Modal
      title="Confirm your care"
      subtitle={`${booking.service} with ${booking.professional.fullName} · ${booking.dateLabel}`}
      onClose={onClose}
    >
      <p className="mb-3 text-sm text-ink">Confirm the scheduled service was completed and share optional feedback.</p>
      <div className="mb-4 flex gap-1" role="radiogroup" aria-label="Rating">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            role="radio"
            aria-checked={rating === n}
            aria-label={`${n} star${n > 1 ? "s" : ""}`}
            onClick={() => setRating(n)}
          >
            <Icon name="star" size={28} className={n <= rating ? "fill-amber-400 text-amber-400" : "text-line"} />
          </button>
        ))}
      </div>
      <textarea
        className="input mb-4 min-h-24"
        maxLength={1000}
        placeholder="How was your experience? (optional)"
        value={comment}
        onChange={(e) => setComment(e.target.value)}
      />
      <div className="flex justify-end gap-2">
        <button className="btn-outline" onClick={onClose}>
          Later
        </button>
        <button className="btn-primary" disabled={saving} onClick={submit}>
          {saving ? "Saving..." : "Confirm service"}
        </button>
      </div>
    </Modal>
  );
}
