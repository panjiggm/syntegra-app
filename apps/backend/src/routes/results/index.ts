import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { type CloudflareBindings } from "@/lib/env";
import {
  GetResultByAttemptIdRequestSchema,
  GetUserResultsRequestSchema,
  GetUserResultsQuerySchema,
  GetTestResultsRequestSchema,
  GetTestResultsQuerySchema,
  CalculateTestResultRequestSchema,
  GetResultReportRequestSchema,
  GetResultReportQuerySchema,
  type TestResultErrorResponse,
} from "shared-types";
import { getResultByAttemptIdHandler } from "./result.get-attempt";
import { getUserResultsHandler } from "./result.get-user";
import { getTestResultsHandler } from "./result.get-test";
import { calculateTestResultHandler } from "./result.calculate";
import { generateResultReportHandler } from "./result.generate-report";
import { authenticateUser, requireAdmin } from "@/middleware/auth";
import { generalApiRateLimit } from "@/middleware/rateLimiter";

const resultRoutes = new Hono<{ Bindings: CloudflareBindings }>();

// ==================== RESULT ROUTES ====================

// Get Test Result by Attempt ID (Participant can access own, Admin can access all)
resultRoutes.get(
  "/attempt/:attemptId",
  generalApiRateLimit,
  authenticateUser,
  zValidator("param", GetResultByAttemptIdRequestSchema, (result, c) => {
    if (!result.success) {
      const errorResponse: TestResultErrorResponse = {
        success: false,
        message: "Invalid attempt ID parameter",
        errors: result.error.errors.map((err) => ({
          field: err.path.join("."),
          message: err.message,
          code: err.code,
        })),
        timestamp: new Date().toISOString(),
      };
      return c.json(errorResponse, 400);
    }
  }),
  getResultByAttemptIdHandler
);

// ==================== ADDITIONAL ROUTES (CERTIFICATE - TO BE IMPLEMENTED) ====================

// Get User Results (Admin only)
resultRoutes.get(
  "/user/:userId",
  generalApiRateLimit,
  authenticateUser,
  requireAdmin,
  zValidator("param", GetUserResultsRequestSchema, (result, c) => {
    if (!result.success) {
      const errorResponse: TestResultErrorResponse = {
        success: false,
        message: "Invalid user ID parameter",
        errors: result.error.errors.map((err) => ({
          field: err.path.join("."),
          message: err.message,
          code: err.code,
        })),
        timestamp: new Date().toISOString(),
      };
      return c.json(errorResponse, 400);
    }
  }),
  zValidator("query", GetUserResultsQuerySchema, (result, c) => {
    if (!result.success) {
      const errorResponse: TestResultErrorResponse = {
        success: false,
        message: "Invalid query parameters",
        errors: result.error.errors.map((err) => ({
          field: err.path.join("."),
          message: err.message,
          code: err.code,
        })),
        timestamp: new Date().toISOString(),
      };
      return c.json(errorResponse, 400);
    }
  }),
  getUserResultsHandler
);

// Get Test Results (Admin only)
resultRoutes.get(
  "/test/:testId",
  generalApiRateLimit,
  authenticateUser,
  requireAdmin,
  zValidator("param", GetTestResultsRequestSchema, (result, c) => {
    if (!result.success) {
      const errorResponse: TestResultErrorResponse = {
        success: false,
        message: "Invalid test ID parameter",
        errors: result.error.errors.map((err) => ({
          field: err.path.join("."),
          message: err.message,
          code: err.code,
        })),
        timestamp: new Date().toISOString(),
      };
      return c.json(errorResponse, 400);
    }
  }),
  zValidator("query", GetTestResultsQuerySchema, (result, c) => {
    if (!result.success) {
      const errorResponse: TestResultErrorResponse = {
        success: false,
        message: "Invalid query parameters",
        errors: result.error.errors.map((err) => ({
          field: err.path.join("."),
          message: err.message,
          code: err.code,
        })),
        timestamp: new Date().toISOString(),
      };
      return c.json(errorResponse, 400);
    }
  }),
  getTestResultsHandler
);

