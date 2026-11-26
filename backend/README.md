# Wellora API — Node.js + Express + PostgreSQL

**Stack:** Node 18+, Express 4, `pg` (hand-written SQL, no ORM), JWT, bcryptjs, multer, zod, luxon.

## Run
```bash
cp .env.example .env            # set DB_* and JWT_SECRET
npm run db:schema               # psql -f database/schema.sql (only if your database does not have the tables yet)
npm install
npm run dev                     # http://localhost:8080/api/v1/health
```
The API **never creates or alters tables**. On start it checks that the tables it needs exist
(PostgreSQL folds unquoted names to lower case, so `Users` in the SQL is the table `users`)
and exits with a clear message otherwise. `database/schema.sql` is the PostgreSQL version of the
DBML diagram, including the `admins` table. All date-time columns are `TIMESTAMPTZ`.
For Supabase, enable `DB_SSL=true`. If Node reports an untrusted/self-signed certificate,
download the database CA certificate from the Supabase Dashboard's Database Settings > SSL Configuration
and set `DB_SSL_CA` to its PEM contents. Certificate verification remains enabled; do not disable it.

`SEED_DEMO_DATA=true` fills an empty `Users` table with demo accounts (password `Password123!`):
olivia@example.com (patient), ethan.williams@example.com (doctor), ava.thompson@example.com (nurse),
admin@example.com (administrator — use **Administrator? Sign in here** on the login page, or `/auth?portal=admin`).

## Administrators
An admin is a `Users` row with `role = 'ADMIN'` plus an `Admins` row holding `admin_level`, `is_active` and the
CRUD flags `can_create` / `can_read` / `can_update` / `can_delete`. Credentials (email + bcrypt hash) live in `Users`.
* Admins cannot self-register. Create one with
  `ADMIN_PASSWORD='…' npm run admin:create -- --email boss@example.com --name "Boss" [--level SUPPORT] [--permissions read,update]`.
* `POST /auth/login` with `"asAdmin": true` is the admin sign-in. An admin using the normal form gets 403, a non-admin
  using the admin form gets 401, and an inactive admin gets 403. A successful login records `Admins.last_login_at`.
* `GET /dashboard` returns platform totals for an admin with `can_read`. The flags are checked in the database on every
  request (`requireAdminPermission("create" | "read" | "update" | "delete")` in `middlewares/auth.js`), so
  deactivating an admin or removing a flag takes effect immediately, even for tokens already issued.
* Admins cannot open the patient/professional screens (`/bookings`, `/payments`, `/reports` return 403).
* The CRUD flags are enforced by `requireAdminPermission`; no admin CRUD endpoints exist yet. Add them with
  `router.post("/admin/…", requireAdminPermission("create"), …)`.

## Smoke test (48 end-to-end checks against a real PostgreSQL)
```bash
SEED_DEMO_DATA=true npm start                         # terminal 1 (empty database)
API_URL=http://localhost:8080/api/v1 npm run smoke    # terminal 2
```

## Code layout
```
src/config/database.js   pg pool (UTC session), query() / exec() / transaction(), schema check
                         (SQL uses $1, $2 placeholders; lists use `= ANY($n::enum_type[])`)
src/models/*.js          ALL SQL lives here: users, appointments, payments (+Balances), reports, validations (+Ratings), admins
src/controllers/*.js     request handling + business rules, calling the model functions
src/views/index.js       JSON shapes the React app consumes
```

## How the API maps to your schema
| API concept | Schema |
|---|---|
| Account | `Users` + one of `Patients` / `Doctors` / `Nurses` (+ `User_Live_Status`, `Balances` for providers) |
| Roles | `Users.role` ENUM, exposed lowercase (`patient`, `doctor`, `nurse`, `admin`) |
| Administrator | `Users` (role `ADMIN`) + `Admins` (level, active flag, CRUD permission flags) |
| Booking | `Appointments` row; `service` / `visitType` = `Services.service_name` / `service_type` (`VIRTUAL`, `IN_PERSON`, `HOME`), created on first use |
| Booking status | `Appointments.status`; API `rejected` = `IGNORED`; `expired` is set when `response_deadline` passes (timer + on reads) |
| Home-visit address | `Appointments.service_address` (defaults to `Patients.address`) |
| Accept | status `ACCEPTED`, `accepted_at`, `Payments` row `PAID` with a `TXN-…` id, provider `Balances.pending_balance += amount` |
| Complete | status `COMPLETED`, `completed_at`, `Service_Validations` `REQUESTED`, balance pending → available + `total_earnings` |
| Patient confirms / disputes | `Service_Validations` `ACCEPTED` / `REJECTED` (+ `patient_feedback`), optional `Ratings` row |
| Cancel after accept | status `CANCELLED`, payment `REFUNDED`, pending balance released |
| Rating / review count | computed from `Ratings` via `Appointments.provider_id` (nothing denormalised) |
| "Accepting bookings" | `User_Live_Status.is_available` |
| Report | `Reports` row attached to an appointment; patient = `Appointments.patient_id`, uploader = `Appointments.provider_id`; `file_path` = random stored file name |
| Specialty / bio | doctor: `Doctors.specialization` / `qualification`; nurse: `Nurses.qualification` (no bio) |
| Experience | `Nurses.experience_years` (doctors have no column) |

### Not stored (the schema has no column) — behaviour today
* **Visit fee** — per-role default from `DOCTOR_FEE_CENTS` / `NURSE_FEE_CENTS`. Needs a column to be editable per provider.
* **phone, city** — returned as `""`, ignored on save.
* **Booking notes** — accepted, not stored.
* **Doctor experience / "offers virtual"** — doctors are always virtual-capable, experience is `0`.
* **Video-room link** — derived (HMAC of the appointment id), not stored.
* **License numbers** — required by `Doctors` / `Nurses`; if sign-up doesn't send one a placeholder `UNVERIFIED-XXXXXX` is stored and the professional can replace it in Settings.

### Tables not used by any endpoint yet
`AI_Analyses`, `AI_Recommendations`, `Patient_Health_Profiles`, `AI_Plans`, `Plan_Progress`, `Prescriptions`,
`Prescription_Items`, `Medicine_Reminders`, `Notifications` (the current UI has no screens for them).
