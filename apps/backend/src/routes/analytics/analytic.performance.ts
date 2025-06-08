import { Context } from "hono";
import { and, count, sql, gte, lte } from "drizzle-orm";
import { getDbFromEnv, users, auditLogs } from "@/db";
import { type CloudflareBindings } from "@/lib/env";
import {
  type PerformanceAnalyticsQuery,
  type PerformanceAnalyticsResponse,
  type AnalyticsErrorResponse,
  getAnalyticsDateRange,
} from "shared-types";

export async function getPerformanceAnalyticsHandler(
  c: Context<{ Bindings: CloudflareBindings; Variables: { user: any } }>
): Promise<Response> {
  try {
    const db = getDbFromEnv(c.env);
    const rawQuery = c.req.query();

    // Parse query parameters
    const queryParams: PerformanceAnalyticsQuery = {
      period: (rawQuery.period as any) || "month",
      date_from: rawQuery.date_from,
      date_to: rawQuery.date_to,
      timezone: rawQuery.timezone || "Asia/Jakarta",
      metric_type: rawQuery.metric_type as any,
      include_details: rawQuery.include_details === "true",
      resolution: (rawQuery.resolution as any) || "hour",
    };

    // Get date range
    const { from, to } =
      queryParams.date_from && queryParams.date_to
        ? {
            from: new Date(queryParams.date_from),
            to: new Date(queryParams.date_to),
          }
        : getAnalyticsDateRange(queryParams.period);

    // Get request volume data from audit logs (proxy for system load)
    const [totalRequests] = await db
      .select({ count: count() })
      .from(auditLogs)
      .where(
        and(gte(auditLogs.created_at, from), lte(auditLogs.created_at, to))
      );

    // Get successful requests (non-error actions)
    const [successfulRequests] = await db
      .select({ count: count() })
      .from(auditLogs)
      .where(
        and(
          gte(auditLogs.created_at, from),
          lte(auditLogs.created_at, to),
          sql`${auditLogs.action} NOT LIKE '%error%'`
        )
      );

    const failedRequests = totalRequests.count - successfulRequests.count;
    const errorRate =
      totalRequests.count > 0
        ? (failedRequests / totalRequests.count) * 100
        : 0;

    // Calculate throughput (requests per second over the period)
    const periodSeconds = (to.getTime() - from.getTime()) / 1000;
    const throughput =
      periodSeconds > 0 ? totalRequests.count / periodSeconds : 0;

    // Simulated system metrics (in real implementation, these would come from monitoring tools)
    const performanceSummary = {
      average_response_time_ms: Math.random() * 100 + 50, // 50-150ms
      average_throughput_per_second: Math.round(throughput * 100) / 100,
      error_rate_percentage: Math.round(errorRate * 100) / 100,
      uptime_percentage: 99.9 - Math.random() * 0.8, // 99.1-99.9%
      total_requests: totalRequests.count,
      successful_requests: successfulRequests.count,
      failed_requests: failedRequests,
    };

    // Simulated system metrics
    const systemMetrics = {
      cpu_usage_percentage: Math.random() * 30 + 20, // 20-50%
      memory_usage_percentage: Math.random() * 40 + 30, // 30-70%
      disk_usage_percentage: Math.random() * 20 + 40, // 40-60%
      network_io_mbps: Math.random() * 100 + 50, // 50-150 Mbps
      active_connections: Math.floor(Math.random() * 200) + 50, // 50-250 connections
      database_connections: Math.floor(Math.random() * 50) + 10, // 10-60 connections
    };

    // Get detailed metrics if requested
    let detailedMetrics = undefined;
    if (queryParams.include_details) {
      detailedMetrics = [];

      const hoursInPeriod = Math.ceil(
        (to.getTime() - from.getTime()) / (1000 * 60 * 60)
      );
      const maxDataPoints = Math.min(hoursInPeriod, 168); // Max 1 week of hourly data

      for (let i = 0; i < maxDataPoints; i++) {
        const timestamp = new Date(
          from.getTime() + (i * (to.getTime() - from.getTime())) / maxDataPoints
        );
        const nextTimestamp = new Date(
          from.getTime() +
            ((i + 1) * (to.getTime() - from.getTime())) / maxDataPoints
        );

        // Get request count for this time period
        const [periodRequests] = await db
          .select({ count: count() })
          .from(auditLogs)
          .where(
            and(
              gte(auditLogs.created_at, timestamp),
              lte(auditLogs.created_at, nextTimestamp)
            )
          );

        // Get error count for this time period
        const [periodErrors] = await db
          .select({ count: count() })
          .from(auditLogs)
          .where(
            and(
              gte(auditLogs.created_at, timestamp),
              lte(auditLogs.created_at, nextTimestamp),
              sql`${auditLogs.action} LIKE '%error%'`
            )
          );

        // Calculate throughput for this period
        const periodSeconds =
          (nextTimestamp.getTime() - timestamp.getTime()) / 1000;
        const periodThroughput =
          periodSeconds > 0 ? periodRequests.count / periodSeconds : 0;

        detailedMetrics.push({
          timestamp: timestamp.toISOString(),
          response_time_ms: Math.random() * 150 + 50, // Simulated
          throughput_per_second: Math.round(periodThroughput * 100) / 100,
          error_count: periodErrors.count,
          cpu_usage: Math.random() * 30 + 20, // Simulated
          memory_usage: Math.random() * 40 + 30, // Simulated
        });
      }
    }

    // Get trends data
    let trends = undefined;
    const daysDiff = Math.ceil(
      (to.getTime() - from.getTime()) / (1000 * 60 * 60 * 24)
    );
    const maxPoints = Math.min(daysDiff, 30);

    trends = [];
    for (let i = 0; i < maxPoints; i++) {
      const date = new Date(
        from.getTime() + (i * (to.getTime() - from.getTime())) / maxPoints
      );
      const nextDate = new Date(
        from.getTime() + ((i + 1) * (to.getTime() - from.getTime())) / maxPoints
      );

      const [dayRequests] = await db
        .select({ count: count() })
        .from(auditLogs)
        .where(
          and(
            gte(auditLogs.created_at, date),
            lte(auditLogs.created_at, nextDate)
          )
        );

      const [dayErrors] = await db
        .select({ count: count() })
        .from(auditLogs)
        .where(
          and(
            gte(auditLogs.created_at, date),
            lte(auditLogs.created_at, nextDate),
            sql`${auditLogs.action} LIKE '%error%'`
          )
        );

      const dayErrorRate =
        dayRequests.count > 0 ? (dayErrors.count / dayRequests.count) * 100 : 0;

      trends.push({
        date: date.toISOString().split("T")[0],
        average_response_time: Math.random() * 100 + 50, // Simulated
        error_rate: Math.round(dayErrorRate * 100) / 100,
        uptime_percentage: 99.8 + Math.random() * 0.2, // Simulated 99.8-100%
        total_requests: dayRequests.count,
      });
    }

    const response: PerformanceAnalyticsResponse = {
      success: true,
      data: {
        performance_summary: performanceSummary,
        system_metrics: systemMetrics,
        detailed_metrics: detailedMetrics,
        trends,
        metadata: {
          total_records: totalRequests.count,
          period_start: from.toISOString(),
          period_end: to.toISOString(),
          generated_at: new Date().toISOString(),
          data_freshness: new Date().toISOString(),
        },
      },
      timestamp: new Date().toISOString(),
    };

    return c.json(response, 200);
  } catch (error) {
    console.error("Error getting performance analytics:", error);

    const errorResponse: AnalyticsErrorResponse = {
      success: false,
      error: {
        code: "INTERNAL_ERROR",
        message: "Failed to retrieve performance analytics",
      },
      timestamp: new Date().toISOString(),
    };

    return c.json(errorResponse, 500);
  }
}
