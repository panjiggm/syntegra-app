import { Context } from "hono";
import { eq, count, sql } from "drizzle-orm";
import {
  getDbFromEnv,
  users,
  tests,
  testSessions,
  testAttempts,
  sessionParticipants,
  sessionModules,
} from "@/db";
import { type CloudflareBindings } from "@/lib/env";

export async function getAdminDashboardHandler(
  c: Context<{ Bindings: CloudflareBindings; Variables: { user: any } }>
): Promise<Response> {
  try {
    const db = getDbFromEnv(c.env);

    // Get basic statistics
    const [totalUsers] = await db.select({ count: count() }).from(users);

    const [totalParticipants] = await db
      .select({ count: count() })
      .from(users)
      .where(eq(users.role, "participant"));

    const [totalAdmins] = await db
      .select({ count: count() })
      .from(users)
      .where(eq(users.role, "admin"));

    const [totalTests] = await db.select({ count: count() }).from(tests);

    const [activeTests] = await db
      .select({ count: count() })
      .from(tests)
      .where(eq(tests.status, "active"));

    const [totalSessions] = await db
      .select({ count: count() })
      .from(testSessions);

    const [activeSessions] = await db
      .select({ count: count() })
      .from(testSessions)
      .where(eq(testSessions.status, "active"));

    const [totalAttempts] = await db
      .select({ count: count() })
      .from(testAttempts);

    const [completedAttempts] = await db
      .select({ count: count() })
      .from(testAttempts)
      .where(eq(testAttempts.status, "completed"));

    const [totalSessionParticipants] = await db
      .select({ count: count() })
      .from(sessionParticipants);

    const [totalSessionModules] = await db
      .select({ count: count() })
      .from(sessionModules);

    // Get recent sessions
    const recentSessions = await db
      .select({
        id: testSessions.id,
        session_name: testSessions.session_name,
        session_code: testSessions.session_code,
        status: testSessions.status,
        start_time: testSessions.start_time,
        end_time: testSessions.end_time,
        current_participants: testSessions.current_participants,
        max_participants: testSessions.max_participants,
      })
      .from(testSessions)
      .orderBy(sql`${testSessions.created_at} DESC`)
      .limit(5);

    // Get popular tests (most attempted)
    const popularTests = await db
      .select({
        test_id: testAttempts.test_id,
        test_name: tests.name,
        attempt_count: count(testAttempts.id),
      })
      .from(testAttempts)
      .leftJoin(tests, eq(testAttempts.test_id, tests.id))
      .groupBy(testAttempts.test_id, tests.name)
      .orderBy(sql`count(${testAttempts.id}) DESC`)
      .limit(5);

    const response = {
      success: true,
      message: "Admin dashboard data retrieved successfully",
      data: {
        overview: {
          total_users: totalUsers.count,
          total_participants: totalParticipants.count,
          total_admins: totalAdmins.count,
          total_tests: totalTests.count,
          active_tests: activeTests.count,
          total_sessions: totalSessions.count,
          active_sessions: activeSessions.count,
          total_attempts: totalAttempts.count,
          completed_attempts: completedAttempts.count,
          total_session_participants: totalSessionParticipants.count,
          total_session_modules: totalSessionModules.count,
        },
        recent_sessions: recentSessions.map((session) => ({
          id: session.id,
          session_name: session.session_name,
          session_code: session.session_code,
          status: session.status,
          start_time: session.start_time.toISOString(),
          end_time: session.end_time.toISOString(),
          participants: `${session.current_participants || 0}/${session.max_participants || 0}`,
        })),
        popular_tests: popularTests.map((test) => ({
          test_id: test.test_id,
          test_name: test.test_name || "Unknown Test",
          attempt_count: test.attempt_count,
        })),
      },
      timestamp: new Date().toISOString(),
    };

    return c.json(response, 200);
  } catch (error) {
    console.error("Error getting admin dashboard:", error);

    return c.json(
      {
        success: false,
        message: "Failed to retrieve admin dashboard data",
        errors: [
          {
            message:
              error instanceof Error ? error.message : "Unknown error occurred",
            code: "INTERNAL_ERROR",
          },
        ],
        timestamp: new Date().toISOString(),
      },
      500
    );
  }
}
