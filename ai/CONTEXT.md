# Sprout CRM — Project Context

## Overview

Multi-tenant trade business CRM with a NestJS (TypeORM + PostgreSQL) backend and an Ionic React frontend. Uses AWS Cognito for authentication and Playwright + Handlebars for PDF invoice generation.

---

## SDLC Workflow (Agent Process)

When invoked to work as an agent, drive every request through the SDLC steps
below. The mechanical git steps are wrapped in **repeatable npm scripts at the
repo root** — prefer them over hand-typing git commands so every run is
identical. Full agent instructions live in `ai/agents/TASK.agent.md`.

### Runbook scripts (repo root)

| npm script | What it does |
| --- | --- |
| `npm run branch:start -- feature/<name>` | Fetch origin, switch to `develop`, reset it to `origin/develop`, create the feature branch. `--base=main` for hotfixes; refuses a dirty tree without `--force` |
| `npm run release:start` | Sync `develop`, create `release/vX.Y.Z`, bump api/web versions **in code**, and commit `chore(release): bump versions to X.Y.Z` — the commit the release tags will reference |
| `npm run release:tag` | After the release PR merges to `main`, create `api-vX.Y.Z` / `web-vX.Y.Z` at that version-bump commit |
| `npm run demo:seed` | `cd api-trade-crm && npm run db:seed-demo` — seeds the local DB with the web demo fixtures (idempotent), so a **real-account** login has data to test with |
| `npm run demo:pdfs` | Regenerates the pre-built demo invoice PDFs from the demo seed |

### 1. Branch setup

1. Gather the task type, task name, and details first (`ai/agents/TASK.agent.md`).
2. Base branch: `develop` for features/bugfixes/docs/chore/refactor; `main` for hotfixes.
3. Working tree must be clean (commit or stash first — `--force` discards).
4. Create the branch: `npm run branch:start -- feature/<short-description>` (or
   `-- --base=main hotfix/<...>`). The script fetches, resets the base to
   `origin/<base>`, and branches from there — never start from a stale local `develop`.

### 2. Demo mode parity — every change

The web app has a browser-only **demo mode** (`?demo=true` on any app URL)
backed by `web-trade-crm/src/demo/demoService.ts` + the fixtures in
`web-trade-crm/src/demo/api/*.json`. It mirrors the real API end-to-end.
**Any change to API behavior (endpoints, DTOs, entities, enums, ordering,
pagination) or shared UI behavior must be mirrored in demo mode**, otherwise
demo mode silently drifts from reality.

1. Update `demoService.ts` to return the same shapes / behavior.
2. Update the fixtures in `src/demo/api/` (`tenant.json`, `customers.json`, `jobs.json`, `catalogItems.json`).
3. Invoice fixtures changed? Regenerate the pre-built PDFs: `npm run demo:pdfs`.
4. Want real-account logins to see the data too? `npm run demo:seed`.

### 3. Implement + update docs

- Follow this file's architecture and coding standards; keep changes scoped.
- Run the relevant tests/builds (backend or frontend).
- Update docs **only if the change makes them inaccurate** (README, `docs/`,
  this file). Don't churn docs for docs' sake.

### 4. Local sign-off gate (before pushing)

When work is done, hand the user repeatable live-testing instructions and
**wait for their sign-off** before anything is pushed or merged:

1. `npm run dev` → Web http://localhost:8100 · API http://localhost:3000 · Swagger http://localhost:3000/api/docs
2. **Demo account (no login)**: open http://localhost:8100/manage-jobs?demo=true and
   click through the changed flows.
3. **Real account (Cognito)** (if applicable): `npm run demo:seed` first, then
   open http://localhost:8100 and sign in.
4. List the specific flows to verify for this change.

Only proceed to step 5 once the user confirms. If live testing isn't possible in
the environment, say so and ask the user to verify.

> **No-QA setup**: there is no QA environment. Testing happens live on the local
> stack (this step) and on production after deploy — never push or merge unreviewed.

### 5. Commits & push

