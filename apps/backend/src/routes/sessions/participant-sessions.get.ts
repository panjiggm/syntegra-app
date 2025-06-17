import { Context } from "hono";
import { eq, and, sql, desc } from "drizzle-orm";
import {
  getDbFromEnv,
  testSessions,
  sessionParticipants,
  sessionModules,
  tests,
  participantTestProgress,
  users,
  isDatabaseConfigured,
} from "@/db";
import { getEnv, type CloudflareBindings } from "@/lib/env";
import type { SessionErrorResponse } from "shared-types";

// Response types for participant sessions
interface ParticipantSessionTest {
  test_id: string;
  test_name: string;
  test_category: string;
  test_module_type: string;
  question_type: string | null;
  time_limit: number;
  total_questions: number;
  sequence: number;
  is_required: boolean;
  icon: string | null;
  card_color: string | null;

  // Progress data
  progress_status:
    | "not_started"
    | "in_progress"
    | "completed"
    | "auto_completed";
  started_at: string | null;
  completed_at: string | null;
  time_spent: number; // in seconds
  answered_questions: number;
  progress_percentage: number;
  is_time_expired: boolean;
}

interface ParticipantSession {
  session_id: string;
  session_name: string;
  session_code: string;
  session_description: string | null;
  session_location: string | null;
  target_position: string;
  start_time: string;
  end_time: string;
  session_status: string;
  is_active: boolean;
  is_expired: boolean;
  time_remaining: number; // in minutes

  // Participant info
  participant_status: string;
  registered_at: string | null;

  // Session progress
  total_tests: number;
  completed_tests: number;
  in_progress_tests: number;
  not_started_tests: number;
  session_progress_percentage: number;

  // Tests in this session
  tests: ParticipantSessionTest[];
}

interface GetParticipantSessionsResponse {
  success: boolean;
  message: string;
  data: {
    participant_info: {
      id: string;
      name: string;
      phone: string;
    };
    sessions: ParticipantSession[];
    summary: {
      total_sessions: number;
      active_sessions: number;
      completed_sessions: number;
      expired_sessions: number;
      total_tests_across_sessions: number;
      completed_tests_across_sessions: number;
      overall_progress_percentage: number;
    };
  };
  timestamp: string;
}

