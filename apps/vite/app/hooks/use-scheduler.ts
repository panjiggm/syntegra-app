import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "~/lib/api-client";
import { toast } from "sonner";

// Types for scheduler
export interface SchedulerJob {
  name: string;
  description: string;
  enabled: boolean;
  last_execution?: string;
}

export interface SchedulerStatus {
  current_time: string;
  environment: string;
  scheduler_enabled: boolean;
  cron_pattern: string;
  jobs: SchedulerJob[];
  manual_trigger_endpoint: string;
  notes: string[];
}

export interface SchedulerJobResult {
  success: boolean;
  expired_count?: number;
  activated_count?: number;
  expired_sessions?: any[];
  activated_sessions?: any[];
  error?: string;
}

export interface ManualTriggerResult {
  execution_time: string;
  jobs_executed: {
    session_expiry: SchedulerJobResult;
    session_activation: SchedulerJobResult;
  };
  summary: {
    total_expired: number;
    total_activated: number;
    all_successful: boolean;
  };
}

interface SchedulerStatusResponse {
  success: boolean;
  message: string;
  data: SchedulerStatus;
  timestamp: string;
}

interface ManualTriggerResponse {
  success: boolean;
  message: string;
  data: ManualTriggerResult;
  timestamp: string;
}

export function useScheduler() {
  const queryClient = useQueryClient();

  // Get scheduler status (Query)
  const useGetSchedulerStatus = () => {
    return useQuery({
      queryKey: ["scheduler", "status"],
      queryFn: async () => {
        const response = await apiClient.get<SchedulerStatusResponse>(
          "/sessions/scheduler/status"
        );

        if (!response.success) {
          throw new Error(response.message || "Failed to get scheduler status");
        }

        return response;
      },
      staleTime: 30 * 1000, // 30 seconds - scheduler status doesn't change often
      refetchInterval: 60 * 1000, // Auto-refresh every minute
      retry: 2, // Retry failed requests twice
    });
  };

  // Manual trigger scheduler (Mutation)
  const useManualTrigger = () => {
    return useMutation({
      mutationFn: async () => {
        const response = await apiClient.post<ManualTriggerResponse>(
          "/sessions/scheduler/trigger-status-update"
        );

        if (!response.success) {
          throw new Error(response.message || "Failed to trigger scheduler");
        }

        return response;
      },
      onSuccess: (response) => {
        const { summary } = response.data;

        // Build detailed success message
        let message = "Scheduler executed successfully!";
        let description = "";

        if (summary.total_expired > 0 || summary.total_activated > 0) {
          const parts = [];
          if (summary.total_expired > 0) {
            parts.push(
              `${summary.total_expired} session${summary.total_expired > 1 ? "s" : ""} expired`
            );
          }
          if (summary.total_activated > 0) {
            parts.push(
              `${summary.total_activated} session${summary.total_activated > 1 ? "s" : ""} activated`
            );
          }
          description = parts.join(", ");
        } else {
          description = "No sessions required status updates";
        }

        toast.success(message, {
          description,
          duration: 5000,
        });

        // Invalidate related queries to refresh data
        queryClient.invalidateQueries({ queryKey: ["scheduler"] });
        queryClient.invalidateQueries({ queryKey: ["sessions"] });

        // If any sessions were affected, show additional info
        if (summary.total_expired > 0 || summary.total_activated > 0) {
          console.log("Scheduler execution details:", response.data);
        }
      },
      onError: (error: Error) => {
        console.error("Manual trigger error:", error);

        const errorMessage = error.message.toLowerCase();

        if (
          errorMessage.includes("unauthorized") ||
          errorMessage.includes("access denied")
        ) {
          toast.error("Access denied", {
            description: "You don't have permission to trigger the scheduler",
            duration: 8000,
          });
        } else if (errorMessage.includes("database")) {
          toast.error("Database error", {
            description:
              "Failed to connect to database. Please try again later.",
            duration: 8000,
          });
        } else if (errorMessage.includes("timeout")) {
          toast.error("Request timeout", {
            description:
              "Scheduler execution took too long. Please check the logs.",
            duration: 8000,
          });
        } else {
          toast.error("Failed to execute scheduler", {
            description: error.message || "An unexpected error occurred",
            duration: 8000,
          });
        }
      },
    });
  };

  // Helper function to check if scheduler is healthy
  const isSchedulerHealthy = (status?: SchedulerStatus): boolean => {
    if (!status) return false;

    return status.scheduler_enabled && status.jobs.every((job) => job.enabled);
  };

  // Helper function to get scheduler summary info
  const getSchedulerSummary = (status?: SchedulerStatus) => {
    if (!status) {
      return {
        isHealthy: false,
        totalJobs: 0,
        enabledJobs: 0,
        environment: "unknown",
        lastUpdate: null,
      };
    }

    return {
      isHealthy: isSchedulerHealthy(status),
      totalJobs: status.jobs.length,
      enabledJobs: status.jobs.filter((job) => job.enabled).length,
      environment: status.environment,
      cronPattern: status.cron_pattern,
      lastUpdate: status.current_time,
    };
  };

  // Helper function to format job execution results
  const formatExecutionResult = (result: ManualTriggerResult) => {
    const { summary, jobs_executed } = result;

    const messages = [];

    if (summary.total_expired > 0) {
      messages.push(`${summary.total_expired} sessions expired`);
    }

    if (summary.total_activated > 0) {
      messages.push(`${summary.total_activated} sessions activated`);
    }

    if (messages.length === 0) {
      messages.push("No sessions needed status updates");
    }

    return {
      summary: messages.join(", "),
      details: {
        expiry: jobs_executed.session_expiry,
        activation: jobs_executed.session_activation,
      },
      successful: summary.all_successful,
      executionTime: result.execution_time,
    };
  };

  return {
    // Queries
    useGetSchedulerStatus,

    // Mutations
    useManualTrigger,

    // Helper functions
    isSchedulerHealthy,
    getSchedulerSummary,
    formatExecutionResult,
  };
}
