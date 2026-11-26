export const money = (cents) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(cents / 100);
export function fileSize(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}
export const visitLabel = {
  virtual: "Virtual",
  in_person: "In-person",
  home: "Home visit",
};
/** Picks a stable avatar colour from an id so a person always keeps the same colour. */
const tones = ["bg-brand-soft text-brand", "bg-blue-50 text-blue", "bg-amber-50 text-gold", "bg-green-50 text-green"];
export const toneFor = (id) => tones[id % tones.length];
