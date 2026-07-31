import { demoService } from "../demo/demoService";

const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:3000";

const ID_TOKEN_KEY = "trade_crm_id_token";
const REFRESH_TOKEN_KEY = "trade_crm_refresh_token";

export interface LoginResponse {
  idToken: string;
  refreshToken: string;
  expiresIn: string;
  localId: string;
  user: {
    id: string;
    email: string;
    status: string;
    role: string;
    firstName: string;
    lastName: string;
    tenantId?: string;
    businessName?: string;
    businessEmail?: string;
    phone?: string;
    defaultTaxPercent?: number;
    invoicePaymentMethodNote?: string;
  };
}

export interface RegisterPayload {
  email: string;
  password: string;
  inviteCode: string;
}

export interface RegisterResponse {
  id: string;
  email: string;
  status: string;
}

export interface CreateTenantPayload {
  businessName: string;
  businessEmail: string;
  phone?: string;
  defaultTaxPercent?: number;
  invoicePaymentMethodNote?: string;
}

export interface CreateTenantResponse {
  id: string;
  businessName: string;
  businessEmail: string;
  phone?: string;
  defaultTaxPercent?: number;
  invoicePaymentMethodNote?: string;
}

export interface UpdateTenantPayload {
  businessName?: string;
  businessEmail?: string;
  phone?: string;
  defaultTaxPercent?: number;
  invoicePaymentMethodNote?: string;
}

export interface CustomerResult {
  id: string;
  type: string;
  firstName: string;
  lastName: string;
  companyName?: string;
  phone: string;
  email?: string;
  notes?: string;
  addresses?: Array<{
    id: string;
    addressLine1: string;
    addressLine2?: string;
    city: string;
    stateProvince: string;
    zipPostalCode: string;
    isDefault: boolean;
  }>;
}

export interface CreateCustomerPayload {
  type: string;
  firstName: string;
  lastName: string;
  companyName?: string;
  phone: string;
  email?: string;
  notes?: string;
  addresses: Array<{
    label: string;
    addressLine1: string;
    addressLine2?: string;
    city: string;
    stateProvince: string;
    zipPostalCode: string;
    countryCode: string;
    isDefault?: boolean;
  }>;
}

export interface CreateJobPayload {
  customerId: string;
  customerAddressId: string;
  title: string;
  description?: string;
}

export interface JobResult {
  id: string;
  title: string;
  description?: string;
  status: string;
  createdAt: string;
  customer: {
    id: string;
    firstName: string;
    lastName: string;
    companyName?: string;
    phone: string;
  };
  customerAddress: {
    id: string;
    addressLine1: string;
    city: string;
    stateProvince: string;
  };
}

