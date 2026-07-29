# Sprout CRM — Frontend

Ionic React SPA for the Sprout CRM multi-tenant trade business application.

## Tech Stack

- **Framework**: Ionic 8 + React 19
- **Build Tool**: Vite 5
- **Routing**: React Router 5 + Ionic React Router
- **Testing**: Vitest (unit) + Cypress (E2E)

## Local Development

### Prerequisites

- Node.js 20+
- The backend API must be running (see `api-trade-crm/README.md`)

### Setup

```bash
npm install
npm run dev
```

The app will be available at `http://localhost:8100`.

### Environment Variables

Set at build time:

| Variable        | Description          | Default                 |
| --------------- | -------------------- | ----------------------- |
| `VITE_API_BASE` | Backend API base URL | `http://localhost:3000` |

## Available Scripts

| Command             | Description              |
| ------------------- | ------------------------ |
| `npm run dev`       | Start dev server         |
| `npm run build`     | Build for production     |
| `npm run preview`   | Preview production build |
| `npm run test.unit` | Run unit tests (Vitest)  |
| `npm run test.e2e`  | Run E2E tests (Cypress)  |
| `npm run lint`      | Run ESLint               |

## Project Structure

```
src/
├── App.tsx                    # Root app with routing + auth gating
├── main.tsx                   # Entry point
├── components/                # Reusable components
│   ├── CustomerSearch.tsx     # Debounced customer search combobox
│   └── Menu.tsx               # Sidemenu with nav items + logout
├── contexts/
│   └── AuthContext.tsx         # Auth state, login, logout, updateUser
├── pages/                     # Route-level pages
│   ├── AuthPage.tsx           # Login + register + forgot password
│   ├── Home.tsx               # Job list dashboard
│   ├── CreateTenantPage.tsx   # Business profile creation
│   ├── ManageBusinessPage.tsx # Edit business profile
│   ├── CreateCustomerPage.tsx # Create customer form
│   ├── ManageCustomersPage.tsx# Search + edit customers
│   ├── CreateJobPage.tsx      # Create job form
│   ├── JobDetailPage.tsx      # Job details + notes + line items + invoices
│   └── InvoicePreviewPage.tsx # Full-page PDF preview
├── services/
│   ├── api.ts                 # HTTP client with token management
│   ├── format.ts              # Phone, invoice number formatting
│   ├── validation.ts          # Email, phone validation helpers
│   └── pdfCache.ts            # In-memory PDF blob cache
└── theme/
    └── variables.css          # Ionic theme overrides
```

## Key Features

- **Authentication**: Login, register with invite code, forgot password flow
- **Multi-tenant**: Each user belongs to a business (tenant)
- **Customer Management**: Create, search, edit customers with addresses
- **Job Management**: Create jobs, add notes and line items, track status
- **Invoicing**: Create invoices with snapshots, PDF generation, status management
- **PDF Preview**: Full-page iframe preview with download
- **Token Refresh**: Automatic transparent token refresh via backend
- **Global Auth**: Auto-logout on 401 responses

## Architecture Notes

- Singleton `api.ts` class handles all HTTP — never use raw `fetch` outside of it
- Every request sends `Authorization: Bearer <idToken>` and `x-refresh-token` headers
- Token refresh is transparent: the backend returns `x-new-id-token` on refresh
- On 401 response, tokens are cleared and user is redirected to login
- Pages use Ionic lifecycle hooks (`useIonViewWillEnter`) for data loading
- Error toasts require manual dismiss (never auto-hide)
- Phone inputs use `inputMode="numeric"` with live formatting

## Deployment

The frontend is live at **https://sprout-crm.com** (via CloudFront + Cloudflare).

### Build for Production

```bash
VITE_API_BASE=https://api.sprout-crm.com npm run build
```

### Deploy to S3

```bash
aws s3 sync dist/ s3://sprout-crm-web/ --delete
```

### Docker Build (for containerized deployment)

```bash
docker build -t sprout-crm-web .
```
