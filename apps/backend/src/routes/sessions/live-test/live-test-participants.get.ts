import { Context } from "hono";
import { eq, and, sql, desc } from "drizzle-orm";
import {
  getDbFromEnv,
  sessionParticipants,
  testAttempts,
  sessionModules,
  tests,
  users,
  isDatabaseConfigured,
} from "@/db";
import { type CloudflareBindings } from "@/lib/env";
import {
  type GetSessionByIdRequest,
  type SessionErrorResponse,
} from "shared-types";

export async function getLiveTestParticipantsHandler(
  c: Context<{ Bindings: CloudflareBindings }>
) {
  try {
    if (!isDatabaseConfigured(c.env)) {
      const errorResponse: SessionErrorResponse = {
        success: false,
        message: "Database not configured",
        timestamp: new Date().toISOString(),
      };
      return c.json(errorResponse, 503);
    }

    const { sessionId } = c.req.param() as GetSessionByIdRequest;
    const db = getDbFromEnv(c.env);

    const auth = c.get("auth");
    if (!auth || auth.user.role !== "admin") {
      const errorResponse: SessionErrorResponse = {
        success: false,
        message: "Access denied",
        timestamp: new Date().toISOString(),
      };
      return c.json(errorResponse, 403);
    }

    // Get participants with their current progress
    const participantsProgress = await db
      .select({
        participant_id: sessionParticipants.id,
        user_id: sessionParticipants.user_id,
        status: sessionParticipants.status,
        registered_at: sessionParticipants.registered_at,
        user_name: users.name,
        user_email: users.email,
        user_nik: users.nik,
      })
      .from(sessionParticipants)
      .innerJoin(users, eq(sessionParticipants.user_id, users.id))
      .where(eq(sessionParticipants.session_id, sessionId))
      .orderBy(desc(sessionParticipants.created_at));

    // Enhance with progress data
    const participantsWithProgress = await Promise.all(
      participantsProgress.map(async (participant) => {
        // Get current test attempt data
        const [currentAttempt] = await db
          .select({
            attempt_id: testAttempts.id,
            test_id: testAttempts.test_id,
            start_time: testAttempts.start_time,
            end_time: testAttempts.end_time,
            status: testAttempts.status,
            questions_answered: testAttempts.questions_answered,
            total_questions: testAttempts.total_questions,
            time_spent: testAttempts.time_spent,
            test_name: tests.name,
            test_time_limit: tests.time_limit,
          })
          .from(testAttempts)
          .innerJoin(tests, eq(testAttempts.test_id, tests.id))
          .where(
            and(
              eq(testAttempts.user_id, participant.user_id),
              eq(testAttempts.session_test_id, sessionId),
              sql`${testAttempts.status} IN ('started', 'in_progress')`
            )
          )
          .orderBy(desc(testAttempts.start_time))
          .limit(1);

        // Calculate overall progress across all tests
        const [overallProgress] = await db
          .select({
            total_answered: sql<number>`sum(${testAttempts.questions_answered})`,
            total_questions: sql<number>`sum(${testAttempts.total_questions})`,
            total_time_spent: sql<number>`sum(${testAttempts.time_spent})`,
          })
          .from(testAttempts)
          .where(
            and(
              eq(testAttempts.user_id, participant.user_id),
              eq(testAttempts.session_test_id, sessionId)
            )
          );

        const overallProgressPercentage =
          overallProgress?.total_questions > 0
            ? Math.round(
                ((overallProgress.total_answered || 0) /
                  overallProgress.total_questions) *
                  100
              )
            : 0;

        // Get session total time limit
        const [sessionTimeData] = await db
          .select({
            total_time_limit: sql<number>`sum(${tests.time_limit})`,
          })
          .from(sessionModules)
          .innerJoin(tests, eq(sessionModules.test_id, tests.id))
          .where(eq(sessionModules.session_id, sessionId));

        const totalTimeLimit = sessionTimeData?.total_time_limit || 120; // Default 2 hours

        // Calculate estimated end time
        let estimatedEndTime = null;
        let estimatedCompletionTime = null;

        if (participant.status === "started" && currentAttempt) {
          const timeSpentMinutes =
            (overallProgress?.total_time_spent || 0) / 60;
          const progressRate = overallProgressPercentage / timeSpentMinutes;
          const estimatedTotalTime = 100 / progressRate;
          const remainingTime = estimatedTotalTime - timeSpentMinutes;

          estimatedEndTime = new Date(
            Date.now() + remainingTime * 60 * 1000
          ).toISOString();

          estimatedCompletionTime = new Date(
            currentAttempt.start_time.getTime() + estimatedTotalTime * 60 * 1000
          ).toISOString();
        }

        return {
          id: participant.participant_id,
          user: {
            id: participant.user_id,
            name: participant.user_name,
            email: participant.user_email,
            nik: participant.user_nik || "",
          },
          status: participant.status as any,
          overall_progress: overallProgressPercentage,
          completed_questions: overallProgress?.total_answered || 0,
          total_questions: overallProgress?.total_questions || 0,
          current_module: currentAttempt
            ? {
                test_id: currentAttempt.test_id,
                test_name: currentAttempt.test_name,
                current_question: currentAttempt.questions_answered || 0,
                total_questions: currentAttempt.total_questions || 0,
                time_spent: Math.round((currentAttempt.time_spent || 0) / 60), // Convert to minutes
                time_limit: currentAttempt.test_time_limit,
              }
            : null,
          started_at: currentAttempt?.start_time?.toISOString() || null,
          estimated_end_time: estimatedEndTime,
          estimated_completion_time: estimatedCompletionTime,
          last_activity: currentAttempt?.start_time?.toISOString() || null,
          time_spent_total: Math.round(
            (overallProgress?.total_time_spent || 0) / 60
          ), // Convert to minutes
        };
      })
    );

    const response = {
      success: true,
      message: `Participants progress retrieved for session`,
      data: participantsWithProgress,
      timestamp: new Date().toISOString(),
    };

    return c.json(response, 200);
  } catch (error) {
    console.error("Error getting live test participants:", error);

    const errorResponse: SessionErrorResponse = {
      success: false,
      message: "Failed to retrieve participants progress",
      timestamp: new Date().toISOString(),
    };

    return c.json(errorResponse, 500);
  }
}
