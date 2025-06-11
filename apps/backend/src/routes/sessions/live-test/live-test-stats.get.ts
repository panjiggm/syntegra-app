import { Context } from "hono";
import { type CloudflareBindings } from "@/lib/env";
import { type SessionErrorResponse, GetSessionByIdRequest } from "shared-types";
import { isDatabaseConfigured } from "@/db";
import { getDbFromEnv } from "@/db";
import { sessionParticipants } from "@/db";
import { sql, eq, and } from "drizzle-orm";
import { testAttempts } from "@/db";

export async function getLiveTestStatsHandler(
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

    // Get basic statistics
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
      (participantStats.find((s) => s.status === "registered")?.count || 0) +
      (participantStats.find((s) => s.status === "invited")?.count || 0);

    const completionRate =
      totalParticipants > 0
        ? Math.round((completedParticipants / totalParticipants) * 100)
        : 0;

    // Calculate average progress
    const [avgProgressData] = await db
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

    const averageProgress = avgProgressData?.avg_progress
      ? Math.round(avgProgressData.avg_progress)
      : 0;

    const response = {
      success: true,
      message: `Live test statistics retrieved`,
      data: {
        total_participants: totalParticipants,
        active_participants: activeParticipants,
        completed_participants: completedParticipants,
        not_started_participants: notStartedParticipants,
        completion_rate: completionRate,
        average_progress: averageProgress,
        estimated_completion_time: new Date(
          Date.now() + 60 * 60 * 1000
        ).toISOString(), // Placeholder
      },
      timestamp: new Date().toISOString(),
    };

    return c.json(response, 200);
  } catch (error) {
    console.error("Error getting live test stats:", error);

    const errorResponse: SessionErrorResponse = {
      success: false,
      message: "Failed to retrieve live test statistics",
      timestamp: new Date().toISOString(),
    };

    return c.json(errorResponse, 500);
  }
}
