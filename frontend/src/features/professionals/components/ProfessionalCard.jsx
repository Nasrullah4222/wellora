/*
 * @feature: Professional Card
 * @description: Directory card showing name, specialty, experience, rating and fee
 *               with a "Book" call-to-action (as designed in Find Doctors / Book a Nurse).
 */
import { Avatar } from "@/shared/components/Avatar";
import { Icon } from "@/shared/components/Icon";
import { money } from "@/shared/lib/format";
export function ProfessionalCard({ pro, onBook }) {
  const unit = pro.role === "nurse" ? "/ visit" : "/ consult";
  return (
    <article className="panel flex flex-col gap-4 p-5">
      <div className="flex items-start gap-3.5">
        <Avatar initials={pro.initials} id={pro.id} size="lg" />
        <div className="min-w-0">
          <h3 className="truncate text-base font-bold">{pro.fullName}</h3>
          <p className="text-sm text-muted">{pro.specialty}</p>
          <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-ink">
            <span className="flex items-center gap-1">
              <Icon name="star" size={14} className="fill-amber-400 text-amber-400" />
              {pro.rating.toFixed(1)} ({pro.reviewCount})
            </span>
            {pro.city && (
              <span className="flex items-center gap-1">
                <Icon name="pin" size={14} />
                {pro.city}
              </span>
            )}
            <span className="flex items-center gap-1">
              <Icon name="briefcase" size={14} />
              {pro.experienceYears} yrs
            </span>
          </div>
        </div>
      </div>
      {pro.bio && <p className="line-clamp-2 text-sm text-muted">{pro.bio}</p>}
      <div className="mt-auto flex items-center justify-between border-t border-line pt-4">
        <div>
          <strong className="text-lg text-navy">{money(pro.feeCents)}</strong>
          <span className="ml-1 text-xs text-muted">{unit}</span>
          {pro.role === "doctor" && pro.supportsVirtual && (
            <span className="ml-2 rounded-full bg-brand-soft px-2 py-0.5 text-xs font-semibold text-brand">Virtual</span>
          )}
        </div>
        <button className="btn-primary" onClick={() => onBook(pro)}>
          Book
        </button>
      </div>
    </article>
  );
}
