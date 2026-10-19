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

### Skills (load on demand)

CONTEXT.md covers architecture and standards; recurring **procedures** live in
skills under `ai/skills/`, loaded only when a task calls for them:

| Skill | Use it for |
| --- | --- |
| [`ai/skills/RELEASE.skill.md`](skills/RELEASE.skill.md) | Cutting, tagging, deploying, or rolling back a release (SDLC step 6) |

Each skill is a self-contained module for one recurring task — keep them
command-first, and free of facts that drift (read versions, paths, and state from
the code rather than restating them).

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
2. Update the fixtures in `src/demo/api/` (`tenant.json`, `customers.json`, `jobs.json`, `catalogItems.json`, `feedback.json`).
3. Invoice fixtures changed? Regenerate the pre-built PDFs: `npm run demo:pdfs`.
4. Want real-account logins to see the data too? `npm run demo:seed`.

### 3. Implement + update docs

- Follow this file's architecture and coding standards — and the patterns
  already used by comparable code — keeping changes scoped.
- Run the relevant tests/builds (backend or frontend).
- Update docs **only if the change makes them inaccurate** (README, `docs/`,
  this file). Don't churn docs for docs' sake.

### 4. Local sign-off gate (before pushing)

When work is done, hand the user repeatable live-testing instructions and
**wait for their sign-off** before anything is pushed or merged:

1. `npm run dev` → Web http://localhost:8100 · API http://localhost:3000 · Swagger http://localhost:3000/api/docs
   (Added a migration? The API container only runs `migration:run` **on start**, so
   `docker compose restart api` is what applies it locally — otherwise the table is
   missing and the API crashes on boot.)
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
changed — not just docs/chore), offer the release. The full procedure — version
choice, release branch, the two PRs, tagging, deploy, migrations, rollback —
lives in [`ai/skills/RELEASE.skill.md`](skills/RELEASE.skill.md): load that skill
and follow it.

In short: `npm run release:start` → push + two PRs (`→ main`, `→ develop`) →
`npm run release:tag` → deploy (`./scripts/deploy.sh`, `./scripts/deploy-frontend.sh`).
Not releasing this one? Then don't create tags.

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
- Version bumps happen on `release/*` branches — never on feature branches. Use `npm run release:start` and follow [`ai/skills/RELEASE.skill.md`](skills/RELEASE.skill.md); read the current versions from each `package.json` (or the git tags) rather than from a doc.

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

The full deploy, tag, and manual-migration sequence lives in
[`ai/skills/RELEASE.skill.md`](skills/RELEASE.skill.md) (*Deploy*, *Production
operations*). In short:

```bash
SSH_KEY=~/.ssh/id_ed25519 ./scripts/deploy.sh   # API: rsync + compose up --build
./scripts/deploy-frontend.sh                     # Web: build + S3 sync + CF invalidate
```

Migrations run automatically on container start; manual migration runs and
database access are in [`ai/skills/RELEASE.skill.md`](skills/RELEASE.skill.md)
(*Production operations*).

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

- Modular architecture with feature modules: `auth`, `tenants`, `customers`, `catalog`, `feedback`, `contact`, `jobs`, `invoices`, `email`, `ai`, `users`
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
- **Other email types reuse this plumbing**: feedback submissions email an internal notification through the same `EmailService` (`feedback-email.hbs`, no attachment) — see `### Feedback`. That is the reference pattern for a new template-based email.
- **Node runtime note**: AWS SDK v3 will require Node >= 22 starting 2027; the API image currently uses `node:20-alpine`. Non-blocking; bump `api-trade-crm/Dockerfile` in a future change.

### Email rate limiting

- Every email-sending endpoint is rate limited with `@nestjs/throttler` through a project-owned `EmailThrottlerGuard` (`src/email/guards/`). It is bound **per route**, never as a global `APP_GUARD`, so no other endpoint is throttled.
- One throttler set (a 1-day window, named `default` so responses carry standard, unsuffixed `Retry-After` / `X-RateLimit-*` headers) is configured in `EmailModule`; each route sets its own budget with `@Throttle(...)` using the `EMAIL_RATE_LIMITS` constants + `EMAIL_RATE_WINDOW_MS` from `src/email/email-throttle.config.ts`:
  - `POST /invoices/:invoiceId/email` — **20/day per tenant**
  - `POST /feedback` — **10/day per tenant**
  - `POST /contact` (public) — **3/day per client IP**
