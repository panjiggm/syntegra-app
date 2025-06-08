import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { type CloudflareBindings } from "@/lib/env";
import {
  SubmitAnswerRequestSchema,
  SubmitAnswerByAttemptRequestSchema,
  AutoSaveAnswerRequestSchema,
  AutoSaveAnswerByAttemptRequestSchema,
  GetAttemptAnswersRequestSchema,
  GetAttemptAnswersQuerySchema,
  GetSpecificAnswerRequestSchema,
  type AnswerErrorResponse,
} from "shared-types";
import { submitAnswerHandler } from "./answer.submit";
import { getAttemptAnswersHandler } from "./answer.get-list";
import { getSpecificAnswerHandler } from "./answer.get-specific";
import { autoSaveAnswerHandler } from "./answer.auto-save";
import { authenticateUser, requireParticipant } from "@/middleware/auth";
import { generalApiRateLimit } from "@/middleware/rateLimiter";

const answerRoutes = new Hono<{ Bindings: CloudflareBindings }>();

// ==================== AUTO-SAVE ROUTE ====================

// Auto-save Answer (Participant only)
answerRoutes.post(
  "/auto-save",
  generalApiRateLimit,
  authenticateUser,
  requireParticipant,
  zValidator("param", AutoSaveAnswerByAttemptRequestSchema, (result, c) => {
    if (!result.success) {
      const errorResponse: AnswerErrorResponse = {
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
  zValidator("json", AutoSaveAnswerRequestSchema, (result, c) => {
    if (!result.success) {
      const errorResponse: AnswerErrorResponse = {
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
  autoSaveAnswerHandler
);

// ==================== ATTEMPT-SPECIFIC ROUTES ====================

// Submit Answer to Attempt (Participant only)
answerRoutes.post(
  "/",
  generalApiRateLimit,
  authenticateUser,
  requireParticipant,
  zValidator("param", SubmitAnswerByAttemptRequestSchema, (result, c) => {
    if (!result.success) {
      const errorResponse: AnswerErrorResponse = {
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
  zValidator("json", SubmitAnswerRequestSchema, (result, c) => {
    if (!result.success) {
      const errorResponse: AnswerErrorResponse = {
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
  submitAnswerHandler
);

// Get Attempt Answers (Participant can access own, Admin can access all)
answerRoutes.get(
  "/",
  generalApiRateLimit,
  authenticateUser,
  zValidator("param", GetAttemptAnswersRequestSchema, (result, c) => {
    if (!result.success) {
      const errorResponse: AnswerErrorResponse = {
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
  zValidator("query", GetAttemptAnswersQuerySchema, (result, c) => {
    if (!result.success) {
      const errorResponse: AnswerErrorResponse = {
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
  getAttemptAnswersHandler
);

// Get Specific Answer (Participant can access own, Admin can access all)
answerRoutes.get(
  "/:questionId",
  generalApiRateLimit,
  authenticateUser,
  zValidator("param", GetSpecificAnswerRequestSchema, (result, c) => {
    if (!result.success) {
      const errorResponse: AnswerErrorResponse = {
        success: false,
        message: "Invalid attempt ID or question ID parameter",
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
  getSpecificAnswerHandler
);

// ==================== UTILITY ROUTES ====================

// Get Answer Types (for frontend)
answerRoutes.get(
  "/utils/answer-types",
  generalApiRateLimit,
  authenticateUser,
  async (c) => {
    try {
      const { ANSWER_TYPE_LABELS, CONFIDENCE_LEVEL_LABELS } = await import(
        "shared-types"
      );

      const response = {
        success: true,
        message: "Answer types retrieved successfully",
        data: {
          answer_types: Object.entries(ANSWER_TYPE_LABELS).map(
            ([value, label]) => ({
              value,
              label,
            })
          ),
          confidence_levels: Object.entries(CONFIDENCE_LEVEL_LABELS).map(
            ([value, label]) => ({
              value: parseInt(value),
              label,
            })
          ),
        },
        timestamp: new Date().toISOString(),
      };

      return c.json(response, 200);
    } catch (error) {
      console.error("Error getting answer types:", error);
      const errorResponse: AnswerErrorResponse = {
        success: false,
        message: "Failed to retrieve answer types",
        timestamp: new Date().toISOString(),
      };
      return c.json(errorResponse, 500);
    }
  }
);

// Get Answer Statistics for Attempt (Admin only)
answerRoutes.get(
  "/stats",
  generalApiRateLimit,
  authenticateUser,
  zValidator("param", GetAttemptAnswersRequestSchema, (result, c) => {
    if (!result.success) {
      const errorResponse: AnswerErrorResponse = {
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
  async (c) => {
    try {
      const { requireAdmin } = await import("@/middleware/auth");

      // Apply admin check
      await requireAdmin(c, async () => {});

      const { getDbFromEnv, userAnswers, testAttempts } = await import("@/db");
      const { eq, and, count, avg, min, max, sql } = await import(
        "drizzle-orm"
      );

      const db = getDbFromEnv(c.env);
      const { attemptId } = c.req.param();

      // Get attempt details
      const attempt = await db
        .select()
        .from(testAttempts)
        .where(eq(testAttempts.id, attemptId))
        .limit(1);

      if (attempt.length === 0) {
        const errorResponse: AnswerErrorResponse = {
          success: false,
          message: "Test attempt not found",
          timestamp: new Date().toISOString(),
        };
        return c.json(errorResponse, 404);
      }

      // Get answer statistics
      const [stats] = await db
        .select({
          total_questions: count(),
          answered_questions: sql<number>`COUNT(CASE WHEN ${userAnswers.answer} IS NOT NULL OR ${userAnswers.answer_data} IS NOT NULL THEN 1 END)`,
          correct_answers: sql<number>`COUNT(CASE WHEN ${userAnswers.is_correct} = true THEN 1 END)`,
          incorrect_answers: sql<number>`COUNT(CASE WHEN ${userAnswers.is_correct} = false THEN 1 END)`,
          total_score: sql<number>`SUM(CASE WHEN ${userAnswers.score} IS NOT NULL THEN ${userAnswers.score}::numeric ELSE 0 END)`,
          total_time_spent: sql<number>`SUM(CASE WHEN ${userAnswers.time_taken} IS NOT NULL THEN ${userAnswers.time_taken} ELSE 0 END)`,
          avg_time: avg(userAnswers.time_taken),
          fastest_answer: min(userAnswers.time_taken),
          slowest_answer: max(userAnswers.time_taken),
        })
        .from(userAnswers)
        .where(eq(userAnswers.attempt_id, attemptId));

      // Get confidence level distribution
      const confidenceDistribution = await db
        .select({
          confidence_level: userAnswers.confidence_level,
          count: count(),
        })
        .from(userAnswers)
        .where(
          and(
            eq(userAnswers.attempt_id, attemptId),
            sql`${userAnswers.confidence_level} IS NOT NULL`
          )
        )
        .groupBy(userAnswers.confidence_level);

      const confidenceDistributionObj = confidenceDistribution.reduce(
        (acc, item) => {
          if (item.confidence_level) {
            acc[item.confidence_level.toString()] = item.count;
          }
          return acc;
        },
        {} as Record<string, number>
      );

      const totalQuestions = Number(stats.total_questions) || 0;
      const answeredQuestions = Number(stats.answered_questions) || 0;
      const correctAnswers = Number(stats.correct_answers) || 0;
      const totalScore = Number(stats.total_score) || 0;
      const totalTimeSpent = Number(stats.total_time_spent) || 0;

      const responseData = {
        attempt_id: attemptId,
        total_questions: totalQuestions,
        answered_questions: answeredQuestions,
        correct_answers: correctAnswers,
        incorrect_answers: Number(stats.incorrect_answers) || 0,
        skipped_questions: totalQuestions - answeredQuestions,
        total_score: totalScore,
        average_score:
          answeredQuestions > 0 ? totalScore / answeredQuestions : 0,
        completion_percentage:
          totalQuestions > 0
            ? Math.round((answeredQuestions / totalQuestions) * 100)
            : 0,
        total_time_spent: totalTimeSpent,
        average_time_per_question: stats.avg_time ? Number(stats.avg_time) : 0,
        fastest_answer: stats.fastest_answer
          ? Number(stats.fastest_answer)
          : null,
        slowest_answer: stats.slowest_answer
          ? Number(stats.slowest_answer)
          : null,
        confidence_distribution: confidenceDistributionObj,
      };

      const response = {
        success: true,
        message: "Answer statistics retrieved successfully",
        data: responseData,
        timestamp: new Date().toISOString(),
      };

      return c.json(response, 200);
    } catch (error) {
      console.error("Error getting answer statistics:", error);
      const errorResponse: AnswerErrorResponse = {
        success: false,
        message: "Failed to retrieve answer statistics",
        timestamp: new Date().toISOString(),
      };
      return c.json(errorResponse, 500);
    }
  }
);

// ==================== ERROR HANDLERS ====================
answerRoutes.onError((err, c) => {
  console.error("Answer routes error:", err);

  const errorResponse: AnswerErrorResponse = {
    success: false,
    message: "Answer route error",
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

export { answerRoutes };
