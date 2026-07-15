# Earning with Solution — Backend

NestJS + PostgreSQL (Prisma) + Redis backend for the Earning with Solution
fintech affiliate platform (Tri M3 Credible Solution Pvt Ltd).

## What's implemented

- **Auth** — Firebase Phone OTP verification, JWT access+refresh tokens (rotation), device tracking, referral codes
- **Users** — profile, KYC submission (Aadhaar/PAN, AES-256 encrypted + hashed for duplicate detection), bank details, Shopkeeper→FOS team hierarchy
- **Products** — full catalog CRUD, **admin-editable affiliate links with full version history**
- **Leads** — company lead form → duplicate/fraud checks → save → redirect to affiliate link; manual admin status workflow (Pending/In Process/Approved/Rejected/Duplicate) with full audit trail; wallet credit only on explicit admin-confirmed approval
- **Wallet** — balance, lifetime/pending/approved/rejected earnings, bonus, referral income, transactions
- **Withdrawals** — min ₹500, UPI/Bank modes, manual admin approval (Pending→Approved→Completed / Rejected), notification on every status change
- **BC Applications** — Banking Business Correspondent onboarding (Kotak/Airtel/Jio), document upload, manual verification
- **Notifications** — Push (FCM) / SMS / WhatsApp / Email, category-based channel defaults, per-user preferences, admin broadcast composer
- **Banks / Locations** — admin-editable master data (states, cities, banks)
- **Admin** — dashboard KPIs, analytics (top products/executives, state-wise sales, conversion funnel, monthly revenue), Excel export, user management (approve/block/KYC), banners, announcements, training videos, support tickets, settings, custom admin roles, security/audit logs, fraud flag review
- **Security** — Helmet, CORS whitelist, global DTO validation (SQLi/XSS protection via ORM + validation), rate limiting (Throttler, extra-strict on OTP), AES-256 encryption for sensitive fields, append-only activity/admin/audit logs, fraud detection (duplicate mobile/PAN/Aadhaar, GPS pattern anomaly)

## Setup

```bash
npm install
cp .env.example .env
# Fill in .env — see comments in the file for where to get each key

# Local Postgres + Redis (optional, for local dev):
docker compose up -d

npx prisma migrate dev --name init
npx prisma db seed

npm run start:dev
```

API runs on `http://localhost:4000/api/v1`.

## Where to plug in real credentials

See `.env.example` — every variable has a comment saying exactly where to
get it (Firebase Console, AWS Console, Razorpay/Cashfree dashboards, etc).
Also see `/docs/DEPLOYMENT_GUIDE.md` in the project root for the full
step-by-step deployment walkthrough.

## Project structure

```
src/
├── auth/            OTP login, JWT, Firebase integration
├── users/            Profile, KYC, bank details, team hierarchy
├── products/          Product catalog + affiliate link management
├── leads/               Lead capture, redirect, status workflow
├── wallet/                Wallet balance & transactions
├── withdrawals/            Withdrawal requests & manual approval
├── bc-applications/          Banking BC onboarding
├── notifications/              Multi-channel notification dispatch
├── banks/ locations/             Master data (banks, states, cities)
├── admin/                          Dashboard, analytics, content, settings, logs
├── uploads/                          S3 presigned upload URLs
└── common/
    ├── security/                       Encryption, fraud detection, security logs
    ├── guards/ decorators/ filters/       JWT/RBAC guards, DTO validation, error handling
```

## Database

Full schema in `prisma/schema.prisma` — this is the single source of truth
for the entire platform's data model (used to generate migrations for
Postgres, and read by every module above).
