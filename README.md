# TAA-App: Teremil Assistance Application

Web application for the Teremil Subdivision assistance system.

## Project Structure

```
taa-app-fullstack/
├── frontend/
│   └── src/components/features/ # Feature UI grouped by domain
├── backend/
│   ├── src/features/             # Routes, controllers, schemas, services, rules, tests
│   ├── src/config/               # Environment, Prisma client, uploads
│   ├── src/middlewares/          # Shared HTTP middleware
│   └── prisma/                   # Prisma schema, migrations, seed scripts
└── shared/                       # Roles and types shared by both apps
```

Each backend feature keeps its HTTP routes, controller, and request schema together (for example `src/features/payments`). Shared infrastructure stays in `config`, `middlewares`, and `utils`. Database models are defined in `prisma/schema.prisma`; there is no separate model layer because Prisma Client is the data access layer. Keep payment and authentication rules in their feature modules and add focused tests next to those rules.

## Tech Stack

**Frontend:** Next.js 15, TypeScript, Tailwind CSS, Axios, Lucide React, Sonner
**Backend:** Node.js, Express, TypeScript, Prisma ORM, MySQL, JWT, bcryptjs, Zod

## Roles

| Role | Access |
|---|---|
| **resident** | View announcements, report incidents, view own payments, view officials, update own profile |
| **hoa_officer** | Verify users, manage announcements/incidents/payments/officials |
| **admin** | Full control: delete records, manage roles, all officer powers |

## Setup

### 1. Database

Create the `taa_v2` database and configure `DATABASE_URL` in `backend/.env`.
For a new database, apply the checked-in migrations with `npm run db:migrate:deploy`.

For an existing database previously created with `prisma db push`, back it up first, then baseline its current schema and apply the new additive migration:

```bash
npx prisma migrate resolve --applied 20261030000000_baseline
npm run db:migrate:deploy
```

The baseline command records the existing schema as already applied; it does not recreate tables. The following migration adds session revocation support and preserves historical payment references.

### 2. Backend (port 5001)

```bash
cd backend
cp .env.example .env        # Set DATABASE_URL and generate unique JWT secrets
npm install
npm run db:migrate:deploy   # create/update tables from checked-in migrations
npx tsx prisma/seed.ts      # seed local demo accounts (refuses production)
npm run dev                 # http://localhost:5001/api
```

### 3. Frontend (port 3000)

```bash
cd frontend
npm install
npm run dev                 # http://localhost:3000
```

The frontend proxies `/api/*` to `http://localhost:5001/api/*` (see `next.config.ts`).

### Checks

```bash
cd backend
npm run build
npm test

cd ../frontend
npm run lint
npx tsc --noEmit
```

> Note: port 5000 is used by macOS AirPlay (ControlCenter), so the API runs on **5001**.

## Seeded Accounts

| Username | Password | Role |
|---|---|---|
| `admin` | `Admin123!` | admin |
| `officer` | `Resident123!` | hoa_officer |
| `resident` | `Resident123!` | resident |

These are local demo credentials. The demo seed refuses to run with `NODE_ENV=production`; use `prisma/bootstrap-admin.ts` with a unique password of at least 16 characters when provisioning a real administrator.

## API Overview

| Endpoint | Description |
|---|---|
| `POST /api/auth/register` | Register (starts as `pending`) |
| `POST /api/auth/login` | Login → access token + refresh cookie |
| `GET  /api/auth/me` | Current user |
| `GET  /api/users` | List/search users (staff) |
| `POST /api/users/:id/verify` | Verify / reject / suspend |
| `GET/PUT /api/residents/me` | Own household profile |
| `GET/POST/PUT/DELETE /api/announcements` | Announcements CRUD |
| `GET/POST/PUT/DELETE /api/incidents` | Incident reporting + status updates |
| `GET/POST/PUT/DELETE /api/payments` | Dues, proof submission, confirmation |
| `POST /api/payments/:id/confirm` | Confirm/reject payment (staff) |
| `GET/POST/PUT/DELETE /api/officials` | HOA officials CRUD |
| `GET  /api/dashboard` | Role-based stats |

## Features

- Account Registration & Login (JWT access + refresh)
- User Verification workflow (pending → verified/rejected/suspended)
- Announcements (publish/unpublish, staff-managed)
- Incident Reporting & Status Tracking
- Payment Management (create dues, submit proof, confirm/reject)
- Officials Management (terms, active/inactive)
- Role-based Access Control (frontend routes + backend `authorize()`)
- Mobile-responsive Design
