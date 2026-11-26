import { Icon } from "./Icon";
export function Spinner({ label = "Loading..." }) {
  return (
    <div className="flex items-center justify-center gap-3 py-16 text-sm text-muted" role="status">
      <span className="h-5 w-5 animate-spin rounded-full border-2 border-line border-t-brand" />
      {label}
    </div>
  );
}
export function ErrorState({ message, onRetry }) {
  return (
    <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-center text-sm text-red-700">
      <p>{message}</p>
      {onRetry && (
        <button className="btn-outline mt-3" onClick={onRetry}>
          Try again
        </button>
      )}
    </div>
  );
}
export function EmptyState({ icon = "file", title, text, action }) {
  return (
    <div className="flex flex-col items-center gap-2 py-14 text-center">
      <span className="flex h-12 w-12 items-center justify-center rounded-full bg-brand-soft text-brand">
        <Icon name={icon} />
      </span>
      <h3 className="text-base font-bold">{title}</h3>
      {text && <p className="max-w-sm text-sm text-muted">{text}</p>}
      {action}
    </div>
  );
}
export function PageHeader({ title, subtitle, action }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="text-2xl font-extrabold">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-muted">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}