- The bucket is chosen by `resolveEmailThrottleTracker`: the tenant id when the request is authenticated (`tenant:<id>`), otherwise the client IP (`ip:<addr>`) — the prefixes keep the two scopes from ever sharing a counter. `TenantGuard` must therefore run first, so it is declared **before** `EmailThrottlerGuard` in `@UseGuards(...)`. The throttler's default `generateKey` already folds in the controller + handler + set name, so each route keeps its own budget.
- **`trust proxy` is set in `main.ts`** (`app.getHttpAdapter().getInstance().set('trust proxy', 1)`) because Caddy is the single reverse-proxy hop — without it `request.ip` would be Caddy's address and the public form's IP budget would collapse onto one bucket. Throttler's `ipv6SubnetPrefix` (default 64) additionally groups IPv6 subnets so a client cannot dodge the limit by rotating addresses.
- Over-limit requests get a **429** whose `message` is friendly copy ("Daily email limit reached. Please try again tomorrow."). The web client already shows `data.message` verbatim, so no API-client change was needed.
- **In-memory counters** (the throttler default): they reset when the API restarts/redeploys and are per-container. Acceptable on the single Lightsail instance; a Postgres-backed `ThrottlerStorage` is the follow-up if that ever matters.
- Deliberately **not mirrored in demo mode**: demo is an authenticated sandbox that neither sends real email nor faces abuse, so `demoService` has no throttle mirror (a documented gap).

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
  - `LineItemFields` — the Type / Description / Quantity / Unit price field set, shared by the manual "Add Line Item" form (`JobDetailPage`) and each AI estimator suggestion card (`ServiceEstimatorModal`) so both look identical. Controlled (`values` + `onChange`); it deliberately uses Ionic's own `ion-item` defaults (16px inset, stacked label, bottom hairline) so it matches the other forms, with `.line-item-fields__row` in `variables.css` splitting Quantity + Unit price with a vertical rule.
  - `ServiceEstimatorModal` — the "AI service estimator" modal opened from the job detail page. Takes a free-text description, shows the returned suggestions as editable line items (via `LineItemFields`) with per-row remove, and only calls back to create line items when the user presses "Add N line items" (Cancel saves nothing). In demo mode the input is pre-filled with one fixed, read-only example prompt (see AI service estimator above).
  - `PaginatedTable` — Reusable paginated table; pagination info + prev/next buttons are at the TOP so controls don't jump on mobile when row counts change between pages
  - `Menu` — Sidemenu with nav items (Jobs, Customers, Catalog, Business Settings, Feedback) + logout
  - `PublicHeader` + `PublicMenu` — the unauthenticated-space nav, sharing the item list in `publicNav.ts`: a custom horizontal top bar on desktop (`>= 992px`) and a hamburger that opens the Ionic `IonMenu` drawer below that. Ionic has no horizontal menu component, so the bar is hand-rolled. Reused by every public page; it highlights the current page in the brand green and does **not** animate page transitions (`IonRouterOutlet animated={false}`), which looked out of place on desktop
  - `AppFooter` — the app-wide footer (Ionic `IonFooter` + `IonToolbar`), shared by both the public and authenticated spaces. `IonFooter` only lays out correctly as a direct child of an `IonPage`, so every routed page renders `<AppFooter />` right after its `IonContent` instead of the app mounting one global instance (the transient Create Business page has no nav chrome and omits it). Its two `routerLink` CTAs (`/terms`, `/privacy`) work in both outlets because App.tsx registers those routes in each
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
- Legal documents (Privacy Policy + Terms of Service) live in `src/legal/` as `.md` files imported with Vite's `?raw` — so the wording is never re-typed — and are rendered by the dependency-free `MarkdownContent` (headings, paragraphs, `-` lists, `**bold**`, two-space hard breaks). Registration requires agreeing to both: each consent row opens its document in an `IonModal`, and the Register button stays disabled until both boxes are ticked. Both documents also have their own routes (`/terms`, `/privacy`), linked from the shared `AppFooter`: `LegalPage` renders the same `.md` source in a page shell and picks the public header (`chrome="public"`) or the app back-button header (`chrome="app"`) per outlet. There is still deliberately **no nav item** for them in the header/sidemenu
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
├── ai/                              # AI service estimator (natural-language catalog matching via Anthropic tool use)
│   ├── controllers/                  # ai-estimator.controller
│   ├── dto/
│   ├── entities/                     # AiEstimationRequest (per-user budget ledger)
│   ├── services/                     # ai-estimator (orchestration), catalog-matcher (tool loop), catalog-tool (tenant-scoped search), ai-usage (3/hour)
│   ├── anthropic.client.ts          # server-side Anthropic SDK wrapper (env-driven, optional)
│   └── ai-estimator.config.ts       # named constants: rate limit, caps, default model
├── feedback/                        # In-app feedback/bug/feature-request/contact submissions
│   ├── controllers/
│   ├── dto/
│   ├── entities/
│   └── services/                    # feedback.service + feedback-email.service (internal notification)
├── contact/                         # Public (unauthenticated) contact-form submissions
│   ├── controllers/                  # contact.controller — unguarded POST /contact
│   ├── dto/
│   ├── entities/                     # ContactSubmission (deliberately NOT tenant-scoped)
│   └── services/                     # contact.service + contact-email.service (internal notification)
├── email/                            # AWS SES integration (email sending via Handlebars templates)
│   ├── services/email.service.ts     # SESv2 SendEmail (raw MIME + attachment) + template renderer
│   ├── email-templates.ts            # .hbs loader/compiler (subject + body per file)
│   ├── email-throttle.config.ts      # per-day email rate-limit budgets + tenant/IP tracker
│   ├── guards/                       # EmailThrottlerGuard (per-route, tenant/IP buckets)
│   ├── templates/                    # Handlebars email templates (invoice-email.hbs, feedback-email.hbs)
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
├── components/                      # Reusable components (CustomerSearch, CustomerTable, CatalogItemSearch, PaginatedTable, Menu, PublicHeader, PublicMenu, publicNav, AppFooter, MarkdownContent)
├── contexts/                        # AuthContext (user, login, logout, updateUser)
├── legal/                           # Privacy Policy + Terms of Service (.md files, modal wrappers, routed LegalPage)
├── pages/                           # Route-level pages (Auth, Home, Create/Manage pages, Catalog pages, public BetaProgram/Contact)
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
- `PATCH /jobs/:id` accepts job fields only — notes and line items have their own endpoints (`POST /jobs/:id/notes`, `POST /jobs/:id/line-items`, `DELETE /jobs/:id/line-items/:lineItemId`), so a child row is inserted or removed individually and existing rows keep their `id` and `createdAt`. Both child lists are returned in the order they were added (`createdAt` ASC, server-derived) — no client sends or tracks an ordering value
- LineItem: `type` (SERVICE/MATERIAL/FEE), `description`, `quantity`, `unitPrice`, `lineTotal`, `catalogItemId?` (nullable FK to `catalog_items`, `ON DELETE SET NULL`). When a `catalogItemId` is supplied, `createLineItem` verifies it belongs to the caller's tenant before saving (this is also the re-validation step for confirmed AI suggestions)

