/*
 * @feature: Admin Queries (PostgreSQL)
 * @description: Admin accounts are a Users row with role = 'ADMIN' plus one row in Admins, which holds
 *               the admin profile and the CRUD permission flags (can_create / can_read / can_update /
 *               can_delete) and is_active. Credentials (email + password_hash) stay in Users.
 *               A database trigger rejects an Admins row whose user does not have the ADMIN role.
 */
import { query, exec } from "../config/database.js";

export const PERMISSIONS = ["create", "read", "update", "delete"];

/** Creates the Users row (role ADMIN) and the Admins row. Must run inside a transaction. */
export async function createAdminAccount(conn, { fullName, email, passwordHash, level = "ADMIN", permissions = PERMISSIONS }) {
  const has = (p) => permissions.includes(p);
  const {
    rows: [{ user_id: userId }],
  } = await exec(
    "INSERT INTO Users (user_name, email, password_hash, role, created_at) VALUES ($1, $2, $3, 'ADMIN', NOW()) RETURNING user_id",
    [fullName, email, passwordHash],
    conn,
  );
  await exec(
    `INSERT INTO Admins (user_id, admin_level, can_create, can_read, can_update, can_delete, is_active)
     VALUES ($1, $2, $3, $4, $5, $6, true)`,
    [userId, level, has("create"), has("read"), has("update"), has("delete")],
    conn,
  );
  return userId;
}

/** Current admin flags straight from the database (so a deactivated admin loses access immediately). */
export async function getAdminAccess(userId, db) {
  const rows = await query(
    "SELECT admin_level, is_active, can_create, can_read, can_update, can_delete FROM Admins WHERE user_id = $1",
    [userId],
    db,
  );
  const r = rows[0];
  if (!r) return null;
  return {
    level: r.admin_level,
    active: r.is_active === true,
    permissions: { create: r.can_create === true, read: r.can_read === true, update: r.can_update === true, delete: r.can_delete === true },
  };
}

export async function touchLastLogin(userId) {
  await exec("UPDATE Admins SET last_login_at = NOW(), updated_at = NOW() WHERE user_id = $1", [userId]);
}

/** Platform-wide numbers for the admin overview. Money is returned in DECIMAL units. */
export async function platformStats() {
  const rows = await query(
    `SELECT
       (SELECT COUNT(*) FROM Users WHERE role = 'PATIENT')                AS patients,
       (SELECT COUNT(*) FROM Users WHERE role IN ('DOCTOR', 'NURSE'))     AS providers,
       (SELECT COUNT(*) FROM Appointments)                                AS appointments,
       (SELECT COUNT(*) FROM Appointments WHERE status = 'PENDING')       AS pending,
       (SELECT COALESCE(SUM(amount), 0) FROM Payments WHERE payment_status = 'PAID') AS revenue`,
  );
  return rows[0];
}
