const styles = {
  pending: "bg-amber-50 text-amber-700",
  accepted: "bg-green-50 text-green",
  in_progress: "bg-indigo-50 text-indigo-700",
  expired: "bg-slate-100 text-slate-500",
  completed: "bg-blue-50 text-blue",
  rejected: "bg-red-50 text-red-600",
  cancelled: "bg-slate-100 text-slate-600",
};
export function StatusBadge({ status }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold capitalize ${styles[status] ?? styles.cancelled}`}
    >
      {status.replace("_", " ")}
    </span>
  );
}
