# Ticket Reservation API (Bootcamp Assignment)

Concert ticket reservation bootcamp backend assignment built with Node.js + TypeScript + Express + TypeORM (PostgreSQL).

## Features

- List concerts and stock: `GET /concerts`
- Ticket inventory management: `GET /tickets`, `POST /tickets`
- Reserve tickets (temporary hold): `POST /reserve` (rate-limited)
- View the authenticated user's reservation history: `GET /reservations/me`
- Purchase
  - reservation purchase: `POST /purchase`
  - direct purchase (optimistic): `POST /purchase/optimistic`
  - direct purchase (pessimistic / PostgreSQL row lock): `POST /purchase/pessimistic`
- Cleanup expired reservations
  - manual: `POST /cleanup`
  - background: runs every minute in-process
- Google Sign-In JWT auth
  - `POST /auth/google`
  - `GET /auth/me`
  - `POST /auth/logout`
- FCM notification token management
  - `POST /notifications/register-token`
  - `DELETE /notifications/register-token`
- Role-based access
  - `POST /concerts` and `POST /tickets` require an authenticated admin user
  - `POST /reserve`, `POST /purchase`, `POST /purchase/optimistic`, `POST /purchase/pessimistic` require any authenticated user
- Swagger UI: `GET /api-docs`

## Tech Stack

- Node.js (>= 20)
- TypeScript (strict)
- Express
- TypeORM
- PostgreSQL (`pg`)
- Zod (validation)
- Pino (JSON logs + AsyncLocalStorage correlationId)
- Redis (rate limiting store via `rate-limit-redis`, fallback supported)
- Swagger UI (`swagger-ui-express`) + Zod OpenAPI (`@asteasolutions/zod-to-openapi`)

## Project Structure

```
src/
  entities/        # TypeORM entities (Concert, Ticket, Reservation)
  migrations/      # DB migrations (synchronize=false)
  routes/          # Express routers (thin controllers)
  services/        # Business logic
  validations/     # Zod schemas (.strict())
  middleware/      # correlation-id, logger, validate, error-handler, rate-limit
  dtos/            # Response DTO mappers
  lib/             # logger, request-context, errors, redis, openapi, transaction
  jobs/            # background jobs (cleanup cron)
  app.ts           # Express wiring (middleware order)
  server.ts        # Bootstrap + graceful shutdown
  seed.ts          # Sample data seeder
```

## Overview (What I Learned)

- Indexing strategy for hot paths (concertId + reservation status/expiry)
- Transactions and atomic updates to prevent overselling
- Concurrency strategies (optimistic updates vs PostgreSQL row locks)
- API validation with consistent error envelopes

## API Routes

| Method | Path | Description |
| --- | --- | --- |
| GET | `/` | Health check |
| GET | `/concerts` | List concerts; supports `search`, `venue`, and `categoryId` filters |
| GET | `/tickets` | List ticket inventory |
| POST | `/tickets` | Create ticket inventory |
| POST | `/reserve` | Reserve tickets (hold stock) |
| GET | `/reservations/me` | List the authenticated user's ticket history |
| POST | `/purchase` | Purchase a reservation by `reservationId` |
| POST | `/purchase/optimistic` | Direct purchase (optimistic) |
| POST | `/purchase/pessimistic` | Direct purchase (pessimistic) |
| POST | `/cleanup` | Cleanup expired reservations |
| POST | `/auth/google` | Verify Google ID token and set JWT auth cookie |
| GET | `/auth/me` | Get authenticated user |
| POST | `/auth/logout` | Clear JWT auth cookie |
| POST | `/notifications/register-token` | Register/refresh current user's FCM token |
| DELETE | `/notifications/register-token` | Disable current user's FCM token |
| GET | `/users` | List users (admin) |
| POST | `/users` | Create a user with the configured default password (admin) |
| PATCH | `/users/:id` | Update a user (admin) |
| GET | `/api-docs` | Swagger UI |

Admin-created users receive a hashed default password. Override the local
`ChangeMe123!` default with `ADMIN_CREATED_USER_DEFAULT_PASSWORD` in production.

## Setup (Local)

```bash
npm install
cp .env.development .env

# Set DB_HOST, DB_PORT, DB_NAME, DB_USER, DB_PASSWORD and auth variables.

npm run migration:run
npm run seed
npm run dev

curl http://localhost:3000/
```

## Setup (Docker)

```bash
docker compose up --build
curl http://localhost:4000/
```

## Setup (EC2 Production)

```bash
cp .env.production.example .env.production
docker compose --env-file .env.production -f docker-compose.prod.yml up -d --build
```

Full guide: `docs/deploy-ec2.md`

## Submission

- Stress Test Report: `docs/stress-test-report.md`
- Swagger UI screenshot 
  - `http://localhost:4000/api-docs`
  - ![Swagger UI Screenshot](docs/swagger-ui.png)
- Logs Test Report: `docs/stress-test-report.md`
