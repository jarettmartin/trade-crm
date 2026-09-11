# Sprout CRM

Multi-tenant service-business CRM MVP — a full-stack application for managing customers, jobs, invoicing, PDF generation, and emailing invoices to customers via AWS SES.

## Roadmap

Track the future of the project's priorities on the [GitHub Projects kanban board](https://github.com/users/jarettmartin/projects/9).

## Branching & Versioning

This repository follows the **GitFlow** branching model. See [docs/GITFLOW.md](docs/GITFLOW.md) for the full workflow.

| Branch      | Purpose                        | Base      | Merges Into          |
| ----------- | ------------------------------ | --------- | -------------------- |
| `main`      | Production-ready code          | —         | —                    |
| `develop`   | Integration branch             | `main`    | `main` (via release) |
| `feature/*` | New features / non-urgent work | `develop` | `develop`            |
| `release/*` | Preparing a production release | `develop` | `main` + `develop`   |
| `hotfix/*`  | Urgent production fixes        | `main`    | `main` + `develop`   |

The **API** and **web frontend** are versioned independently (separate deployables, separate release lifecycles):

| Package      | Location         | Version ref    | Tag prefix |
| ------------ | ---------------- | -------------- | ---------- |
| API (NestJS) | `api-trade-crm/` | `package.json` | `api-v`    |
| Web (Ionic)  | `web-trade-crm/` | `package.json` | `web-v`    |

Current release: **API `v0.3.0`** · **Web `v0.3.0`** (tags `api-v0.3.0`, `web-v0.3.0`).

## Architecture

- **Backend**: NestJS + TypeORM + PostgreSQL (API container)
- **Frontend**: Ionic React SPA (static files on S3)
- **Auth**: AWS Cognito (server-side only)
- **PDF**: Handlebars templates + Playwright Chromium
- **Email**: AWS SES (Handlebars email templates + PDF attachments)
- **Infrastructure**: AWS Lightsail (API + DB) + S3 + CloudFront (frontend)

## Project Structure

```
trade-crm/
├── api-trade-crm/          # NestJS backend
│   ├── src/                # Source code
│   ├── Dockerfile          # Container build
│   └── package.json
├── web-trade-crm/          # Ionic React frontend
│   ├── src/                # Source code
│   ├── Dockerfile          # Container build (nginx)
│   ├── nginx.conf          # SPA routing config
│   └── package.json
├── ai/
│   ├── agents/
│   │   └── TASK.agent.md   # AI task agent instructions
│   └── CONTEXT.md          # AI project context (architecture, standards)
├── docs/
│   ├── GITFLOW.md          # Branching & release workflow
│   └── CONTRIBUTING.md     # Commit standard & contribution guide
├── .github/
│   ├── PULL_REQUEST_TEMPLATE.md  # PR template
│   └── CODEOWNERS                # Code ownership
└── docker-compose.yml      # Local PostgreSQL
```

## Quick Start

### Prerequisites

- Docker (with the Compose plugin)
- Node.js 20+ (only needed for the manual / non-Docker workflow below)

### Option A — One-command Docker startup (recommended)

Bring up the entire stack (PostgreSQL + API + web) with a single command:

```bash
docker compose up
```

This starts everything with hot reload enabled:

- **API** → http://localhost:3000 (Swagger docs at `/api/docs`)
- **Web** → http://localhost:8100
- **PostgreSQL** → localhost:5432

Migrations run automatically and seed data is generated on startup, so no manual
setup is required. The API and web containers watch your source files and
reload on change.

> **Hot reload** applies to `src/` files only. Changes to config or static files
> (e.g. `vite.config.ts`, `nest-cli.json`, `package.json`, Dockerfiles, or
> `docker-compose.yml`) require a restart: stop with `docker compose down`, then
> run `docker compose up` again.

Stop the stack with `Ctrl+C`, or use `docker compose down` to remove the
containers. Common commands are available as npm scripts (see
[package.json](package.json)): `npm run dev`, `npm run down`, `npm run logs`,
`npm run reset`, etc.

