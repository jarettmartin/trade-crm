# Sprout CRM — API

NestJS backend for the Sprout CRM multi-tenant trade business application.

## Tech Stack

- **Framework**: NestJS 11
- **ORM**: TypeORM with PostgreSQL
- **Auth**: AWS Cognito (server-side only, no client-side Cognito SDK)
- **PDF**: Handlebars templates + Playwright Chromium
- **Validation**: class-validator + class-transformer

## Local Development

### Prerequisites

- Node.js 20+
- PostgreSQL 15 (or `docker compose up -d` from the project root)

### Setup

```bash
cp .env.sample .env
npm install
npm run migration:run
npm run start:dev
```

The API will be available at `http://localhost:3000` with Swagger docs at `/api/docs`.

### Environment Variables

See `.env.sample` for all required variables. Key ones:

| Variable      | Description                                  |
| ------------- | -------------------------------------------- |
| `DB_HOST`     | PostgreSQL host                              |
| `DB_PORT`     | PostgreSQL port                              |
| `DB_USERNAME` | PostgreSQL username                          |
| `DB_PASSWORD` | PostgreSQL password                          |
| `DB_DATABASE` | Database name                                |
| `DB_SSL`      | Enable SSL (set to `true` for RDS)           |
| `PORT`        | App listen port (default 3000)               |
| `CORS_ORIGIN` | Comma-separated allowed CORS origins         |
| `COGNITO_*`   | AWS Cognito configuration                    |
| `AWS_*`       | IAM credentials for Cognito admin operations |

## Available Scripts

| Command                      | Description              |
| ---------------------------- | ------------------------ |
| `npm run start:dev`          | Start in watch mode      |
| `npm run build`              | Compile TypeScript       |
| `npm run start:prod`         | Run compiled app         |
| `npm test`                   | Run unit tests           |
| `npm run test:e2e`           | Run E2E tests            |
| `npm run migration:run`      | Run pending migrations   |
| `npm run migration:generate` | Generate a new migration |
| `npm run migration:revert`   | Revert last migration    |

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

### Docker Build

```bash
docker build -t sprout-crm-api .
docker tag sprout-crm-api:latest <ecr-repo-uri>:latest
docker push <ecr-repo-uri>:latest
```

### Run Migrations on RDS

```bash
aws ecs run-task --cluster sprout-crm-cluster --task-definition sprout-crm-api-task:2 \
  --launch-type FARGATE \
  --network-configuration "awsvpcConfiguration={subnets=[...],securityGroups=[...],assignPublicIp=ENABLED}" \
  --override '{"containerOverrides":[{"name":"sprout-crm-api","command":["node","node_modules/typeorm/cli.js","migration:run","-d","dist/config/data-source.js"]}]}'
```

## Architecture Notes

- All tenant-scoped entities extend `TenantScopedEntity` which includes `tenantId`
- Every query filters by `tenantId` — never trust tenantId from client input
- DTOs use `whitelist: true` + `forbidNonWhitelisted: true` to prevent field injection
- Cognito communication is entirely server-side — the client never talks to Cognito directly
- Token refresh is transparent: guards detect expired JWTs, refresh via Cognito, and return new tokens via `x-new-id-token` response header
- Invoice numbers start at `88880001` and increment globally per tenant