export async function getParticipantSessionsHandler(
  c: Context<{ Bindings: CloudflareBindings }>
) {
  try {
    // Check if database is configured first
    if (!isDatabaseConfigured(c.env)) {
      const errorResponse: SessionErrorResponse = {
        success: false,
        message: "Database not configured",
        errors: [
          {
            field: "database",
            message:
              "DATABASE_URL is not configured. Please set your Neon database connection string in wrangler.jsonc",
            code: "DATABASE_NOT_CONFIGURED",
          },
        ],
        timestamp: new Date().toISOString(),
      };
      return c.json(errorResponse, 503);
    }

    // Get authenticated user (participant)
    const auth = c.get("auth");
    if (!auth || auth.user.role !== "participant") {
      const errorResponse: SessionErrorResponse = {
        success: false,
        message: "Access denied",
        errors: [
          {
            field: "authorization",
            message: "Only participants can access their sessions",
            code: "ACCESS_DENIED",
          },
        ],
        timestamp: new Date().toISOString(),
      };
      return c.json(errorResponse, 403);
    }

    const participantUserId = auth.user.id;
    const db = getDbFromEnv(c.env);

    // Get participant info
    const [participant] = await db
      .select({
        id: users.id,
        name: users.name,
        phone: users.phone,
      })
      .from(users)
      .where(eq(users.id, participantUserId))
      .limit(1);

    if (!participant) {
      const errorResponse: SessionErrorResponse = {
        success: false,
        message: "Participant not found",
        errors: [
          {
            field: "participant",
            message: "Participant data not found",
            code: "PARTICIPANT_NOT_FOUND",
          },
        ],
        timestamp: new Date().toISOString(),
      };
      return c.json(errorResponse, 404);
    }

    // Get all sessions where this participant is registered
    const participantSessions = await db
      .select({
        // Session data
        session_id: testSessions.id,
        session_name: testSessions.session_name,
        session_code: testSessions.session_code,
        session_description: testSessions.description,
        session_location: testSessions.location,
        target_position: testSessions.target_position,
        start_time: testSessions.start_time,
        end_time: testSessions.end_time,
        session_status: testSessions.status,

        // Participant data
        participant_status: sessionParticipants.status,
        registered_at: sessionParticipants.registered_at,
      })
      .from(sessionParticipants)
      .innerJoin(
        testSessions,
        eq(sessionParticipants.session_id, testSessions.id)
      )
      .where(eq(sessionParticipants.user_id, participantUserId))
      .orderBy(desc(testSessions.start_time));

    // For each session, get the tests and progress
    const sessions: ParticipantSession[] = [];

    for (const session of participantSessions) {
      // Get session modules (tests) for this session
      const sessionTests = await db
        .select({
          // Session module data
          session_module_id: sessionModules.id,
          test_id: sessionModules.test_id,
          sequence: sessionModules.sequence,
          is_required: sessionModules.is_required,

          // Test data
          test_name: tests.name,
          test_category: tests.category,
          test_module_type: tests.module_type,
          question_type: tests.question_type,
          time_limit: tests.time_limit,
          total_questions: tests.total_questions,
          icon: tests.icon,
          card_color: tests.card_color,

          // Progress data (may be null if not started)
          progress_id: participantTestProgress.id,
          progress_status: participantTestProgress.status,
          started_at: participantTestProgress.started_at,
          completed_at: participantTestProgress.completed_at,
          time_spent: participantTestProgress.time_spent,
          answered_questions: participantTestProgress.answered_questions,
          is_auto_completed: participantTestProgress.is_auto_completed,
        })
        .from(sessionModules)
        .innerJoin(tests, eq(sessionModules.test_id, tests.id))
        .leftJoin(
          participantTestProgress,
          and(
            eq(participantTestProgress.session_id, session.session_id),
            eq(participantTestProgress.user_id, participantUserId),
            eq(participantTestProgress.test_id, sessionModules.test_id)
          )
        )
        .where(eq(sessionModules.session_id, session.session_id))
        .orderBy(sessionModules.sequence);

      // Transform test data and calculate progress
      const testsWithProgress: ParticipantSessionTest[] = sessionTests.map(
        (test) => {
          const progressStatus = test.progress_status || "not_started";
          const answeredQuestions = test.answered_questions || 0;
          const totalQuestions = test.total_questions || 0;
          const progressPercentage =
            totalQuestions > 0
              ? Math.round((answeredQuestions / totalQuestions) * 100)
              : 0;

          // Check if time is expired for in-progress tests
          const isTimeExpired =
            test.started_at && test.time_limit > 0
              ? new Date().getTime() - new Date(test.started_at).getTime() >
                test.time_limit * 60 * 1000
              : false;

          return {
            test_id: test.test_id,
            test_name: test.test_name,
            test_category: test.test_category,
            test_module_type: test.test_module_type,
            question_type: test.question_type,
            time_limit: test.time_limit,
            total_questions: test.total_questions || 0,
            sequence: test.sequence,
            is_required: test.is_required ?? true,
            icon: test.icon,
            card_color: test.card_color,

            progress_status: progressStatus,
            started_at: test.started_at?.toISOString() || null,
            completed_at: test.completed_at?.toISOString() || null,
            time_spent: test.time_spent || 0,
            answered_questions: answeredQuestions,
            progress_percentage: progressPercentage,
            is_time_expired: isTimeExpired,
          };
        }
      );

      // Calculate session progress statistics
      const totalTests = testsWithProgress.length;
      const completedTests = testsWithProgress.filter(
        (t) =>
          t.progress_status === "completed" ||
          t.progress_status === "auto_completed"
      ).length;
      const inProgressTests = testsWithProgress.filter(
        (t) => t.progress_status === "in_progress"
      ).length;
      const notStartedTests = testsWithProgress.filter(
        (t) => t.progress_status === "not_started"
      ).length;
      const sessionProgressPercentage =
        totalTests > 0 ? Math.round((completedTests / totalTests) * 100) : 0;

      sessions.push({
        session_id: session.session_id,
        session_name: session.session_name,
        session_code: session.session_code,
        session_description: session.session_description,
        session_location: session.session_location,
        target_position: session.target_position || "",
        start_time: session.start_time.toISOString(),
        end_time: session.end_time.toISOString(),
        session_status: session.session_status || "draft",
        is_active:
          session.session_status === "active" &&
          new Date() <= new Date(session.end_time),
        is_expired: new Date() > new Date(session.end_time),
        time_remaining: Math.max(
          0,
          Math.floor(
            (new Date(session.end_time).getTime() - new Date().getTime()) /
              (1000 * 60)
          )
        ),

        participant_status: session.participant_status || "",
        registered_at: session.registered_at?.toISOString() || null,

        total_tests: totalTests,
        completed_tests: completedTests,
        in_progress_tests: inProgressTests,
        not_started_tests: notStartedTests,
        session_progress_percentage: sessionProgressPercentage,

        tests: testsWithProgress,
      });
    }

    // Calculate overall summary
    const totalSessions = sessions.length;
    const activeSessions = sessions.filter(
      (s) => s.is_active && !s.is_expired
    ).length;
    const completedSessions = sessions.filter(
      (s) => s.session_status === "completed"
    ).length;
    const expiredSessions = sessions.filter((s) => s.is_expired).length;
    const totalTestsAcrossSessions = sessions.reduce(
      (sum, s) => sum + s.total_tests,
      0
    );
    const completedTestsAcrossSessions = sessions.reduce(
      (sum, s) => sum + s.completed_tests,
      0
    );
    const overallProgressPercentage =
      totalTestsAcrossSessions > 0
        ? Math.round(
            (completedTestsAcrossSessions / totalTestsAcrossSessions) * 100
          )
        : 0;

    const response: GetParticipantSessionsResponse = {
      success: true,
      message: `Found ${totalSessions} session(s) for participant ${participant.name}`,
      data: {
        participant_info: {
          id: participant.id,
          name: participant.name,
          phone: participant.phone || "",
        },
        sessions,
        summary: {
          total_sessions: totalSessions,
          active_sessions: activeSessions,
          completed_sessions: completedSessions,
          expired_sessions: expiredSessions,
          total_tests_across_sessions: totalTestsAcrossSessions,
          completed_tests_across_sessions: completedTestsAcrossSessions,
          overall_progress_percentage: overallProgressPercentage,
        },
      },
      timestamp: new Date().toISOString(),
    };

    console.log(
      `✅ Participant sessions retrieved: ${sessions.length} sessions for participant ${participant.name} (${participant.phone})`
    );

    return c.json(response, 200);
  } catch (error) {
    console.error("❌ Get participant sessions error:", error);

    const errorResponse: SessionErrorResponse = {
      success: false,
      message: "Internal server error while retrieving participant sessions",
      errors: [
        {
          field: "server",
          message:
            error instanceof Error ? error.message : "Unknown server error",
          code: "INTERNAL_SERVER_ERROR",
        },
      ],
      timestamp: new Date().toISOString(),
    };
    return c.json(errorResponse, 500);
  }
}
