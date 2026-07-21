const API_BASE = "http://localhost:3000";
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
    addressLine1: string;
    addressLine2?: string;
    city: string;
    stateProvince: string;
    zipPostalCode: string;
    isDefault: boolean;
  }>;
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
}

export const api = new ApiService();
