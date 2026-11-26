/*
 * @feature: User & Professional Queries (PostgreSQL)
 * @description: All SQL for accounts. A person is one row in Users plus one row in the
 *               table for their role (Patients / Doctors / Nurses). Professionals also get
 *               a User_Live_Status row (is_available = "accepting bookings") and a Balances row.
 *
 *   API field        -> schema column
 *   fullName         -> Users.user_name
 *   address          -> Patients.address            (patients only)
 *   specialty        -> Doctors.specialization  /  Nurses.qualification
 *   bio              -> Doctors.qualification       (nurses have no bio column)
 *   experienceYears  -> Nurses.experience_years     (doctors have no such column -> 0)
 *   accepting        -> User_Live_Status.is_available
 *   rating/reviews   -> computed from Ratings (via Appointments.provider_id)
 *   phone, city      -> no column in the schema (always "")
 *   admin            -> Admins.admin_level / can_create / can_read / can_update / can_delete / is_active
 */
import { query, exec } from "../config/database.js";
import { ROLES, fromDbRole, isProfessional, toDbRole, CARE_DB_STATUSES } from "./constants.js";
import { feeCentsForRole } from "../utils/pricing.js";
import { randomHex } from "../utils/helpers.js";

const SPECIALTY = "COALESCE(d.specialization, n.qualification)";

const USER_SELECT = `
  SELECT u.user_id, u.user_name, u.email, u.password_hash, u.role, u.created_at,
         pt.address AS patient_address,
         d.specialization, d.qualification AS doctor_qualification, d.medical_license,
         n.qualification AS nurse_qualification, n.experience_years, n.nursing_license,
         COALESCE(ls.is_available, false) AS is_available,
         ad.admin_level, ad.can_create, ad.can_read, ad.can_update, ad.can_delete, ad.is_active AS admin_active,
         (SELECT AVG(r.rating) FROM Ratings r JOIN Appointments a ON a.appointment_id = r.appointment_id
           WHERE a.provider_id = u.user_id) AS avg_rating,
         (SELECT COUNT(*) FROM Ratings r JOIN Appointments a ON a.appointment_id = r.appointment_id
           WHERE a.provider_id = u.user_id) AS review_count
    FROM Users u
    LEFT JOIN Patients pt ON pt.user_id = u.user_id
    LEFT JOIN Doctors d ON d.user_id = u.user_id
    LEFT JOIN Nurses n ON n.user_id = u.user_id
    LEFT JOIN Admins ad ON ad.user_id = u.user_id
    LEFT JOIN User_Live_Status ls ON ls.user_id = u.user_id`;

/** Turns a joined row into the object the controllers/views use. */
function mapUser(r) {
  if (!r) return null;
  const role = fromDbRole(r.role);
  const user = {
    id: r.user_id,
    fullName: r.user_name,
    email: r.email,
    passwordHash: r.password_hash,
    role,
    phone: "",
    city: "",
    address: r.patient_address ?? "",
  };
  if (role === ROLES.ADMIN) {
    user.admin = {
      level: r.admin_level ?? "",
      active: r.admin_active === true,
      permissions: { create: r.can_create === true, read: r.can_read === true, update: r.can_update === true, delete: r.can_delete === true },
    };
  }
  if (isProfessional(role)) {
    const isDoctor = role === ROLES.DOCTOR;
    user.profile = {
      specialty: (isDoctor ? r.specialization : r.nurse_qualification) ?? "",
      bio: (isDoctor ? r.doctor_qualification : "") ?? "",
      experienceYears: isDoctor ? 0 : Number(r.experience_years ?? 0),
      feeCents: feeCentsForRole(role),
      supportsVirtual: isDoctor,
      accepting: Boolean(r.is_available),
      rating: Number(r.avg_rating ?? 0),
      reviewCount: Number(r.review_count ?? 0),
      license: (isDoctor ? r.medical_license : r.nursing_license) ?? "",
    };
  }
  return user;
}

export async function findUserById(id, db) {
  const rows = await query(`${USER_SELECT} WHERE u.user_id = $1 LIMIT 1`, [id], db);
  return mapUser(rows[0]);
}

export async function findUserByEmail(email, db) {
  const rows = await query(`${USER_SELECT} WHERE u.email = $1 LIMIT 1`, [email], db);
  return mapUser(rows[0]);
}

export async function emailExists(email, db) {
  const rows = await query("SELECT 1 FROM Users WHERE email = $1 LIMIT 1", [email], db);
  return rows.length > 0;
}

/**
 * Creates the Users row and the role-specific rows. Must run inside a transaction.
 * The schema requires a license number for doctors/nurses; when the sign-up form does not
 * provide one a clearly-marked UNVERIFIED-xxxx placeholder is stored (editable in Settings).
 */
