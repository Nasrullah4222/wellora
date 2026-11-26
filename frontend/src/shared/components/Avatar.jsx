/*
 * @feature: Avatar
 * @description: Circular initials avatar. The colour is derived from the user id
 *               so a person keeps the same colour everywhere.
 */
import { toneFor } from "@/shared/lib/format";
const sizes = { sm: "h-9 w-9 text-xs", md: "h-11 w-11 text-sm", lg: "h-14 w-14 text-base" };
export function Avatar({ initials, id = 0, size = "md" }) {
  return <div className={`flex shrink-0 items-center justify-center rounded-full font-bold ${sizes[size]} ${toneFor(id)}`}>{initials}</div>;
}
