# Sprout CRM

Multi-tenant service-business CRM MVP — a full-stack application for managing customers, jobs, invoicing, and PDF generation.

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
├── docs/
│   └── AI_CONTEXT.md       # Detailed project context
└── docker-compose.yml      # Local PostgreSQL
```

## Quick Start

### Prerequisites

- Node.js 20+
- Docker (for local PostgreSQL)
- PostgreSQL 15 (via Docker or local install)

### 1. Start the database

```bash
docker compose up -d
```

### 2. Backend

```bash
cd api-trade-crm
cp .env.sample .env          # Edit as needed
npm install
npm run migration:run        # Create tables
npm run start:dev            # http://localhost:3000
```

### 3. Frontend

```bash
cd web-trade-crm
npm install
npm run dev                  # http://localhost:8100
```

## Deployment

The app is deployed on AWS, accessible via custom domain through CloudFront + Cloudflare:

### Live URLs

| Service          | URL                                 |
| ---------------- | ----------------------------------- |
| **Frontend**     | **https://sprout-crm.com**          |
| **API**          | **https://api.sprout-crm.com**      |
| **Swagger Docs** | https://api.sprout-crm.com/api/docs |

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
