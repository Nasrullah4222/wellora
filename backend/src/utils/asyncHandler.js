/*
 * @feature: Async Route Wrapper
 * @description: Forwards rejected promises from async controllers to Express'
 *               error middleware (Express 4 does not do this automatically).
 */
export const asyncHandler = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
