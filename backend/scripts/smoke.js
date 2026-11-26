/*
 * @feature: End-to-End Smoke Test
 * @description: Exercises the full booking journey against a running API:
 *               login -> directory -> slots -> book -> accept -> complete ->
 *               confirm/review -> payments -> report upload/download -> RBAC checks ->
 *               administrator sign-in, permissions and access limits.
 *               Usage: API_URL=http://localhost:8080/api/v1 npm run smoke
 */
const BASE = process.env.API_URL ?? "http://localhost:8080/api/v1";
let failures = 0;

const check = (name, cond, extra = "") => {
  console.log(`${cond ? "PASS" : "FAIL"}  ${name}${cond ? "" : `  ${extra}`}`);
  if (!cond) failures += 1;
};

async function call(method, path, { token, body, form } = {}) {
  const res = await fetch(BASE + path, {
    method,
    headers: { ...(token && { Authorization: `Bearer ${token}` }), ...(body && { "Content-Type": "application/json" }) },
    body: form ?? (body ? JSON.stringify(body) : undefined),
  });
  const type = res.headers.get("content-type") ?? "";
  return { status: res.status, json: type.includes("json") ? await res.json() : null, res };
}
const login = async (email) => (await call("POST", "/auth/login", { body: { email, password: "Password123!" } })).json.data.token;

const patient = await login("olivia@example.com");
const doctor = await login("ethan.ross@example.com");

// --- auth ---
check("login rejects wrong password", (await call("POST", "/auth/login", { body: { email: "olivia@example.com", password: "nope" } })).status === 401);
check("protected route needs token", (await call("GET", "/dashboard")).status === 401);
const reg = await call("POST", "/auth/register", { body: { fullName: "Test Nurse", email: `n${Date.now()}@example.com`, password: "Password123!", role: "nurse" } });
check("register nurse returns token + profile", reg.status === 201 && reg.json.data.user.specialty === "Registered Nurse");

// --- directory ---
const docs = (await call("GET", "/professionals?role=doctor&q=cardio", { token: patient })).json.data;
check("search cardiologists", docs.length === 2 && docs.every((d) => d.specialty === "Cardiologist"));
const ross = docs.find((d) => d.fullName === "Dr. Ethan Ross");

// --- booking ---
const date = new Date(Date.now() + 5 * 86400000).toISOString().slice(0, 10);
const slots = (await call("GET", `/professionals/${ross.id}/slots?date=${date}`, { token: patient })).json.data;
check("slots returned and available", slots.length === 8 && slots.every((s) => s.available));

const bookBody = { professionalId: ross.id, visitType: "virtual", service: "Follow-up consultation", date, time: "10:00", notes: "n/a" };
const created = await call("POST", "/bookings", { token: patient, body: bookBody });
check("create booking -> pending", created.status === 201 && created.json.data.status === "pending");
check("double booking blocked (409)", (await call("POST", "/bookings", { token: patient, body: bookBody })).status === 409);
check("doctor cannot create booking (403)", (await call("POST", "/bookings", { token: doctor, body: bookBody })).status === 403);
check("nurse visit type rule", (await call("POST", "/bookings", { token: patient, body: { ...bookBody, professionalId: reg.json.data.user.id, time: "11:00" } })).status === 400);
const booked = (await call("GET", `/professionals/${ross.id}/slots?date=${date}`, { token: patient })).json.data;
check("booked slot now unavailable", booked.find((s) => s.time === "10:00").available === false);

const id = created.json.data.id;
check("patient cannot accept (422)", (await call("PATCH", `/bookings/${id}/status`, { token: patient, body: { status: "accepted" } })).status === 422);
const accepted = await call("PATCH", `/bookings/${id}/status`, { token: doctor, body: { status: "accepted" } });
check("doctor accepts; meeting link exposed", accepted.json.data.status === "accepted" && /meet\.jit\.si/.test(accepted.json.data.meetingUrl));
check("confirm before completion rejected (422)", (await call("POST", `/bookings/${id}/confirm`, { token: patient, body: { rating: 5 } })).status === 422);
check("doctor completes", (await call("PATCH", `/bookings/${id}/status`, { token: doctor, body: { status: "completed" } })).json.data.status === "completed");
const confirmed = await call("POST", `/bookings/${id}/confirm`, { token: patient, body: { rating: 5, comment: "Great" } });
check("patient confirms + reviews", confirmed.json.data.patientConfirmed === true);
check("double confirm blocked (409)", (await call("POST", `/bookings/${id}/confirm`, { token: patient, body: { rating: 5 } })).status === 409);
const rated = (await call("GET", `/professionals/${ross.id}`, { token: patient })).json.data;
check("professional rating recomputed", rated.reviewCount === 1 && rated.rating === 5, JSON.stringify(rated));

