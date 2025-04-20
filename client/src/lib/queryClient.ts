import { QueryClient, QueryFunction } from "@tanstack/react-query";
import { offlineApiRequest } from './offlineApiClient';
import { initDatabase } from './db';

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
}

// Original API request function - preserved for backward compatibility
export async function apiRequest<T = any>(
  url: string,
  options?: RequestInit & { data?: unknown },
): Promise<T> {
  const { data, ...rest } = options || {};
  
  // Pre-check for offline
  if (!navigator.onLine) {
    console.log('Offline detected, using offline fallback for:', url);
    return offlineApiRequest<T>(url, options);
  }

  try {
    const res = await fetch(url, {
      method: 'GET', // Default method
      headers: data ? { "Content-Type": "application/json" } : {},
      body: data ? JSON.stringify(data) : undefined,
      credentials: "include",
      ...rest
    });

    await throwIfResNotOk(res);
    return await res.json();
  } catch (error) {
    console.log('Fetch error, using offline data', error);
    return offlineApiRequest(url, options);
  }
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    // Pre-check for offline in queries
    if (!navigator.onLine) {
      console.log('Offline detected in query, using offline fallback for:', queryKey[0]);
      return offlineApiRequest(queryKey[0] as string, { method: 'GET' });
    }

    try {
      const res = await fetch(queryKey[0] as string, {
        credentials: "include",
      });

      if (unauthorizedBehavior === "returnNull" && res.status === 401) {
        return null;
      }

      await throwIfResNotOk(res);
      return await res.json();
    } catch (error) {
      console.log('Query error, using offline data', error);
      return offlineApiRequest(queryKey[0] as string, { method: 'GET' });
    }
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

// Initialize IndexedDB when this module loads
initDatabase().catch(error => {
  console.warn('Could not initialize IndexedDB (this is normal in development):', error);
});
