/*
 * @feature: API Error
 * @description: Error carrying an HTTP status. Controllers throw it; the central
 *               error middleware turns it into {"error": "message"}.
 */
export class ApiError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}
