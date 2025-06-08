import { Context } from "hono";
import { eq, sql } from "drizzle-orm";
import {
  getDbFromEnv,
  users,
  tests,
  testAttempts,
  testSessions,
  sessionParticipants,
} from "@/db";
import { type CloudflareBindings } from "@/lib/env";

export async function getParticipantDashboardHandler(
  c: Context<{ Bindings: CloudflareBindings; Variables: { user: any } }>
): Promise<Response> {
  try {
    const db = getDbFromEnv(c.env);
    const auth = c.get("auth");
    const user = auth.user;

    // Get user's test attempts
    const userAttempts = await db
      .select({
        id: testAttempts.id,
        test_id: testAttempts.test_id,
        status: testAttempts.status,
        start_time: testAttempts.start_time,
        end_time: testAttempts.end_time,
        time_spent: testAttempts.time_spent,
        test_name: tests.name,
        test_category: tests.category,
      })
      .from(testAttempts)
      .leftJoin(tests, eq(testAttempts.test_id, tests.id))
      .where(eq(testAttempts.user_id, user.id))
      .orderBy(sql`${testAttempts.start_time} DESC`);

    // Calculate statistics
    const totalAttempts = userAttempts.length;
    const completedTests = userAttempts.filter(
      (attempt) => attempt.status === "completed"
    ).length;
    const inProgressTests = userAttempts.filter(
      (attempt) =>
        attempt.status === "started" || attempt.status === "in_progress"
    ).length;

    // Calculate total time spent (convert seconds to minutes)
    const totalTimeSpent = Math.round(
      userAttempts.reduce(
        (sum, attempt) => sum + (attempt.time_spent || 0),
        0
      ) / 60
    );

    // Get user's sessions
    const userSessions = await db
      .select({
        session_id: sessionParticipants.session_id,
        session_name: testSessions.session_name,
        session_code: testSessions.session_code,
        status: testSessions.status,
        start_time: testSessions.start_time,
        end_time: testSessions.end_time,
        participant_status: sessionParticipants.status,
      })
      .from(sessionParticipants)
      .leftJoin(
        testSessions,
        eq(sessionParticipants.session_id, testSessions.id)
      )
      .where(eq(sessionParticipants.user_id, user.id))
      .orderBy(sql`${testSessions.start_time} DESC`)
      .limit(5);

    const now = new Date();
    const upcomingSessions = userSessions.filter(
      (session) =>
        session.status === "active" && new Date(session.start_time || "") > now
    );

    // Get recent completed tests
    const recentTests = userAttempts
      .filter((attempt) => attempt.status === "completed")
      .slice(0, 5)
      .map((attempt) => ({
        test_name: attempt.test_name || "Unknown Test",
        category: attempt.test_category || "unknown",
        completed_at:
          attempt.end_time?.toISOString() || attempt.start_time.toISOString(),
        time_spent_minutes: Math.round((attempt.time_spent || 0) / 60),
      }));

    // Get tests by category
    const testsByCategory = userAttempts
      .filter((attempt) => attempt.status === "completed")
      .reduce(
        (acc, attempt) => {
          const category = attempt.test_category || "unknown";
          acc[category] = (acc[category] || 0) + 1;
          return acc;
        },
        {} as Record<string, number>
      );

    const response = {
      success: true,
      message: "Participant dashboard data retrieved successfully",
      data: {
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          nik: user.nik,
          last_login: user.last_login,
        },
        test_summary: {
          total_attempts: totalAttempts,
          completed_tests: completedTests,
          in_progress_tests: inProgressTests,
          total_time_spent_minutes: totalTimeSpent,
          average_time_per_test_minutes:
            completedTests > 0
              ? Math.round(totalTimeSpent / completedTests)
              : 0,
        },
        session_summary: {
          total_sessions: userSessions.length,
          upcoming_sessions: upcomingSessions.length,
          active_sessions: userSessions.filter((s) => s.status === "active")
            .length,
        },
        recent_tests: recentTests,
        tests_by_category: testsByCategory,
        upcoming_sessions: upcomingSessions.slice(0, 3).map((session) => ({
          session_name: session.session_name,
          session_code: session.session_code,
          start_time: session.start_time?.toISOString() || "",
          end_time: session.end_time?.toISOString() || "",
          can_access:
            new Date(session.start_time || "").getTime() - now.getTime() <=
            30 * 60 * 1000, // 30 minutes before
        })),
      },
      timestamp: new Date().toISOString(),
    };

    return c.json(response, 200);
  } catch (error) {
    console.error("Error getting participant dashboard:", error);

    return c.json(
      {
        success: false,
        message: "Failed to retrieve participant dashboard data",
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
