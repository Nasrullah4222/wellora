/*
 * @feature: Server Bootstrap
 * @description: Entry point. Validates config, connects to PostgreSQL (with retries), checks that
 *               the deployed schema has the tables the API needs (it never creates or alters
 *               tables — the database is deployed from database/schema.sql), optionally seeds
 *               demo data, starts the appointment-expiry timer and the HTTP server with
 *               graceful shutdown on SIGINT/SIGTERM.
 */
import fs from "node:fs/promises";
import { createApp } from "./app.js";
import { assertSchema, connectWithRetry, pool } from "./config/database.js";
import { env } from "./config/env.js";
import { expireStale } from "./models/appointments.js";
import { seedDemoData } from "./seeders/demo.js";

if (env.isProduction && env.jwtSecret === "dev-only-secret-change-me") {
  console.error("JWT_SECRET must be set to a strong random value in production");
  process.exit(1);
}

await fs.mkdir(env.uploadDir, { recursive: true });
await connectWithRetry();
try {
  await assertSchema();
} catch (err) {
  console.error(err.message);
  process.exit(1);
}
if (env.seedDemoData) await seedDemoData();

// PENDING requests past Appointments.response_deadline become EXPIRED (also swept on reads).
const sweeper = setInterval(() => expireStale().catch((e) => console.error("expiry sweep failed:", e.message)), 60_000);
sweeper.unref();

const server = createApp().listen(env.port, () => console.log(`Wellora API listening on :${env.port} (${env.nodeEnv})`));

const shutdown = (signal) => {
  console.log(`${signal} received, shutting down...`);
  server.close(async () => {
    await pool.end();
    process.exit(0);
  });
  setTimeout(() => process.exit(1), 10_000).unref();
};
process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));
