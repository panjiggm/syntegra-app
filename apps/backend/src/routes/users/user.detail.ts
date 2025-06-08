import { Context } from "hono";
import { eq, and, desc } from "drizzle-orm";
import { getDbFromEnv, isDatabaseConfigured } from "@/db";
import {
  users,
  testAttempts,
  testResults,
  testSessions,
  sessionParticipants,
  sessionResults,
  tests,
} from "@/db";
import { CloudflareBindings } from "@/lib/env";
import type { ErrorResponse, UserDetailResponse } from "shared-types";

// Helper function to calculate age
function calculateAge(birthDate: Date | null): number | null {
  if (!birthDate) return null;

  const today = new Date();
  const birth = new Date(birthDate);
  let age = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();

  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age--;
  }

  return age;
}

export async function getUserDetailHandler(
  c: Context<{ Bindings: CloudflareBindings }>
) {
  try {
    // Check database configuration
    if (!isDatabaseConfigured(c.env)) {
      const errorResponse: ErrorResponse = {
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

    const { userId } = c.req.param();
    const auth = c.get("auth");

    if (!auth) {
      const errorResponse: ErrorResponse = {
        success: false,
        message: "Authentication required",
        timestamp: new Date().toISOString(),
      };
      return c.json(errorResponse, 401);
    }

    const db = getDbFromEnv(c.env);

    // Authorization check
    // Admin can view any user, participants can only view themselves
    if (auth.user.role === "participant" && auth.user.id !== userId) {
      const errorResponse: ErrorResponse = {
        success: false,
        message: "Access denied",
        errors: [
          {
            field: "authorization",
            message: "You can only view your own profile",
            code: "FORBIDDEN",
          },
        ],
        timestamp: new Date().toISOString(),
      };
      return c.json(errorResponse, 403);
    }

    // Get user basic information
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (!user) {
      const errorResponse: ErrorResponse = {
        success: false,
        message: "User not found",
        errors: [
          {
            field: "userId",
            message: "User with provided ID does not exist",
            code: "USER_NOT_FOUND",
          },
        ],
        timestamp: new Date().toISOString(),
      };
      return c.json(errorResponse, 404);
    }

    // Prepare profile data
    const profile = {
      id: user.id,
      nik: user.nik || "",
      name: user.name,
      email: user.email,
      profile_picture_url: user.profile_picture_url,
      is_active: user.is_active ?? true,
      email_verified: user.email_verified ?? false,
      created_at: user.created_at.toISOString(),
      last_login: user.last_login?.toISOString() || null,
    };

    // Prepare personal info
    const personal_info = {
      phone: user.phone || "",
      gender: user.gender || "other",
      birth_place: user.birth_place,
      birth_date: user.birth_date?.toISOString() || null,
      age: calculateAge(user.birth_date),
      religion: user.religion,
      education: user.education,
      address: {
        full_address: user.address,
        province: user.province,
        regency: user.regency,
        district: user.district,
        village: user.village,
        postal_code: user.postal_code,
      },
    };

    // For participants, get psychotest history
    let psychotest_history: UserDetailResponse["data"]["psychotest_history"] =
      null;

    if (user.role === "participant") {
      // Get test sessions the user participated in
      const userSessions = await db
        .select({
          session_id: sessionParticipants.session_id,
          participant_status: sessionParticipants.status,
          session_name: testSessions.session_name,
          session_code: testSessions.session_code,
          start_time: testSessions.start_time,
          end_time: testSessions.end_time,
          session_status: testSessions.status,
          score: sessionResults.weighted_score,
          completion_rate: sessionResults.completion_rate,
        })
        .from(sessionParticipants)
        .leftJoin(
          testSessions,
          eq(sessionParticipants.session_id, testSessions.id)
        )
        .leftJoin(
          sessionResults,
          and(
            eq(sessionResults.session_id, testSessions.id),
            eq(sessionResults.user_id, userId)
          )
        )
        .where(eq(sessionParticipants.user_id, userId))
        .orderBy(desc(testSessions.start_time));

      // Get test attempts
      const userAttempts = await db
        .select({
          attempt_id: testAttempts.id,
          test_name: tests.name,
          test_category: tests.category,
          module_type: tests.module_type,
          start_time: testAttempts.start_time,
          end_time: testAttempts.end_time,
          status: testAttempts.status,
          time_spent: testAttempts.time_spent,
          raw_score: testResults.raw_score,
          scaled_score: testResults.scaled_score,
          percentile: testResults.percentile,
          grade: testResults.grade,
          is_passed: testResults.is_passed,
        })
        .from(testAttempts)
        .leftJoin(tests, eq(testAttempts.test_id, tests.id))
        .leftJoin(testResults, eq(testResults.attempt_id, testAttempts.id))
        .where(eq(testAttempts.user_id, userId))
        .orderBy(desc(testAttempts.start_time));

      // Get detailed test results with analysis
      const detailedResults = await db
        .select({
          test_name: tests.name,
          category: tests.category,
          traits: testResults.traits,
          recommendations: testResults.recommendations,
          detailed_analysis: testResults.detailed_analysis,
        })
        .from(testResults)
        .leftJoin(testAttempts, eq(testResults.attempt_id, testAttempts.id))
        .leftJoin(tests, eq(testAttempts.test_id, tests.id))
        .where(
          and(
            eq(testResults.user_id, userId),
            eq(testAttempts.status, "completed")
          )
        );

      // Calculate statistics
      const totalSessions = userSessions.length;
      const completedSessions = userSessions.filter(
        (s) => s.participant_status === "completed"
      ).length;

      const totalAttempts = userAttempts.length;
      const completedAttempts = userAttempts.filter(
        (a) => a.status === "completed"
      ).length;

      const totalTimeSpent = userAttempts.reduce(
        (sum, attempt) => sum + (attempt.time_spent || 0),
        0
      );

      const scoresSum = userAttempts
        .filter((a) => a.scaled_score !== null)
        .reduce((sum, attempt) => sum + (Number(attempt.scaled_score) || 0), 0);

      const scoresCount = userAttempts.filter(
        (a) => a.scaled_score !== null
      ).length;
      const averageScore = scoresCount > 0 ? scoresSum / scoresCount : 0;

      const completionRate =
        totalAttempts > 0 ? (completedAttempts / totalAttempts) * 100 : 0;

      const categoriesAttempted = [
        ...new Set(userAttempts.map((a) => a.test_category).filter(Boolean)),
      ];

      // Calculate performance by category
      const performanceByCategory = categoriesAttempted.map((category) => {
        const categoryAttempts = userAttempts.filter(
          (a) => a.test_category === category
        );
        const categoryCompleted = categoryAttempts.filter(
          (a) => a.status === "completed"
        );
        const categoryScores = categoryAttempts
          .filter((a) => a.scaled_score !== null)
          .map((a) => Number(a.scaled_score));

        return {
          category: category || "unknown",
          attempts: categoryAttempts.length,
          average_score:
            categoryScores.length > 0
              ? categoryScores.reduce((sum, score) => sum + score, 0) /
                categoryScores.length
              : 0,
          best_score:
            categoryScores.length > 0 ? Math.max(...categoryScores) : 0,
          completion_rate:
            categoryAttempts.length > 0
              ? (categoryCompleted.length / categoryAttempts.length) * 100
              : 0,
        };
      });

      // Format response data
      psychotest_history = {
        sessions: userSessions.map((session) => ({
          id: session.session_id,
          session_name: session.session_name || "",
          session_code: session.session_code || "",
          start_time: session.start_time?.toISOString() || "",
          end_time: session.end_time?.toISOString() || "",
          status: session.session_status || "unknown",
          participant_status: session.participant_status || "invited",
          score: session.score ? Number(session.score) : undefined,
          completion_percentage: session.completion_rate
            ? Number(session.completion_rate)
            : undefined,
        })),

        attempts: userAttempts.map((attempt) => ({
          id: attempt.attempt_id,
          test_name: attempt.test_name || "Unknown Test",
          test_category: attempt.test_category || "unknown",
          module_type: attempt.module_type || "unknown",
          attempt_date: attempt.start_time.toISOString(),
          duration_minutes: Math.round((attempt.time_spent || 0) / 60),
          status: attempt.status,
          raw_score: attempt.raw_score ? Number(attempt.raw_score) : undefined,
          scaled_score: attempt.scaled_score
            ? Number(attempt.scaled_score)
            : undefined,
          percentile: attempt.percentile
            ? Number(attempt.percentile)
            : undefined,
          grade: attempt.grade || undefined,
          is_passed: attempt.is_passed ?? undefined,
        })),

        results_analysis: detailedResults.map((result) => ({
          test_name: result.test_name || "Unknown Test",
          category: result.category || "unknown",
          traits: result.traits || [],
          recommendations: Array.isArray(result.recommendations)
            ? result.recommendations
            : result.recommendations
              ? [result.recommendations]
              : [],
          detailed_analysis: result.detailed_analysis || null,
        })),

        statistics: {
          total_sessions: totalSessions,
          completed_sessions: completedSessions,
          total_attempts: totalAttempts,
          completed_attempts: completedAttempts,
          average_score: Math.round(averageScore * 100) / 100,
          total_time_spent_minutes: Math.round(totalTimeSpent / 60),
          completion_rate: Math.round(completionRate * 100) / 100,
          categories_attempted: categoriesAttempted.filter(Boolean) as string[],
        },

        performance_by_category: performanceByCategory,
      };
    }

    const response: UserDetailResponse = {
      success: true,
      message: "User details retrieved successfully",
      data: {
        profile,
        personal_info,
        psychotest_history,
      },
      timestamp: new Date().toISOString(),
    };

    return c.json(response, 200);
  } catch (error) {
    console.error("Error getting user details:", error);

    const errorResponse: ErrorResponse = {
      success: false,
      message: "Failed to retrieve user details",
      errors: [
        {
          message:
            error instanceof Error ? error.message : "Unknown error occurred",
          code: "INTERNAL_ERROR",
        },
      ],
      timestamp: new Date().toISOString(),
    };

    return c.json(errorResponse, 500);
  }
}