### CatalogItem

- Tenant preset line items so adding bills/line items is faster. `type` (SERVICE/MATERIAL/FEE), `description`, `unitPrice`
- `JobLineItem.catalogItemId` is an **optional reference only** — every display value is always snapshotted onto the `job_line_items` row at add time, so editing or deleting a catalog item never changes existing line items (deleting a catalog item just clears the reference via `ON DELETE SET NULL`)
- Catalog search on the Create/Job detail page loads the tenant's items up-front and filters **locally** (description/type/unit price); pick an item to prefill the normal manual line item form (editable before applying), or use the "Add Custom Line Item" button for a blank entry
- Management UI: `/manage-catalog` (paginated table + free-text search + type-filter checkboxes — both applied server-side via `?q=` and `?type=`), `/create-catalog-item` and `/edit-catalog-item/:id` (same form page; edit mode has delete with confirmation). `?q=` is whitespace-tokenized: every token must match at least one of description / type / unit price (AND across tokens, OR across fields — the same shape as customer search), capped at 12 tokens and always bound as parameters. The AI estimator's `search_catalog` tool reuses this exact search

### AI service estimator

- Natural-language line-item suggestions on the job detail page: describe the work, Claude picks items from the caller's **own** catalog, and the UI shows editable suggestions. **No line items are created until the user explicitly confirms** — the AI endpoints only read.
- Module `src/ai/`: `AiEstimatorController` (`POST /ai/catalog-matches`, `GET /ai/catalog-matches/usage`, both `TenantGuard`), `AiEstimatorService` (budget + orchestration + safe error mapping), `CatalogMatcherService` (inline fast path + bounded tool fallback), `CatalogToolService` (tenant-scoped catalog reads), `AiUsageService` (the per-user budget), `AnthropicClient` (SDK wrapper).
- **Tool use, not guessing.** The model reads the caller's catalog through the single `search_catalog` tool, executed locally via `CatalogService.findAll`: an **empty query lists the whole catalog** (newest first, capped at `AI_MAX_TOOL_RESULTS` = 100) and a non-blank query is the token search (AND across tokens, OR across fields). The first provider call sets `tool_choice` to force `search_catalog`, so every estimate is grounded in rows a search actually returned; later turns may answer or search again. Always tenant-scoped, ≤ 5 iterations, no SQL/URL/write tools — the model can never create or update jobs or line items.
- **Refs, not UUIDs, go over the wire.** Each row is sent with a short per-request `ref` ("1", "2", …): UUIDs tokenize poorly and models mistype them, and a mistyped id is silently dropped by validation. The model returns `catalogItemRef`, the server maps it back to the real UUID, and responses still carry `catalogItemId` so the client contract is unchanged. Refs are registered only for rows actually sent — a guessed ref cannot resolve to an item the model never saw.
- **Output is untrusted**: the model returns only `catalogItemRef` + `quantity` + `matchReason`. Every ref is checked against the rows *this request* actually sent (invented/unseen/duplicate refs are dropped), and `catalogItemId`/`type`/`description`/`unitPrice` are re-attached server-side from the catalog rows — the model can never invent a name or a price. Malformed output yields an empty result with a friendly message.
- The prompt tells the model to **start with an empty query** (list the whole, normally-small catalog), then narrow with **1–3 distinctive keywords** and drop filler words (e.g. "existing") — avoiding the "long phrase matches nothing" failure mode.
- Bounded everywhere: description ≤ 1000 chars (DTO), ≤ 200 tool results per search, ≤ 5 tool iterations, ≤ 1024 output tokens, ≤ 10 suggestions, 30 s provider timeout, 1 SDK retry. Only the description and those minimal catalog fields are sent to the provider — never customer names, addresses or notes; logs carry operational metadata (status, latency, counts) only.
- **Rate limit: 3 requests per rolling hour per authenticated user**, enforced *before* the provider call so provider failures still count. It is persistent (a small `ai_estimation_requests` ledger table + composite index) and atomic (count-then-insert inside a transaction guarded by a per-user `pg_advisory_xact_lock`), keyed by the local user id from the verified token. This is deliberately **not** the `@nestjs/throttler` email limiter (that one is in-memory). Over-limit returns 429 with a friendly message and a `retryAfterSeconds` hint; the response also carries `usage { limit, used, remaining, resetAt }`.
- **Config**: `ANTHROPIC_API_KEY` (server-side only; unset ⇒ the endpoints return a graceful 503 and nothing else breaks) and optional `ANTHROPIC_MODEL` (default `claude-haiku-5-5`, the cheapest current model). Never commit the key.
- **Confirmation reuses the normal endpoint**: the UI posts the edited selections to `POST /jobs/:id/line-items`, and `JobService.createLineItem` now validates that a supplied `catalogItemId` belongs to the caller's tenant (previously a foreign UUID could be referenced).
- Demo mode: the modal pre-fills one fixed, read-only example prompt that maps to a **defined** catalog output built from the fixtures — neither the backend nor Anthropic is called, and unexpected input returns a friendly no-match message. The demo also mirrors the 3/hour budget (in-memory, resets on reload).

