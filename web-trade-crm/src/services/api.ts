const API_BASE = "http://localhost:3000";
const FIREBASE_API_KEY = "AIzaSyDwTUilKplIzmgIdPJuFXUl0CL-bQi795w";
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
  defaultTaxPercent: number;
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

  private async refreshIdToken(): Promise<string | null> {
    const rt = this.refreshToken || localStorage.getItem(REFRESH_TOKEN_KEY);
    if (!rt) return null;

    try {
      const res = await fetch(
        `https://securetoken.googleapis.com/v1/token?key=AIzaSyDwTUilKplIzmgIdPJuFXUl0CL-bQi795w`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            grant_type: "refresh_token",
            refresh_token: rt,
          }),
        },
      );
      const data = await res.json();
      if (data.id_token) {
        this.idToken = data.id_token;
        this.refreshToken = data.refresh_token || rt;
        localStorage.setItem(ID_TOKEN_KEY, data.id_token);
        localStorage.setItem(REFRESH_TOKEN_KEY, this.refreshToken!);
        return data.id_token;
      }
      return null;
    } catch {
      return null;
    }
  }

  private async request<T>(
    path: string,
    options: RequestInit = {},
    retried = false,
  ): Promise<T> {
    const token =
      ((options.headers as Record<string, string>)?.["Authorization"] || "")
        .replace("Bearer ", "")
        .substring(0, 20) || "none";
    console.log(`[API] ${path} — using token: ${token}...`);

    const res = await fetch(`${this.baseUrl}${path}`, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...((options.headers as Record<string, string>) || {}),
      },
    });

    console.log(`[API] ${path} — response status: ${res.status}`);

    // If 401 and we haven't retried yet, try refreshing the token
    if (res.status === 401 && !retried) {
      console.log(`[API] ${path} — 401 received, attempting token refresh...`);
      const newToken = await this.refreshIdToken();
      if (newToken) {
        console.log(
          `[API] ${path} — token refreshed successfully, retrying...`,
        );
        const newHeaders = {
          ...((options.headers as Record<string, string>) || {}),
          Authorization: `Bearer ${newToken}`,
        };
        return this.request<T>(path, { ...options, headers: newHeaders }, true);
      }
      console.log(`[API] ${path} — token refresh FAILED`);
    }

    const data = await res.json();

    if (!res.ok) {
      const message = data.message || data.error?.message || "Request failed";
      throw new Error(Array.isArray(message) ? message[0] : message);
    }

    return data as T;
  }

  private getValidToken(): string | null {
    return this.idToken || localStorage.getItem("trade_crm_id_token");
  }

  private authHeaders(): HeadersInit {
    const token = this.getValidToken();
    return { Authorization: `Bearer ${token}` };
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
    return this.request<CreateTenantResponse>("/tenants", {
      method: "POST",
      headers: this.authHeaders(),
      body: JSON.stringify(payload),
    });
  }

  async updateTenant(tenantId: string, payload: UpdateTenantPayload) {
    return this.request<CreateTenantResponse>(`/tenants/${tenantId}`, {
      method: "PATCH",
      headers: this.authHeaders(),
      body: JSON.stringify(payload),
    });
  }

  async searchCustomers(q: string) {
    return this.request<CustomerResult[]>(
      `/customers/search?q=${encodeURIComponent(q)}`,
      {
        headers: this.authHeaders(),
      },
    );
  }

  async createCustomer(payload: CreateCustomerPayload) {
    return this.request<CustomerResult>("/customers", {
      method: "POST",
      headers: this.authHeaders(),
      body: JSON.stringify(payload),
    });
  }

  async fetchCustomer(id: string) {
    return this.request<CustomerResult>(`/customers/${id}`, {
      headers: this.authHeaders(),
    });
  }

  async updateCustomer(id: string, payload: Record<string, unknown>) {
    return this.request(`/customers/${id}`, {
      method: "PATCH",
      headers: this.authHeaders(),
      body: JSON.stringify(payload),
    });
  }

  async createJob(payload: CreateJobPayload) {
    return this.request("/jobs", {
      method: "POST",
      headers: this.authHeaders(),
      body: JSON.stringify(payload),
    });
  }

  async fetchJobs(page: number = 1, limit: number = 10, status?: string) {
    let path = `/jobs?page=${page}&limit=${limit}`;
    if (status) {
      path += `&status=${encodeURIComponent(status)}`;
    }
    return this.request<PaginatedJobsResponse>(path, {
      headers: this.authHeaders(),
    });
  }

  async fetchJob(id: string) {
    return this.request<JobDetailResult>(`/jobs/${id}`, {
      headers: this.authHeaders(),
    });
  }

  async updateJob(id: string, payload: Record<string, unknown>) {
    return this.request(`/jobs/${id}`, {
      method: "PATCH",
      headers: this.authHeaders(),
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
    return this.request(`/jobs/${jobId}/invoices`, {
      method: "POST",
      headers: this.authHeaders(),
      body: JSON.stringify(payload),
    });
  }

  async updateInvoiceStatus(invoiceId: string, status: string) {
    return this.request(`/invoices/${invoiceId}`, {
      method: "PATCH",
      headers: this.authHeaders(),
      body: JSON.stringify({ status }),
    });
  }

  async downloadInvoicePdf(invoiceId: string): Promise<Blob> {
    const token = this.getValidToken();
    const res = await fetch(`${this.baseUrl}/invoices/${invoiceId}/pdf`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    if (!res.ok) {
      throw new Error("Failed to download PDF");
    }
    return res.blob();
  }

  async sendPasswordResetEmail(email: string): Promise<void> {
    const res = await fetch(
      `https://identitytoolkit.googleapis.com/v1/accounts:sendOobCode?key=${FIREBASE_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          requestType: "PASSWORD_RESET",
          email,
        }),
      },
    );
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error?.message || "Failed to send password reset");
    }
  }
}

export const api = new ApiService();
