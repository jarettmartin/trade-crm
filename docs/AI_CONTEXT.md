# Trade CRM — Project Context

## Overview

Multi-tenant trade business CRM with a NestJS (TypeORM + PostgreSQL) backend and an Ionic React frontend. Uses Firebase Authentication for user management and Playwright + Handlebars for PDF invoice generation.

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
- `TenantGuard` resolves tenant from Firebase JWT + local DB
- `FirebaseAuthGuard` verifies Firebase ID tokens on every authenticated request
- `CurrentUser` decorator extracts user info from the JWT
- Business logic lives in services, never in controllers
- Transactions via `DataSource.transaction()` where atomicity is required (e.g., customer + address creation)
- Eager loading avoided — explicit `relations` in every `findOne`/`find`
- Pagination on list endpoints via `PaginationDto` (page, limit)
- Soft deletes not implemented — physical deletes used for nested objects
- Invoice numbers start at `88880001` and increment globally per tenant
- Invoice versioning increments per job (each new invoice for a job increments the version)

### Frontend (Ionic React)

- SPA with `IonReactRouter` + `IonSplitPane` layout (sidemenu + content area)
- `AuthProvider` context wraps the entire app — provides `user`, `login`, `logout`, `updateUser`
- `api.ts` singleton class handles all HTTP requests:
  - In-memory token cache + localStorage fallback
  - Auto-refresh on 401 via Firebase `securetoken.googleapis.com`
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
├── auth/                            # Firebase auth, registration, login
│   ├── auth.module.ts
│   ├── controllers/auth.controller.ts
│   ├── dto/ (register.dto.ts, login.dto.ts)
│   ├── entities/invite-code.entity.ts
│   ├── repositories/
│   └── services/ (auth.service.ts, firebase.service.ts)
├── common/                          # Shared guards, decorators, DTOs, entities, enums
│   ├── common.module.ts
│   ├── guards/ (firebase-auth.guard.ts, tenant.guard.ts)
│   ├── decorators/current-user.decorator.ts
│   ├── dto/pagination.dto.ts
│   ├── entities/ (base.entity.ts, tenant-scoped.entity.ts)
│   └── enums/ (customer-type, invoice-status, job-status, job-line-item-type, user-role, user-status)
├── config/                          # TypeORM data-source + config
│   ├── data-source.ts
│   └── typeorm.config.ts
├── customers/                       # Customer CRUD with nested addresses
│   ├── customer.module.ts
│   ├── controllers/customer.controller.ts
│   ├── dto/ (create-customer.dto.ts, update-customer.dto.ts, create-address.dto.ts, search-customer.dto.ts)
│   ├── entities/ (customer.entity.ts, customer-address.entity.ts)
│   └── services/customer.service.ts
├── invoices/                        # Invoice creation, PDF generation
│   ├── invoice.module.ts
│   ├── controllers/invoice.controller.ts
│   ├── dto/create-invoice.dto.ts
│   ├── entities/invoice.entity.ts
│   └── services/ (invoice.service.ts, pdf.service.ts)
├── jobs/                            # Job CRUD with nested notes + line items
│   ├── job.module.ts
│   ├── controllers/job.controller.ts
│   ├── dto/ (create-job.dto.ts, update-job.dto.ts, query-jobs.dto.ts, create-job-note.dto.ts, create-job-line-item.dto.ts)
│   ├── entities/ (job.entity.ts, job-note.entity.ts, job-line-item.entity.ts)
│   └── services/job.service.ts
├── migrations/                      # TypeORM migrations
├── tenants/                         # Tenant (business) CRUD
│   ├── tenant.module.ts
│   ├── controllers/tenant.controller.ts
│   ├── dto/ (create-tenant.dto.ts, update-tenant.dto.ts)
│   ├── entities/tenant.entity.ts
│   └── services/tenant.service.ts
└── users/                           # User entity
    └── entities/user.entity.ts
```

### Frontend (`web-trade-crm/src/`)

```
src/
├── App.tsx                          # Root app with routing + auth gating
├── main.tsx                         # Entry point
├── components/                      # Reusable components
│   ├── CustomerSearch.tsx           # Debounced customer search + create button
│   ├── Menu.tsx                     # Sidemenu with nav items + logout
│   └── Menu.css
├── contexts/
│   └── AuthContext.tsx              # Auth state provider (user, login, logout, updateUser)
├── pages/                           # Route-level pages
│   ├── AuthPage.tsx                 # Login / Register / Forgot Password
│   ├── Home.tsx                     # Job dashboard (recent jobs, status filter, load more)
│   ├── CreateTenantPage.tsx         # Initial tenant (business) setup
│   ├── ManageBusinessPage.tsx       # Edit tenant details
│   ├── CreateJobPage.tsx            # Create job (search customer → add items → save)
│   ├── JobDetailPage.tsx            # Full job view: summary, notes, line items, costing, invoices
│   ├── ManageCustomersPage.tsx      # Search + edit customer details + addresses
│   ├── CreateCustomerPage.tsx       # Create new customer with addresses
│   └── InvoicePreviewPage.tsx       # Full-page PDF viewer via iframe
├── services/                        # API and utility services
│   ├── api.ts                       # HTTP client (token mgmt, auth, all endpoints)
│   ├── pdfCache.ts                  # In-memory PDF blob cache + download helper
│   ├── format.ts                    # Invoice number formatting (8-digit padded with optional space)
│   └── validation.ts                # Client-side validation helpers (email, phone)
└── theme/
    └── variables.css                # Ionic theme overrides
```

---

## Data Model (Key Entities)

### TenantScopedEntity (base class)

- All tenant-owned entities extend this
- Fields: `id` (UUID), `createdAt`, `updatedAt`, `tenantId`

### Tenant

- `businessName`, `businessEmail`, `phone`, `defaultTaxPercent`, `invoicePaymentMethodNote`

### User

- `email`, `firstName`, `lastName`, `firebaseUid`, `status`, `role`, `tenantId?`

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

## API Endpoints

### Auth

- `POST /auth/login` — Firebase sign-in + local user lookup
- `POST /auth/register` — Create user with invite code

### Customers

- `POST /customers` — Create customer + addresses (transaction)
- `GET /customers/search?q=` — Fuzzy search across customer + address fields
- `GET /customers/:id` — Get customer with addresses + jobs
- `PATCH /customers/:id` — Update customer + replace addresses

### Jobs

- `POST /jobs` — Create job
- `GET /jobs` — Paginated list with optional status filter
- `GET /jobs/:id` — Get job with customer, address, notes (with user), line items, invoices
- `PATCH /jobs/:id` — Update job fields + replace notes + replace line items

### Invoices

- `POST /jobs/:jobId/invoices` — Create invoice (snapshots job data, supersedes DRAFTs)
- `PATCH /invoices/:invoiceId` — Update invoice status (PAID sets paidAt timestamp)
- `GET /invoices/:invoiceId/pdf` — Generate and download PDF via Playwright + Handlebars

### Tenants

- `POST /tenants` — Create tenant
- `PATCH /tenants/:id` — Update tenant (business details)

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

### PDF Generation

- Handlebars templates compiled at service startup
- Playwright Chromium browser for HTML→PDF conversion
- Invoice snapshots stored as JSONB at creation time
- Template path resolved via `path.join(__dirname, '..', 'templates', 'invoice.hbs')`