// --- cancel after accept refunds the payment; dispute flow ---
const date2 = new Date(Date.now() + 6 * 86400000).toISOString().slice(0, 10);
const second = await call("POST", "/bookings", { token: patient, body: { ...bookBody, date: date2, time: "11:00" } });
await call("PATCH", `/bookings/${second.json.data.id}/status`, { token: doctor, body: { status: "accepted" } });
const cancelled = await call("PATCH", `/bookings/${second.json.data.id}/status`, { token: patient, body: { status: "cancelled" } });
check("patient cancels accepted booking", cancelled.json.data.status === "cancelled");
const afterCancel = (await call("GET", "/payments", { token: doctor })).json.data;
check("cancelled payment refunded & excluded from totals", afterCancel.totalCents === 9000 && afterCancel.transactions.some((t) => t.status === "refunded") && afterCancel.balance.pendingCents === 0, JSON.stringify(afterCancel));
const third = await call("POST", "/bookings", { token: patient, body: { ...bookBody, date: date2, time: "12:00" } });
const tid = third.json.data.id;
await call("PATCH", `/bookings/${tid}/status`, { token: doctor, body: { status: "accepted" } });
check("accepted -> in_progress", (await call("PATCH", `/bookings/${tid}/status`, { token: doctor, body: { status: "in_progress" } })).json.data.status === "in_progress");
await call("PATCH", `/bookings/${tid}/status`, { token: doctor, body: { status: "completed" } });
const disputed = await call("POST", `/bookings/${tid}/dispute`, { token: patient, body: { feedback: "Visit was cut short" } });
check("patient disputes completed service", disputed.status === 200 && disputed.json.data.validationStatus === "rejected" && disputed.json.data.patientConfirmed === false, JSON.stringify(disputed.json));
const rejectedOne = await call("PATCH", `/bookings/${(await call("POST", "/bookings", { token: patient, body: { ...bookBody, date: date2, time: "14:00" } })).json.data.id}/status`, { token: doctor, body: { status: "rejected" } });
check("doctor rejects request (IGNORED -> rejected)", rejectedOne.json.data.status === "rejected");
check("status filter works for rejected", (await call("GET", "/bookings?status=rejected", { token: patient })).json.data.every((b) => b.status === "rejected"));

// --- payments / dashboard / patients ---
const pay = (await call("GET", "/payments", { token: doctor })).json.data;
check("doctor earnings recorded (PAID)", pay.totalCents === 18000 && pay.transactions.length === 3 && pay.transactions.filter((t) => t.status === "paid").length === 2, JSON.stringify(pay));
check("provider balance: pending -> available", pay.balance.availableCents === 18000 && pay.balance.pendingCents === 0 && pay.balance.totalEarningsCents === 18000, JSON.stringify(pay.balance));
const dash = (await call("GET", "/dashboard", { token: patient })).json.data;
check("patient dashboard stats", dash.stats.length === 4 && dash.stats.find((s) => s.key === "spent").value > 0);
const pts = (await call("GET", "/patients", { token: doctor })).json.data;
check("doctor patient list", pts.length === 1 && pts[0].fullName === "Olivia Martin" && pts[0].visits === 2, JSON.stringify(pts));
check("patient cannot list patients (403)", (await call("GET", "/patients", { token: patient })).status === 403);

// --- reports ---
const pdf = new Blob([Buffer.from("%PDF-1.4\n1 0 obj<<>>endobj\ntrailer<<>>\n%%EOF")], { type: "application/pdf" });
const form = new FormData();
form.append("patientId", String(pts[0].id));
form.append("title", "Blood test");
form.append("file", pdf, "blood.pdf");
const up = await call("POST", "/reports", { token: doctor, form });
check("doctor uploads PDF", up.status === 201 && up.json.data.title === "Blood test", JSON.stringify(up.json));

const fake = new FormData();
fake.append("patientId", String(pts[0].id));
fake.append("title", "Evil");
fake.append("file", new Blob(["MZ not a pdf"], { type: "application/pdf" }), "evil.pdf");
check("fake PDF rejected by content sniffing (415)", (await call("POST", "/reports", { token: doctor, form: fake })).status === 415);
check("patient cannot upload (403)", (await call("POST", "/reports", { token: patient, form })).status === 403);