### Feedback

- Support submissions from in-app users: `type` (FEEDBACK/BUG/FEATURE_REQUEST/CONTACT), `subject` (nullable, ≤255), `message` (≤1000), plus a `userEmail` snapshot of the submitter
- `POST /feedback` (TenantGuard) records a submission — `tenantId`, `userId`, and `userEmail` always come from the verified token, never the body
- `GET /feedback` (TenantGuard) lists the tenant's submissions newest-first (`createdAt DESC`, paginated)
- **Deliberately has no relations/foreign keys** to `tenants` or `users` (plain scalar `tenantId`/`userId` columns) so feedback history survives a user or tenant being changed/deleted; `tenantId` still scopes every query
- **Every submission also emails an internal notification** to the support inbox in `FEEDBACK_NOTIFY_EMAIL` (env-only: unset or empty → notifications disabled, and submissions are recorded as `SKIPPED`; no address is hardcoded in the repo, so the value lives in the gitignored `api-trade-crm/.env` locally and `.env.production` when deployed). Strictly outside the user's world: the submission is saved first, the send is fire-and-forget via `FeedbackEmailService` (template `src/email/templates/feedback-email.hbs`, From `SES_FROM_EMAIL`, Reply-To the submitter), and a failure can never slow down or fail the user's request. `POST /feedback` is also rate limited to **10/day per tenant** — see `### Email rate limiting`.
- The notification outcome is tracked on the row itself (`emailStatus` PENDING/SENT/FAILED/SKIPPED + `emailRecipient`, `emailMessageId`, `emailErrorMessage`, `emailSentAt`) but **never reaches a client**: the five columns are `@Exclude()`d on the entity and `FeedbackController` registers `ClassSerializerInterceptor`, so serialization strips them for every response shape (bare entity, array, and the paginated `{ data, meta }` wrapper). That is the canonical Nest pattern for hiding entity fields — the alternative (a response DTO + mapper) has to be remembered at every call site, which is exactly the leak this replaces. Caveat: `@Exclude()` only applies to class instances, which TypeORM returns; a plain object would pass through untouched. Recovery note: those columns are nullable and nothing is written to them by the demo seed, so pre-existing/demo-seeded rows read NULL ("not tracked") rather than a fabricated PENDING; stale PENDING rows older than 30 min are flagged FAILED on startup like `InvoiceEmailService`.
- UI: `/feedback` (sidemenu link) — submit form + the tenant's own submission history

