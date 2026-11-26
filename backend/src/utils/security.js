/*
 * @feature: Security Utilities (JWT & Passwords)
 * @description: bcrypt password hashing and HS256 JSON Web Tokens that carry the
 *               user id and role, so role checks need no database round trip.
 */
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { env } from "../config/env.js";

export const hashPassword = (plain) => bcrypt.hash(plain, 10);
export const checkPassword = (hash, plain) => bcrypt.compare(plain, hash);

export function generateToken(user) {
  return jwt.sign({ uid: user.id, role: user.role }, env.jwtSecret, {
    algorithm: "HS256",
    expiresIn: `${env.jwtExpiryHours}h`,
    issuer: "wellora",
  });
}

/** Verifies signature/expiry; only HS256 is accepted to prevent algorithm-confusion attacks. */
export function verifyToken(token) {
  return jwt.verify(token, env.jwtSecret, { algorithms: ["HS256"] });
}