- Conventional Commits (see `docs/CONTRIBUTING.md`), scoped `api`/`web` where it
  helps, short imperative messages.
- Stage and commit locally. **Never push to the remote yourself.** Leave the
  branch committed and tell the user it's ready:
  `git push -u origin <branch-name>` → PR to `develop` (or `main` for hotfixes).

### 6. Release — after the PR merges

Once the user has merged a **feature/fix** PR into `develop` (i.e. functionality
changed — not just docs/chore), offer/perform the release:

1. `npm run release:start` — syncs `develop`, creates `release/vX.Y.Z`, bumps the
   api + web versions in code (`--api-only` / `--web-only` for a single
   deployable), and commits the bump. **The bump commit is exactly what the
   release tags will point at.**
2. Guide the user: push the release branch → PR `release/vX.Y.Z → main` (and a
   second PR `release/vX.Y.Z → develop` so the version bump is kept).
3. After the merge to `main`: `npm run release:tag`, then the user pushes the
   tags: `git push origin --tags`.
4. If they want this version deployed: `./scripts/deploy.sh` (API) and
   `./scripts/deploy-frontend.sh` (web). If they skip the release, don't create tags.

---

## Development Workflow

This repository follows the **GitFlow** branching model. Full reference: `docs/GITFLOW.md`. Contribution guide: `docs/CONTRIBUTING.md`.

### Branches

| Branch      | Purpose                        | Base      | Merges Into          |
| ----------- | ------------------------------ | --------- | -------------------- |
| `main`      | Production-ready code          | —         | —                    |
| `develop`   | Integration branch             | `main`    | `main` (via release) |
| `feature/*` | New features / non-urgent work | `develop` | `develop`            |
| `release/*` | Preparing a production release | `develop` | `main` + `develop`   |
| `hotfix/*`  | Urgent production fixes        | `main`    | `main` + `develop`   |

### Commits

All commits follow **Conventional Commits** (`feat`, `fix`, `docs`, `style`, `refactor`, `perf`, `test`, `build`, `ci`, `chore`) with an optional scope, e.g. `feat(web): add invoice status dropdown`. Use imperative mood and keep descriptions under 72 characters.

### Pull Requests

- All changes to `main` and `develop` go through PRs (branch protection enforced).
- Use the template at `.github/PULL_REQUEST_TEMPLATE.md`.
- Code owners are auto-requested via `.github/CODEOWNERS` (currently `@jarettmartin`).

### Versioning