### Contact submissions

- Submissions from the **public** (unauthenticated) contact form. Because a visitor with no account has no tenant, this table is deliberately **not** tenant-scoped: `ContactSubmission` extends `BaseEntity` and has no `tenantId` column at all (nothing tenant-scoped ever reads it, so multi-tenancy stays strict)
- `type` (CONTACT/EARLY_ACCESS), `email` (required — support needs a way to reply), `subject` (nullable, ≤255), `message` (≤1000). Otherwise it mirrors `Feedback`: the same internal-notification columns (`emailStatus` PENDING/SENT/FAILED/SKIPPED + `emailRecipient`, `emailMessageId`, `emailErrorMessage`, `emailSentAt`), all `@Exclude()`d and stripped by `ClassSerializerInterceptor` on the controller, with the same stale-PENDING recovery on startup
- `POST /contact` is **unguarded** (visitors have no token) and accepts only the contact subject types — an in-app-only type such as `BUG` is rejected. Nothing identity-related is accepted from the body. It is rate limited to **3/day per client IP** — see `### Email rate limiting`.
- `FeedbackType` is shared by both submission tables (and the same Postgres `feedback_type_enum`), so the values and their labels stay in one place. `EARLY_ACCESS` was added for the contact form; the in-app `CreateFeedbackDto` deliberately does *not* accept it
- Notifications reuse the same `EmailService` + PENDING/SENT/FAILED bookkeeping but render `src/email/templates/contact-email.hbs` (the feedback template's "Business"/"Tenant ID" lines don't apply to a tenant-free submission). Destination is the same env-driven `FEEDBACK_NOTIFY_EMAIL`
- UI: `/contact` — reached from the public nav and from the Early Access page's "Request Early Access" CTA, which pre-selects the type via `/contact?type=EARLY_ACCESS`. An unknown/missing `?type=` falls back to CONTACT
- Demo-mode note: the public pages are unreachable while `?demo=true` (demo mode is an authenticated session), so `demoService.submitContact` only exists to keep the api client's demo branch honest

