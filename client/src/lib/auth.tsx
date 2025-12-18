import { createContext, useContext, useState, useEffect, type ReactNode } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "./queryClient";
import type { User, AuthResponse, LoginRequest, InsertUser, Company } from "@shared/schema";

interface AuthMeResponse {
  user: Omit<User, "password_hash">;
  company: Company | null;
}

interface AuthContextType {
  user: Omit<User, "password_hash"> | null;
  company: Company | null;
  token: string | null;
  isLoading: boolean;
  login: (credentials: LoginRequest) => Promise<void>;
  register: (data: InsertUser) => Promise<void>;
  logout: () => void;
  authenticate: (authResponse: AuthResponse) => void;
  isAuthenticated: boolean;
  isSuperAdmin: boolean;
  isCompanyAdmin: boolean;
  isRegularUser: boolean;
  isImpersonating: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(() => 
    sessionStorage.getItem("auth_token") || localStorage.getItem("auth_token")
  );
  const [isImpersonating, setIsImpersonating] = useState(() => 
    sessionStorage.getItem("impersonating") === "true" || localStorage.getItem("impersonating") === "true"
  );

  // Keep track of the last successfully loaded user data
  // This prevents showing logged-out state during transient network errors
  const [cachedAuthData, setCachedAuthData] = useState<AuthMeResponse | null>(null);
  
  const { data, isLoading, isError, error, isFetching } = useQuery<AuthMeResponse>({
    queryKey: ["/api/auth/me"],
    enabled: !!token,
    // Retry on network errors (transient), but not on auth errors (permanent)
    retry: (failureCount, err: any) => {
      // Don't retry 401/403 - these are auth failures
      if (err?.status === 401 || err?.status === 403) {
        return false;
      }
      // Retry up to 3 times for network errors
      return failureCount < 3;
    },
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 10000),
    // Keep previous data while refetching to prevent flash of logged-out state
    placeholderData: (previousData) => previousData,
  });

  // Cache successful auth data so we can maintain auth state during network errors
  useEffect(() => {
    if (data) {
      setCachedAuthData(data);
    }
  }, [data]);

  useEffect(() => {
    // Only clear token on genuine 401 auth errors, not network errors
    if (isError && token && error) {
      const status = (error as any)?.status;
      // Only logout if we got a definitive 401/403 from the server
      if (status === 401 || status === 403) {
        console.log("Auth token invalid, logging out");
        setToken(null);
        setCachedAuthData(null);
        localStorage.removeItem("auth_token");
        sessionStorage.removeItem("auth_token");
      }
      // For network errors (no status), keep the token and cached data
    }
  }, [isError, token, error]);

  const loginMutation = useMutation({
    mutationFn: async (credentials: LoginRequest) => {
      const response = await apiRequest<AuthResponse>("POST", "/api/auth/login", credentials);
      return response;
    },
    onSuccess: (response) => {
      localStorage.removeItem("impersonating");
      localStorage.removeItem("impersonated_user_name");
      localStorage.removeItem("impersonated_user_email");
      setToken(response.token);
      localStorage.setItem("auth_token", response.token);
      queryClient.setQueryData(["/api/auth/me"], {
        user: response.user,
        company: null,
      });
    },
  });

  const registerMutation = useMutation({
    mutationFn: async (userData: InsertUser) => {
      const response = await apiRequest<AuthResponse>("POST", "/api/auth/register", userData);
      return response;
    },
    onSuccess: (response) => {
      setToken(response.token);
      localStorage.setItem("auth_token", response.token);
      queryClient.setQueryData(["/api/auth/me"], {
        user: response.user,
        company: null,
      });
    },
  });

  const authenticate = (authResponse: AuthResponse) => {
    setToken(authResponse.token);
    localStorage.setItem("auth_token", authResponse.token);
    queryClient.setQueryData(["/api/auth/me"], {
      user: authResponse.user,
      company: authResponse.company || null,
    });
  };

  const logout = () => {
    setToken(null);
    setIsImpersonating(false);
    
    // Clear all auth-related storage from both localStorage and sessionStorage
    localStorage.removeItem("auth_token");
    localStorage.removeItem("impersonating");
    localStorage.removeItem("impersonated_user_name");
    localStorage.removeItem("impersonated_user_email");
    sessionStorage.removeItem("auth_token");
    sessionStorage.removeItem("impersonating");
    sessionStorage.removeItem("impersonated_user_name");
    sessionStorage.removeItem("impersonated_user_email");
    queryClient.clear();
    window.location.href = "/login";
  };

  useEffect(() => {
    if (token && !isImpersonating) {
      localStorage.setItem("auth_token", token);
    } else if (!token) {
      localStorage.removeItem("auth_token");
    }
  }, [token, isImpersonating]);

  // Use fresh data if available, fall back to cached data during network errors
  // This ensures user stays "authenticated" during transient network issues
  const effectiveData = data || cachedAuthData;
  const user = effectiveData?.user || null;
  const company = effectiveData?.company || null;
  
  // Consider authenticated if we have a token AND either:
  // 1. We have valid user data (fresh or cached)
  // 2. We're still loading (don't flash logged-out state during initial load)
  const isAuthenticated = !!token && (!!user || isLoading);

  return (
    <AuthContext.Provider
      value={{
        user,
        company,
        token,
        isLoading: isLoading || isFetching,
        login: async (credentials) => {
          await loginMutation.mutateAsync(credentials);
        },
        register: async (userData) => {
          await registerMutation.mutateAsync(userData);
        },
        logout,
        authenticate,
        isAuthenticated,
        isSuperAdmin: user?.role === "super_admin",
        isCompanyAdmin: user?.role === "company_admin",
        isRegularUser: user?.role === "user",
        isImpersonating,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