- API (`api-trade-crm/`) and web (`web-trade-crm/`) are **versioned independently** (SemVer in each `package.json`).
- Release tags are prefixed per package: `api-v0.1.0`, `web-v0.1.0`.
- Version bumps happen on `release/*` branches — never on feature branches. Use `npm run release:start` (see [SDLC Workflow](#sdlc-workflow-agent-process)).
- Current release: API `v0.3.0` · Web `v0.3.0`.

### Typical Feature Flow

1. Branch from `develop`: `npm run branch:start -- feature/<name>` (fetches, resets `develop` to `origin/develop`, branches).
2. Implement, keeping demo mode in sync (SDLC step 2), and commit with Conventional Commits.
3. Ask the user to test locally (demo + real account) and get their sign-off (SDLC step 4).
4. Push and open a PR against `develop`. Address review, keep tests green, merge.
5. After the merge, offer the release flow (SDLC step 6).

---

## AWS Infrastructure (Production)

The application is deployed on AWS with two pieces: the API + database on a
single Lightsail instance (Docker Compose), and the static frontend on S3
behind CloudFront. (The previous ECS + RDS + ALB + ECR stack has been retired.)

### Live URLs

| Service          | URL                                     |
| ---------------- | --------------------------------------- |
| **Frontend**     | **https://sprout-crm.com**              |
| **API**          | **https://api.sprout-crm.com**          |
| **Swagger Docs** | **https://api.sprout-crm.com/api/docs** |

### Architecture Diagram

```
Browser
  ├── https://sprout-crm.com
  │     └── CloudFront (ACM cert) → S3 Bucket (static frontend files)
  │
  └── https://api.sprout-crm.com
        └── Lightsail instance (small_3_0, 2 vCPU / 2GB)
              └── Caddy (Let's Encrypt TLS) → NestJS API (port 3000)
                    └── PostgreSQL 15 (Docker container + volume)
```

### Services

| Service        | Name                 | Details                                              |
| -------------- | -------------------- | ---------------------------------------------------- |
| **Lightsail**  | `sprout-crm-prod`    | `small_3_0` (2 vCPU, 2GB, 60GB SSD), $12/mo          |
| **Static IP**  | `sprout-crm-prod-ip` | Persistent public IPv4                               |
| **DB**         | `postgres`           | PostgreSQL 15 container + named volume (internal)    |
| **API**        | `api`                | NestJS container (port 3000, internal)               |
| **Proxy**      | `caddy`              | Auto-HTTPS (Let's Encrypt) for `api.sprout-crm.com`  |
| **S3**         | `sprout-crm-web`     | Static website hosting, public read policy           |
| **CloudFront** | `EUOKGR08LL6O`       | Serves the SPA over HTTPS with an ACM cert           |
| **ACM**        | (us-east-1)          | Certificate for `sprout-crm.com`                     |
| **Backups**    | `sprout-crm-backups` | Daily `pg_dump` → S3; private/encrypted, 7-day retention |
| **SES**        | (us-east-2)          | `sprout-crm.com` domain identity — invoice emailing via SES v2 (`SendEmail` with raw MIME + PDF attachment) |

### Firewall (Lightsail public ports)

| Port | Purpose                      | Source          |
| ---- | ---------------------------- | --------------- |
| 22   | SSH                          | Your IP only    |
| 80   | Caddy ACME HTTP-01 challenge | 0.0.0.0/0       |
| 443  | HTTPS (API)                  | 0.0.0.0/0       |

Postgres (`5432`) is **not** exposed publicly — it is only reachable over the
Docker network or via SSH.

### Deployment Commands

#### API (Lightsail)

```bash
cp .env.production.example .env.production   # fill in secrets
SSH_KEY=~/.ssh/id_ed25519 ./scripts/deploy.sh
```

`deploy.sh` rsyncs the repo to the instance and runs
`docker compose -f docker-compose.prod.yml up -d --build`, which builds the API
image, runs migrations + seed, and starts the stack.

#### Frontend (S3 + CloudFront)

```bash
./scripts/deploy-frontend.sh
```

Builds the SPA (reads `VITE_API_BASE` from `web-trade-crm/.env.production`),
syncs `dist/` to the `sprout-crm-web` bucket, and invalidates CloudFront.

#### Database Migrations (manual)

Migrations run automatically on container start. To run manually, SSH in:

```bash
ssh ubuntu@<public_ip>
cd ~/trade-crm
docker compose -f docker-compose.prod.yml exec api \
  node node_modules/typeorm/cli.js migration:run -d dist/config/data-source.js
```

#### Database access (manual)

```bash
ssh ubuntu@<public_ip>
cd ~/trade-crm
docker compose -f docker-compose.prod.yml exec postgres psql -U postgres -d trade_crm
```

For a local GUI client, forward the port (Postgres is bound to localhost only):

```bash
ssh -L 5432:127.0.0.1:5432 ubuntu@<public_ip>
```

#### Database backups (automatic)

Runs daily at 1am Eastern via cron on the instance
(`scripts/backup-db.sh` + `scripts/install-backup-cron.sh`). Backups land in
`s3://sprout-crm-backups/sprout-crm-db-<unix-ms>.sql.gz`; backups older than
7 days are pruned by the same script.

### IAM User

- **Username**: `sprout-crm-api`
- **Managed policies**: `AmazonS3FullAccess`, `CloudFrontFullAccess` (ECR/ECS/RDS-read policies are still attached but now unused)
- **Inline policy**: custom policy granting `lightsail:*`, `rds:Delete*`, `ec2:*` (EIP/SG cleanup), `elasticloadbalancing:*` (cleanup), and `acm:*` actions
- **SES policy** (AWS console, inline): grants `ses:VerifyDomainIdentity`, `ses:VerifyDomainDkim`, `ses:GetIdentityVerificationAttributes`, `ses:GetIdentityDkimAttributes`, `ses:SendEmail`, `ses:SendRawEmail` so terraform can create the identity and the API can send invoice email. See the "Console (one-time)" block in `infra/lightsail/ses.tf` for the exact JSON.
- **Note**: Cannot create IAM roles — those require the AWS console with admin credentials

### Security Notes

- **Never commit AWS config files to the repository.** `.env.production`, `terraform.tfvars`, and `terraform.tfstate*` are gitignored and contain real secrets (database password, Cognito client secret, AWS keys, your IP). The committed `*.example` files contain placeholders only.
- The `.env` (local dev) and `.env.production` files are gitignored — never commit them.
- `terraform.tfvars` holds `ssh_public_key` and `ssh_cidr_blocks` (your IP) and is gitignored via `*.tfvars`.
- Terraform state is stored locally (`infra/lightsail/terraform.tfstate`, gitignored). Back it up, or enable the commented S3 backend in `main.tf` for shared state.
- The ACM certificate for `sprout-crm.com` is validated via a CNAME record in Cloudflare (must be DNS-only, not proxied).
- **SES setup (complete as of the invoice-emailing feature)**: domain identity `sprout-crm.com` verified via Easy DKIM (3 CNAMEs in Cloudflare, DNS-only), SES production access granted, and an SES inline policy attached to `sprout-crm-api` in the console. Terraform manages only the identity + DKIM outputs (`infra/lightsail/ses.tf`); IAM stays console-managed because terraform runs with the restricted `sprout-crm-api` credentials (see the "Console (one-time)" block in `ses.tf`).

---

## Architecture Principles

### Multi-Tenancy

- Every tenant-owned table contains a `tenantId` column (via `TenantScopedEntity` base class)
- All queries filter by `tenantId` — never trust tenantId from client input
- DTOs use `whitelist: true` + `forbidNonWhitelisted: true` so users cannot inject `tenantId` or ownership fields
- Every update verifies ownership: `findOne({ id, tenantId })` before modifying
- Cascade deletes on nested objects (addresses, notes, line items) include `tenantId` in the `where` clause

### Backend (NestJS)

- Modular architecture with feature modules: `auth`, `tenants`, `customers`, `catalog`, `jobs`, `invoices`, `users`
- Common module (`common/`) for shared guards, decorators, DTOs, entities, and enums
- Repository pattern used exclusively — no raw queries
- Constructor injection for all dependencies
- Global `ValidationPipe` with `transform: true` for automatic DTO transformation
- Global `SwaggerModule` at `/api/docs` for API documentation
- `TenantGuard` resolves tenant from Cognito JWT + local DB
- `CognitoAuthGuard` verifies Cognito ID tokens on every authenticated request
- Both guards support **transparent token refresh** — when a JWT is expired, they use the `x-refresh-token` header to get a new token from Cognito and return it via `x-new-id-token` response header
- `CurrentUser` decorator extracts user info from the JWT
- Business logic lives in services, never in controllers
- Transactions via `DataSource.transaction()` where atomicity is required (e.g., customer + address creation)
- Eager loading avoided — explicit `relations` in every `findOne`/`find`
- Pagination on list endpoints via `PaginationDto` (page, limit)
- Soft deletes not implemented — physical deletes used for nested objects
- Invoice numbers start at `88880001` and increment globally per tenant
- Invoice versioning increments per job (each new invoice for a job increments the version)
- **Customer addresses are reconciled in place on update** (`CustomerService.update`, inside a transaction): existing rows are updated positionally, new ones inserted, and only surplus addresses not referenced by a job are deleted. Never reintroduce delete-all+recreate — `jobs.customerAddressId` is an `ON DELETE NO ACTION` FK, so deleting a referenced address returns a 500.

### Invoice Email (AWS SES)

- `EmailService` (`src/email/`) wraps SES v2 `SendEmail` with a raw MIME message (plain-text body + base64 PDF attachment) built by the dependency-free `mime.ts` builder. Credentials come from `AWS_ACCESS_KEY_ID`/`AWS_SECRET_ACCESS_KEY`; region/from from `SES_REGION`/`SES_FROM_EMAIL`. **`SES_FROM_EMAIL` is required** — the From address must always be a verified SES identity owned by the platform (e.g. `no-reply@sprout-crm.com` on the verified `sprout-crm.com` domain). The tenant's `businessEmail` is never used as the From (it's unverified for SES); it's only the reply-to and the contact address printed in the email body. Sending fails fast if `SES_FROM_EMAIL` is missing.
- **Email copy lives in Handlebars templates** (`src/email/templates/*.hbs`, compiled once at startup — same pattern as the PDF template). Format per file: a `subject: <hbs>` line, a `---` separator, then the plain-text body. `EmailService.renderEmailTemplate(name, context)` returns `{ subject, textBody }`; future email types just add a new `.hbs` + call `sendEmail()`.
- `POST /invoices/:invoiceId/email` (TenantGuard) validates the customer has a valid email on file, records a **PENDING** `InvoiceEmailAttempt` (subject rendered from the template and snapshotted), and returns immediately. Delivery is fire-and-forget: `InvoiceEmailService.processAttempt()` generates the PDF (`PdfService`), renders the body via `EmailService`, and sends via SES in the background, then updates the attempt to `SENT` (with SES `messageId` + `sentAt`) or `FAILED` (with `errorMessage`).
- `GET /invoices/:invoiceId/emails` (TenantGuard) returns the attempt history (newest first) for polling.
- A 409 is returned if a PENDING attempt already exists for the invoice (prevents duplicate concurrent sends).
- `JobService.findById` loads `invoices.emailAttempts` so the job-detail payload already includes per-invoice email status.
- Customer email validation already exists: `@IsEmail() @IsOptional()` on customer DTOs and `isValidEmail()` on the frontend.
- **Node runtime note**: AWS SDK v3 will require Node >= 22 starting 2027; the API image currently uses `node:20-alpine`. Non-blocking; bump `api-trade-crm/Dockerfile` in a future change.

### Authentication (AWS Cognito)

- All Cognito API calls are handled server-side by the Node.js backend using `@aws-sdk/client-cognito-identity-provider`
- The client never communicates with Cognito directly — no `SECRET_HASH` computation in the browser
- Every authenticated request sends both `Authorization: Bearer <idToken>` and `x-refresh-token` headers
- Token refresh is transparent: guards detect expired tokens, refresh via Cognito, and return the new token in the response
- Registration uses Cognito `SignUp` API which sends a verification link email
- Login uses Cognito `InitiateAuth` with `USER_PASSWORD_AUTH`
- Password reset uses Cognito `ForgotPassword` + `ConfirmForgotPassword` APIs
- IAM credentials (`AWS_ACCESS_KEY_ID`/`AWS_SECRET_ACCESS_KEY`) are used for admin operations (user lookup, deletion)

### Frontend (Ionic React)

- SPA with `IonReactRouter` + `IonSplitPane` layout (sidemenu + content area)
- `AuthProvider` context wraps the entire app — provides `user`, `login`, `logout`, `updateUser`
- `api.ts` singleton class handles all HTTP requests:
  - In-memory token cache + localStorage fallback
  - Auto-refresh on 401 via backend `POST /auth/refresh`
  - Generic `request<T>()` method for type-safe API calls
- Pages use Ionic lifecycle hooks:
  - `useIonViewWillEnter` for data fetching on page entry (Home job list)
  - `useIonViewWillLeave` / `useIonViewWillEnter` for lifecycle-safe operations (InvoicePreview)
- Navigation patterns:
  - `IonBackButton` with `defaultHref` for detail/edit pages (back navigation)
  - `IonMenuButton` for navigable pages (access to sidemenu)
  - `routerLink` for Ionic-managed navigation (avoids React Router history bugs). Prefer this over `history.push()` for list→detail navigation. Note the Jobs page now uses the paginated `PaginatedTable`, whose rows navigate via the click handler (`history.push`) — safe only because `JobDetailPage` falls back to parsing the path (see the param-routes caveat below)
  - `history.push()`/`history.goBack()` for programmatic navigation
  - **Param routes caveat**: `useParams()` can return an empty object after client-side navigation in this Ionic React Router v5 setup (even with `routerLink`). Param-driven pages (`JobDetailPage`, `InvoicePreviewPage`, `CatalogItemFormPage`) therefore read the id via `routeId || window.location.pathname.split("/").pop()`
- Shared components:
  - `CustomerSearch` — Debounced search with dropdown results + "Create New Customer" button
  - `CustomerTable` — Shared paginated customers table (wraps `PaginatedTable`) used on Manage Customers + Create Job to browse/select customers
  - `CatalogItemSearch` — Catalog picker for the job detail page: tenant catalog is fetched up-front (`api.fetchAllCatalogItems()`, pages the endpoint at limit 100), then filtered **locally** on every keystroke across description/type/unit price. Refetched on `useIonViewWillEnter` so catalog edits/deletes land when a job page is revisited. Includes the "Add Custom Line Item" button that switches to the manual form.
  - `PaginatedTable` — Reusable paginated table; pagination info + prev/next buttons are at the TOP so controls don't jump on mobile when row counts change between pages
  - `Menu` — Sidemenu with nav items (Jobs, Customers, Catalog, Business Settings) + logout
- Paginated tables on the Jobs page (the primary job list) and the Manage Customers / Create Job pages (below the search bar) share `PaginatedTable`; the real API orders by `createdAt DESC` and demo mode mirrors that
- PDF handling:
  - In-memory `pdfCache.ts` (Map<string, Blob>) caches downloaded PDFs for the session
  - `getPdfBlob()` — fetch + cache
  - `downloadPdf()` — trigger browser download
  - Invoice preview via full-page `iframe` at `/invoice-preview/:id`
- Invoice emailing (JobDetailPage invoice cards):
  - Full-width "Send Email" button (above the Download | Preview row); disabled when the customer has no valid email on file (`isValidEmail()`)
  - `api.sendInvoiceEmail()` returns a PENDING attempt which is shown **immediately** on the card; the UI polls `api.fetchInvoiceEmailAttempts()` until `SENT`/`FAILED`, then reloads the job
  - Attempt entries read **"Email sent to <recipient>"** with an optional status tag appended: `· PENDING` (amber, in flight) or `· ERROR` (red, with the error message). SENT has **no tag** — assumed success
  - Demo mode mirrors this in `demoService.ts` (simulated ~2s delivery; emails containing `fail@` or ending `.fail` simulate a failure so the ERROR state is testable)
- Validation:
  - Frontend `validation.ts` helpers: `isValidEmail()`, `isValidPhone()`
  - Forms validate before submit (email format, phone format, required fields)
  - Save buttons disabled until all criteria satisfied
- Toast notifications use dismiss-only buttons for errors (never auto-hide for errors)

---

## Folder Structure

### Backend (`api-trade-crm/src/`)

```
src/
├── main.ts                          # Bootstrap, CORS, ValidationPipe, Swagger
├── app.module.ts                    # Root module
├── auth/                            # Cognito auth, registration, login, token refresh, password reset
│   ├── controllers/
│   ├── dto/
│   ├── entities/
│   └── services/
├── common/                          # Shared guards, decorators, DTOs, entities, enums
│   ├── guards/                      # CognitoAuthGuard, TenantGuard
│   ├── decorators/
│   ├── dto/
│   ├── entities/                    # BaseEntity, TenantScopedEntity
│   └── enums/
├── config/                          # TypeORM data-source + config
├── customers/                       # Customer CRUD with nested addresses
│   ├── controllers/
│   ├── dto/
│   ├── entities/
│   └── services/
├── catalog/                         # Catalog item CRUD (reusable preset line items)
│   ├── controllers/
│   ├── dto/
│   ├── entities/
│   └── services/
├── email/                            # AWS SES integration (email sending via Handlebars templates)
│   ├── services/email.service.ts     # SESv2 SendEmail (raw MIME + attachment) + template renderer
│   ├── email-templates.ts            # .hbs loader/compiler (subject + body per file)
│   ├── templates/                    # Handlebars email templates (invoice-email.hbs, …)
│   └── mime.ts                       # Dependency-free RFC 5322 MIME builder
├── invoices/                        # Invoice creation, PDF generation, emailing
│   ├── controllers/                  # invoice.controller, invoice-email.controller
│   ├── dto/
│   ├── entities/                     # Invoice, InvoiceEmailAttempt
│   ├── services/                     # invoice.service, pdf.service, invoice-email.service
│   └── templates/                   # Handlebars invoice template
├── jobs/                            # Job CRUD with nested notes + line items
│   ├── controllers/
│   ├── dto/
│   ├── entities/
│   └── services/
├── migrations/                      # TypeORM migrations
├── tenants/                         # Tenant (business) CRUD
│   ├── controllers/
│   ├── dto/
│   ├── entities/
│   └── services/
└── users/                           # User entity
    └── entities/
```

### Frontend (`web-trade-crm/src/`)

```
src/
├── App.tsx                          # Root app with routing + auth gating
├── main.tsx                         # Entry point
├── components/                      # Reusable components (CustomerSearch, CustomerTable, CatalogItemSearch, PaginatedTable, Menu)
├── contexts/                        # AuthContext (user, login, logout, updateUser)
├── pages/                           # Route-level pages (Auth, Home, Create/Manage pages, Catalog pages)
├── services/                        # API client, PDF cache, formatting, validation
└── theme/                           # Ionic theme overrides
```

---

## Data Model (Key Entities)

### TenantScopedEntity (base class)

- All tenant-owned entities extend this
- Fields: `id` (UUID), `createdAt`, `updatedAt`, `tenantId`

### Tenant

- `businessName`, `businessEmail`, `phone`, `defaultTaxPercent`, `invoicePaymentMethodNote`

### User

- `email`, `firstName`, `lastName`, `cognitoSub`, `status`, `role`, `tenantId?`

### Customer + CustomerAddress

- Customer: `type` (PERSON/BUSINESS), `firstName`, `lastName`, `companyName`, `phone`, `email`, `notes`
- Address: `label`, `addressLine1/2`, `city`, `stateProvince`, `zipPostalCode`, `countryCode`, `isDefault`

### Job + JobNote + JobLineItem

- Job: `title`, `description`, `status` (DRAFT/ASSIGNED/IN_PROGRESS/COMPLETED/CANCELLED), `customerId`, `customerAddressId`, `assignedUserId`, `scheduledStart/End`, `completedAt`
- Note: `userId`, `note` (cumulative, non-editable)
- LineItem: `type` (SERVICE/MATERIAL/FEE), `description`, `quantity`, `unitPrice`, `lineTotal`, `sortOrder`, `catalogItemId?` (nullable FK to `catalog_items`, `ON DELETE SET NULL`)

### CatalogItem

- Tenant preset line items so adding bills/line items is faster. `type` (SERVICE/MATERIAL/FEE), `description`, `unitPrice`
- `JobLineItem.catalogItemId` is an **optional reference only** — every display value is always snapshotted onto the `job_line_items` row at add time, so editing or deleting a catalog item never changes existing line items (deleting a catalog item just clears the reference via `ON DELETE SET NULL`)
- Catalog search on the Create/Job detail page loads the tenant's items up-front and filters **locally** (description/type/unit price); pick an item to prefill the normal manual line item form (editable before applying), or use the "Add Custom Line Item" button for a blank entry
- Management UI: `/manage-catalog` (paginated table + type-filter checkboxes), `/create-catalog-item` and `/edit-catalog-item/:id` (same form page; edit mode has delete with confirmation)

### Invoice

- `jobId`, `invoiceNumber` (8-digit, starts at 88880001), `version` (per job), `status` (DRAFT/ISSUED/PAID/VOID/SUPERSEDED), `subtotal`, `taxPercent`, `taxAmount`, `total`, `issuedAt`, `paidAt`, `snapshot` (JSONB — frozen copy of job data at time of invoice)
- One-to-many `emailAttempts` → `InvoiceEmailAttempt`

### InvoiceEmailAttempt

- One row per invoice-email send attempt (tenant-scoped, FK to `invoices`)
- `recipientEmail`, `fromEmail`, `status` (PENDING/SENT/FAILED), `subject`, `messageId` (SES), `errorMessage`, `sentAt`, `snapshot` (JSONB — frozen invoice summary at send time)
- Lifecycle: `PENDING → SENT | FAILED`. Stale `PENDING` rows older than 30 min are flagged `FAILED` on API startup (avoids double-sends after a crash/restart)

---

## Coding Standards

### Backend

- Constructor injection for all dependencies
- DTOs with `class-validator` decorators on every field
- `@Type(() => Number)` from `class-transformer` on numeric DTO fields (for string→number conversion)
- `ValidationPipe` with `transform: true`, `whitelist: true`, `forbidNonWhitelisted: true`
- Transactions via `DataSource.transaction()` for multi-table atomic operations
- Explicit `relations` in all `findOne`/`find` queries — no eager loading
- Pagination on list endpoints with `PaginationDto` (page, limit)
- All list queries use `tenantId` filter + `order` for consistent results
- Never expose deleted rows or another tenant's data

### Frontend

- Singleton `api.ts` class for all HTTP — never use raw `fetch` outside of it
- Shared components for reusable UI (CustomerSearch, CustomerTable, PaginatedTable, Menu)
- Shared services for cross-cutting concerns (format, validation, pdfCache)
- `IonActionSheet` for inline status changes (invoice status)
- `IonSelect` + `interface="popover"` for dropdown menus
- `useIonViewWillEnter` for Ionic lifecycle-safe data loading
- Error toasts are dismiss-only (never auto-hide)
- Invoice numbers formatted as `8888 0001` via shared `formatInvoiceNumber()` utility
- Phone inputs use `inputMode="numeric"` + `stripPhone()` + immediate `e.target.value` override

### PDF Generation

- Handlebars templates compiled at service startup
- Playwright Chromium browser for HTML→PDF conversion
- Invoice snapshots stored as JSONB at creation time
- Template path resolved via `path.join(__dirname, '..', 'templates', 'invoice.hbs')`
- **Docker**: `chromium.launch()` must specify `executablePath: '/usr/bin/chromium-browser'` and `args: ['--no-sandbox']` — the Alpine `chromium` package installs the binary at `/usr/bin/chromium-browser`, not in Playwright's expected path. Without this, rebuilds can break if the Playwright version changes.
- **PDF download (frontend)**: The `downloadInvoicePdf()` method in `api.ts` uses raw `fetch` (not the `request<T>()` method), so it must explicitly include the `x-refresh-token` header for token refresh to work on expired tokens.
- **Static file location**: Static assets that must be served as-is (e.g., pre-generated demo invoice PDFs) belong in `web-trade-crm/public/`. Vite copies everything from `public/` verbatim into `dist/` at the root path, making files accessible at `/demo/invoice-pdfs/{tenantId}-{invoiceNumber}-invoice.pdf`. Do NOT use `src/assets/` for files that need to be referenced by URL at runtime — files there get bundled/inlined by Vite's build pipeline and are not guaranteed to remain as separate files. Seed JSON data for demo mode lives in `src/demo/api/`, while pre-generated PDFs live in `public/demo/invoice-pdfs/`. Regenerate them with `node scripts/generate-demo-pdfs.mjs` when the seed data changes.
