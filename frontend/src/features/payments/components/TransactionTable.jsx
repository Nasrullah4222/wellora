/*
 * @feature: Transaction Table
 * @description: Ledger rows. Patients see outgoing amounts (-); professionals see
 *               incoming earnings (+) together with the patient's name.
 */
import { Icon } from "@/shared/components/Icon";
import { money } from "@/shared/lib/format";
export function TransactionTable({ items, role }) {
  const isPro = role !== "patient";
  return (
    <ul className="divide-y divide-line">
      {items.map((p) => (
        <li key={p.id} className="flex flex-wrap items-center gap-4 px-5 py-4">
          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-green-50 text-green">
            <Icon name="card" size={18} />
          </span>
          <div className="min-w-48 flex-1">
            <strong className="block text-sm text-navy">{p.description}</strong>
            <span className="text-xs text-muted">
              {isPro ? p.patient.fullName : p.professional.fullName} · {p.method}
            </span>
          </div>
          <span className="text-sm text-muted">{p.dateLabel}</span>
          <strong className={`w-24 text-right ${isPro ? "text-green" : "text-navy"}`}>
            {isPro ? "+" : "-"}
            {money(p.amountCents)}
          </strong>
          <span
            className={`rounded-full px-2.5 py-1 text-xs font-semibold capitalize ${p.status === "paid" ? "bg-green-50 text-green" : p.status === "refunded" ? "bg-slate-100 text-slate-600" : "bg-amber-50 text-amber-700"}`}
          >
            {p.status}
          </span>
        </li>
      ))}
    </ul>
  );
}
