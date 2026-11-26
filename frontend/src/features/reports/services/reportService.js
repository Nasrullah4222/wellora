/*
 * @feature: Reports API Service
 * @description: List, upload (multipart) and download medical reports, plus the
 *               professional's patient list used by the upload form.
 */
import { api, unwrap } from "@/shared/lib/api";
export const reportService = {
  list: () => unwrap(api.get("/reports")),
  patients: () => unwrap(api.get("/patients")),
  upload: (patientId, title, file) => {
    const form = new FormData();
    form.append("patientId", String(patientId));
    form.append("title", title);
    form.append("file", file);
    return unwrap(api.post("/reports", form));
  },
  /** Downloads through axios so the Authorization header is sent, then triggers a browser save. */
  async download(report) {
    const res = await api.get(`/reports/${report.id}/download`, { responseType: "blob" });
    const url = URL.createObjectURL(res.data);
    const a = document.createElement("a");
    a.href = url;
    a.download = report.fileName;
    a.click();
    URL.revokeObjectURL(url);
  },
};
