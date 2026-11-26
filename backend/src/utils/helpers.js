/*
 * @feature: Shared Helpers
 * @description: Name initials for avatars, secure random ids and time-zone aware
 *               date helpers (Luxon) used for slot generation and labels.
 */
import crypto from "node:crypto";
import { DateTime } from "luxon";
import { env } from "../config/env.js";

export const randomHex = (bytes) => crypto.randomBytes(bytes).toString("hex");

/** "Dr. Ethan Ross" -> "ER" (honorifics skipped). */
export function initials(fullName = "") {
  return fullName
    .split(/\s+/)
    .map((w) => w.replace(/[.,]/g, ""))
    .filter((w) => w && w.toLowerCase() !== "dr")
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join("");
}

export const nowLocal = () => DateTime.now().setZone(env.timezone);

/** Parses "YYYY-MM-DD HH:mm" in the application time zone. */
export const parseLocal = (date, time) =>
  DateTime.fromFormat(`${date} ${time}`, "yyyy-MM-dd HH:mm", { zone: env.timezone });

export const startOfLocalDay = (date) => DateTime.fromFormat(date, "yyyy-MM-dd", { zone: env.timezone }).startOf("day");

export const dateLabel = (d) => DateTime.fromJSDate(new Date(d)).setZone(env.timezone).setLocale("en").toFormat("LLL d, yyyy");
export const timeLabel = (d) => DateTime.fromJSDate(new Date(d)).setZone(env.timezone).setLocale("en").toFormat("h:mm a");
export const hhmm = (d) => DateTime.fromJSDate(new Date(d)).setZone(env.timezone).toFormat("HH:mm");

/** Escapes % _ \ so user text can be used safely inside LIKE '%...%'. */
export const likeEscape = (text) => String(text).replace(/[\\%_]/g, "\\$&");

/**
 * Video-room URL for virtual visits. The schema has no meeting_url column, so the room name
 * is derived (HMAC of the appointment id with the server secret): stable, unguessable, not stored.
 */
export const meetingUrlFor = (appointmentId) =>
  `https://meet.jit.si/wellora-${crypto.createHmac("sha256", env.jwtSecret).update(`appointment:${appointmentId}`).digest("hex").slice(0, 20)}`;
