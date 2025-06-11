import { Context } from "hono";
import { eq, and, sql, desc } from "drizzle-orm";
import {
  getDbFromEnv,
  testSessions,
  sessionParticipants,
  testAttempts,
  userAnswers,
  sessionModules,
  tests,
  users,
  isDatabaseConfigured,
} from "@/db";
import { getEnv, type CloudflareBindings } from "@/lib/env";
import {
  type GetSessionByIdRequest,
  type SessionErrorResponse,
  isSessionActive,
} from "shared-types";

interface LiveTestDataResponse {
  success: boolean;
  message: string;
  data: {
    session: {
      id: string;
      session_name: string;
      session_code: string;
      start_time: Date;
      end_time: Date;
      status: string;
    };
    stats: {
      total_participants: number;
      active_participants: number;
      completed_participants: number;
      not_started_participants: number;
      completion_rate: number;
      average_progress: number;
      estimated_completion_time: string;
    };
    modules_progress: Array<{
      test_id: string;
      test_name: string;
      icon?: string;
      sequence: number;
      total_participants: number;
      participants_started: number;
      participants_completed: number;
      average_completion_time: number;
      completion_rate: number;
    }>;
    real_time_updates: {
      last_updated: string;
      active_connections: number;
    };
  };
  timestamp: string;
}

