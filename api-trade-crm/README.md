# Sprout CRM — API

NestJS backend for the Sprout CRM multi-tenant trade business application.

## Tech Stack

- **Framework**: NestJS 11
- **ORM**: TypeORM with PostgreSQL
- **Auth**: AWS Cognito (server-side only, no client-side Cognito SDK)
- **PDF**: Handlebars templates + Playwright Chromium
- **Validation**: class-validator + class-transformer

## Versioning

Current version: **`v0.1.0`** (git tag `api-v0.1.0`).

- Semantic Versioning (`MAJOR.MINOR.PATCH`) — mirrored in `package.json` / `package-lock.json`.
- The API and web frontend are versioned independently (separate deployables with separate release lifecycles).
- Release tags use the `api-v` prefix (e.g. `api-v0.1.0`, `api-v0.1.1`).
- See [docs/GITFLOW.md](../docs/GITFLOW.md) for the full branching & release workflow.

## Local Development

### Prerequisites

- Node.js 20+
- PostgreSQL 15 (or `docker compose up -d` from the project root)

### Setup

```bash
cp .env.example .env
npm install
npm run db:reset
npm run start:dev
```

The API will be available at `http://localhost:3000` with Swagger docs at `/api/docs`.

> **Note:** `npm run db:reset` drops the database, recreates it, runs all migrations, and seeds an invite code (`INV` with 1000 max uses) for registration. On a fresh install this is all you need. If you only need to seed data without resetting, use `npm run db:seed` instead.

### Environment Variables

See `.env.example` for all required variables. Key ones:

| Variable      | Description                                  |
| ------------- | -------------------------------------------- |
| `DB_HOST`     | PostgreSQL host                              |
| `DB_PORT`     | PostgreSQL port                              |
| `DB_USERNAME` | PostgreSQL username                          |
| `DB_PASSWORD` | PostgreSQL password                          |
| `DB_DATABASE` | Database name                                |
| `DB_SSL`      | Enable SSL (`false` locally; `true` only for an external TLS DB) |
| `PORT`        | App listen port (default 3000)               |
| `CORS_ORIGIN` | Comma-separated allowed CORS origins         |
| `COGNITO_*`   | AWS Cognito configuration                    |
| `AWS_*`       | IAM credentials for Cognito admin operations |

## Available Scripts

| Command                      | Description                            |
| ---------------------------- | -------------------------------------- |
| `npm run start:dev`          | Start in watch mode                    |
| `npm run build`              | Compile TypeScript                     |
| `npm run start:prod`         | Run compiled app                       |
| `npm test`                   | Run unit tests                         |
| `npm run test:e2e`           | Run E2E tests                          |
| `npm run migration:run`      | Run pending migrations                 |
| `npm run migration:generate` | Generate a new migration               |
| `npm run migration:revert`   | Revert last migration                  |
| `npm run db:seed`            | Seed invite code `INV` (1000 max uses) |
| `npm run db:reset`           | Drop DB → recreate → migrate → seed    |

## Project Structure

```
src/
├── main.ts                    # Bootstrap, CORS, Swagger
├── app.module.ts              # Root module
├── auth/                      # Cognito auth, login, register, refresh, password reset
├── common/                    # Guards, decorators, DTOs, entities, enums
├── config/                    # TypeORM config + data-source
├── customers/                 # Customer CRUD with addresses
├── invoices/                  # Invoice creation + PDF generation
├── jobs/                      # Job CRUD with notes + line items
├── migrations/                # TypeORM migration files
├── tenants/                   # Tenant (business) management
└── users/                     # User entity
```

## API Endpoints

| Method | Path                            | Description                    |
| ------ | ------------------------------- | ------------------------------ |
| POST   | `/auth/register`                | Register with invite code      |
| POST   | `/auth/login`                   | Login with email/password      |
| POST   | `/auth/refresh`                 | Refresh ID token               |
| POST   | `/auth/forgot-password`         | Send password reset code       |
| POST   | `/auth/confirm-forgot-password` | Confirm password reset         |
| GET    | `/auth/verify-status/:userId`   | Check email verification       |
| POST   | `/tenants`                      | Create business profile        |
| PATCH  | `/tenants/:id`                  | Update business profile        |
| POST   | `/customers`                    | Create customer                |
| GET    | `/customers/search`             | Search customers               |
| GET    | `/customers/:id`                | Get customer details           |
| PATCH  | `/customers/:id`                | Update customer                |
| POST   | `/jobs`                         | Create job                     |
| GET    | `/jobs`                         | List jobs (paginated)          |
| GET    | `/jobs/:id`                     | Get job with relations         |
| PATCH  | `/jobs/:id`                     | Update job (notes, line items) |
| POST   | `/jobs/:jobId/invoices`         | Create invoice                 |
| PATCH  | `/invoices/:invoiceId`          | Update invoice status          |
| GET    | `/invoices/:invoiceId/pdf`      | Download invoice PDF           |

## Deployment

The API runs in a Docker container on a single AWS Lightsail instance, accessible at **https://api.sprout-crm.com** (Caddy terminates TLS with Let's Encrypt).

### Live Endpoints

| Endpoint         | URL                                 |
| ---------------- | ----------------------------------- |
| **API**          | https://api.sprout-crm.com          |
| **Swagger Docs** | https://api.sprout-crm.com/api/docs |

### Deploy

From the repo root:

```bash
cp .env.production.example .env.production   # fill in secrets
SSH_KEY=~/.ssh/id_ed25519 ./scripts/deploy.sh
```

This rsyncs the repo to the Lightsail instance and runs
`docker compose -f docker-compose.prod.yml up -d --build`, which builds the API
image and runs migrations + seed before starting the server. See
[docker-compose.prod.yml](../docker-compose.prod.yml) and
[infra/lightsail/README.md](../infra/lightsail/README.md).

### Run migrations manually

Migrations run automatically on container start. To run them by hand, SSH in
and use:

```bash
ssh ubuntu@<public_ip>
cd ~/trade-crm
docker compose -f docker-compose.prod.yml exec api \
  node node_modules/typeorm/cli.js migration:run -d dist/config/data-source.js
```

### Backups

The production database is backed up daily to S3 with 7-day retention. See
[`../scripts/backup-db.sh`](../scripts/backup-db.sh) and the root
[README](../README.md#backups).

## Architecture Notes

- All tenant-scoped entities extend `TenantScopedEntity` which includes `tenantId`
- Every query filters by `tenantId` — never trust tenantId from client input
- DTOs use `whitelist: true` + `forbidNonWhitelisted: true` to prevent field injection
- Cognito communication is entirely server-side — the client never talks to Cognito directly
- Token refresh is transparent: guards detect expired JWTs, refresh via Cognito, and return new tokens via `x-new-id-token` response header
- Invoice numbers start at `88880001` and increment globally per tenant
