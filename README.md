# Ticket Reservation API (Bootcamp Assignment)

Concert ticket reservation bootcamp backend assignment built with Node.js + TypeScript + Express + TypeORM (SQLite).

## Features

- List concerts: `GET /concerts`
- Reserve tickets (hold stock temporarily): `POST /reserve`
- Purchase a reservation: `POST /purchase`
- Cleanup expired reservations: `POST /cleanup`

## Tech Stack

- Node.js (>= 20)
- TypeScript (strict)
- Express
- TypeORM
- SQLite
- Zod validation

## Project Structure

```
src/
  entities/        # TypeORM entities
  migrations/      # DB migrations (synchronize=false)
  routes/          # Express routes (no business logic)
  services/        # Business logic
  validations/     # Zod schemas
  app.ts           # Express app wiring
  server.ts        # HTTP bootstrap
  seed.ts          # Sample data seeder
  errors.ts        # HTTP response helpers
```

## AI Assisted

This project was built with AI assistance using Cursor. Architectural decisions and final implementation choices were made by the author (user).

## Overview (What I Learned)

- Indexing Strategy: SQLite/TypeORM indexing concepts (e.g. `concertId` index + status/time-based index for fast lookup of pending/expiring reservations).
- ACID & Transactions: reservation flow မှာ stock update + reservation create ကို atomic ဖြစ်အောင် transaction နဲ့ handle လုပ်ခြင်း။
- Data Consistency: negative stock / double-selling မဖြစ်အောင် validation + locking/transaction patterns ကိုနားလည်ခြင်း။
- Migrations Only (No synchronize): schema change ကို migration နဲ့သာ manage လုပ်ပြီး reproducible database state ထိန်းသိမ်းခြင်း။
- API Validation: Zod နဲ့ request payload တွေ validate လုပ်ပြီး predictable error response structure ထိန်းသိမ်းခြင်း။


## Setup (Local)

```bash
npm install

# create .env (use template if available)
cp .env.development .env 2>/dev/null || echo "PORT=3000" > .env

npm run migration:run
npm run seed
npm run dev

# health check
curl http://localhost:3000/
```

## Setup (Docker)

Uses the `dev` target by default in `docker-compose.yml`.

```bash
docker compose up --build
```

## Endpoints

| Method | Path | Description | Request Body (JSON) | Success |
| --- | --- | --- | --- | --- |
| GET | `/` | Health check | - | 200 |
| GET | `/concerts` | List concerts | - | 200 |
| POST | `/reserve` | Create reservation (hold stock) | `{ "concertId": "uuid", "quantity": 1, "holdSeconds": 60? }` | 201 |
| POST | `/purchase` | Purchase a reservation | `{ "reservationId": "uuid" }` | 200 |
| POST | `/cleanup` | Cleanup expired reservations | - | 200 |