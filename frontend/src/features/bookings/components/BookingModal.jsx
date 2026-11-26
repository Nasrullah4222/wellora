/*
 * @feature: Booking Modal (3 steps)
 * @description: Step 1 choose visit type, service, date and an available slot;
 *               Step 2 review the summary and fee; Step 3 confirmation. The
 *               request is only sent on "Submit" (step 2 -> 3) and the booking
 *               starts as "pending" until the professional accepts.
 */
import { useEffect, useState } from "react";
import { Icon } from "@/shared/components/Icon";
import { Modal } from "@/shared/components/Modal";
import { StatusBadge } from "@/shared/components/StatusBadge";
import { getErrorMessage } from "@/shared/lib/api";
import { money, visitLabel } from "@/shared/lib/format";
import { bookingService } from "../services/bookingService";
const services = {
  doctor: ["Follow-up consultation", "New health concern", "Report review"],
  nurse: ["Wound care and assessment", "Medication support", "Post-operative assistance", "Health assessment"],
};
const today = () => new Date().toLocaleDateString("en-CA"); // YYYY-MM-DD in local time
export function BookingModal({ professional, onClose, onBooked }) {
  const isNurse = professional.role === "nurse";
  const options = isNurse ? services.nurse : services.doctor;
  const [step, setStep] = useState(1);
  const [visitType, setVisitType] = useState(isNurse ? "home" : professional.supportsVirtual ? "virtual" : "in_person");
  const [service, setService] = useState(options[0]);
  const [date, setDate] = useState(today());
  const [time, setTime] = useState("");
  const [notes, setNotes] = useState("");
  const [slots, setSlots] = useState([]);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  // Reload free slots whenever the date changes.
  useEffect(() => {
    let cancelled = false;
    setSlotsLoading(true);
    setTime("");
    bookingService
      .slots(professional.id, date)
      .then((s) => !cancelled && setSlots(s))
      .catch((e) => !cancelled && setError(getErrorMessage(e)))
      .finally(() => !cancelled && setSlotsLoading(false));
    return () => {
      cancelled = true;
    };
  }, [professional.id, date]);
  async function submit() {
    setSubmitting(true);
    setError(null);
    try {
      await bookingService.create({ professionalId: professional.id, visitType, service, date, time, notes });
      setStep(3);
    } catch (e) {
      setError(getErrorMessage(e));
      setStep(1); // slot may have been taken; let the patient pick again
    } finally {
      setSubmitting(false);
    }
  }
  const titles = { 1: "Choose your care details", 2: "Review your booking", 3: "Request sent" };
  const visitChoices = isNurse
    ? [{ value: "home", icon: "nurse", title: "Home visit", text: "Care at your address" }]
    : [
        {
          value: "virtual",
          icon: "video",
          title: "Virtual consultation",
          text: "Secure video appointment",
          disabled: !professional.supportsVirtual,
        },
        { value: "in_person", icon: "pin", title: "In-person visit", text: "At the medical clinic" },
      ];
  return (
    <Modal
      title={titles[step]}
      subtitle={`${isNurse ? "Nurse" : "Doctor"} booking · step ${step} of 3 · ${professional.fullName}`}
      onClose={onClose}
    >
      {error && (
        <p role="alert" className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      )}

      {step === 1 && (
        <div className="flex flex-col gap-4">
          <div className="grid gap-3 sm:grid-cols-2">
            {visitChoices.map((c) => (
              <button
                key={c.value}
                type="button"
                disabled={c.disabled}
                onClick={() => setVisitType(c.value)}
                className={`flex flex-col gap-1 rounded-xl border p-4 text-left transition disabled:opacity-40 ${visitType === c.value ? "border-brand bg-brand-soft" : "border-line hover:bg-paper"}`}
              >
                <Icon name={c.icon} className="text-brand" />
                <strong className="text-sm">{c.title}</strong>
                <span className="text-xs text-muted">{c.text}</span>
              </button>
            ))}
          </div>

          <label className="field-label">
            {isNurse ? "Nursing service" : "Reason for visit"}
            <select className="input" value={service} onChange={(e) => setService(e.target.value)}>
              {options.map((o) => (
                <option key={o}>{o}</option>
              ))}
            </select>
          </label>

          <label className="field-label">
            Preferred date
            <input className="input" type="date" min={today()} value={date} onChange={(e) => e.target.value && setDate(e.target.value)} />
          </label>

          <div>
            <span className="mb-1.5 block text-sm font-medium">Available time</span>
            {slotsLoading ? (
              <p className="text-sm text-muted">Checking availability...</p>
            ) : (
              <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                {slots.map((s) => (
                  <button
                    key={s.time}
                    type="button"
                    disabled={!s.available}
                    onClick={() => setTime(s.time)}
                    className={`rounded-lg border py-2 text-sm font-semibold transition disabled:cursor-not-allowed disabled:bg-paper disabled:text-muted/60 disabled:line-through ${time === s.time ? "border-brand bg-brand text-white" : "border-line hover:bg-brand-soft"}`}
                  >
                    {s.time}
                  </button>
                ))}
              </div>
            )}
          </div>

          <label className="field-label">
            Notes for the professional (optional)
            <textarea className="input min-h-20" maxLength={1000} value={notes} onChange={(e) => setNotes(e.target.value)} />
          </label>

          <div className="flex justify-end gap-2">
            <button className="btn-outline" onClick={onClose}>
              Cancel
            </button>
            <button className="btn-primary" disabled={!time} onClick={() => setStep(2)}>
              Review booking <Icon name="arrow" size={16} />
            </button>
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="flex flex-col gap-4">
          <div className="rounded-xl border border-line p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <strong>{professional.fullName}</strong>
                <p className="text-sm text-muted">
                  {visitLabel[visitType]} · {service}
                </p>
              </div>
              <strong className="text-lg">{money(professional.feeCents)}</strong>
            </div>
            <p className="mt-3 flex items-center gap-2 text-sm text-ink">
              <Icon name="calendar" size={16} /> {date} at {time}
            </p>
          </div>
          <div className="flex items-start gap-2 rounded-xl bg-brand-soft p-3 text-sm text-brand">
            <Icon name="shield" size={17} />
            Payment is only captured after the professional accepts this booking.
          </div>
          <div className="flex justify-end gap-2">
            <button className="btn-outline" onClick={() => setStep(1)}>
              Back
            </button>
            <button className="btn-primary" disabled={submitting} onClick={submit}>
              {submitting ? "Sending..." : "Submit booking request"}
            </button>
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="flex flex-col items-center gap-3 py-4 text-center">
          <span className="flex h-14 w-14 items-center justify-center rounded-full bg-green-50 text-green">
            <Icon name="check" size={28} />
          </span>
          <h3 className="text-lg font-bold">Your booking request has been sent</h3>
          <p className="text-sm text-muted">
            {professional.fullName} has been asked to confirm {date} at {time}. No payment has been captured yet.
          </p>
          <StatusBadge status="pending" />
          <button className="btn-primary mt-2 w-full" onClick={onBooked}>
            Done
          </button>
        </div>
      )}
    </Modal>
  );
}