export async function getLiveTestDataHandler(
  c: Context<{ Bindings: CloudflareBindings }>
) {
  try {
    // Check if database is configured
    if (!isDatabaseConfigured(c.env)) {
      const errorResponse: SessionErrorResponse = {
        success: false,
        message: "Database not configured",
        errors: [
          {
            field: "database",
            message: "DATABASE_URL is not configured",
            code: "DATABASE_NOT_CONFIGURED",
          },
        ],
        timestamp: new Date().toISOString(),
      };
      return c.json(errorResponse, 503);
    }

    const { sessionId } = c.req.param() as GetSessionByIdRequest;
    const db = getDbFromEnv(c.env);
    const env = getEnv(c);

    // Get authenticated admin user
    const auth = c.get("auth");
    if (!auth || auth.user.role !== "admin") {
      const errorResponse: SessionErrorResponse = {
        success: false,
        message: "Access denied",
        errors: [
          {
            field: "authorization",
            message: "Only admin users can access live test monitoring",
            code: "ACCESS_DENIED",
          },
        ],
        timestamp: new Date().toISOString(),
      };
      return c.json(errorResponse, 403);
    }

    // Get session details
    const [session] = await db
      .select({
        id: testSessions.id,
        session_name: testSessions.session_name,
        session_code: testSessions.session_code,
        start_time: testSessions.start_time,
        end_time: testSessions.end_time,
        status: testSessions.status,
        current_participants: testSessions.current_participants,
      })
      .from(testSessions)
      .where(eq(testSessions.id, sessionId))
      .limit(1);

    if (!session) {
      const errorResponse: SessionErrorResponse = {
        success: false,
        message: "Session not found",
        errors: [
          {
            field: "sessionId",
            message: `Session with ID "${sessionId}" not found`,
            code: "SESSION_NOT_FOUND",
          },
        ],
        timestamp: new Date().toISOString(),
      };
      return c.json(errorResponse, 404);
    }

    // Check if session is active
    const sessionIsActive = isSessionActive({
      start_time: session.start_time,
      end_time: session.end_time,
      status: session.status || "draft",
    });

    if (!sessionIsActive) {
      const errorResponse: SessionErrorResponse = {
        success: false,
        message: "Session is not active",
        errors: [
          {
            field: "session_status",
            message: "Live monitoring is only available for active sessions",
            code: "SESSION_NOT_ACTIVE",
          },
        ],
        timestamp: new Date().toISOString(),
      };
      return c.json(errorResponse, 400);
    }

    // Get participants statistics
    const participantStats = await db
      .select({
        status: sessionParticipants.status,
        count: sql<number>`count(*)`,
      })
      .from(sessionParticipants)
      .where(eq(sessionParticipants.session_id, sessionId))
      .groupBy(sessionParticipants.status);

    const totalParticipants = participantStats.reduce(
      (sum, stat) => sum + (stat.count || 0),
      0
    );

    const activeParticipants =
      participantStats.find((s) => s.status === "started")?.count || 0;
    const completedParticipants =
      participantStats.find((s) => s.status === "completed")?.count || 0;
    const notStartedParticipants =
      participantStats.find((s) => s.status === "registered")?.count || 0;

    const completionRate =
      totalParticipants > 0
        ? Math.round((completedParticipants / totalParticipants) * 100)
        : 0;

    // Get session modules and their progress
    const modulesWithProgress = await db
      .select({
        test_id: sessionModules.test_id,
        test_name: tests.name,
        test_icon: tests.icon,
        sequence: sessionModules.sequence,
        time_limit: tests.time_limit,
        total_questions: tests.total_questions,
      })
      .from(sessionModules)
      .innerJoin(tests, eq(sessionModules.test_id, tests.id))
      .where(eq(sessionModules.session_id, sessionId))
      .orderBy(sessionModules.sequence);

    // Calculate progress for each module
    const modulesProgress = await Promise.all(
      modulesWithProgress.map(async (module) => {
        // Get participants who started this test
        const [startedCount] = await db
          .select({
            count: sql<number>`count(*)`,
          })
          .from(testAttempts)
          .where(
            and(
              eq(testAttempts.test_id, module.test_id),
              eq(testAttempts.session_test_id, sessionId),
              sql`${testAttempts.status} IN ('started', 'in_progress', 'completed')`
            )
          );

        // Get participants who completed this test
        const [completedCount] = await db
          .select({
            count: sql<number>`count(*)`,
          })
          .from(testAttempts)
          .where(
            and(
              eq(testAttempts.test_id, module.test_id),
              eq(testAttempts.session_test_id, sessionId),
              eq(testAttempts.status, "completed")
            )
          );

        // Calculate average completion time
        const [avgTime] = await db
          .select({
            avg_time: sql<number>`avg(${testAttempts.time_spent})`,
          })
          .from(testAttempts)
          .where(
            and(
              eq(testAttempts.test_id, module.test_id),
              eq(testAttempts.session_test_id, sessionId),
              eq(testAttempts.status, "completed"),
              sql`${testAttempts.time_spent} IS NOT NULL`
            )
          );

        const averageCompletionTime = avgTime?.avg_time
          ? Math.round(avgTime.avg_time / 60) // Convert seconds to minutes
          : module.time_limit; // Fallback to time limit

        const moduleCompletionRate =
          startedCount?.count > 0
            ? Math.round(
                ((completedCount?.count || 0) / startedCount.count) * 100
              )
            : 0;

        return {
          test_id: module.test_id,
          test_name: module.test_name,
          icon: module.test_icon ?? undefined,
          sequence: module.sequence,
          total_participants: totalParticipants,
          participants_started: startedCount?.count || 0,
          participants_completed: completedCount?.count || 0,
          average_completion_time: averageCompletionTime,
          completion_rate: moduleCompletionRate,
        };
      })
    );

    // Calculate average progress across all participants
    const [progressData] = await db
      .select({
        avg_progress: sql<number>`
          avg(
            case 
              when ${testAttempts.total_questions} > 0 
              then (${testAttempts.questions_answered} * 100.0 / ${testAttempts.total_questions})
              else 0
            end
          )
        `,
      })
      .from(testAttempts)
      .where(
        and(
          eq(testAttempts.session_test_id, sessionId),
          sql`${testAttempts.status} IN ('started', 'in_progress', 'completed')`
        )
      );

    const averageProgress = progressData?.avg_progress
      ? Math.round(progressData.avg_progress)
      : 0;

    // Estimate completion time based on current progress
    const timeElapsed =
      (new Date().getTime() - session.start_time.getTime()) / (1000 * 60); // minutes
    const estimatedTotalTime =
      averageProgress > 0 ? (timeElapsed * 100) / averageProgress : 0;
    const estimatedRemainingTime = Math.max(
      0,
      estimatedTotalTime - timeElapsed
    );

    const estimatedCompletionTime = new Date(
      Date.now() + estimatedRemainingTime * 60 * 1000
    ).toISOString();

    const response: LiveTestDataResponse = {
      success: true,
      message: `Live test data retrieved for session '${session.session_name}'`,
      data: {
        session: {
          id: session.id,
          session_name: session.session_name,
          session_code: session.session_code,
          start_time: session.start_time,
          end_time: session.end_time,
          status: session.status || "active",
        },
        stats: {
          total_participants: totalParticipants,
          active_participants: activeParticipants,
          completed_participants: completedParticipants,
          not_started_participants: notStartedParticipants,
          completion_rate: completionRate,
          average_progress: averageProgress,
          estimated_completion_time: estimatedCompletionTime,
        },
        modules_progress: modulesProgress,
        real_time_updates: {
          last_updated: new Date().toISOString(),
          active_connections: 1, // This would be dynamic in a real WebSocket implementation
        },
      },
      timestamp: new Date().toISOString(),
    };

    console.log(
      `✅ Live test data retrieved by admin ${auth.user.email}: ${session.session_name} (${session.session_code}) - ${totalParticipants} participants, ${activeParticipants} active`
    );

    return c.json(response, 200);
  } catch (error) {
    console.error("Error getting live test data:", error);

    const env = getEnv(c);
    const errorResponse: SessionErrorResponse = {
      success: false,
      message: "Failed to retrieve live test data",
      ...(env.NODE_ENV === "development" && {
        errors: [
          {
            message: error instanceof Error ? error.message : "Unknown error",
            code: "INTERNAL_ERROR",
          },
        ],
      }),
      timestamp: new Date().toISOString(),
    };

    return c.json(errorResponse, 500);
  }
}
