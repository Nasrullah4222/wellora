/*
 * @feature: PostgreSQL Connection Pool & Transactions
 * @description: A node-postgres (pg) pool plus three tiny helpers used by every model:
 *               query() -> rows, exec() -> { rows, rowCount }, transaction().
 *               Every connection runs in UTC (startup option timezone=UTC) and all timestamp columns are
 *               TIMESTAMPTZ, so a moment in time is stored unambiguously; the app converts to
 *               APP_TIMEZONE only when presenting dates.
 *               BIGINT (int8) and NUMERIC are returned by pg as strings, so type parsers turn
 *               them into JS numbers (ids, COUNT(*), DECIMAL money columns).
 *               SQL uses numbered placeholders ($1, $2, ...). To match a column against a list use
 *               `col = ANY($n::enum_type[])` and pass a JS array.
 */
import pg from "pg";
import { env } from "./env.js";

const { Pool, types } = pg;

types.setTypeParser(20, (v) => Number(v)); // int8 / BIGINT / COUNT(*)
types.setTypeParser(1700, (v) => Number(v)); // numeric / DECIMAL / AVG / SUM

export const pool = new Pool({
  host: env.db.host,
  port: env.db.port,
  user: env.db.user,
  password: env.db.password,
  database: env.db.name,
  max: env.db.connectionLimit,
  options: "-c timezone=UTC", // every session runs in UTC
  ...(env.db.ssl
    ? {
        ssl: {
          minVersion: "TLSv1.2",
          rejectUnauthorized: true,
          ...(env.db.sslCa ? { ca: env.db.sslCa } : {}),
        },
      }
    : {}),
});

pool.on("error", (err) => console.error("idle database client error:", err.message));

/** Runs a SELECT and returns the rows. `db` may be the pool or a transaction client. */
export async function query(sql, params = [], db = pool) {
  const result = await db.query(sql, params);
  return result.rows;
}

/** Runs INSERT/UPDATE/DELETE and returns { rows, rowCount } (use RETURNING to get new ids). */
export async function exec(sql, params = [], db = pool) {
  const result = await db.query(sql, params);
  return { rows: result.rows, rowCount: result.rowCount };
}

/** Runs `fn(client)` inside BEGIN/COMMIT; rolls back and rethrows on any error. */
export async function transaction(fn) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const result = await fn(client);
    await client.query("COMMIT");
    return result;
  } catch (err) {
    await client.query("ROLLBACK").catch(() => {});
    throw err;
  } finally {
    client.release();
  }
}

export async function connectWithRetry(attempts = 10, delayMs = 3000) {
  for (let i = 1; i <= attempts; i += 1) {
    try {
      await pool.query("SELECT 1");
      return;
    } catch (err) {
      console.warn(`database not ready (attempt ${i}/${attempts}): ${err.message}`);
      if (i === attempts) throw err;
      await new Promise((r) => setTimeout(r, delayMs));
    }
  }
}

/** Fails fast with a readable message when the deployed schema is missing tables the API needs. */
export async function assertSchema() {
  const required = [
    "Users", "Patients", "Doctors", "Nurses", "Admins", "Services", "Appointments", "User_Live_Status",
    "Reports", "Payments", "Balances", "Ratings", "Service_Validations",
  ];
  // PostgreSQL folds unquoted names to lower case, so Users in the SQL means the table "users".
  const rows = await query("SELECT table_name AS name FROM information_schema.tables WHERE table_schema = current_schema()");
  const have = new Set(rows.map((r) => r.name));
  const missing = required.filter((t) => !have.has(t.toLowerCase()));
  if (missing.length) throw new Error(`database is missing required tables: ${missing.map((t) => t.toLowerCase()).join(", ")}`);
}
