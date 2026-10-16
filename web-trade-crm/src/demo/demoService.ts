import tenantSeed from "./api/tenant.json";
import customersSeed from "./api/customers.json";
import jobsSeed from "./api/jobs.json";
import catalogItemsSeed from "./api/catalogItems.json";
import feedbackSeed from "./api/feedback.json";
import type {
  CustomerResult,
  JobResult,
  JobDetailResult,
  JobLineItemResult,
  JobNoteResult,
  InvoiceResult,
  InvoiceEmailAttemptResult,
  PaginatedJobsResponse,
  PaginatedCustomersResponse,
  PaginatedCatalogItemsResponse,
  PaginatedFeedbackResponse,
  CreateTenantPayload,
  UpdateTenantPayload,
  CreateTenantResponse,
  CreateCustomerPayload,
  CreateJobPayload,
  CreateJobLineItemPayload,
  CreateCatalogItemPayload,
  CreateFeedbackPayload,
  CatalogItemResult,
  FeedbackResult,
  CreateContactSubmissionPayload,
  ContactSubmissionResult,
  CatalogMatchResponse,
  CatalogMatchSuggestion,
  AiEstimatorUsage,
} from "../services/api";

/** Mirrors the API's catalog search token cap (`CatalogService.MAX_SEARCH_TOKENS`). */
const DEMO_CATALOG_SEARCH_TOKEN_LIMIT = 12;

// ---------------------------------------------------------------------------
// In-memory store – re-initialized from seed on every page load
// ---------------------------------------------------------------------------

let tenant: typeof tenantSeed = structuredClone(tenantSeed);
const customers: CustomerResult[] = structuredClone(
  customersSeed,
) as unknown as CustomerResult[];
const jobs: JobSeed[] = structuredClone(jobsSeed);
const catalogItems: CatalogItemResult[] = structuredClone(catalogItemsSeed);
const feedbackSubmissions: FeedbackResult[] = structuredClone(feedbackSeed);

interface JobSeed {
  id: string;
  title: string;
  description?: string;
  status: string;
  createdAt: string;
  customerId: string;
  customerAddressId: string;
  notes: JobNoteSeed[];
  lineItems: JobLineItemResult[];
  invoices: InvoiceResult[];
}

