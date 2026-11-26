/*
 * @feature: Role Picker
 * @description: Segmented control to choose Patient / Nurse / Doctor while registering.
 */
import { Icon } from "@/shared/components/Icon";
const options = [
  { value: "patient", label: "Patient", icon: "user" },
  { value: "nurse", label: "Nurse", icon: "nurse" },
  { value: "doctor", label: "Doctor", icon: "doctor" },
];
export function RolePicker({ value, onChange }) {
  return (
    <fieldset>
      <legend className="mb-1.5 text-sm font-medium">I am a</legend>
      <div className="grid grid-cols-3 gap-2">
        {options.map((o) => (
          <button
            type="button"
            key={o.value}
            onClick={() => onChange(o.value)}
            aria-pressed={value === o.value}
            className={`flex items-center justify-center gap-2 rounded-xl border px-3 py-2.5 text-sm font-semibold transition ${value === o.value ? "border-brand bg-brand-soft text-brand" : "border-line bg-white text-ink hover:bg-paper"}`}
          >
            <Icon name={o.icon} size={18} />
            {o.label}
          </button>
        ))}
      </div>
    </fieldset>
  );
}
