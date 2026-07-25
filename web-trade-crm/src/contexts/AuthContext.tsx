import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
} from "react";
import { api, LoginResponse } from "../services/api";

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

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [state, setState] = useState<AuthState>({
    user: null,
    idToken: null,
    isAuthenticated: false,
    isLoading: true,
  });

  // Keep a stable reference to logout so the effect doesn't re-run
  const logoutRef = useRef<() => void>(() => {});

  useEffect(() => {
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
  }, []);

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
    // Hard redirect to clear old nav state, but only if user has a tenant
    // (otherwise the create-tenant page handles the flow)
    if (res.user.tenantId) {
      window.location.href = "/home";
    }
  }, []);

  const logout = useCallback(() => {
    api.clearTokens();
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
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
