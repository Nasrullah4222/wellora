/*
 * @feature: Application Configuration
 * @description: Loads runtime settings (server, PostgreSQL, JWT, uploads, CORS, pricing,
 *               booking deadlines) from environment variables with safe development
 *               defaults. All other modules import this object instead of reading
 *               process.env directly.
 */
import "dotenv/config";

const toInt = (value, fallback) => {
  const n = Number.parseInt(value ?? "", 10);
  return Number.isNaN(n) ? fallback : n;
};

export const env = {
  nodeEnv: process.env.NODE_ENV ?? "development",
  port: toInt(process.env.PORT, 8080),
  timezone: process.env.APP_TIMEZONE ?? "UTC",
  allowedOrigins: (process.env.ALLOWED_ORIGINS ?? "http://localhost:5173")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean),

  db: {
    host: process.env.DB_HOST ?? "127.0.0.1",
    port: toInt(process.env.DB_PORT, 5432),
    user: process.env.DB_USER ?? "wellora",
    password: process.env.DB_PASSWORD ?? "wellora_pass",
    name: process.env.DB_NAME ?? "wellora",
    // Managed PostgreSQL providers (Neon, Supabase, RDS, Aiven...) normally require TLS.
    ssl: process.env.DB_SSL === "true",
    sslCa: process.env.DB_SSL_CA || undefined,
    connectionLimit: toInt(process.env.DB_POOL_SIZE, 20),
  },

  jwtSecret: process.env.JWT_SECRET ?? "dev-only-secret-change-me",
  jwtExpiryHours: toInt(process.env.JWT_EXPIRY_HOURS, 24),

  uploadDir: process.env.UPLOAD_DIR ?? "./uploads",
  maxUploadMb: toInt(process.env.MAX_UPLOAD_MB, 10),

  // The schema has no fee column, so visit fees come from here (see utils/pricing.js).
  pricing: {
    doctorFeeCents: toInt(process.env.DOCTOR_FEE_CENTS, 9000),
    nurseFeeCents: toInt(process.env.NURSE_FEE_CENTS, 4200),
  },

  // Appointments.response_deadline: how long a provider has to accept/reject a request.
  booking: {
    responseHours: toInt(process.env.APPOINTMENT_RESPONSE_HOURS, 24),
    emergencyResponseMinutes: toInt(process.env.EMERGENCY_RESPONSE_MINUTES, 15),
  },

  seedDemoData: process.env.SEED_DEMO_DATA === "true",
  get isProduction() {
    return this.nodeEnv === "production";
  },
};
