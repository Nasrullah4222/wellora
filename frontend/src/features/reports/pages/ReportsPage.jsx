/*
 * @feature: Medical Reports Page
 * @description: Patients view and download their documents; nurses/doctors see
 *               reports of patients they care for and can upload new ones.
 */
import { useState } from "react";
import { EmptyState, ErrorState, PageHeader, Spinner } from "@/shared/components/Feedback";
import { Icon } from "@/shared/components/Icon";
import { useToast } from "@/shared/components/Toast";
import { useAsync } from "@/shared/hooks/useAsync";
import { getErrorMessage } from "@/shared/lib/api";
import { fileSize } from "@/shared/lib/format";
import { useAuth } from "@/features/auth/hooks/AuthContext";
import { UploadReportModal } from "../components/UploadReportModal";
import { reportService } from "../services/reportService";
export default function ReportsPage() {
  const { user } = useAuth();
  const { notify } = useToast();
  const { data, loading, error, reload } = useAsync(() => reportService.list(), []);
  const [uploading, setUploading] = useState(false);
  if (!user) return null;
  const isPro = user.role !== "patient";
  return (
    <>
      <PageHeader
        title={isPro ? "Patient reports" : "Your medical documents"}
        subtitle="Encrypted in transit and available only to authorized care providers."
        action={
          isPro ? (
            <button className="btn-primary" onClick={() => setUploading(true)}>
              <Icon name="upload" size={17} /> Upload report
            </button>
          ) : undefined
        }
      />

      <div className="panel overflow-hidden">
        {loading && !data ? (
          <Spinner />
        ) : error ? (
          <div className="p-6">
            <ErrorState message={error} onRetry={reload} />
          </div>
        ) : data && data.length > 0 ? (
          <ul className="divide-y divide-line">
            {data.map((r) => (
              <li key={r.id} className="flex flex-wrap items-center gap-4 px-5 py-4">
                <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-soft text-brand">
                  <Icon name="file" />
                </span>
                <div className="min-w-48 flex-1">
                  <strong className="block text-sm text-navy">{r.title}</strong>
                  <span className="text-xs text-muted">
                    {isPro ? `Patient: ${r.patient.fullName}` : `Uploaded by ${r.uploader.fullName}`} · {r.dateLabel} ·{" "}
                    {fileSize(r.fileSize)}
                  </span>
                </div>
                <button className="btn-outline" onClick={() => reportService.download(r).catch((e) => notify(getErrorMessage(e), "error"))}>
                  <Icon name="download" size={16} /> Download
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState
            icon="file"
            title="No reports yet"
            text={isPro ? "Upload a report for one of your patients." : "Reports shared by your care team will appear here."}
          />
        )}
      </div>

      {uploading && (
        <UploadReportModal
          onClose={() => setUploading(false)}
          onUploaded={() => {
            setUploading(false);
            notify("Medical report uploaded securely");
            void reload();
          }}
        />
      )}
    </>
  );
}
