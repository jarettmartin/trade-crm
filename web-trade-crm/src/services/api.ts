const API_BASE = "http://localhost:3000";

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

class ApiService {
  private baseUrl = API_BASE;

  private async request<T>(
    path: string,
    options: RequestInit = {},
  ): Promise<T> {
    const res = await fetch(`${this.baseUrl}${path}`, {
      headers: {
        "Content-Type": "application/json",
        ...((options.headers as Record<string, string>) || {}),
      },
      ...options,
    });

    const data = await res.json();

    if (!res.ok) {
      const message = data.message || data.error?.message || "Request failed";
      throw new Error(Array.isArray(message) ? message[0] : message);
    }

    return data as T;
  }

  async login(email: string, password: string) {
    return this.request<LoginResponse>("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });
  }

  async register(payload: RegisterPayload) {
    return this.request<RegisterResponse>("/auth/register", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  }
}

export const api = new ApiService();
