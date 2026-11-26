/*
 * @feature: Create Administrator (CLI)
 * @description: Creates a Users row (role ADMIN) plus its Admins row with the chosen CRUD permissions.
 *               Usage:
 *                 ADMIN_PASSWORD='a-strong-password' npm run admin:create -- --email boss@example.com --name "Boss"
 *                 npm run admin:create -- --email x@y.com --name "Support" --level SUPPORT --permissions read,update
 *               Options: --email  --name  --password (or ADMIN_PASSWORD)  --level (default SUPER_ADMIN)
 *                        --permissions create,read,update,delete (default: all four)
 *               Passing the password through ADMIN_PASSWORD keeps it out of your shell history.
 */
import { pool, transaction } from "../src/config/database.js";
import { PERMISSIONS, createAdminAccount } from "../src/models/admins.js";
import { emailExists } from "../src/models/users.js";
import { hashPassword } from "../src/utils/security.js";

const args = Object.fromEntries(
  process.argv.slice(2).reduce((acc, token, i, all) => (token.startsWith("--") ? [...acc, [token.slice(2), all[i + 1]]] : acc), []),
);

const email = String(args.email ?? "").trim().toLowerCase();
const fullName = String(args.name ?? "").trim();
const password = args.password ?? process.env.ADMIN_PASSWORD ?? "";
const level = String(args.level ?? "SUPER_ADMIN").trim().toUpperCase();
const permissions = args.permissions ? String(args.permissions).split(",").map((p) => p.trim().toLowerCase()) : PERMISSIONS;

function fail(message) {
  console.error(`error: ${message}`);
  process.exitCode = 1;
}

try {
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) fail("--email must be a valid email address");
  else if (fullName.length < 2) fail("--name is required (at least 2 characters)");
  else if (password.length < 8) fail("password must be at least 8 characters (use --password or ADMIN_PASSWORD)");
  else if (permissions.some((p) => !PERMISSIONS.includes(p))) fail(`--permissions may only contain: ${PERMISSIONS.join(", ")}`);
  else if (await emailExists(email)) fail("an account with this email already exists");
  else {
    const passwordHash = await hashPassword(password);
    const id = await transaction((conn) => createAdminAccount(conn, { fullName, email, passwordHash, level, permissions }));
    console.log(`admin created: id=${id} email=${email} level=${level} permissions=${permissions.join(",")}`);
  }
} finally {
  await pool.end();
}
