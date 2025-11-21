import { createContext, useContext, useState, useEffect, type ReactNode } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "./queryClient";
import type { User, AuthResponse, LoginRequest, InsertUser } from "@shared/schema";

interface AuthContextType {
  user: Omit<User, "password_hash"> | null;
  token: string | null;
  isLoading: boolean;
  login: (credentials: LoginRequest) => Promise<void>;
  register: (data: InsertUser) => Promise<void>;
  logout: () => void;
  isAuthenticated: boolean;
  isAdmin: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(() => localStorage.getItem("auth_token"));

  const { data: user, isLoading } = useQuery<Omit<User, "password_hash">>({
    queryKey: ["/api/auth/me"],
    enabled: !!token,
    retry: false,
    onError: () => {
      setToken(null);
      localStorage.removeItem("auth_token");
    },
  });

  const loginMutation = useMutation({
    mutationFn: async (credentials: LoginRequest) => {
      const response = await apiRequest<AuthResponse>("POST", "/api/auth/login", credentials);
      return response;
    },
    onSuccess: (data) => {
      setToken(data.token);
      localStorage.setItem("auth_token", data.token);
      queryClient.setQueryData(["/api/auth/me"], data.user);
    },
  });

  const registerMutation = useMutation({
    mutationFn: async (data: InsertUser) => {
      const response = await apiRequest<AuthResponse>("POST", "/api/auth/register", data);
      return response;
    },
    onSuccess: (data) => {
      setToken(data.token);
      localStorage.setItem("auth_token", data.token);
      queryClient.setQueryData(["/api/auth/me"], data.user);
    },
  });

  const logout = () => {
    setToken(null);
    localStorage.removeItem("auth_token");
    queryClient.clear();
    window.location.href = "/login";
  };

  useEffect(() => {
    if (token) {
      localStorage.setItem("auth_token", token);
    } else {
      localStorage.removeItem("auth_token");
    }
  }, [token]);

  return (
    <AuthContext.Provider
      value={{
        user: user || null,
        token,
        isLoading,
        login: async (credentials) => {
          await loginMutation.mutateAsync(credentials);
        },
        register: async (data) => {
          await registerMutation.mutateAsync(data);
        },
        logout,
        isAuthenticated: !!user,
        isAdmin: user?.role === "admin",
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
