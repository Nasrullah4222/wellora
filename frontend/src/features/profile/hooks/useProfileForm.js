/*
 * @feature: Profile Form Logic
 * @description: Holds editable profile fields (fee edited in dollars, stored in
 *               cents), saves them and refreshes the session user in context.
 */
import { useState } from "react";
import { useAuth } from "@/features/auth/hooks/AuthContext";
import { useToast } from "@/shared/components/Toast";
import { getErrorMessage } from "@/shared/lib/api";
import { profileService } from "../services/profileService";
export function useProfileForm() {
  const { user, setUser } = useAuth();
  const { notify } = useToast();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(() => ({
    fullName: user?.fullName ?? "",
    phone: user?.phone ?? "",
    city: user?.city ?? "",
    address: user?.address ?? "",
    specialty: user?.specialty ?? "",
    bio: user?.bio ?? "",
    experienceYears: user?.experienceYears ?? 0,
    feeDollars: (user?.feeCents ?? 0) / 100,
    supportsVirtual: user?.supportsVirtual ?? false,
    accepting: user?.accepting ?? true,
    licenseNumber: user?.licenseNumber ?? "",
  }));
  const set = (key, value) => setForm((f) => ({ ...f, [key]: value }));
  async function save(e) {
    e.preventDefault();
    setSaving(true);
    try {
      const { feeDollars, ...rest } = form;
      const updated = await profileService.update({ ...rest, feeCents: Math.round(feeDollars * 100) });
      setUser(updated);
      notify("Profile changes saved");
    } catch (err) {
      notify(getErrorMessage(err), "error");
    } finally {
      setSaving(false);
    }
  }
  return { form, set, save, saving };
}
