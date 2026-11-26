/*
 * @feature: Payments / Earnings Page
 * @description: Summary cards (lifetime total, this month, transaction count)
 *               and the transaction history for the signed-in role.
 */
import { EmptyState, ErrorState, PageHeader, Spinner } from "@/shared/components/Feedback";
import { Icon } from "@/shared/components/Icon";
import { money } from "@/shared/lib/format";
import { useAuth } from "@/features/auth/hooks/AuthContext";
import { TransactionTable } from "../components/TransactionTable";
import { usePayments } from "../hooks/usePayments";
export default function PaymentsPage() {
  const { user } = useAuth();
  const { data, loading, error, reload } = usePayments();
  if (!user) return null;
  const isPro = user.role !== "patient";
  const cards = data
    ? [
        { label: isPro ? "Total earnings" : "Total spent", value: money(data.totalCents), icon: "wallet" },
        { label: "This month", value: money(data.thisMonthCents), icon: "trend" },
        { label: "Transactions", value: String(data.count), icon: "card" },
      ]
    : [];
  return (
    <>
      <PageHeader title={isPro ? "Earnings" : "Payments"} subtitle="Secure payment activity and history." />
      {loading && !data ? (
        <Spinner />
      ) : error ? (
        <ErrorState message={error} onRetry={reload} />
      ) : data ? (
        <>
          <section className="grid gap-4 sm:grid-cols-3">
            {cards.map((c) => (
              <div key={c.label} className="panel flex items-center gap-4 p-5">
                <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-brand-soft text-brand">
                  <Icon name={c.icon} />
                </span>
                <div>
                  <p className="text-sm text-muted">{c.label}</p>
                  <strong className="font-display text-2xl text-navy">{c.value}</strong>
                </div>
              </div>
            ))}
          </section>
          <section className="panel mt-6 overflow-hidden">
            <div className="border-b border-line p-5">
              <h2 className="text-lg font-bold">Transaction history</h2>
            </div>
            {data.transactions.length > 0 ? (
              <TransactionTable items={data.transactions} role={user.role} />
            ) : (
              <EmptyState icon="card" title="No transactions yet" text="Payments appear here once a booking is accepted." />
            )}
          </section>
        </>
      ) : null}
    </>
  );
}