// Calculate/Recalculate Test Result (Admin only)
resultRoutes.post(
  "/calculate",
  generalApiRateLimit,
  authenticateUser,
  requireAdmin,
  zValidator("json", CalculateTestResultRequestSchema, (result, c) => {
    if (!result.success) {
      const errorResponse: TestResultErrorResponse = {
        success: false,
        message: "Validation failed",
        errors: result.error.errors.map((err) => ({
          field: err.path.join("."),
          message: err.message,
          code: err.code,
        })),
        timestamp: new Date().toISOString(),
      };
      return c.json(errorResponse, 400);
    }
  }),
  calculateTestResultHandler
);

// Generate Test Result Report (Participant can access own, Admin can access all)
resultRoutes.get(
  "/:resultId/report",
  generalApiRateLimit,
  authenticateUser,
  zValidator("param", GetResultReportRequestSchema, (result, c) => {
    if (!result.success) {
      const errorResponse: TestResultErrorResponse = {
        success: false,
        message: "Invalid result ID parameter",
        errors: result.error.errors.map((err) => ({
          field: err.path.join("."),
          message: err.message,
          code: err.code,
        })),
        timestamp: new Date().toISOString(),
      };
      return c.json(errorResponse, 400);
    }
  }),
  zValidator("query", GetResultReportQuerySchema, (result, c) => {
    if (!result.success) {
      const errorResponse: TestResultErrorResponse = {
        success: false,
        message: "Invalid query parameters",
        errors: result.error.errors.map((err) => ({
          field: err.path.join("."),
          message: err.message,
          code: err.code,
        })),
        timestamp: new Date().toISOString(),
      };
      return c.json(errorResponse, 400);
    }
  }),
  generateResultReportHandler
);

// Generate Test Result Certificate (Participant can access own, Admin can access all)
resultRoutes.get(
  "/:resultId/certificate",
  generalApiRateLimit,
  authenticateUser,
  async (c) => {
    const errorResponse: TestResultErrorResponse = {
      success: false,
      message: "Generate test result certificate endpoint not implemented yet",
      timestamp: new Date().toISOString(),
    };
    return c.json(errorResponse, 501);
  }
);

// ==================== UTILITY ROUTES ====================

// Get Result Filter Options (for frontend dropdowns)
resultRoutes.get(
  "/filters/options",
  generalApiRateLimit,
  authenticateUser,
  async (c) => {
    try {
      const { GRADE_LABELS, TRAIT_CATEGORIES, SCORE_INTERPRETATIONS } =
        await import("shared-types");

      const filterOptions = {
        success: true,
        message: "Result filter options retrieved successfully",
        data: {
          grades: Object.entries(GRADE_LABELS).map(([value, label]) => ({
            value,
            label,
          })),
          trait_categories: Object.entries(TRAIT_CATEGORIES).map(
            ([value, label]) => ({
              value,
              label,
            })
          ),
          score_ranges: Object.entries(SCORE_INTERPRETATIONS).map(
            ([key, range]) => ({
              value: key,
              label: range.label,
              min: range.min,
              max: range.max,
              color: range.color,
            })
          ),
          report_formats: [
            { value: "pdf", label: "PDF Document" },
            { value: "html", label: "HTML Web Page" },
            { value: "json", label: "JSON Data" },
          ],
          certificate_formats: [
            { value: "pdf", label: "PDF Certificate" },
            { value: "png", label: "PNG Image" },
            { value: "jpg", label: "JPEG Image" },
          ],
          certificate_templates: [
            { value: "standard", label: "Standard Certificate" },
            { value: "premium", label: "Premium Certificate" },
            { value: "corporate", label: "Corporate Certificate" },
            { value: "simple", label: "Simple Certificate" },
          ],
        },
        timestamp: new Date().toISOString(),
      };

      return c.json(filterOptions, 200);
    } catch (error) {
      console.error("Error getting result filter options:", error);
      const errorResponse: TestResultErrorResponse = {
        success: false,
        message: "Failed to retrieve filter options",
        timestamp: new Date().toISOString(),
      };
      return c.json(errorResponse, 500);
    }
  }
);