export interface PaginatedJobsResponse {
  data: JobResult[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface JobNoteResult {
  id: string;
  note: string;
  createdAt: string;
  user: {
    id: string;
    firstName: string;
    lastName: string;
  };
}

export interface JobLineItemResult {
  id: string;
  type: string;
  description: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
  sortOrder: number;
}

export interface InvoiceResult {
  id: string;
  invoiceNumber: number;
  version: number;
  status: string;
  subtotal: number;
  taxPercent: number;
  taxAmount: number;
  total: number;
  createdAt: string;
}

export interface JobDetailResult {
  id: string;
  title: string;
  description?: string;
  status: string;
  createdAt: string;
  customer: {
    id: string;
    firstName: string;
    lastName: string;
    companyName?: string;
    phone: string;
  };
  customerAddress: {
    id: string;
    addressLine1: string;
    city: string;
    stateProvince: string;
  };
  notes: JobNoteResult[];
  lineItems: JobLineItemResult[];
  invoices: InvoiceResult[];
}

class ApiService {
  private baseUrl = API_BASE;
  private idToken: string | null = null;
  private refreshToken: string | null = null;
  private onUnauthorizedCallback: (() => void) | null = null;
  private demoMode = false;

  onUnauthorized(callback: () => void) {
    this.onUnauthorizedCallback = callback;
  }

  setDemoMode(enabled: boolean) {
    this.demoMode = enabled;
  }

  isDemoMode(): boolean {
    return this.demoMode;
  }

  setTokens(idToken: string, refreshToken: string) {
    this.idToken = idToken;
    this.refreshToken = refreshToken;
    localStorage.setItem(ID_TOKEN_KEY, idToken);
    localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
  }

  clearTokens() {
    this.idToken = null;
    this.refreshToken = null;
    localStorage.removeItem(ID_TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
  }

  private async request<T>(
    path: string,
    options: RequestInit = {},
  ): Promise<T> {
    const token = this.idToken || localStorage.getItem(ID_TOKEN_KEY);
    const rt =
      this.refreshToken || localStorage.getItem(REFRESH_TOKEN_KEY) || "";

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      ...((options.headers as Record<string, string>) || {}),
    };

    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
      headers["x-refresh-token"] = rt;
    }

    const res = await fetch(`${this.baseUrl}${path}`, {
      ...options,
      headers,
    });

    // If the backend refreshed the token, capture the new token
    const newToken = res.headers.get("x-new-id-token");
    if (newToken) {
      this.idToken = newToken;
      localStorage.setItem(ID_TOKEN_KEY, newToken);
    }

    const data = await res.json();

    if (!res.ok) {
      // If the server returned 401, the token is fully expired — log out
      if (res.status === 401) {
        this.clearTokens();
        this.onUnauthorizedCallback?.();
      }
      const message = data.message || data.error?.message || "Request failed";
      throw new Error(Array.isArray(message) ? message[0] : message);
    }

    return data as T;
  }

  private authHeaders(): HeadersInit {
    return {};
  }

  async login(email: string, password: string) {
    const res = await this.request<LoginResponse>("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });
    this.setTokens(res.idToken, res.refreshToken);
    return res;
  }

  async register(payload: RegisterPayload) {
    return this.request<RegisterResponse>("/auth/register", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  }

  async createTenant(payload: CreateTenantPayload) {
    if (this.demoMode) {
      return demoService.createTenant(payload);
    }
    return this.request<CreateTenantResponse>("/tenants", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  }

  async updateTenant(tenantId: string, payload: UpdateTenantPayload) {
    if (this.demoMode) {
      return demoService.updateTenant(tenantId, payload);
    }
    return this.request<CreateTenantResponse>(`/tenants/${tenantId}`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    });
  }

  async searchCustomers(q: string) {
    if (this.demoMode) {
      return demoService.searchCustomers(q);
    }
    return this.request<CustomerResult[]>(
      `/customers/search?q=${encodeURIComponent(q)}`,
    );
  }

  async createCustomer(payload: CreateCustomerPayload) {
    if (this.demoMode) {
      return demoService.createCustomer(payload);
    }
    return this.request<CustomerResult>("/customers", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  }

  async fetchCustomer(id: string) {
    if (this.demoMode) {
      return demoService.fetchCustomer(id);
    }
    return this.request<CustomerResult>(`/customers/${id}`);
  }

  async updateCustomer(id: string, payload: Record<string, unknown>) {
    if (this.demoMode) {
      return demoService.updateCustomer(id, payload);
    }
    return this.request(`/customers/${id}`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    });
  }

  async createJob(payload: CreateJobPayload) {
    if (this.demoMode) {
      return demoService.createJob(payload);
    }
    return this.request("/jobs", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  }

  async fetchJobs(page: number = 1, limit: number = 10, status?: string) {
    if (this.demoMode) {
      return demoService.fetchJobs(page, limit, status);
    }
    let path = `/jobs?page=${page}&limit=${limit}`;
    if (status) {
      path += `&status=${encodeURIComponent(status)}`;
    }
    return this.request<PaginatedJobsResponse>(path);
  }

  async fetchJob(id: string) {
    if (this.demoMode) {
      return demoService.fetchJob(id);
    }
    return this.request<JobDetailResult>(`/jobs/${id}`);
  }

  async updateJob(id: string, payload: Record<string, unknown>) {
    if (this.demoMode) {
      return demoService.updateJob(id, payload);
    }
    return this.request(`/jobs/${id}`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    });
  }

  async createInvoice(
    jobId: string,
    payload: {
      subtotal: number;
      taxPercent: number;
      taxAmount: number;
      total: number;
    },
  ) {
    if (this.demoMode) {
      return demoService.createInvoice(jobId, payload);
    }
    return this.request(`/jobs/${jobId}/invoices`, {
      method: "POST",
      body: JSON.stringify(payload),
    });
  }

  async updateInvoiceStatus(invoiceId: string, status: string) {
    if (this.demoMode) {
      return demoService.updateInvoiceStatus(invoiceId, status);
    }
    return this.request(`/invoices/${invoiceId}`, {
      method: "PATCH",
      body: JSON.stringify({ status }),
    });
  }

  async downloadInvoicePdf(invoiceId: string): Promise<Blob> {
    if (this.demoMode) {
      return demoService.downloadInvoicePdf(invoiceId);
    }
    const token = this.idToken || localStorage.getItem(ID_TOKEN_KEY);
    const rt =
      this.refreshToken || localStorage.getItem(REFRESH_TOKEN_KEY) || "";
    const res = await fetch(`${this.baseUrl}/invoices/${invoiceId}/pdf`, {
      headers: {
        Authorization: `Bearer ${token}`,
        "x-refresh-token": rt,
      },
    });
    if (!res.ok) {
      throw new Error("Failed to download PDF");
    }
    return res.blob();
  }

  async sendPasswordResetEmail(email: string): Promise<void> {
    return this.request("/auth/forgot-password", {
      method: "POST",
      body: JSON.stringify({ email }),
    });
  }

  async confirmPasswordReset(
    email: string,
    code: string,
    newPassword: string,
  ): Promise<void> {
    return this.request("/auth/confirm-forgot-password", {
      method: "POST",
      body: JSON.stringify({ email, code, newPassword }),
    });
  }
}

export const api = new ApiService();
