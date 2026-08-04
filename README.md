# Sprout CRM

Multi-tenant service-business CRM MVP — a full-stack application for managing customers, jobs, invoicing, and PDF generation.

## Platform Engineering Roadmap

Track the future of the projects platform enginerring priorities on the [GitHub Projects kanban board](https://github.com/users/jarettmartin/projects/9).

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

Current release: **API `v0.1.0`** · **Web `v0.1.0`** (tags `api-v0.1.0`, `web-v0.1.0`).

## Architecture

- **Backend**: NestJS + TypeORM + PostgreSQL (API container)
- **Frontend**: Ionic React SPA (static files on S3)
- **Auth**: AWS Cognito (server-side only)
- **PDF**: Handlebars templates + Playwright Chromium
- **Infrastructure**: AWS (ECS Fargate, RDS, S3, ALB)

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

The app is deployed on AWS, accessible via custom domain through CloudFront + Cloudflare:

### Live URLs

| Service          | URL                                     |
| ---------------- | --------------------------------------- |
| **Frontend**     | **https://sprout-crm.com**              |
| **API**          | **https://api.sprout-crm.com**          |
| **Swagger Docs** | **https://api.sprout-crm.com/api/docs** |

### Infrastructure

- **API**: ECS Fargate behind an ALB, fronted by CloudFront
- **Frontend**: Static files on S3, fronted by CloudFront
- **CDN/DNS**: CloudFront + Cloudflare (proxied)
- **Database**: RDS PostgreSQL 15
- **Auth**: AWS Cognito User Pool
- **SSL**: AWS Certificate Manager (us-east-1)

### Deploy API

```bash
cd api-trade-crm
docker build -t sprout-crm-api .
docker tag sprout-crm-api:latest 052120999904.dkr.ecr.us-east-2.amazonaws.com/sprout-crm-api:latest
docker push 052120999904.dkr.ecr.us-east-2.amazonaws.com/sprout-crm-api:latest
aws ecs update-service --cluster sprout-crm-cluster --service sprout-crm-api-service --force-new-deployment
```

### Deploy Frontend

```bash
cd web-trade-crm
VITE_API_BASE=https://api.sprout-crm.com npm run build
aws s3 sync dist/ s3://sprout-crm-web/ --delete
aws cloudfront create-invalidation --distribution-id E3BYN5AYDQO0IE --paths "/*"
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
| `AWS_ACCESS_KEY_ID`     | IAM access key for Cognito admin   |
| `AWS_SECRET_ACCESS_KEY` | IAM secret key for Cognito admin   |

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
