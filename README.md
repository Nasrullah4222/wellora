# Wellora — Healthcare Booking Platform (MVP)

Working implementation of the Figma design.

| Layer    | Stack |
|----------|-------|
| Frontend | React 19, TypeScript, Tailwind CSS v4, React Router, Axios |
| Backend  | Node.js, Express, pg / node-postgres (raw SQL, MVC) |
| Database | PostgreSQL 16 |

## Quick start

### 1. Database + API (Docker)
```bash
docker compose up --build
```
API: http://localhost:8080/api/v1 (health: `/health`). Tables are created from `backend/database/schema.sql` on the first start of the PostgreSQL container and demo data is seeded.

*Without Docker:* create a PostgreSQL database/user and load the schema, then
```bash
cd backend
cp .env.example .env     # set DB_* and JWT_SECRET
npm install
npm run dev
```

### 2. Frontend
```bash
cd frontend
cp .env.example .env
npm install
npm run dev              # http://localhost:5173
```

### Demo accounts (password `Password123!`)
| Role    | Email                       |
|---------|-----------------------------|
| Patient | olivia@example.com          |
| Doctor  | ethan.williams@example.com  |
| Nurse   | ava.thompson@example.com    |

## MVP features
- Registration / login with JWT, three roles (patient, nurse, doctor), role-based routes and API permissions
- Find doctors (search + specialty filter) and book nurses
- 3-step booking modal with live slot availability (double-booking prevented with a row lock)
- Booking lifecycle: pending → accepted / rejected → completed; patients can cancel
- Patient confirmation + 1–5 star review after completion (updates professional rating)
- Virtual visits get a unique video-room link (Jitsi) shown as "Join call" once accepted
- Medical reports: professional upload (PDF/PNG/JPEG, content-sniffed, 10 MB), secure download
- Payments / earnings ledger (PAID payment + provider balance when a booking is accepted, REFUNDED on cancellation)
- Role-specific dashboards, patient list, profile settings

## Not in the MVP (next steps)
AI health insights, in-app video, real payment gateway (Stripe), map/distance search,
notifications, email verification & password reset, professional-managed working hours.

## Project structure
```
backend/                    Node.js + Express (MVC)
├── src/
│   ├── server.js           bootstrap + graceful shutdown
│   ├── app.js              Express app (helmet, CORS, logging, routes, errors)
│   ├── config/             env + pg pool / transactions
│   ├── models/             M — all PostgreSQL queries + booking rules
│   ├── views/              V — JSON presenters & response envelope
│   ├── controllers/        C — auth, professionals, bookings, reports, payments, dashboard, users
│   ├── routes/             URL → middleware → controller
│   ├── middlewares/        JWT + roles, zod validation, upload, errors
│   ├── seeders/            demo data
│   └── utils/              ApiError, asyncHandler, security, helpers
├── database/schema.sql     PostgreSQL DDL (all tables incl. Admins, TIMESTAMPTZ columns)
├── scripts/smoke.js        39-step end-to-end test
└── uploads/                stored report files (git-ignored)

frontend/
└── src/
    ├── app/                routing + role guards
    ├── features/<name>/    { components, hooks, pages, services }
    │                       auth · dashboard · professionals · bookings · reports · payments · profile · landing
    └── shared/             components, hooks, layouts, lib (api client), types
```

## API (prefix `/api/v1`, JWT required unless noted)
| Method | Path | Who | Purpose |
|---|---|---|---|
| POST | /auth/register, /auth/login | public | create account / sign in |
| GET | /auth/me | any | current user |
| PUT | /users/me | any | update profile |
| GET | /dashboard | any | stats + upcoming |
| GET | /professionals?role=&q=&specialty= | any | directory |
| GET | /professionals/:id, /professionals/:id/slots?date= | any | profile / free slots |
| GET | /bookings?status= | any | my bookings |
| POST | /bookings | patient | request a booking |
| PATCH | /bookings/:id/status | owner | accept/reject/start/complete/cancel |
| POST | /bookings/:id/confirm | patient | confirm service + review |
| POST | /bookings/:id/dispute | patient | reject a completed service with feedback |
| GET | /reports, /reports/:id/download | any (scoped) | list / download |
| POST | /reports | doctor, nurse | upload (multipart) |
| GET | /payments | any (scoped) | ledger + totals |
| GET | /patients | doctor, nurse | my patients |

Set `APP_TIMEZONE` (e.g. `Asia/Dhaka`) so slot times match your local time.
