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
    stats: () => [...queryKeys.tests.all, "stats"] as const,
    filterOptions: () => [...queryKeys.tests.all, "filter-options"] as const,
  },

  // Questions
  questions: {
    all: () => ["questions"] as const,
    lists: () => [...queryKeys.questions.all(), "list"] as const,
    list: (testId: string, params?: any) =>
      [...queryKeys.questions.lists(), testId, params] as const,
    details: () => [...queryKeys.questions.all(), "detail"] as const,
    detail: (testId: string, questionId: string) =>
      [...queryKeys.questions.details(), testId, questionId] as const,
  },

  // Session Participants
  participants: {
    all: () => ["participants"] as const,
    lists: () => [...queryKeys.participants.all(), "list"] as const,
    list: (sessionId: string, params?: any) =>
      [...queryKeys.participants.lists(), sessionId, params] as const,
    details: () => [...queryKeys.participants.all(), "detail"] as const,
    detail: (sessionId: string, participantId: string) =>
      [...queryKeys.participants.details(), sessionId, participantId] as const,
  },

  // Test Attempts
  attempts: {
    all: () => ["attempts"] as const,
    lists: () => [...queryKeys.attempts.all(), "list"] as const,
    list: (params?: any) => [...queryKeys.attempts.lists(), params] as const,
    details: () => [...queryKeys.attempts.all(), "detail"] as const,
    detail: (id: string) => [...queryKeys.attempts.details(), id] as const,
    progress: (id: string) =>
      [...queryKeys.attempts.all(), "progress", id] as const,
  },

  // Results
  results: {
    all: () => ["results"] as const,
    lists: () => [...queryKeys.results.all(), "list"] as const,
    list: (params?: any) => [...queryKeys.results.lists(), params] as const,
    details: () => [...queryKeys.results.all(), "detail"] as const,
    detail: (id: string) => [...queryKeys.results.details(), id] as const,
    byAttempt: (attemptId: string) =>
      [...queryKeys.results.all(), "attempt", attemptId] as const,
    byUser: (userId: string) =>
      [...queryKeys.results.all(), "user", userId] as const,
  },

  // Dashboard
  dashboard: {
    all: () => ["dashboard"] as const,
    admin: () => [...queryKeys.dashboard.all(), "admin"] as const,
    participant: () => [...queryKeys.dashboard.all(), "participant"] as const,
    stats: () => [...queryKeys.dashboard.all(), "stats"] as const,
  },

  // Auth-related queries
  auth: {
    user: ["auth", "user"] as const,
    permissions: ["auth", "permissions"] as const,
  },

  // Analytics
  analytics: {
    all: () => ["analytics"] as const,
    summary: () => [...queryKeys.analytics.all(), "summary"] as const,
    tests: () => [...queryKeys.analytics.all(), "tests"] as const,
    sessions: () => [...queryKeys.analytics.all(), "sessions"] as const,
    users: () => [...queryKeys.analytics.all(), "users"] as const,
  },
} as const;
