# RECONCILE

> **Data Reconciliation & Exception Management Platform**

Reconcile is a production-quality full-stack web application designed for financial operations and data teams to ingest, normalize, and match records between disparate systems (e.g. Stripe Payment Gateway vs Internal ERP Ledger), detect discrepancies, collaborate on open exceptions, and maintain auditability.

---

## Technical Stack

- **Frontend**: Next.js 14 (App Router), React, TypeScript, Tailwind CSS, TanStack Query, Recharts, Lucide Icons
- **Backend**: Node.js, TypeScript, Express.js, Prisma ORM, JWT, bcrypt, Redis rate limiting
- **Database**: PostgreSQL (multi-tenant organization isolation, foreign keys, compound indexes)
- **Background Processing**: Redis & BullMQ queue
- **Testing**: Vitest unit/integration tests, Supertest API tests, Playwright E2E, k6 load script
- **Deployment**: Docker & Docker Compose

---

## Primary User Flow

```text
Create Reconciliation ──► Upload Source A ──► Upload Source B ──► Validate Data
         │
         ▼
Run Reconciliation ──► Match Records ──► Identify Exceptions ──► Investigate ──► Resolve ──► View Analytics
```

---

## Setup & Running Locally

### Prerequisites

- Node.js >= 20
- Docker & Docker Compose
- PostgreSQL & Redis (or run via Docker)

### Option 1: Run Full Stack via Docker Compose

```bash
# 1. Clone repository & copy environment configuration
cp .env.example .env

# 2. Build and launch all services (Postgres, Redis, Express API, BullMQ Worker, Next.js UI)
docker compose up -d --build
```

Access the application at:
- **Frontend**: `http://localhost:3000`
- **Backend API**: `http://localhost:5000/api/v1`

---

### Option 2: Local Development Setup

```bash
# 1. Install dependencies across packages
npm install
cd database && npm install
cd ../backend && npm install
cd ../worker && npm install
cd ../frontend && npm install
cd ../tests && npm install
cd ..

# 2. Start PostgreSQL and Redis via Docker
docker run -d --name reconcile_pg -p 5432:5432 -e POSTGRES_PASSWORD=postgres postgres:16-alpine
docker run -d --name reconcile_redis -p 6379:6379 redis:7-alpine

# 3. Generate Prisma client & push schema to database
npm run db:generate
npm run db:push

# 4. Seed database with deterministic sample datasets and test users
npm run db:seed

# 5. Start Backend API, Worker, and Next.js Frontend concurrently
# Terminal 1: Express Backend API
npm run dev:backend

# Terminal 2: BullMQ Background Worker Process
npm run dev:worker

# Terminal 3: Next.js Web App
npm run dev:frontend
```

---

## Default Seed Credentials

- **Owner**: `owner@acme.com` / `password123`
- **Member**: `member@acme.com` / `password123`
- **Viewer**: `viewer@acme.com` / `password123`
- **Globex Tenant (Isolation Test)**: `owner@globex.com` / `password123`

---

## Testing Suite

### Unit & Integration Tests (Vitest & Supertest)

```bash
cd tests
npm run test
```

Tests verify:
- Deterministic matching engine (exact match, amount mismatch, date tolerance, missing keys)
- Normalization & minor units monetary integer calculation
- Multi-tenancy isolation (`Organization A cannot access Organization B records`)
- Auth token guards & error formatting

### End-to-End Tests (Playwright)

```bash
cd tests
npx playwright test
```

### Load Testing (k6)

```bash
cd tests
k6 run load/k6-reconcile.js
```

---

## API Reference Overview

- `POST /api/v1/auth/register` - Register organization & owner user
- `POST /api/v1/auth/login` - Authenticate and acquire JWT
- `GET /api/v1/data-sources` - List data source connectors (CSV, JSON, API)
- `POST /api/v1/imports` - Upload file or trigger ingestion (SHA-256 deduplication)
- `GET /api/v1/imports/:id` - Fetch import status & row validation metrics
- `POST /api/v1/reconciliations` - Queue background reconciliation job
- `GET /api/v1/reconciliations/:id/results` - Paginated result explorer with diff fields
- `GET /api/v1/exceptions` - Exception workbench with status/severity filters
- `PATCH /api/v1/exceptions/:id/status` - Transition status and record resolution
- `POST /api/v1/exceptions/:id/comments` - Append note to exception timeline
- `GET /api/v1/analytics/dashboard` - Real-time metrics overview
