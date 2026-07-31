import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
} from "react";
import { api, LoginResponse } from "../services/api";
import { clearAllPdfCache } from "../services/pdfCache";

interface AuthState {
  user: LoginResponse["user"] | null;
  idToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

interface AuthContextType extends AuthState {
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  updateUser: (partial: Partial<LoginResponse["user"]>) => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

const TOKEN_KEY = "trade_crm_id_token";
const USER_KEY = "trade_crm_user";

const demoUser: LoginResponse["user"] = {
  id: "demo-user-1",
  email: "demo@sprout-crm.com",
  status: "ACTIVE",
  role: "ADMIN",
  firstName: "Demo",
  lastName: "User",
  tenantId: "demo-tenant-1",
  businessName: "Sprout Landscaping",
  businessEmail: "hello@sproutlandscaping.com",
  phone: "(555) 123-4567",
  defaultTaxPercent: 13,
  invoicePaymentMethodNote:
    "Payment due within 30 days. Thank you for your business.",
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [state, setState] = useState<AuthState>(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("demo") === "true") {
      api.setDemoMode(true);
      return {
        user: demoUser,
        idToken: "demo-token",
        isAuthenticated: true,
        isLoading: false,
      };
    }
    return {
      user: null,
      idToken: null,
      isAuthenticated: false,
      isLoading: true,
    };
  });

  // Keep a stable reference to logout so the effect doesn't re-run
  const logoutRef = useRef<() => void>(() => {});

  useEffect(() => {
    // If already initialized (e.g. demo mode), skip localStorage restore
    if (!state.isLoading) return;

    const token = localStorage.getItem(TOKEN_KEY);
    const userJson = localStorage.getItem(USER_KEY);
    if (token && userJson) {
      try {
        const user = JSON.parse(userJson);
        // Sync token into api service so it can use it for authenticated requests
        api.setTokens(
          token,
          localStorage.getItem("trade_crm_refresh_token") || "",
        );
        setState({
          user,
          idToken: token,
          isAuthenticated: true,
          isLoading: false,
        });
      } catch {
        localStorage.removeItem(TOKEN_KEY);
        localStorage.removeItem(USER_KEY);
        setState((s) => ({ ...s, isLoading: false }));
      }
    } else {
      setState((s) => ({ ...s, isLoading: false }));
    }
  }, [state.isLoading]);

  // Register the global unauthorized handler once
  useEffect(() => {
    api.onUnauthorized(() => logoutRef.current());
  }, []);

  const updateUser = useCallback((partial: Partial<LoginResponse["user"]>) => {
    setState((prev) => {
      const updated = { ...prev.user!, ...partial };
      localStorage.setItem(USER_KEY, JSON.stringify(updated));
      return { ...prev, user: updated };
    });
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const res = await api.login(email, password);
    localStorage.setItem(TOKEN_KEY, res.idToken);
    localStorage.setItem(USER_KEY, JSON.stringify(res.user));
    setState({
      user: res.user,
      idToken: res.idToken,
      isAuthenticated: true,
      isLoading: false,
    });
    // Clear any stale cached data from previous sessions
    clearAllPdfCache();
    // Hard redirect to clear old nav state, but only if user has a tenant
    // (otherwise the create-tenant page handles the flow)
    if (res.user.tenantId) {
      window.location.href = "/manage-jobs";
    }
  }, []);

  const logout = useCallback(() => {
    api.clearTokens();
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    clearAllPdfCache();
    setState({
      user: null,
      idToken: null,
      isAuthenticated: false,
      isLoading: false,
    });
  }, []);

  // Keep the ref in sync so the api callback always calls the latest logout
  logoutRef.current = logout;

  return (
    <AuthContext.Provider value={{ ...state, login, logout, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
};
