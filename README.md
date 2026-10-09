# 1C Billboard Asset Management — Next.js / Express / PostgreSQL

The source is a TypeScript monorepo with a Next.js App Router frontend in `client/` and an Express API in `server/`. PostgreSQL is the only database. There are no seeded assets, demo accounts, SQLite databases or mock API routes. Photographs use a **private Vercel Blob store**, with metadata in PostgreSQL.

## Setup

1. Install Node.js 22.13 or newer and run `npm ci` in this directory.
2. Copy `server/.env.example` to `server/.env` and `client/.env.example` to `client/.env.local`.
3. Create a Neon PostgreSQL database. Set `DATABASE_URL` to its connection string with TLS (`sslmode=require`). A pooled URL is suitable for the running API. For schema deployment you can temporarily use Neon’s direct URL.
4. Create a **private** Vercel Blob store and supply its `BLOB_READ_WRITE_TOKEN`. Blob is object storage, not a relational database.
5. Generate two separate secrets with `node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"`. Set `JWT_SECRET` and `CSRF_SECRET`.
6. Run `npm run db:migrate`. The complete SQL is in `server/sql/001_schema.sql`. It creates tables, foreign keys, indexes and checks; it inserts no business data. This initial schema script can be rerun, but future schema changes should use new versioned migrations.
7. Set `ADMIN_EMAIL`, `ADMIN_NAME` and a strong `ADMIN_PASSWORD` in `server/.env`, then run `npm run admin:create`. This creates the first owner account. Remove `ADMIN_PASSWORD` immediately afterward. Passwords require at least 12 characters, uppercase, lowercase, a number and a symbol. A second owner cannot be created.
8. In separate terminals run `npm run dev:server` and `npm run dev:client`. Open http://localhost:3000. Sign in, create assessor/admin accounts, set each member’s upload password and add real assets.

## Folders

```text
client/
  app/                  Launch, login, dashboard, asset forms, QR cards, admin and reports
  api/                  Axios instance, CSRF/refresh interceptors and API functions
  contexts/             Shared auth context and route access UI
  components/ui/        shadcn-style Button primitive
  lib/ types/ public/   Helpers, TypeScript contracts and brand imagery
server/
  controllers/          Auth, assets, members, photographs and deletion approvals
  routes/               All concrete API route registrations
  middleware/           JWT authentication, role checks and signed CSRF validation
  models/               Parameterized PostgreSQL queries
  configs/              Environment validation and database pool
  types/                Express request/user TypeScript declarations
  src/                  Express application and process entry point
  utils/                Node crypto, cookies, validation and editable Excel export
  sql/                  Complete initial PostgreSQL schema
  scripts/              Schema install, first admin and blob cleanup
  tests/                Security and API integration verification
```

## Features

- Real asset register, condition/priority/maintenance ratings, maintenance dates, advertiser details, comments and GPS capture.
- New assets immediately receive downloadable/printable QR labels. QR URLs use the current frontend origin and `/qr?asset=ASSET-ID`; changing domain requires new labels.
- Public QR cards show only the large bold asset number, owner and advertiser. Dashboard, reports, contact details and photographs require login.
- Camera capture and multiple photo uploads. Logged-in assessors enter their separate upload password before uploading. Grants expire in 30 minutes and are bound to the user, session and asset. Resetting a member’s upload password revokes old grants.
- Assessor deletion requests remain active until an admin approves. Approval is transactional; removed assets are soft-deleted and their existing QR labels become unavailable. Administrative history is retained.
- White-background summary reports, branded cover, 3D-style portfolio charts, individual report selector and photographs. Use the report’s print controls to save PDF.
- Admin-only editable Excel register with dashboard, formulas and native charts. Photograph links require an active browser session; photographs are not embedded in the workbook.

## Authentication and API

`POST /api/auth/login`, `POST /api/auth/refresh`, `POST /api/auth/logout`, `GET /api/auth/me`, `GET /api/auth/csrf`, `POST /api/auth/password`.

Access tokens are HS256 JWTs in HttpOnly cookies, valid for 15 minutes. They contain `sub` (user ID) and `sid` (session ID), plus issuer/audience/expiry. Middleware validates the JWT and checks the current database user and session on every protected request. Controllers receive `req.user.id`, `req.userId` and `req.user.sessionId`; a client-supplied user ID is never trusted. Refresh tokens are opaque Node crypto random tokens; only SHA-256 hashes are stored, and successful refresh rotates the token. Sessions expire after seven days. Logout, deactivation and login password reset revoke sessions. Passwords use salted Node crypto scrypt and timing-safe comparison.

Unsafe requests require the exact configured browser Origin and a signed double-submit CSRF cookie/header. Axios acquires that token and sends credentials automatically. Secrets and tokens are never stored in localStorage. Administrator-created accounts are the only registration mechanism. There is no public sign-up endpoint or default password.

Protected endpoints: `/api/assets` (GET/POST/PATCH), `/api/assets/export` (GET/admin), `/api/members` (GET/POST/DELETE/admin), `/api/upload-password` (POST/admin), `/api/upload-unlock` (GET/POST), `/api/photos` (POST), `/api/photos/:id` (GET/DELETE), `/api/deletion-requests` (GET/POST/PATCH, PATCH/admin). Public endpoint: `GET /api/public/assets/:id`.

## Production deployment

Run `npm run typecheck`, `npm test` and `npm run build`. Start Express with `npm run start --workspace server` and Next with `npm run start --workspace client`. Provide production environment values, set `NODE_ENV=production`, configure the public HTTPS `CLIENT_ORIGIN` and set the private `API_PROXY_TARGET` to your Express service before building Next. Cookies are Secure in production. Keep `/api` on the same browser origin through the supplied Next rewrite; host-only cookies then work for both API calls and image requests. No frontend secret is required.

Run Express on a Node host with support for streaming responses and 10 MB multipart uploads. The supplied Next configuration sets a 12 MB proxy body limit for multipart overhead. Configure your external reverse-proxy request-body limit and timeouts accordingly; platforms with small serverless body limits cannot use this upload route unchanged. Express buffers one input photo up to 10 MB, verifies/decodes it, limits pixel count, strips metadata and converts to JPEG before private storage. Restrict direct API network access where possible, set `TRUST_PROXY_HOPS` to match your actual proxy chain and use one API instance unless you replace the in-memory global IP limiter with a shared store. Credential/upload throttles already use PostgreSQL.

Schedule `npm run blob:cleanup --workspace server` regularly. Deleted photos are queued for remote deletion; failed jobs remain for retry. Approved asset deletions retain photographs with archived records and deny their retrieval. Choose an archival retention policy before scheduling any permanent purge. Monitor failed cleanup jobs, database size, API errors, blob usage and backups. Enable Neon backups and manage secret rotation in your host. This delivery does not include email invitations, forgotten-password email delivery or MFA; admins can reset login passwords in Team Administration.

Private Blob API reference: https://vercel.com/docs/vercel-blob/private-storage
Neon connection setup: https://neon.com/docs/connect/connect-from-any-app
Next proxy rewrites: https://nextjs.org/docs/app/api-reference/config/next-config-js/rewrites

## Verification

TypeScript checks, frontend/backend builds and included tests can run without production credentials. API integration tests run against the PostgreSQL engine through PGlite (a test-only dependency), not a SQL mock. You can optionally set `TEST_DATABASE_URL` to a disposable PostgreSQL database whose name ends in `_1c_test`. Tests never use the production `DATABASE_URL`; the test database must be empty and is expendable. External Neon and Vercel Blob connectivity must be verified with your filled configuration before launch.
