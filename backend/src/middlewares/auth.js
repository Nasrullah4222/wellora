/*
 * @feature: Authentication & Authorization Middleware
 * @description: authRequired validates the Bearer JWT and exposes req.user
 *               ({ id, role }). requireRoles restricts a route to specific roles
 *               (e.g. only patients can book). requireAdminPermission("create" | "read" |
 *               "update" | "delete") checks the Admins row in the database on every request,
 *               so deactivating an admin or removing a flag takes effect immediately.
 */
import { getAdminAccess } from "../models/admins.js";
import { ROLES } from "../models/constants.js";
import { ApiError } from "../utils/ApiError.js";
import { verifyToken } from "../utils/security.js";

export function authRequired(req, _res, next) {
  const [scheme, token] = (req.get("Authorization") ?? "").split(" ");
  if (scheme?.toLowerCase() !== "bearer" || !token) {
    return next(new ApiError(401, "missing or malformed authorization header"));
  }
  try {
    const claims = verifyToken(token);
    req.user = { id: claims.uid, role: claims.role };
    return next();
  } catch {
    return next(new ApiError(401, "invalid or expired token"));
  }
}

export const requireRoles =
  (...roles) =>
  (req, _res, next) =>
    roles.includes(req.user?.role) ? next() : next(new ApiError(403, "you do not have permission to perform this action"));

export const requireAdminPermission = (permission) => async (req, _res, next) => {
  try {
    if (req.user?.role !== ROLES.ADMIN) throw new ApiError(403, "you do not have permission to perform this action");
    const access = await getAdminAccess(req.user.id);
    if (!access?.active) throw new ApiError(403, "this administrator account is not active");
    if (!access.permissions[permission]) throw new ApiError(403, `your admin account is not allowed to ${permission}`);
    req.admin = access;
    return next();
  } catch (err) {
    return next(err);
  }
};