// Get Result Statistics (Admin only)
resultRoutes.get(
  "/stats/summary",
  generalApiRateLimit,
  authenticateUser,
  async (c) => {
    try {
      const { requireAdmin } = await import("@/middleware/auth");

      // Apply admin check
      await requireAdmin(c, async () => {});

      const { getDbFromEnv, testResults } = await import("@/db");
      const { count, avg, sql } = await import("drizzle-orm");

      const db = getDbFromEnv(c.env);

      // Get basic statistics
      const [totalResults] = await db
        .select({ count: count() })
        .from(testResults);

      const [scoreStats] = await db
        .select({
          avg_raw_score: avg(sql`CAST(${testResults.raw_score} AS DECIMAL)`),
          avg_scaled_score: avg(
            sql`CAST(${testResults.scaled_score} AS DECIMAL)`
          ),
          avg_percentile: avg(sql`CAST(${testResults.percentile} AS DECIMAL)`),
          avg_completion: avg(
            sql`CAST(${testResults.completion_percentage} AS DECIMAL)`
          ),
        })
        .from(testResults)
        .where(sql`${testResults.raw_score} IS NOT NULL`);

      const [passFailStats] = await db
        .select({
          passed: sql<number>`COUNT(CASE WHEN ${testResults.is_passed} = true THEN 1 END)`,
          failed: sql<number>`COUNT(CASE WHEN ${testResults.is_passed} = false THEN 1 END)`,
        })
        .from(testResults)
        .where(sql`${testResults.is_passed} IS NOT NULL`);

      const gradeDistribution = await db
        .select({
          grade: testResults.grade,
          count: count(),
        })
        .from(testResults)
        .where(sql`${testResults.grade} IS NOT NULL`)
        .groupBy(testResults.grade);

      const gradeDistributionObj = gradeDistribution.reduce(
        (acc, item) => {
          if (item.grade) {
            acc[item.grade] = item.count;
          }
          return acc;
        },
        {} as Record<string, number>
      );

      const stats = {
        total_results: totalResults.count,
        passed_results: Number(passFailStats.passed) || 0,
        failed_results: Number(passFailStats.failed) || 0,
        pass_rate:
          totalResults.count > 0
            ? Math.round(
                (Number(passFailStats.passed) / totalResults.count) * 100
              )
            : 0,
        average_raw_score: scoreStats.avg_raw_score
          ? Math.round(Number(scoreStats.avg_raw_score))
          : 0,
        average_scaled_score: scoreStats.avg_scaled_score
          ? Math.round(Number(scoreStats.avg_scaled_score))
          : 0,
        average_percentile: scoreStats.avg_percentile
          ? Math.round(Number(scoreStats.avg_percentile))
          : 0,
        average_completion_percentage: scoreStats.avg_completion
          ? Math.round(Number(scoreStats.avg_completion))
          : 0,
        grade_distribution: gradeDistributionObj,
      };

      const response = {
        success: true,
        message: "Result statistics retrieved successfully",
        data: stats,
        timestamp: new Date().toISOString(),
      };

      return c.json(response, 200);
    } catch (error) {
      console.error("Error getting result statistics:", error);
      const errorResponse: TestResultErrorResponse = {
        success: false,
        message: "Failed to retrieve result statistics",
        timestamp: new Date().toISOString(),
      };
      return c.json(errorResponse, 500);
    }
  }
);

// ==================== ERROR HANDLERS ====================
resultRoutes.onError((err, c) => {
  console.error("Result routes error:", err);

  const errorResponse: TestResultErrorResponse = {
    success: false,
    message: "Result route error",
    ...(c.env.NODE_ENV === "development" && {
      errors: [
        {
          message: err.message,
          code: "ROUTE_ERROR",
        },
      ],
    }),
    timestamp: new Date().toISOString(),
  };

  return c.json(errorResponse, 500);
});

export { resultRoutes };
