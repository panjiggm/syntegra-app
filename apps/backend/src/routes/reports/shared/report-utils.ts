import { type Context } from "hono";
import { and, between, eq } from "drizzle-orm";
import { type CloudflareBindings } from "@/lib/env";
import { testSessions, getDbFromEnv } from "@/db";
import {
  type GetTestResultsReportQuery,
  type ReportErrorResponse,
} from "shared-types";

/**
 * Validates admin access for report endpoints
 */
export function validateAdminAccess(
  c: Context<{ Bindings: CloudflareBindings; Variables: { auth: any } }>
): ReportErrorResponse | null {
  const auth = c.get("auth");
  const currentUser = auth.user;

  if (currentUser.role !== "admin") {
    return {
      success: false,
      message: "Access denied. Admin privileges required.",
      timestamp: new Date().toISOString(),
    };
  }

  return null;
}

/**
 * Parses and validates query parameters
 */
export function parseReportQuery(rawQuery: any): GetTestResultsReportQuery {
  return {
    period_type: (rawQuery.period_type as any) || "this_month",
    start_date: rawQuery.start_date,
    end_date: rawQuery.end_date,
    position: rawQuery.position,
    session_id: rawQuery.session_id,
  };
}

/**
 * Calculate date range based on period_type
 */
export function calculateDateRange(query: GetTestResultsReportQuery) {
  const now = new Date();
  let startDate: Date;
  let endDate: Date;
  let label: string;

  switch (query.period_type) {
    case "today":
      startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      endDate = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate(),
        23,
        59,
        59
      );
      label = "Hari Ini";
      break;

    case "this_week":
      const dayOfWeek = now.getDay();
      const diff = now.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
      startDate = new Date(now.getFullYear(), now.getMonth(), diff);
      endDate = new Date(
        now.getFullYear(),
        now.getMonth(),
        diff + 6,
        23,
        59,
        59
      );
      label = "Minggu Ini";
      break;

    case "this_month":
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
      label = `${now.toLocaleDateString("id-ID", {
        month: "long",
        year: "numeric",
      })}`;
      break;

    case "last_month":
      const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      startDate = new Date(lastMonth.getFullYear(), lastMonth.getMonth(), 1);
      endDate = new Date(
        lastMonth.getFullYear(),
        lastMonth.getMonth() + 1,
        0,
        23,
        59,
        59
      );
      label = `${lastMonth.toLocaleDateString("id-ID", {
        month: "long",
        year: "numeric",
      })}`;
      break;

    case "this_year":
      startDate = new Date(now.getFullYear(), 0, 1);
      endDate = new Date(now.getFullYear(), 11, 31, 23, 59, 59);
      label = `Tahun ${now.getFullYear()}`;
      break;

    case "custom":
      if (!query.start_date || !query.end_date) {
        throw new Error(
          "Start date and end date are required for custom period"
        );
      }
      startDate = new Date(query.start_date);
      endDate = new Date(query.end_date);
      endDate.setHours(23, 59, 59);
      label = `${startDate.toLocaleDateString("id-ID")} - ${endDate.toLocaleDateString("id-ID")}`;
      break;

    default:
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
      label = `${now.toLocaleDateString("id-ID", {
        month: "long",
        year: "numeric",
      })}`;
  }

  return { startDate, endDate, label };
}

/**
 * Builds where clause for database queries
 */
export function buildWhereClause(query: GetTestResultsReportQuery) {
  const { startDate, endDate } = calculateDateRange(query);
  
  const dateFilter = between(testSessions.start_time, startDate, endDate);
  const filters = [dateFilter];
  
  if (query.position) {
    filters.push(eq(testSessions.target_position, query.position));
  }
  if (query.session_id) {
    filters.push(eq(testSessions.id, query.session_id));
  }

  return and(...filters);
}

/**
 * Generate test module icon based on database icon and performance
 */
export function generateTestModuleIcon(module: any): string {
  if (module.icon) {
    return module.icon;
  }

  const categoryIcons: Record<string, string> = {
    wais: "🧠",
    mbti: "🎭",
    wartegg: "🎨",
    riasec: "🔍",
    kraepelin: "🔢",
    pauli: "➕",
    big_five: "🌟",
    papi_kostick: "📊",
    dap: "👤",
    raven: "🧩",
    epps: "💭",
    army_alpha: "🎯",
    htp: "🏠",
    disc: "🎪",
    iq: "🤔",
    eq: "❤️",
  };

  return categoryIcons[module.category] || "📝";
}

/**
 * Common error response helper
 */
export function createErrorResponse(message: string): ReportErrorResponse {
  return {
    success: false,
    message,
    timestamp: new Date().toISOString(),
  };
}