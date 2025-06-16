import { Context } from "hono";
import { eq, and } from "drizzle-orm";
import {
  getDbFromEnv,
  participantTestProgress,
  tests,
  isDatabaseConfigured,
} from "@/db";
import { type CloudflareBindings } from "@/lib/env";

export async function getTestProgressHandler(
  c: Context<{ Bindings: CloudflareBindings }>
) {
  try {
    // Check if database is configured first
    if (!isDatabaseConfigured(c.env)) {
      const errorResponse = {
        success: false,
        message: "Database not configured",
        timestamp: new Date().toISOString(),
      };
      return c.json(errorResponse, 503);
    }

    // Get path parameters
    const { sessionId, participantId, testId } = c.req.param();

    // Get database connection
    const db = getDbFromEnv(c.env);

    // Get progress record with test info
    const [progressData] = await db
      .select({
        // Progress fields
        id: participantTestProgress.id,
        participant_id: participantTestProgress.participant_id,
        session_id: participantTestProgress.session_id,
        test_id: participantTestProgress.test_id,
        user_id: participantTestProgress.user_id,
        status: participantTestProgress.status,
        started_at: participantTestProgress.started_at,
        completed_at: participantTestProgress.completed_at,
        expected_completion_at: participantTestProgress.expected_completion_at,
        answered_questions: participantTestProgress.answered_questions,
        total_questions: participantTestProgress.total_questions,
        time_spent: participantTestProgress.time_spent,
        is_auto_completed: participantTestProgress.is_auto_completed,
        last_activity_at: participantTestProgress.last_activity_at,
        created_at: participantTestProgress.created_at,
        updated_at: participantTestProgress.updated_at,
        // Test fields
        test_name: tests.name,
        test_category: tests.category,
        test_module_type: tests.module_type,
        test_time_limit: tests.time_limit,
        test_total_questions: tests.total_questions,
        test_icon: tests.icon,
        test_card_color: tests.card_color,
        test_question_type: tests.question_type,
      })
      .from(participantTestProgress)
      .innerJoin(tests, eq(participantTestProgress.test_id, tests.id))
      .where(
        and(
          eq(participantTestProgress.participant_id, participantId),
          eq(participantTestProgress.session_id, sessionId),
          eq(participantTestProgress.test_id, testId)
        )
      )
      .limit(1);

    if (!progressData) {
      const errorResponse = {
        success: false,
        message: "Test progress not found",
        timestamp: new Date().toISOString(),
      };
      return c.json(errorResponse, 404);
    }

    // Calculate computed fields
    const now = new Date();
    let timeRemaining = 0;
    let isTimeExpired = false;

    if (progressData.started_at && progressData.status === "in_progress") {
      const expectedCompletion = new Date(
        progressData.started_at.getTime() +
          progressData.test_time_limit * 60 * 1000
      );
      timeRemaining = Math.max(
        0,
        Math.floor((expectedCompletion.getTime() - now.getTime()) / 1000)
      );
      isTimeExpired = now >= expectedCompletion;
    } else if (progressData.status === "not_started") {
      timeRemaining = progressData.test_time_limit * 60;
    }

    const progressPercentage =
      (progressData.test_total_questions ?? 0) > 0
        ? Math.min(
            100,
            Math.round(
              ((progressData.answered_questions ?? 0) /
                (progressData.test_total_questions ?? 1)) *
                100
            )
          )
        : 0;

    const response = {
      success: true,
      message: "Test progress retrieved successfully",
      data: {
        id: progressData.id,
        participant_id: progressData.participant_id,
        session_id: progressData.session_id,
        test_id: progressData.test_id,
        user_id: progressData.user_id,
        status: progressData.status,
        started_at: progressData.started_at,
        completed_at: progressData.completed_at,
        expected_completion_at: progressData.expected_completion_at,
        answered_questions: progressData.answered_questions,
        total_questions: progressData.total_questions,
        time_spent: progressData.time_spent,
        is_auto_completed: progressData.is_auto_completed,
        last_activity_at: progressData.last_activity_at,
        created_at: progressData.created_at,
        updated_at: progressData.updated_at,
        test: {
          id: progressData.test_id,
          name: progressData.test_name,
          category: progressData.test_category,
          module_type: progressData.test_module_type,
          time_limit: progressData.test_time_limit,
          total_questions: progressData.test_total_questions,
          icon: progressData.test_icon,
          card_color: progressData.test_card_color,
          question_type: progressData.test_question_type,
        },
        time_remaining: timeRemaining,
        progress_percentage: progressPercentage,
        is_time_expired: isTimeExpired,
      },
      timestamp: new Date().toISOString(),
    };

    return c.json(response, 200);
  } catch (error) {
    console.error("Error getting test progress:", error);

    const errorResponse = {
      success: false,
      message: "Failed to retrieve test progress",
      timestamp: new Date().toISOString(),
    };

    return c.json(errorResponse, 500);
  }
}