> If `docker compose up` fails with `address already in use` (a stale Vite
> server or leftover container is holding a port), run `npm run kill-ports`
> first. It stops this project's containers and terminates any remaining host
> processes on the app ports (5432, 3000, 8100). Database data is preserved —
> it lives in the named `postgres_data` volume.

### Option B — Manual setup (no Docker)

Run the API and web directly on your machine.

```bash
# 1. Database (Docker or local PostgreSQL 15)
docker compose up -d postgres

# 2. Backend
cd api-trade-crm
cp .env.example .env         # Edit as needed
npm install
npm run migration:run        # Create tables
npm run db:seed              # Seed data
npm run start:dev            # http://localhost:3000

# 3. Frontend
cd web-trade-crm
cp .env.example .env         # Edit as needed
npm install
npm run dev                  # http://localhost:8100
```

### Pre-commit hooks

The repo uses [Husky](https://typicode.github.io/husky/) +
[lint-staged](https://github.com/lint-staged/lint-staged) to run linting and
formatting on staged files before every commit. Run once from the repo root to
install the hooks:

```bash
npm install
```

This sets up the `pre-commit` hook (via the `prepare` script). If you have
already installed, you can re-run `npm run prepare` to (re)install them.

## Deployment

The app runs on AWS with two pieces: the API + database on a single Lightsail
instance (Docker Compose), and the static frontend on S3 behind CloudFront.

### Live URLs

| Service          | URL                                     |
| ---------------- | --------------------------------------- |
| **Frontend**     | **https://sprout-crm.com**              |
| **API**          | **https://api.sprout-crm.com**          |
| **Swagger Docs** | **https://api.sprout-crm.com/api/docs** |

### Infrastructure

| Service    | Details                                             |
| ---------- | --------------------------------------------------- |
| **Server** | Lightsail instance (`small_3_0`, 2 vCPU/2GB, $12/mo)|
| **DB**     | PostgreSQL 15 (Docker container + volume)           |
| **API**    | NestJS (Docker container)                           |
| **Proxy**  | Caddy (automatic HTTPS for the API)                 |
| **Web**    | S3 bucket + CloudFront (HTTPS, ACM cert)            |
| **Email**  | Amazon SES — `sprout-crm.com` domain identity, invoice emailing |

See [infra/lightsail/README.md](infra/lightsail/README.md) for the Terraform
setup, [docker-compose.prod.yml](docker-compose.prod.yml) for the API stack,
and [scripts/](scripts/) for the deploy helpers.

### One-time infrastructure setup

```bash
cd infra/lightsail
cp terraform.tfvars.example terraform.tfvars   # paste your SSH key + lock ssh_cidr_blocks
terraform init
terraform plan
terraform apply
```

This creates the Lightsail instance (Docker + Compose installed on first boot),
a static IP, the firewall rules, the ACM certificate, and the CloudFront
distribution. Then point DNS in Cloudflare:

- `api.sprout-crm.com` → the `public_ip` output (A record, DNS-only)
- `sprout-crm.com` → the `frontend_domain` output (DNS-only)

### Deploy API

```bash
cp .env.production.example .env.production   # fill in secrets
SSH_KEY=~/.ssh/id_ed25519 ./scripts/deploy.sh
```

`deploy.sh` rsyncs the repo to the instance and runs
`docker compose -f docker-compose.prod.yml up -d --build`, which builds the API
image, runs migrations + seed, and starts the stack.

### Deploy frontend

```bash
./scripts/deploy-frontend.sh
```

Builds the SPA, syncs `dist/` to the `sprout-crm-web` bucket, and invalidates
CloudFront.

### Database management (manual)

```bash
ssh ubuntu@<public_ip>
cd ~/trade-crm
docker compose -f docker-compose.prod.yml exec postgres psql -U postgres -d trade_crm
```

For a local GUI client, forward the port (Postgres is bound to localhost only):

```bash
ssh -L 5432:127.0.0.1:5432 ubuntu@<public_ip>
```

### Backups

The production database is backed up daily to a private, encrypted S3 bucket
with a 7-day retention policy:

- **Schedule**: daily at 1am Eastern via cron on the Lightsail instance
  (`CRON_TZ=America/New_York`).
- **Script**: [`scripts/backup-db.sh`](scripts/backup-db.sh) — `pg_dump` →
  gzip → upload to `s3://sprout-crm-backups/sprout-crm-db-<unix-ms>.sql.gz`,
  then deletes backups older than 7 days.
- **Bucket**: created by [`infra/lightsail/backups.tf`](infra/lightsail/backups.tf)
  (private, SSE-S3 encrypted, `prevent_destroy`).
- `deploy.sh` installs/keeps the cron up to date on every deploy.

To restore the latest backup:

```bash
ssh ubuntu@<public_ip> \
  "cd ~/trade-crm && aws s3 cp s3://sprout-crm-backups/sprout-crm-db-<ms>.sql.gz - | gunzip | \
   docker compose -f docker-compose.prod.yml exec -T postgres psql -U postgres -d trade_crm"
```

## Environment Variables

### Backend (`api-trade-crm/.env`)

| Variable                | Description                        |
| ----------------------- | ---------------------------------- |
| `DB_HOST`               | PostgreSQL host                    |
| `DB_PORT`               | PostgreSQL port                    |
| `DB_USERNAME`           | PostgreSQL username                |
| `DB_PASSWORD`           | PostgreSQL password                |
| `DB_DATABASE`           | PostgreSQL database name           |
| `DB_SSL`                | Enable SSL for database connection |
| `PORT`                  | App listen port                    |
| `CORS_ORIGIN`           | Comma-separated allowed origins    |
| `COGNITO_REGION`        | AWS Cognito region                 |
| `COGNITO_USER_POOL_ID`  | Cognito user pool ID               |
| `COGNITO_CLIENT_ID`     | Cognito app client ID              |
| `COGNITO_CLIENT_SECRET` | Cognito app client secret          |
| `AWS_ACCESS_KEY_ID`     | IAM access key for Cognito admin + SES sends |
| `AWS_SECRET_ACCESS_KEY` | IAM secret key for Cognito admin + SES sends |
| `SES_REGION`            | AWS SES region (invoice emailing)             |
| `SES_FROM_EMAIL`        | From address for invoice emails (must be part of a verified SES identity) |

### Frontend (build-time)

| Variable        | Description          |
| --------------- | -------------------- |
| `VITE_API_BASE` | Backend API base URL |

## Running Tests

### Backend

```bash
cd api-trade-crm
npm test              # Unit tests
npm run test:e2e      # E2E tests
```

### Frontend

```bash
cd web-trade-crm
npm run test.unit     # Unit tests (vitest)
npm run test.e2e      # E2E tests (Cypress)
```

## Contributing

- **Branching**: GitFlow model — see [docs/GITFLOW.md](docs/GITFLOW.md)
- **Commits**: Conventional Commits — see [docs/CONTRIBUTING.md](docs/CONTRIBUTING.md)
- **Pull requests**: Use the [PR template](.github/PULL_REQUEST_TEMPLATE.md); code owners are auto-requested via [CODEOWNERS](.github/CODEOWNERS)
- **Architecture**: See [ai/CONTEXT.md](ai/CONTEXT.md)

## AI Agent

This repository includes an AI engineering agent that guides task completion
end-to-end (task intake, GitFlow branch setup, Conventional Commits, and
verification). Its instructions live in [ai/agents/TASK.agent.md](ai/agents/TASK.agent.md),
with the project context it references in [ai/CONTEXT.md](ai/CONTEXT.md).

### Example prompt

Copy this to start a new task with the agent (the `@` reference points to the
agent file so your AI tool loads it):

```text
@/ai/agents/TASK.agent.md I'm working on a new task:

# All of the following are optional — the agent will ask for any missing
# inputs before starting.
- Task type: feature | hotfix | bugfix | release | chore | docs | refactor
- Task name: <short description>
- Task details: <what "done" looks like / acceptance criteria>
- Branch name: <optional — otherwise the agent generates one>
```
