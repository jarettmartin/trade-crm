import tenantSeed from "./api/tenant.json";
import customersSeed from "./api/customers.json";
import jobsSeed from "./api/jobs.json";
import type {
  CustomerResult,
  JobResult,
  JobDetailResult,
  JobNoteResult,
  JobLineItemResult,
  InvoiceResult,
  PaginatedJobsResponse,
  CreateTenantPayload,
  UpdateTenantPayload,
  CreateTenantResponse,
  CreateCustomerPayload,
  CreateJobPayload,
} from "../services/api";

// ---------------------------------------------------------------------------
// In-memory store – re-initialized from seed on every page load
// ---------------------------------------------------------------------------

let tenant: typeof tenantSeed = structuredClone(tenantSeed);
let customers: CustomerResult[] = structuredClone(
  customersSeed,
) as unknown as CustomerResult[];
let jobs: JobSeed[] = structuredClone(jobsSeed);

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
    invoices: j.invoices.map((inv) => ({ ...inv })),
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

  updateCustomer(id: string, payload: Record<string, unknown>): CustomerResult {
    const idx = customers.findIndex((c) => c.id === id);
    if (idx === -1) throw new Error("Customer not found");
    customers[idx] = { ...customers[idx], ...payload } as CustomerResult;
    return { ...customers[idx] };
  },

  // ---- Jobs ----
  fetchJobs(
    page: number,
    limit: number,
    status?: string,
  ): PaginatedJobsResponse {
    let filtered = [...jobs];
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
    // Handle special nested fields
    if (payload.notes) {
      jobs[idx].notes = payload.notes as JobNoteSeed[];
      delete payload.notes;
    }
    if (payload.lineItems) {
      jobs[idx].lineItems = payload.lineItems as JobLineItemResult[];
      delete payload.lineItems;
    }
    // Apply remaining scalar fields
    Object.assign(jobs[idx], payload);
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
    };
    j.invoices.push(invoice);
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
};
