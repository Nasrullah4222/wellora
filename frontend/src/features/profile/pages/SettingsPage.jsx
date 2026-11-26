/*
 * @feature: Settings / Profile Page
 * @description: Edit personal information. Nurses and doctors additionally edit
 *               their public profile: specialty, bio, experience, fee and
 *               whether they currently accept bookings.
 */
import { Avatar } from "@/shared/components/Avatar";
import { PageHeader } from "@/shared/components/Feedback";
import { Icon } from "@/shared/components/Icon";
import { useAuth } from "@/features/auth/hooks/AuthContext";
import { useProfileForm } from "../hooks/useProfileForm";
export default function SettingsPage() {
  const { user } = useAuth();
  const { form, set, save, saving } = useProfileForm();
  if (!user) return null;
  const isPro = user.role === "doctor" || user.role === "nurse";
  return (
    <>
      <PageHeader title="Settings" subtitle="Keep your profile and details up to date." />
      <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
        <aside className="panel flex flex-col items-center gap-2 p-6 text-center">
          <Avatar initials={user.initials} id={user.id} size="lg" />
          <h2 className="text-lg font-bold">{user.fullName}</h2>
          <p className="text-sm capitalize text-muted">{user.role}</p>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-soft px-3 py-1 text-xs font-semibold text-brand">
            <Icon name="shield" size={15} /> {user.email}
          </span>
        </aside>

        <form onSubmit={save} className="panel grid gap-4 p-6 sm:grid-cols-2">
          <h2 className="text-lg font-bold sm:col-span-2">Personal information</h2>
          <label className="field-label">
            Full name
            <input className="input" required minLength={2} value={form.fullName} onChange={(e) => set("fullName", e.target.value)} />
          </label>
          {!isPro && (
            <label className="field-label sm:col-span-2">
              Address
              <input className="input" value={form.address} onChange={(e) => set("address", e.target.value)} />
            </label>
          )}

          {isPro && (
            <>
              <h2 className="mt-2 text-lg font-bold sm:col-span-2">Professional profile</h2>
              <label className="field-label">
                Specialty
                <input className="input" value={form.specialty} onChange={(e) => set("specialty", e.target.value)} />
              </label>
              {user.role === "nurse" && (
                <label className="field-label">
                  Years of experience
                  <input
                    className="input"
                    type="number"
                    min={0}
                    max={70}
                    value={form.experienceYears}
                    onChange={(e) => set("experienceYears", Number(e.target.value))}
                  />
                </label>
              )}
              <label className="field-label">
                {user.role === "doctor" ? "Medical license" : "Nursing license"}
                <input className="input" minLength={3} value={form.licenseNumber} onChange={(e) => set("licenseNumber", e.target.value)} />
              </label>
              <label className="field-label">
                Fee per visit (USD)
                <input className="input" type="number" value={form.feeDollars} readOnly disabled title="Set by the platform" />
              </label>
              {user.role === "doctor" && (
                <label className="field-label sm:col-span-2">
                  Qualifications / bio
                  <textarea className="input min-h-24" maxLength={2000} value={form.bio} onChange={(e) => set("bio", e.target.value)} />
                </label>
              )}
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={form.accepting} onChange={(e) => set("accepting", e.target.checked)} /> Currently accepting
                bookings
              </label>
            </>
          )}

          <div className="flex justify-end sm:col-span-2">
            <button className="btn-primary" disabled={saving}>
              {saving ? "Saving..." : "Save changes"}
            </button>
          </div>
        </form>
      </div>
    </>
  );
}
