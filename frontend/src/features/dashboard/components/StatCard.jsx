/*
 * @feature: Stat Card
 * @description: Metric tile for the overview page. Money values are formatted as currency.
 */
import { Icon } from "@/shared/components/Icon";
import { money } from "@/shared/lib/format";
const icons = {
  upcoming: "calendar",
  completed: "check",
  reports: "file",
  spent: "wallet",
  pending: "bell",
  today: "clock",
  earned: "wallet",
  patients: "users",
  providers: "doctor",
  appointments: "calendar",
  revenue: "wallet",
};
export function StatCard({ stat }) {
  return (
    <div className="panel flex items-center gap-4 p-5">
      <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-brand-soft text-brand">
        <Icon name={icons[stat.key] ?? "grid"} />
      </span>
      <div>
        <p className="text-sm text-muted">{stat.label}</p>
        <strong className="font-display text-2xl text-navy">{stat.kind === "money" ? money(stat.value) : stat.value}</strong>
      </div>
    </div>
  );
}
