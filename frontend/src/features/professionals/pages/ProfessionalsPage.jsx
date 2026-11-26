/*
 * @feature: Find Doctors / Book a Nurse Page
 * @description: One page serving two routes (/doctors and /nurses). Provides
 *               search, an optional specialty filter for doctors and opens the
 *               booking modal for the chosen professional.
 */
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { BookingModal } from "@/features/bookings/components/BookingModal";
import { EmptyState, ErrorState, PageHeader, Spinner } from "@/shared/components/Feedback";
import { Icon } from "@/shared/components/Icon";
import { useToast } from "@/shared/components/Toast";
import { ProfessionalCard } from "../components/ProfessionalCard";
import { useProfessionals } from "../hooks/useProfessionals";
const doctorSpecialties = ["Cardiologist", "General Physician", "Dermatologist", "Neurologist"];
export default function ProfessionalsPage({ role }) {
  const { data, loading, error, reload, search, setSearch, specialty, setSpecialty } = useProfessionals(role);
  const [selected, setSelected] = useState(null);
  const { notify } = useToast();
  const navigate = useNavigate();
  const isDoctor = role === "doctor";
  return (
    <>
      <PageHeader
        title={isDoctor ? "Find a doctor" : "Book a nurse"}
        subtitle={isDoctor ? "Top-rated specialists available this week" : "Trusted nurses who come to your home"}
      />

      <div className="mb-6 flex flex-wrap gap-3">
        <label className="flex min-w-64 flex-1 items-center gap-2 rounded-xl border border-line bg-white px-3.5">
          <Icon name="search" size={18} className="text-muted" />
          <input
            className="w-full bg-transparent py-2.5 text-sm outline-none"
            placeholder={isDoctor ? "Search doctors or specialties..." : "Search by service or nurse"}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </label>
        {isDoctor && (
          <label className="flex items-center gap-2 rounded-xl border border-line bg-white px-3.5">
            <Icon name="filter" size={17} className="text-muted" />
            <select className="bg-transparent py-2.5 text-sm outline-none" value={specialty} onChange={(e) => setSpecialty(e.target.value)}>
              <option value="">All specialties</option>
              {doctorSpecialties.map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>
          </label>
        )}
      </div>

      {loading && !data ? (
        <Spinner />
      ) : error ? (
        <ErrorState message={error} onRetry={reload} />
      ) : data && data.length > 0 ? (
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {data.map((p) => (
            <ProfessionalCard key={p.id} pro={p} onBook={setSelected} />
          ))}
        </div>
      ) : (
        <div className="panel">
          <EmptyState icon="search" title="No professionals found" text="Try a different name or specialty." />
        </div>
      )}

      {selected && (
        <BookingModal
          professional={selected}
          onClose={() => setSelected(null)}
          onBooked={() => {
            setSelected(null);
            notify("Booking request sent successfully");
            navigate("/appointments");
          }}
        />
      )}
    </>
  );
}
