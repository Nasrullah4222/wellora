/*
 * @feature: Profile API Service
 * @description: Saves the signed-in user's profile (PUT /users/me).
 */
import { api, unwrap } from "@/shared/lib/api";
export const profileService = { update: (input) => unwrap(api.put("/users/me", input)) };
