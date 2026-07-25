# Sprout CRM — Project Context

## Overview

Multi-tenant trade business CRM with a NestJS (TypeORM + PostgreSQL) backend and an Ionic React frontend. Uses AWS Cognito for authentication and Playwright + Handlebars for PDF invoice generation.

---

## Architecture Principles

### Multi-Tenancy

- Every tenant-owned table contains a `tenantId` column (via `TenantScopedEntity` base class)
- All queries filter by `tenantId` — never trust tenantId from client input
- DTOs use `whitelist: true` + `forbidNonWhitelisted: true` so users cannot inject `tenantId` or ownership fields
- Every update verifies ownership: `findOne({ id, tenantId })` before modifying
- Cascade deletes on nested objects (addresses, notes, line items) include `tenantId` in the `where` clause

### Backend (NestJS)

- Modular architecture with feature modules: `auth`, `tenants`, `customers`, `jobs`, `invoices`, `users`
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
  - `routerLink` for Ionic-managed navigation (avoids React Router history bugs)
  - `history.push()`/`history.goBack()` for programmatic navigation
- Shared components:
  - `CustomerSearch` — Debounced search with dropdown results + "Create New Customer" button
  - `Menu` — Sidemenu with nav items + logout
- PDF handling:
  - In-memory `pdfCache.ts` (Map<string, Blob>) caches downloaded PDFs for the session
  - `getPdfBlob()` — fetch + cache
  - `downloadPdf()` — trigger browser download
  - Invoice preview via full-page `iframe` at `/invoice-preview/:id`
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
├── invoices/                        # Invoice creation, PDF generation
│   ├── controllers/
│   ├── dto/
│   ├── entities/
│   ├── services/
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
├── components/                      # Reusable components (CustomerSearch, Menu)
├── contexts/                        # AuthContext (user, login, logout, updateUser)
├── pages/                           # Route-level pages (Auth, Home, Create/Manage pages)
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
- LineItem: `type` (SERVICE/MATERIAL/FEE), `description`, `quantity`, `unitPrice`, `lineTotal`, `sortOrder`

### Invoice

- `jobId`, `invoiceNumber` (8-digit, starts at 88880001), `version` (per job), `status` (DRAFT/ISSUED/PAID/VOID/SUPERSEDED), `subtotal`, `taxPercent`, `taxAmount`, `total`, `issuedAt`, `paidAt`, `snapshot` (JSONB — frozen copy of job data at time of invoice)

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
- Shared components for reusable UI (CustomerSearch, Menu)
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