export async function createAccount(conn, { fullName, email, passwordHash, role, specialty, bio, experienceYears, licenseNumber, address, accepting = true }) {
  const {
    rows: [{ user_id: userId }],
  } = await exec(
    "INSERT INTO Users (user_name, email, password_hash, role, created_at) VALUES ($1, $2, $3, $4, NOW()) RETURNING user_id",
    [fullName, email, passwordHash, toDbRole(role)],
    conn,
  );

  if (role === ROLES.PATIENT) {
    await exec("INSERT INTO Patients (user_id, address) VALUES ($1, $2)", [userId, address || null], conn);
    return userId;
  }

  const license = licenseNumber || `UNVERIFIED-${randomHex(6).toUpperCase()}`;
  if (role === ROLES.DOCTOR) {
    await exec(
      "INSERT INTO Doctors (user_id, medical_license, specialization, qualification) VALUES ($1, $2, $3, $4)",
      [userId, license, specialty || "General Physician", bio || null],
      conn,
    );
  } else {
    await exec(
      "INSERT INTO Nurses (user_id, nursing_license, qualification, experience_years) VALUES ($1, $2, $3, $4)",
      [userId, license, specialty || "Registered Nurse", experienceYears ?? 0],
      conn,
    );
  }
  await exec(
    "INSERT INTO User_Live_Status (user_id, is_online, is_available, updated_at) VALUES ($1, false, $2, NOW())",
    [userId, Boolean(accepting)],
    conn,
  );
  await exec("INSERT INTO Balances (user_id, updated_at) VALUES ($1, NOW())", [userId], conn);
  return userId;
}

/** Updates the signed-in user's own rows. Fields that have no column in the schema are ignored. */
export async function updateProfile(conn, userId, role, b) {
  await exec("UPDATE Users SET user_name = $1 WHERE user_id = $2", [b.fullName, userId], conn);

  if (role === ROLES.PATIENT) {
    await exec("UPDATE Patients SET address = $1 WHERE user_id = $2", [b.address || null, userId], conn);
    return;
  }
  if (!isProfessional(role)) return;

  if (role === ROLES.DOCTOR) {
    await exec(
      `UPDATE Doctors
          SET specialization  = COALESCE(NULLIF($1::text, ''), specialization),
              qualification   = $2,
              medical_license = COALESCE(NULLIF($3::text, ''), medical_license)
        WHERE user_id = $4`,
      [b.specialty, b.bio || null, b.licenseNumber ?? "", userId],
      conn,
    );
  } else {
    await exec(
      `UPDATE Nurses
          SET qualification    = COALESCE(NULLIF($1::text, ''), qualification),
              experience_years = $2,
              nursing_license  = COALESCE(NULLIF($3::text, ''), nursing_license)
        WHERE user_id = $4`,
      [b.specialty, b.experienceYears, b.licenseNumber ?? "", userId],
      conn,
    );
  }

  if (b.accepting !== undefined) {
    await exec(
      `INSERT INTO User_Live_Status (user_id, is_online, is_available, updated_at) VALUES ($1, false, $2, NOW())
       ON CONFLICT (user_id) DO UPDATE SET is_available = EXCLUDED.is_available, updated_at = NOW()`,
      [userId, Boolean(b.accepting)],
      conn,
    );
  }
}

/** Directory search: only professionals currently available, best rated first. */
export async function listProfessionals({ role, q, specialty }) {
  const params = [toDbRole(role)];
  const where = ["u.role = $1", "COALESCE(ls.is_available, false) = true"];
  if (q) {
    params.push(`%${q}%`);
    where.push(`(u.user_name ILIKE $${params.length} OR ${SPECIALTY} ILIKE $${params.length})`);
  }
  if (specialty) {
    params.push(specialty);
    where.push(`${SPECIALTY} = $${params.length}`);
  }
  // PostgreSQL cannot use the avg_rating alias inside an expression, so sort in an outer query.
  const rows = await query(
    `SELECT * FROM (${USER_SELECT} WHERE ${where.join(" AND ")}) t
      ORDER BY COALESCE(t.avg_rating, 0) DESC, t.user_name ASC`,
    params,
  );
  return rows.map(mapUser);
}

/** Patients a professional has an accepted / in-progress / completed appointment with. */
export async function listCarePatients(providerId) {
  return query(
    `SELECT u.user_id AS id, u.user_name AS "fullName", u.email AS email,
            COUNT(a.appointment_id) AS visits, MAX(a.scheduled_at) AS "lastVisit"
       FROM Appointments a
       JOIN Users u ON u.user_id = a.patient_id
      WHERE a.provider_id = $1 AND a.status = ANY($2::appointment_status[])
      GROUP BY u.user_id, u.user_name, u.email
      ORDER BY "lastVisit" DESC NULLS LAST`,
    [providerId, CARE_DB_STATUSES],
  );
}