const reports = (await call("GET", "/reports", { token: patient })).json.data;
check("patient sees report", reports.length === 1);
const dl = await call("GET", `/reports/${reports[0].id}/download`, { token: patient });
check("patient downloads file", dl.status === 200 && (await dl.res.text()).startsWith("%PDF"));
const other = await login("ava.thompson@example.com");
check("unrelated nurse cannot download (404)", (await call("GET", `/reports/${reports[0].id}/download`, { token: other })).status === 404);

// --- profile ---
const upd = await call("PUT", "/users/me", { token: doctor, body: { fullName: "Dr. Ethan Ross", phone: "123", city: "SF", address: "x", specialty: "Interventional Cardiologist", bio: "MD, FACC", experienceYears: 13, feeCents: 15500, supportsVirtual: true, accepting: false } });
check("doctor profile update persists specialty/bio/availability", upd.status === 200 && upd.json.data.specialty === "Interventional Cardiologist" && upd.json.data.bio === "MD, FACC" && upd.json.data.accepting === false, JSON.stringify(upd.json));
check("unavailable doctor hidden from directory", !(await call("GET", "/professionals?role=doctor&q=ross", { token: patient })).json.data.some((d) => d.id === ross.id));
await call("PUT", "/users/me", { token: doctor, body: { fullName: "Dr. Ethan Ross", specialty: "Cardiologist", accepting: true } });
const nurseToken = reg.json.data.token;
const nurseUpd = await call("PUT", "/users/me", { token: nurseToken, body: { fullName: "Test Nurse", specialty: "Wound care", experienceYears: 5, accepting: true } });
check("nurse profile persists specialty + experience", nurseUpd.json.data.specialty === "Wound care" && nurseUpd.json.data.experienceYears === 5, JSON.stringify(nurseUpd.json));
const patUpd = await call("PUT", "/users/me", { token: patient, body: { fullName: "Olivia Martin", address: "1 New Street" } });
check("patient address persists (Patients.address)", patUpd.json.data.address === "1 New Street");
check("LIKE wildcards are escaped in search", (await call("GET", "/professionals?role=doctor&q=%25", { token: patient })).json.data.length === 0);

// --- administrator ---
const adminLogin = await call("POST", "/auth/login", { body: { email: "admin@example.com", password: "Password123!", asAdmin: true } });
check("admin signs in through the admin form", adminLogin.status === 200 && adminLogin.json.data.user.role === "admin", JSON.stringify(adminLogin.json));
const perms = adminLogin.json.data.user.admin?.permissions ?? {};
check("admin profile exposes CRUD permissions", perms.create && perms.read && perms.update && perms.delete && adminLogin.json.data.user.admin.level === "SUPER_ADMIN");
check("admin must use the admin form (403)", (await call("POST", "/auth/login", { body: { email: "admin@example.com", password: "Password123!" } })).status === 403);
check("patient cannot use the admin form (401)", (await call("POST", "/auth/login", { body: { email: "olivia@example.com", password: "Password123!", asAdmin: true } })).status === 401);
check("admin wrong password rejected (401)", (await call("POST", "/auth/login", { body: { email: "admin@example.com", password: "nope", asAdmin: true } })).status === 401);
check("nobody can self-register as admin", (await call("POST", "/auth/register", { body: { fullName: "Evil Admin", email: `a${Date.now()}@example.com`, password: "Password123!", role: "admin" } })).status === 400);
const adminToken = adminLogin.json.data.token;
const adminDash = await call("GET", "/dashboard", { token: adminToken });
check("admin dashboard shows platform stats", adminDash.status === 200 && adminDash.json.data.stats.length === 4 && adminDash.json.data.stats[0].value >= 1, JSON.stringify(adminDash.json));
check("admin restored by /auth/me", (await call("GET", "/auth/me", { token: adminToken })).json.data.role === "admin");
check("admin cannot use care screens (403)", (await call("GET", "/bookings", { token: adminToken })).status === 403 && (await call("GET", "/payments", { token: adminToken })).status === 403 && (await call("GET", "/reports", { token: adminToken })).status === 403);

console.log(failures === 0 ? "\nALL CHECKS PASSED" : `\n${failures} CHECK(S) FAILED`);
process.exit(failures === 0 ? 0 : 1);