### Invoice

- `jobId`, `invoiceNumber` (8-digit, starts at 88880001), `version` (per job), `status` (DRAFT/ISSUED/PAID/VOID/SUPERSEDED), `subtotal`, `taxPercent`, `taxAmount`, `total`, `issuedAt`, `paidAt`, `snapshot` (JSONB — frozen copy of job data at time of invoice)
- One-to-many `emailAttempts` → `InvoiceEmailAttempt`

### InvoiceEmailAttempt

- One row per invoice-email send attempt (tenant-scoped, FK to `invoices`)
- `recipientEmail`, `fromEmail`, `status` (PENDING/SENT/FAILED), `subject`, `messageId` (SES), `errorMessage`, `sentAt`, `snapshot` (JSONB — frozen invoice summary at send time)
- Lifecycle: `PENDING → SENT | FAILED`. Stale `PENDING` rows older than 30 min are flagged `FAILED` on API startup (avoids double-sends after a crash/restart)

---

## Coding Standards

The rules below cover the parts of the codebase that must stay consistent. They
are not a full description of the project's style, so **the existing code is the
source of truth**:

- Before writing something new, find the closest existing example of the same
  kind of thing (page, component, service, controller, DTO, test) and follow it
  — structure, naming, file layout, styling, error handling, test style.
  Consistent beats clever.
- Reuse what's already there — shared components, services/utilities, CSS
  classes — before adding a new one. If you're about to introduce a second way
  of doing something the codebase already does, extend the existing one
  instead, or explain why it has to differ.
- When a convention doesn't cover the case, pick whichever option looks most
  like its neighbours rather than designing a new approach.
- If a task genuinely needs a new pattern or a deliberate deviation from an
  established one, say so in your summary and document it where it lives.

### Backend

- Constructor injection for all dependencies
- DTOs with `class-validator` decorators on every field
- `@Type(() => Number)` from `class-transformer` on numeric DTO fields (for string→number conversion)
- `ValidationPipe` with `transform: true`, `whitelist: true`, `forbidNonWhitelisted: true`
- Transactions via `DataSource.transaction()` for multi-table atomic operations
- **Raw SQL fragments in a `createQueryBuilder` do not get TypeORM's property→column mapping** — and the mapping is also skipped when an `alias.property` is immediately followed by a `::` cast (e.g. `LOWER(item.unitPrice::text)` is passed through verbatim, then Postgres folds it to `unitprice` and the query fails with `column item.unitprice does not exist`). Write physical column names quoted (`item."unitPrice"`) in those fragments, or prefer the repository API / `ILike()` which map for you. See `catalog.service.ts` → `findAll` for the fixed pattern.
- Explicit `relations` in all `findOne`/`find` queries — no eager loading
- Pagination on list endpoints with `PaginationDto` (page, limit)
- All list queries use `tenantId` filter + `order` for consistent results
- Never expose deleted rows or another tenant's data

### Frontend

- Singleton `api.ts` class for all HTTP — never use raw `fetch` outside of it
- Shared components for reusable UI (CustomerSearch, CustomerTable, PaginatedTable, Menu)
- Shared layout and styling classes live in `src/theme/variables.css` (page containers, form cards, form controls) — reuse them instead of page-local styles, and read the comment above a class to see where it's meant to be used
- Shared services for cross-cutting concerns (format, validation, pdfCache)
- `IonActionSheet` for inline status changes (invoice status)
- `IonSelect` + `interface="popover"` for dropdown menus
- `useIonViewWillEnter` for Ionic lifecycle-safe data loading
- Error toasts are dismiss-only (never auto-hide)
- Invoice numbers formatted as `8888 0001` via shared `formatInvoiceNumber()` utility
- Phone inputs use `inputMode="numeric"` + `stripPhone()` + immediate `e.target.value` override

### Testing & type-checking spec files

Different tools type-check the backend, and they disagree by design — that is
why a spec can pass `npm test` yet show errors in VS Code:

- **`npm run build`** (`nest build`) compiles via `tsconfig.build.json`, which
  **excludes `**/*spec.ts` and `test/`** — specs are never compiled, so the build
  never reports spec errors.
- **`npm test`** (ts-jest) honours `isolatedModules: true`, which is set in
  `api-trade-crm/tsconfig.json`. Under `isolatedModules`, ts-jest **transpiles
  each file in isolation without type-checking**, so semantic errors in specs
  never fail the run.
- **VS Code / `npx tsc --noEmit -p api-trade-crm/tsconfig.json`** type-checks
  every file under `api-trade-crm/` (specs included) with `tsconfig.json`. This
  is the **only** one that surfaces spec type errors — so an error that appears
  only in the IDE is real, not a tooling quirk.

**The recurring error** is a mock that doesn't structurally satisfy the type it
is injected as. A `jest.fn()`-built object has none of a TypeORM `Repository<T>`'s
members (`target`, `manager`, `metadata`, …), so `new Service(mockRepo …)` reports
`TS2345` whose message names `jest.Mock`. A bare `jest.fn()` also widens its
arguments to `never`, so `.mockResolvedValue({ … })` reports
`TS2345 … not assignable to parameter of type 'never'`.

**How to keep specs clean:**

- Give mock functions explicit types using `jest.fn`'s two-type-argument form —
  `jest.fn<Promise<unknown>, unknown[]>()` — so `mockResolvedValue(...)` accepts
  real values instead of `never`.
- Cast the whole mock to the real type **at the injection site** —
  `repo as unknown as Repository<Job>`, `service as unknown as CatalogService` —
  which keeps the object typed as mocks so `.mockResolvedValue(...)` /
  `expect(...)` still work.

**Import the Jest globals — never rely on the ambient ones.** `@types/jest` is
installed only under `api-trade-crm/node_modules` and declares *global* types, so
a spec that uses the bare `jest` / `describe` / `it` / `expect` (rather than
importing them) is what shows `Cannot find name 'jest'` in the IDE even though
`tsc -p tsconfig.json` resolves it. Every spec imports them from `@jest/globals`
(e.g. `import { describe, expect, it, jest } from '@jest/globals'`); do the same
and that error cannot appear. Note the two definitions differ: `@jest/globals`'
`jest.fn` takes **one** function-type argument (`jest.fn<() => Promise<unknown>>()`),
whereas the ambient `@types/jest` one takes two (`jest.fn<Promise<unknown>, unknown[]>()`).

The `src/ai/**` specs and `src/jobs/services/job.service.spec.ts` are the
reference examples. Since only the IDE surfaces these, run
`npx tsc --noEmit -p api-trade-crm/tsconfig.json` to catch them before a commit.

### PDF Generation

- Handlebars templates compiled at service startup
- Playwright Chromium browser for HTML→PDF conversion
- Invoice snapshots stored as JSONB at creation time
- Template path resolved via `path.join(__dirname, '..', 'templates', 'invoice.hbs')`
- **Docker**: `chromium.launch()` must specify `executablePath: '/usr/bin/chromium-browser'` and `args: ['--no-sandbox']` — the Alpine `chromium` package installs the binary at `/usr/bin/chromium-browser`, not in Playwright's expected path. Without this, rebuilds can break if the Playwright version changes.
- **PDF download (frontend)**: The `downloadInvoicePdf()` method in `api.ts` uses raw `fetch` (not the `request<T>()` method), so it must explicitly include the `x-refresh-token` header for token refresh to work on expired tokens.
- **Static file location**: Static assets that must be served as-is (e.g., pre-generated demo invoice PDFs) belong in `web-trade-crm/public/`. Vite copies everything from `public/` verbatim into `dist/` at the root path, making files accessible at `/demo/invoice-pdfs/{tenantId}-{invoiceNumber}-invoice.pdf`. Do NOT use `src/assets/` for files that need to be referenced by URL at runtime — files there get bundled/inlined by Vite's build pipeline and are not guaranteed to remain as separate files. Seed JSON data for demo mode lives in `src/demo/api/`, while pre-generated PDFs live in `public/demo/invoice-pdfs/`. Regenerate them with `node scripts/generate-demo-pdfs.mjs` when the seed data changes.
