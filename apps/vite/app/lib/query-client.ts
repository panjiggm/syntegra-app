import { QueryClient } from "@tanstack/react-query";

// Create query client with optimized defaults for Syntegra
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Stale time - data considered fresh for 5 minutes
      staleTime: 5 * 60 * 1000,

      // Cache time - keep in cache for 10 minutes after unused
      gcTime: 10 * 60 * 1000,

      // Retry configuration
      retry: (failureCount, error: any) => {
        // Don't retry on 4xx errors (client errors)
        if (error?.response?.status >= 400 && error?.response?.status < 500) {
          return false;
        }
        // Retry max 3 times for server errors or network issues
        return failureCount < 3;
      },

      // Retry delay with exponential backoff
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),

      // Refetch on window focus for real-time data
      refetchOnWindowFocus: true,

      // Refetch on reconnect for better offline experience
      refetchOnReconnect: true,

      // Don't refetch on mount if data is fresh
      refetchOnMount: true,
    },
    mutations: {
      // Retry mutations once on failure
      retry: 1,

      // Retry delay for mutations
      retryDelay: 1000,
    },
  },
});

// Query keys factory for consistent key management
export const queryKeys = {
  // User-related queries
  users: {
    all: ["users"] as const,
    lists: () => [...queryKeys.users.all, "list"] as const,
    list: (filters?: any) => [...queryKeys.users.lists(), filters] as const,
    details: () => [...queryKeys.users.all, "detail"] as const,
    detail: (id: string) => [...queryKeys.users.details(), id] as const,
  },

  // Session-related queries
  sessions: {
    all: ["sessions"] as const,
    lists: () => [...queryKeys.sessions.all, "list"] as const,
    list: (filters?: any) => [...queryKeys.sessions.lists(), filters] as const,
    details: () => [...queryKeys.sessions.all, "detail"] as const,
    detail: (id: string) => [...queryKeys.sessions.details(), id] as const,
    participant: (participantId: string) =>
      ["participant-sessions", participantId] as const,
  },

  // Test-related queries
  tests: {
    all: ["tests"] as const,
    lists: () => [...queryKeys.tests.all, "list"] as const,
    list: (filters?: any) => [...queryKeys.tests.lists(), filters] as const,
    details: () => [...queryKeys.tests.all, "detail"] as const,
    detail: (id: string) => [...queryKeys.tests.details(), id] as const,
  },

  // Auth-related queries
  auth: {
    user: ["auth", "user"] as const,
    permissions: ["auth", "permissions"] as const,
  },

  // Dashboard-related queries
  dashboard: {
    admin: (userId?: string) => ["dashboard", "admin", userId] as const,
    participant: (userId?: string) =>
      ["dashboard", "participant", userId] as const,
  },
} as const;
