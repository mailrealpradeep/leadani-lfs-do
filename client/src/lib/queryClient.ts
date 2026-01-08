import { QueryClient, QueryFunction } from "@tanstack/react-query";

export class ApiError extends Error {
  status: number;
  data: any;
  blocking_reasons?: string[];
  requires_force_exit?: boolean;
  system_error?: boolean;

  constructor(status: number, message: string, data?: any) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.data = data;
    if (data?.blocking_reasons) {
      this.blocking_reasons = data.blocking_reasons;
    }
    if (data?.requires_force_exit !== undefined) {
      this.requires_force_exit = data.requires_force_exit;
    }
    if (data?.system_error !== undefined) {
      this.system_error = data.system_error;
    }
  }
}

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    
    let parsedData: any = null;
    let errorMessage = text;
    
    try {
      parsedData = JSON.parse(text);
      errorMessage = parsedData.error || parsedData.message || text;
    } catch {
    }
    
    throw new ApiError(res.status, errorMessage, parsedData);
  }
}

export async function apiRequest<T = any>(
  method: string,
  url: string,
  data?: unknown | undefined,
): Promise<T> {
  const token = localStorage.getItem("auth_token");
  const headers: Record<string, string> = {};
  if (data) {
    headers["Content-Type"] = "application/json";
  }
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }
  
  const res = await fetch(url, {
    method,
    headers,
    body: data ? JSON.stringify(data) : undefined,
    credentials: "include",
  });

  await throwIfResNotOk(res);
  
  // Check Content-Type before parsing JSON
  const contentType = res.headers.get("content-type");
  if (contentType && !contentType.includes("application/json")) {
    const text = await res.text();
    throw new ApiError(
      res.status,
      `Expected JSON response but received ${contentType}. Response: ${text.substring(0, 200)}`,
      { contentType, responseText: text }
    );
  }
  
  return await res.json();
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    const token = localStorage.getItem("auth_token");
    const res = await fetch(queryKey.join("/") as string, {
      credentials: "include",
      headers: {
        ...(token && { Authorization: `Bearer ${token}` }),
      },
    });

    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      return null;
    }

    await throwIfResNotOk(res);
    return await res.json();
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: Infinity,
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});
