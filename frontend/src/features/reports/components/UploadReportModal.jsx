/*
 * @feature: Upload Report Modal
 * @description: Lets a professional attach a PDF/PNG/JPEG (max 10 MB) to one of
 *               their patients. Client-side checks mirror the server rules for
 *               instant feedback; the server remains the source of truth.
 */
import { useState } from "react";
import { Modal } from "@/shared/components/Modal";
import { getErrorMessage } from "@/shared/lib/api";
import { useAsync } from "@/shared/hooks/useAsync";
import { reportService } from "../services/reportService";
const MAX_MB = 10;
const ACCEPT = ["application/pdf", "image/png", "image/jpeg"];
export function UploadReportModal({ onClose, onUploaded }) {
  const patients = useAsync(() => reportService.patients(), []);
  const [patientId, setPatientId] = useState("");
  const [title, setTitle] = useState("");
  const [file, setFile] = useState(null);
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);
  async function submit(e) {
    e.preventDefault();
    if (!file) return setError("Please choose a file.");
    if (!ACCEPT.includes(file.type)) return setError("Only PDF, PNG and JPEG files are allowed.");
    if (file.size > MAX_MB * 1024 * 1024) return setError(`File must be smaller than ${MAX_MB} MB.`);
    setSaving(true);
    setError(null);
    try {
      await reportService.upload(Number(patientId), title, file);
      onUploaded();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }
  return (
    <Modal title="Upload medical report" subtitle="Stored securely and visible only to the patient and their care team." onClose={onClose}>
      <form onSubmit={submit} className="flex flex-col gap-4">
        <label className="field-label">
          Patient
          <select className="input" required value={patientId} onChange={(e) => setPatientId(e.target.value)}>
            <option value="">{patients.loading ? "Loading..." : "Select a patient"}</option>
            {patients.data?.map((p) => (
              <option key={p.id} value={p.id}>
                {p.fullName}
              </option>
            ))}
          </select>
        </label>
        {patients.data?.length === 0 && (
          <p className="text-sm text-muted">You can upload reports once you have an accepted booking with a patient.</p>
        )}
        <label className="field-label">
          Report title
          <input
            className="input"
            required
            maxLength={160}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Blood test results"
          />
        </label>
        <label className="field-label">
          File (PDF, PNG or JPEG, max {MAX_MB} MB)
          <input
            className="input"
            type="file"
            required
            accept=".pdf,.png,.jpg,.jpeg"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          />
        </label>
        {error && (
          <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </p>
        )}
        <div className="flex justify-end gap-2">
          <button type="button" className="btn-outline" onClick={onClose}>
            Cancel
          </button>
          <button className="btn-primary" disabled={saving}>
            {saving ? "Uploading..." : "Upload report"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
