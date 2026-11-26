/*
 * @feature: Request Validation
 * @description: Validates req.body with a zod schema. On failure responds 400
 *               with a friendly message; on success replaces req.body with the
 *               parsed (trimmed, coerced) data.
 */
import { ApiError } from "../utils/ApiError.js";

export const validate = (schema, message = "invalid request data") => (req, _res, next) => {
  const result = schema.safeParse(req.body ?? {});
  if (!result.success) return next(new ApiError(400, message));
  req.body = result.data;
  return next();
};
