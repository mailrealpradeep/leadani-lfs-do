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
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(() => 
    sessionStorage.getItem("auth_token") || localStorage.getItem("auth_token")
  );
  const [isImpersonating] = useState(() => sessionStorage.getItem("impersonating") === "true");

  const { data, isLoading, isError } = useQuery<AuthMeResponse>({
    queryKey: ["/api/auth/me"],
    enabled: !!token,
    retry: false,
  });

  useEffect(() => {
    if (isError && token) {
      setToken(null);
      localStorage.removeItem("auth_token");
    }
  }, [isError, token]);

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
    
    if (isImpersonating) {
      sessionStorage.removeItem("auth_token");
      sessionStorage.removeItem("impersonating");
      sessionStorage.removeItem("impersonated_user_name");
      sessionStorage.removeItem("impersonated_user_email");
      queryClient.clear();
      window.close();
      return;
    }
    
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

  const user = data?.user || null;
  const company = data?.company || null;

  return (
    <AuthContext.Provider
      value={{
        user,
        company,
        token,
        isLoading,
        login: async (credentials) => {
          await loginMutation.mutateAsync(credentials);
        },
        register: async (userData) => {
          await registerMutation.mutateAsync(userData);
        },
        logout,
        authenticate,
        isAuthenticated: !!user,
        isSuperAdmin: user?.role === "super_admin",
        isCompanyAdmin: user?.role === "company_admin",
        isRegularUser: user?.role === "user",
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