interface JobNoteSeed {
  id: string;
  note: string;
  createdAt: string;
  user: { id: string; firstName: string; lastName: string };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

let nextInvoiceNumber = 2000;

function getCustomer(id: string): CustomerResult | undefined {
  return customers.find((c) => c.id === id);
}

function buildJobDetail(j: JobSeed): JobDetailResult {
  const cust = getCustomer(j.customerId);
  const addr = cust?.addresses?.find((a) => a.id === j.customerAddressId);
  return {
    id: j.id,
    title: j.title,
    description: j.description,
    status: j.status,
    createdAt: j.createdAt,
    customer: {
      id: j.customerId,
      firstName: cust?.firstName ?? "",
      lastName: cust?.lastName ?? "",
      companyName: cust?.companyName ?? undefined,
      phone: cust?.phone ?? "",
      email: cust?.email,
    },
    customerAddress: {
      id: j.customerAddressId,
      addressLine1: addr?.addressLine1 ?? "",
      city: addr?.city ?? "",
      stateProvince: addr?.stateProvince ?? "",
    },
    notes: j.notes.map((n) => ({
      id: n.id,
      note: n.note,
      createdAt: n.createdAt,
      user: { ...n.user },
    })),
    lineItems: j.lineItems.map((li) => ({ ...li })),
    invoices: j.invoices.map((inv) => ({
      ...inv,
      emailAttempts: inv.emailAttempts ?? [],
    })),
  };
}

function buildJobResult(j: JobSeed): JobResult {
  const cust = getCustomer(j.customerId);
  return {
    id: j.id,
    title: j.title,
    description: j.description,
    status: j.status,
    createdAt: j.createdAt,
    customer: {
      id: j.customerId,
      firstName: cust?.firstName ?? "",
      lastName: cust?.lastName ?? "",
      companyName: cust?.companyName ?? undefined,
      phone: cust?.phone ?? "",
    },
    customerAddress: {
      id: j.customerAddressId,
      addressLine1: "",
      city: "",
      stateProvince: "",
    },
  };
}

// Which seeded invoice IDs have a pre-generated PDF available.
// Filenames follow the pattern: {tenantId}-{invoiceNumber}-invoice.pdf
const seedInvoicePdfIds = new Set<string>(["demo-inv-1", "demo-inv-2"]);

/**
 * Get the invoice number for a given invoice ID from the seed jobs data.
 */
function findInvoiceNumber(invoiceId: string): number | undefined {
  for (const j of jobs) {
    const inv = j.invoices.find((i) => i.id === invoiceId);
    if (inv) {
      return inv.invoiceNumber;
    }
  }
  return undefined;
}

/**
 * Build the public URL for a pre-generated demo invoice PDF.
 * Files live in public/demo/invoice-pdfs/ and are served at /demo/invoice-pdfs/.
 * Filenames follow the pattern: {tenantId}-{invoiceNumber}-invoice.pdf
 */
function buildInvoicePdfUrl(invoiceId: string): string | undefined {
  const invoiceNumber = findInvoiceNumber(invoiceId);
  if (!invoiceNumber) return undefined;
  return `/demo/invoice-pdfs/${tenant.id}-${invoiceNumber}-invoice.pdf`;
}

// ---------------------------------------------------------------------------
// AI service estimator (demo mode)
// ---------------------------------------------------------------------------
//
// Demo mode never calls the backend or Anthropic. Instead the estimator is
// backed by a single hardcoded example prompt that maps to a *defined* catalog
// output built from the demo catalog fixtures. The prompt is pre-filled into
// the (read-only) input, and anything else returns a friendly no-match message,
// so the demo stays offline, deterministic and free while still mirroring the
// real endpoint's response shape.

interface DemoEstimatorMatch {
  catalogItemId: string;
  quantity: number;
  matchReason: string;
}

/** The one prompt the demo recognises; shown pre-filled and read-only. */
const DEMO_ESTIMATOR_PROMPT =
  "Replace two outdoor light fixtures, inspect the existing wiring, and supply weatherproof fittings.";

/** The defined catalog output that prompt maps to. */
const DEMO_ESTIMATOR_MATCHES: DemoEstimatorMatch[] = [
  {
    catalogItemId: "demo-catalog-13",
    quantity: 2,
    matchReason: "Replaces the two light fixtures",
  },
  {
    catalogItemId: "demo-catalog-14",
    quantity: 1,
    matchReason: "Covers the wiring inspection",
  },
  {
    catalogItemId: "demo-catalog-15",
    quantity: 1,
    matchReason: "Supplies the weatherproof fittings",
  },
];

/** Demo-only budget mirror; resets on page reload (the real one is per hour). */
const DEMO_AI_LIMIT = 3;
const DEMO_AI_WINDOW_MS = 60 * 60 * 1000;
let demoAiUsed = 0;
let demoAiWindowStart = Date.now();

function demoAiUsage(): AiEstimatorUsage {
  const now = Date.now();
  if (now - demoAiWindowStart >= DEMO_AI_WINDOW_MS) {
    demoAiWindowStart = now;
    demoAiUsed = 0;
  }
  return {
    limit: DEMO_AI_LIMIT,
    used: demoAiUsed,
    remaining: Math.max(0, DEMO_AI_LIMIT - demoAiUsed),
    resetAt: new Date(demoAiWindowStart + DEMO_AI_WINDOW_MS).toISOString(),
  };
}

/** Punctuation/whitespace-insensitive, so users needn't match exactly. */
function normalizeDescription(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

/** Build the defined output from the demo catalog fixtures. */
function buildDemoSuggestions(
  matches: DemoEstimatorMatch[],
): CatalogMatchSuggestion[] {
  const suggestions: CatalogMatchSuggestion[] = [];
  for (const match of matches) {
    const item = catalogItems.find((c) => c.id === match.catalogItemId);
    if (!item) continue; // Fixture missing — omit rather than invent one.
    suggestions.push({
      catalogItemId: item.id,
      type: item.type,
      description: item.description,
      unitPrice: Number(item.unitPrice),
      quantity: match.quantity,
      matchReason: match.matchReason,
    });
  }
  return suggestions;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export const demoService = {
  // ---- Tenant ----
  getTenant() {
    return { ...tenant };
  },

  createTenant(payload: CreateTenantPayload): CreateTenantResponse {
    const updated = {
      id: "demo-tenant-1",
      businessName: payload.businessName,
      businessEmail: payload.businessEmail,
      phone: payload.phone ?? undefined,
      defaultTaxPercent: payload.defaultTaxPercent ?? 13,
      invoicePaymentMethodNote: payload.invoicePaymentMethodNote ?? undefined,
    };
    tenant = updated as typeof tenantSeed;
    return updated as CreateTenantResponse;
  },

  updateTenant(
    _tenantId: string,
    payload: UpdateTenantPayload,
  ): CreateTenantResponse {
    const updated = { ...tenant, ...payload };
    tenant = updated;
    return updated as unknown as CreateTenantResponse;
  },

  // ---- Customers ----
  searchCustomers(q: string): CustomerResult[] {
    const lower = q.toLowerCase();
    return customers.filter(
      (c) =>
        c.firstName.toLowerCase().includes(lower) ||
        c.lastName.toLowerCase().includes(lower) ||
        (c.companyName && c.companyName.toLowerCase().includes(lower)) ||
        c.phone.includes(q),
    );
  },

  fetchCustomers(page: number, limit: number): PaginatedCustomersResponse {
    const total = customers.length;
    const totalPages = Math.max(1, Math.ceil(total / limit));
    const start = (page - 1) * limit;
    const data = customers
      .slice(start, start + limit)
      .map((c) => ({ ...c, addresses: c.addresses?.map((a) => ({ ...a })) }));
    return { data, meta: { page, limit, total, totalPages } };
  },

  fetchCustomer(id: string): CustomerResult {
    const c = customers.find((c) => c.id === id);
    if (!c) throw new Error("Customer not found");
    return { ...c, addresses: c.addresses?.map((a) => ({ ...a })) };
  },

  createCustomer(payload: CreateCustomerPayload): CustomerResult {
    const newCustomer: CustomerResult = {
      id: `demo-customer-${Date.now()}`,
      type: payload.type ?? "RESIDENTIAL",
      firstName: payload.firstName,
      lastName: payload.lastName,
      companyName: payload.companyName ?? undefined,
      phone: payload.phone,
      email: payload.email ?? undefined,
      notes: payload.notes ?? undefined,
      addresses: payload.addresses?.map((a, i) => ({
        id: `demo-addr-${Date.now()}-${i}`,
        addressLine1: a.addressLine1,
        addressLine2: a.addressLine2 ?? undefined,
        city: a.city,
        stateProvince: a.stateProvince,
        zipPostalCode: a.zipPostalCode,
        isDefault: a.isDefault ?? i === 0,
      })),
    };
    customers.push(newCustomer);
    return { ...newCustomer };
  },

  updateCustomer(id: string, payload: CreateCustomerPayload): CustomerResult {
    const idx = customers.findIndex((c) => c.id === id);
    if (idx === -1) throw new Error("Customer not found");
    const existing = customers[idx];
    const existingAddresses = existing.addresses || [];
    // Reconcile addresses positionally, like the API does: existing rows keep
    // their id, new rows get one, and surplus rows are dropped — so a job's
    // customerAddressId keeps resolving after an edit.
    const addresses = payload.addresses.map((a, i) => ({
      id: existingAddresses[i]?.id ?? `demo-addr-${Date.now()}-${i}`,
      addressLine1: a.addressLine1,
      addressLine2: a.addressLine2 ?? undefined,
      city: a.city,
      stateProvince: a.stateProvince,
      zipPostalCode: a.zipPostalCode,
      isDefault: a.isDefault ?? i === 0,
    }));
    const updated: CustomerResult = {
      ...existing,
      type: payload.type,
      firstName: payload.firstName,
      lastName: payload.lastName,
      companyName: payload.companyName ?? undefined,
      phone: payload.phone,
      email: payload.email ?? undefined,
      notes: payload.notes ?? undefined,
      addresses,
    };
    customers[idx] = updated;
    return { ...updated, addresses: addresses.map((a) => ({ ...a })) };
  },

  // ---- Catalog items ----
  fetchCatalogItems(
    page: number,
    limit: number,
    types?: string[],
    q?: string,
  ): PaginatedCatalogItemsResponse {
    // Token search mirroring the API's CatalogService.findAll: every
    // whitespace-separated token must appear in at least one field (AND across
    // tokens, OR across fields), so word order and which field matched don't
    // matter. Kept in sync with the server on purpose — see demo mode parity.
    const tokens = (q ?? "")
      .trim()
      .toLowerCase()
      .split(/\s+/)
      .filter((token) => token.length > 0)
      .slice(0, DEMO_CATALOG_SEARCH_TOKEN_LIMIT);
    const filtered = catalogItems.filter((item) => {
      if (types && types.length > 0 && !types.includes(item.type)) {
        return false;
      }
      if (tokens.length === 0) {
        return true;
      }
      const haystacks = [
        item.description,
        item.type,
        String(item.unitPrice),
      ].map((field) => field.toLowerCase());
      return tokens.every((token) =>
        haystacks.some((field) => field.includes(token)),
      );
    });
    filtered.sort(
      (a, b) =>
        new Date(b.createdAt ?? 0).getTime() -
        new Date(a.createdAt ?? 0).getTime(),
    );
    const total = filtered.length;
    const totalPages = Math.max(1, Math.ceil(total / limit));
    const start = (page - 1) * limit;
    const data = filtered.slice(start, start + limit).map((item) => ({ ...item }));
    return { data, meta: { page, limit, total, totalPages } };
  },

  fetchCatalogItem(id: string): CatalogItemResult {
    const item = catalogItems.find((i) => i.id === id);
    if (!item) throw new Error("Catalog item not found");
    return { ...item };
  },

  createCatalogItem(payload: CreateCatalogItemPayload): CatalogItemResult {
    const newItem: CatalogItemResult = {
      id: `demo-catalog-${Date.now()}`,
      type: payload.type,
      description: payload.description,
      unitPrice: payload.unitPrice,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    catalogItems.unshift(newItem);
    return { ...newItem };
  },

  updateCatalogItem(
    id: string,
    payload: Record<string, unknown>,
  ): CatalogItemResult {
    const idx = catalogItems.findIndex((i) => i.id === id);
    if (idx === -1) throw new Error("Catalog item not found");
    catalogItems[idx] = {
      ...catalogItems[idx],
      ...payload,
    } as CatalogItemResult;
    return { ...catalogItems[idx] };
  },

  deleteCatalogItem(id: string): void {
    const idx = catalogItems.findIndex((i) => i.id === id);
    if (idx === -1) throw new Error("Catalog item not found");
    catalogItems.splice(idx, 1);
    // Reference cleanup mirrors the real API's ON DELETE SET NULL:
    // line items keep their snapshotted values, only the reference clears.
    for (const j of jobs) {
      for (const li of j.lineItems) {
        if (li.catalogItemId === id) {
          delete li.catalogItemId;
        }
      }
    }
  },

  // ---- Feedback ----
  fetchFeedback(page: number, limit: number): PaginatedFeedbackResponse {
    // Mirror the real API (FeedbackService.findAll orders by createdAt DESC).
    const sorted = [...feedbackSubmissions].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
    const total = sorted.length;
    const totalPages = Math.max(1, Math.ceil(total / limit));
    const start = (page - 1) * limit;
    const data = sorted.slice(start, start + limit).map((f) => ({ ...f }));
    return { data, meta: { page, limit, total, totalPages } };
  },

  submitFeedback(payload: CreateFeedbackPayload): FeedbackResult {
    // Tenant/author mirror the demo account in AuthContext (demoUser).
    const submission: FeedbackResult = {
      id: `demo-feedback-${Date.now()}`,
      type: payload.type,
      subject: payload.subject?.trim() || undefined,
      message: payload.message.trim(),
      userId: "demo-user-1",
      userEmail: "demo@sprout-crm.com",
      createdAt: new Date().toISOString(),
    };
    feedbackSubmissions.unshift(submission);
    return { ...submission };
  },

  /**
   * Mirrors `POST /contact`. Nothing is stored: the public contact form is only
   * reachable when the app is *not* in demo mode (demo mode is an authenticated
   * session), so this exists purely to keep the api client's demo branch
   * honest.
   */
  submitContact(
    payload: CreateContactSubmissionPayload,
  ): ContactSubmissionResult {
    return {
      id: `demo-contact-${Date.now()}`,
      type: payload.type,
      email: payload.email.trim(),
      subject: payload.subject?.trim() || undefined,
      message: payload.message.trim(),
      createdAt: new Date().toISOString(),
    };
  },

  // ---- Jobs ----
  fetchJobs(
    page: number,
    limit: number,
    status?: string,
  ): PaginatedJobsResponse {
    // Mirror the real API (JobService.findAll orders by createdAt DESC).
    let filtered = [...jobs].sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
    if (status) {
      filtered = filtered.filter((j) => j.status === status);
    }
    const total = filtered.length;
    const totalPages = Math.max(1, Math.ceil(total / limit));
    const start = (page - 1) * limit;
    const data = filtered.slice(start, start + limit).map(buildJobResult);
    return { data, meta: { page, limit, total, totalPages } };
  },

  fetchJob(id: string): JobDetailResult {
    const j = jobs.find((j) => j.id === id);
    if (!j) throw new Error("Job not found");
    return buildJobDetail(j);
  },

  createJob(payload: CreateJobPayload): JobDetailResult {
    const newJob: JobSeed = {
      id: `demo-job-${Date.now()}`,
      title: payload.title,
      description: payload.description ?? undefined,
      status: "DRAFT",
      createdAt: new Date().toISOString(),
      customerId: payload.customerId,
      customerAddressId: payload.customerAddressId,
      notes: [],
      lineItems: [],
      invoices: [],
    };
    jobs.unshift(newJob);
    return buildJobDetail(newJob);
  },

  updateJob(id: string, payload: Record<string, unknown>): void {
    const idx = jobs.findIndex((j) => j.id === id);
    if (idx === -1) throw new Error("Job not found");
    // Notes and line items have their own endpoints, mirroring the API where
    // PATCH /jobs/:id only accepts job fields.
    delete payload.notes;
    delete payload.lineItems;
    // Apply remaining scalar fields
    Object.assign(jobs[idx], payload);
  },

  createJobLineItem(
    jobId: string,
    payload: CreateJobLineItemPayload,
  ): JobLineItemResult {
    const job = jobs.find((j) => j.id === jobId);
    if (!job) throw new Error("Job not found");

    const item: JobLineItemResult = {
      ...payload,
      id: `demo-li-${Date.now()}`,
    };
    job.lineItems.push(item);

    return { ...item };
  },

  deleteJobLineItem(jobId: string, lineItemId: string): { success: true } {
    const job = jobs.find((j) => j.id === jobId);
    if (!job) throw new Error("Job not found");

    const remaining = job.lineItems.filter((li) => li.id !== lineItemId);
    if (remaining.length === job.lineItems.length) {
      throw new Error("Line item not found");
    }
    job.lineItems = remaining;

    return { success: true };
  },

  createJobNote(
    jobId: string,
    payload: { note: string; userId: string },
  ): JobNoteResult {
    const job = jobs.find((j) => j.id === jobId);
    if (!job) throw new Error("Job not found");

    const note: JobNoteSeed = {
      id: `demo-note-${Date.now()}`,
      note: payload.note,
      createdAt: new Date().toISOString(),
      user: { id: payload.userId, firstName: "Demo", lastName: "User" },
    };
    job.notes.push(note);

    return { ...note, user: { ...note.user } };
  },

  // ---- Invoices ----
  createInvoice(
    jobId: string,
    payload: {
      subtotal: number;
      taxPercent: number;
      taxAmount: number;
      total: number;
    },
  ): InvoiceResult {
    const j = jobs.find((j) => j.id === jobId);
    if (!j) throw new Error("Job not found");
    const invoice: InvoiceResult = {
      id: `demo-inv-${Date.now()}`,
      invoiceNumber: nextInvoiceNumber++,
      version: 1,
      status: "DRAFT",
      subtotal: payload.subtotal,
      taxPercent: payload.taxPercent,
      taxAmount: payload.taxAmount,
      total: payload.total,
      createdAt: new Date().toISOString(),
      emailAttempts: [],
    };
    // Match real backend ordering: invoices are returned newest-first (createdAt DESC)
    j.invoices.unshift(invoice);
    return { ...invoice };
  },

  updateInvoiceStatus(invoiceId: string, status: string): void {
    for (const j of jobs) {
      const inv = j.invoices.find((i) => i.id === invoiceId);
      if (inv) {
        inv.status = status;
        return;
      }
    }
    throw new Error("Invoice not found");
  },

  sendInvoiceEmail(invoiceId: string): InvoiceEmailAttemptResult {
    for (const j of jobs) {
      const inv = j.invoices.find((i) => i.id === invoiceId);
      if (!inv) continue;
      const cust = getCustomer(j.customerId);
      const recipientEmail = cust?.email;
      if (!recipientEmail) {
        throw new Error(
          "Customer has no email on file. Add one before sending the invoice.",
        );
      }

      const attempt: InvoiceEmailAttemptResult = {
        id: `demo-attempt-${Date.now()}`,
        status: "PENDING",
        recipientEmail,
        fromEmail: tenant.businessEmail,
        subject: `Invoice ${inv.invoiceNumber} from ${tenant.businessName}`,
        createdAt: new Date().toISOString(),
      };

      inv.emailAttempts = [
        attempt,
        ...(inv.emailAttempts ?? []),
      ].sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      );

      // Simulate background delivery completing ~2s later.
      // Emails containing "fail@" (or ending ".fail") simulate a delivery
      // error so the ERROR state is exercisable in demo mode.
      setTimeout(() => {
        const current = inv?.emailAttempts?.find((a) => a.id === attempt.id);
        if (current) {
          if (
            recipientEmail.includes("fail@") ||
            recipientEmail.endsWith(".fail")
          ) {
            current.status = "FAILED";
            current.errorMessage =
              "Email address is not verified with SES (simulated failure)";
          } else {
            current.status = "SENT";
            current.sentAt = new Date().toISOString();
            current.messageId = "demo-ses-message-id";
          }
        }
      }, 2000);

      return { ...attempt };
    }
    throw new Error("Invoice not found");
  },

  fetchInvoiceEmailAttempts(invoiceId: string): InvoiceEmailAttemptResult[] {
    for (const j of jobs) {
      const inv = j.invoices.find((i) => i.id === invoiceId);
      if (inv) {
        return [...(inv.emailAttempts ?? [])];
      }
    }
    throw new Error("Invoice not found");
  },

  async downloadInvoicePdf(invoiceId: string): Promise<Blob> {
    // Only pre-generated seed invoice PDFs are available in demo mode
    if (!seedInvoicePdfIds.has(invoiceId)) {
      throw new Error(
        "Cannot generate new PDFs in demo mode. Please select an existing one for preview or download.",
      );
    }

    // Fetch the pre-generated PDF from the public static assets
    const pdfUrl = buildInvoicePdfUrl(invoiceId);
    if (!pdfUrl) {
      throw new Error(
        "Cannot generate new PDFs in demo mode. Please select an existing one for preview or download.",
      );
    }
    const res = await fetch(pdfUrl);
    if (!res.ok) {
      throw new Error(
        "Cannot generate new PDFs in demo mode. Please select an existing one for preview or download.",
      );
    }
    return res.blob();
  },

  // ---- AI service estimator (demo: one fixed prompt, no provider call) ----
  /** The fixed prompt the demo pre-fills; the caller gates this on demo mode. */
  getEstimatorDemoPrompt(): string | null {
    return DEMO_ESTIMATOR_PROMPT;
  },

  fetchAiEstimatorUsage(): AiEstimatorUsage {
    return demoAiUsage();
  },

  /**
   * Mirrors POST /ai/catalog-matches without any network/provider call: the
   * description is compared with the one fixed demo prompt and, when it
   * matches, returns a defined set of suggestions built from the demo catalog.
   */
  matchCatalog(description: string): CatalogMatchResponse {
    const usage = demoAiUsage();
    if (usage.remaining <= 0) {
      throw new Error(
        "Demo limit reached — the estimator allows 3 requests per hour. Reload the page to reset the demo.",
      );
    }

    const matches =
      normalizeDescription(description) ===
      normalizeDescription(DEMO_ESTIMATOR_PROMPT)
        ? DEMO_ESTIMATOR_MATCHES
        : null;

    // Count accepted submissions, like the real endpoint (which consumes the
    // budget before the provider call).
    demoAiUsed += 1;

    if (!matches) {
      return {
        suggestions: [],
        followUpQuestions: [],
        message:
          "Demo mode only recognises its one example prompt. Use the pre-filled example to see a defined catalog result.",
        usage: demoAiUsage(),
      };
    }

    return {
      suggestions: buildDemoSuggestions(matches),
      followUpQuestions: [],
      usage: demoAiUsage(),
    };
  },
};
