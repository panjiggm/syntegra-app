import { type Context } from "hono";
import { type CloudflareBindings } from "@/lib/env";
import {
  type GetIndividualReportsListQuery,
  type GetIndividualReportsListResponse,
  type ReportErrorResponse,
  calculateReportTimeEfficiency,
} from "shared-types";
import {
  calculateFreshScoresForUsers,
  groupFreshScoresByUser,
  calculateUserAverageFromFreshScores,
  isRatingScaleTest,
} from "@/lib/reportCalculations";

/**
 * Handler for GET /api/v1/reports/individual
 * Returns a paginated list of users with their report overview data
 */
export async function getIndividualReportsListHandler(
  c: Context<{ Bindings: CloudflareBindings; Variables: { auth: any } }>
): Promise<Response> {
  try {
    const rawQuery = c.req.query();

    // Parse query parameters with defaults
    const query: GetIndividualReportsListQuery = {
      page: parseInt(rawQuery.page || "1"),
      per_page: Math.min(parseInt(rawQuery.per_page || "20"), 100),
      search: rawQuery.search,
      session_id: rawQuery.session_id,
      sort_by: (rawQuery.sort_by as any) || "name",
      sort_order: (rawQuery.sort_order as any) || "asc",
      has_reports: rawQuery.has_reports
        ? rawQuery.has_reports === "true"
        : undefined,
      date_from: rawQuery.date_from,
      date_to: rawQuery.date_to,
    };
    const auth = c.get("auth");
    const currentUser = auth.user;
    const userId = currentUser.id;
    const userRole = currentUser.role;

    // Import database utilities and schemas
    const {
      getDbFromEnv,
      users,
      testResults,
      testSessions,
      sessionParticipants,
      testAttempts,
    } = await import("@/db");
    const { sql, and, or, eq, count, desc, asc, isNotNull, inArray } = await import(
      "drizzle-orm"
    );

    const db = getDbFromEnv(c.env);

    // Build base query conditions
    const conditions = [];

    // If not admin, only show current user's data
    if (userRole !== "admin") {
      conditions.push(eq(users.id, userId));
    }

    // Search filter
    if (query.search) {
      const searchTerm = `%${query.search.toLowerCase()}%`;
      conditions.push(
        or(
          sql`LOWER(${users.name}) LIKE ${searchTerm}`,
          sql`LOWER(${users.email}) LIKE ${searchTerm}`,
          sql`LOWER(${users.nik}) LIKE ${searchTerm}`
        )
      );
    }

    // Session filter
    if (query.session_id) {
      conditions.push(
        sql`${users.id} IN (
          SELECT ${sessionParticipants.user_id} 
          FROM ${sessionParticipants} 
          WHERE ${sessionParticipants.session_id} = ${query.session_id}
        )`
      );
    }

    // Filter users who have reports
    if (query.has_reports === true) {
      conditions.push(
        sql`${users.id} IN (
          SELECT DISTINCT ${testResults.user_id} 
          FROM ${testResults} 
          WHERE ${testResults.user_id} IS NOT NULL
        )`
      );
    } else if (query.has_reports === false) {
      conditions.push(
        sql`${users.id} NOT IN (
          SELECT DISTINCT ${testResults.user_id} 
          FROM ${testResults} 
          WHERE ${testResults.user_id} IS NOT NULL
        )`
      );
    }

    // Date range filter
    if (query.date_from || query.date_to) {
      const dateConditions = [];
      if (query.date_from) {
        dateConditions.push(
          sql`${testResults.calculated_at} >= ${query.date_from}`
        );
      }
      if (query.date_to) {
        dateConditions.push(
          sql`${testResults.calculated_at} <= ${query.date_to}`
        );
      }

      if (dateConditions.length > 0) {
        conditions.push(
          sql`${users.id} IN (
            SELECT DISTINCT ${testResults.user_id} 
            FROM ${testResults} 
            WHERE ${and(...dateConditions)}
          )`
        );
      }
    }

    // Only get participants
    conditions.push(eq(users.role, "participant"));

    // Calculate pagination
    const offset = (query.page - 1) * query.per_page;

    // Get total count for pagination
    const [totalCountResult] = await db
      .select({ count: count() })
      .from(users)
      .where(conditions.length > 0 ? and(...conditions) : undefined);

    const totalCount = totalCountResult.count;
    const totalPages = Math.ceil(totalCount / query.per_page);

    // Build order by clause
    let orderBy;
    const isAsc = query.sort_order === "asc";

    switch (query.sort_by) {
      case "name":
        orderBy = isAsc ? asc(users.name) : desc(users.name);
        break;
      case "email":
        orderBy = isAsc ? asc(users.email) : desc(users.email);
        break;
      case "overall_score":
        // This requires a complex subquery - we'll handle it differently
        orderBy = isAsc ? asc(users.name) : desc(users.name); // fallback to name
        break;
      case "completion_rate":
        // This requires a complex subquery - we'll handle it differently
        orderBy = isAsc ? asc(users.name) : desc(users.name); // fallback to name
        break;
      case "last_test_date":
        // This requires a complex subquery - we'll handle it differently
        orderBy = isAsc ? asc(users.created_at) : desc(users.created_at); // fallback to created_at
        break;
      default:
        orderBy = asc(users.name);
    }

    // Get users data
    const usersData = await db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        nik: users.nik,
        profile_picture_url: users.profile_picture_url,
      })
      .from(users)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(orderBy)
      .limit(query.per_page)
      .offset(offset);

    // Get test statistics for each user
    const userIds = usersData.map((u) => u.id);
    const userStats = new Map();

    if (userIds.length > 0) {
      // Calculate fresh scores for all users
      const allUsersFreshScores = await calculateFreshScoresForUsers(
        db,
        userIds,
        query.session_id,
        query.date_from,
        query.date_to
      );

      console.log(
        `Calculated ${allUsersFreshScores.length} fresh scores for ${userIds.length} users`
      );

      // Group fresh scores by user
      const userFreshScores = groupFreshScoresByUser(allUsersFreshScores);

      // Get test statistics from attempts (more accurate for total tests taken)
      let testStats = [];
      try {
        testStats = await db
          .select({
            user_id: testAttempts.user_id,
            total_tests: count(),
            total_completed: sql<number>`COUNT(CASE WHEN ${testAttempts.status} = 'completed' THEN 1 END)`,
            total_time: sql<number>`COALESCE(SUM(${testAttempts.time_spent}), 0)`,
            first_test: sql<string>`MIN(${testAttempts.start_time})`,
            last_test: sql<string>`MAX(${testAttempts.end_time})`,
          })
          .from(testAttempts)
          .where(inArray(testAttempts.user_id, userIds))
          .groupBy(testAttempts.user_id);
      } catch (testStatsError) {
        console.error("Error getting test stats:", testStatsError);
        // Initialize with empty stats for all users
        testStats = userIds.map(userId => ({
          user_id: userId,
          total_tests: 0,
          total_completed: 0,
          total_time: 0,
          first_test: null,
          last_test: null,
        }));
      }

      // Get session participation data
      let sessionStats: any[] = [];
      try {
        sessionStats = await db
          .select({
            user_id: sessionParticipants.user_id,
            session_id: testSessions.id,
            session_name: testSessions.session_name,
            participation_date: sessionParticipants.registered_at,
            status: sessionParticipants.status,
          })
          .from(sessionParticipants)
          .innerJoin(
            testSessions,
            eq(sessionParticipants.session_id, testSessions.id)
          )
          .where(inArray(sessionParticipants.user_id, userIds))
          .orderBy(desc(sessionParticipants.registered_at));
      } catch (sessionStatsError) {
        console.error("Error getting session stats:", sessionStatsError);
        // Initialize with empty session stats
        sessionStats = [];
      }

      // Build user statistics map
      testStats.forEach((stat) => {
        const completionRate =
          stat.total_tests > 0
            ? (stat.total_completed / stat.total_tests) * 100
            : 0;
        const timeEfficiency =
          stat.total_time > 0
            ? calculateReportTimeEfficiency(
                stat.total_time / 60,
                stat.total_tests * 30
              )
            : 100; // convert seconds to minutes

        // Get fresh scores for this user
        const userScores = userFreshScores[stat.user_id] || [];
        let freshAverage = null;
        let overallGrade = null;

        if (userScores.length > 0) {
          // calculateUserAverageFromFreshScores now handles filtering rating_scale tests internally
          freshAverage = calculateUserAverageFromFreshScores(userScores);

          // Only calculate grade if we have actual scorable tests
          if (freshAverage.overallScore > 0) {
            if (freshAverage.overallScore >= 90) overallGrade = "A";
            else if (freshAverage.overallScore >= 80) overallGrade = "B";
            else if (freshAverage.overallScore >= 70) overallGrade = "C";
            else if (freshAverage.overallScore >= 60) overallGrade = "D";
            else overallGrade = "E";
          }
        }

        userStats.set(stat.user_id, {
          total_tests_taken: stat.total_tests,
          total_tests_completed: stat.total_completed,
          completion_rate: Math.round(completionRate * 100) / 100,
          total_time_spent_minutes: Math.round((stat.total_time || 0) / 60), // convert seconds to minutes
          average_score: freshAverage
            ? (freshAverage.overallScore * 100) / 100
            : null,
          overall_score: freshAverage ? freshAverage.overallScore : null,
          overall_percentile: freshAverage
            ? freshAverage.overallPercentile
            : null,
          overall_grade: overallGrade,
          first_test_date: stat.first_test,
          last_test_date: stat.last_test,
          data_quality_score: Math.min(
            100,
            timeEfficiency + completionRate / 2
          ), // simple calculation
        });
      });

      // Build session participation map
      const sessionMap = new Map();
      sessionStats.forEach((session) => {
        if (!sessionMap.has(session.user_id)) {
          sessionMap.set(session.user_id, []);
        }
        sessionMap.get(session.user_id).push({
          session_id: session.session_id,
          session_name: session.session_name,
          participation_date: session.participation_date,
          status: session.status,
        });
      });

      // Merge session data into userStats
      sessionMap.forEach((sessions, userId) => {
        const existingStats = userStats.get(userId) || {};
        userStats.set(userId, {
          ...existingStats,
          sessions_count: sessions.length,
          sessions_participated: sessions,
        });
      });

      // Ensure all users have session data even if they don't have test stats
      userIds.forEach(userId => {
        if (!userStats.has(userId)) {
          const userSessions = sessionMap.get(userId) || [];
          userStats.set(userId, {
            total_tests_taken: 0,
            total_tests_completed: 0,
            completion_rate: 0,
            total_time_spent_minutes: 0,
            average_score: null,
            overall_score: null,
            overall_percentile: null,
            overall_grade: null,
            first_test_date: null,
            last_test_date: null,
            data_quality_score: 0,
            sessions_count: userSessions.length,
            sessions_participated: userSessions,
          });
        }
      });
    }

    // Format response data
    const individuals = usersData.map((user) => {
      const stats = userStats.get(user.id) || {};
      return {
        user_id: user.id,
        name: user.name,
        email: user.email,
        nik: user.nik || "",
        profile_picture_url: user.profile_picture_url,
        overall_score: stats.overall_score || null,
        overall_grade: stats.overall_grade || null,
        overall_percentile: stats.overall_percentile || null,
        sessions_count: stats.sessions_count || 0,
        sessions_participated: stats.sessions_participated || [],
        total_tests_taken: stats.total_tests_taken || 0,
        total_tests_completed: stats.total_tests_completed || 0,
        completion_rate: stats.completion_rate || 0,
        total_time_spent_minutes: stats.total_time_spent_minutes || 0,
        average_score: stats.average_score || null,
        first_test_date: stats.first_test_date || null,
        last_test_date: stats.last_test_date || null,
        has_complete_reports: (stats.total_tests_completed || 0) > 0,
        data_quality_score: stats.data_quality_score || 0,
      };
    });

    // Calculate summary statistics
    const usersWithReports = individuals.filter(
      (u) => u.has_complete_reports
    ).length;
    const avgCompletionRate =
      individuals.length > 0
        ? individuals.reduce((sum, u) => sum + u.completion_rate, 0) /
          individuals.length
        : 0;

    const allSessions = new Set();
    individuals.forEach((u: any) => {
      u.sessions_participated.forEach((s: any) =>
        allSessions.add(s.session_id)
      );
    });

    const allTestDates = individuals
      .flatMap((u) => [u.first_test_date, u.last_test_date])
      .filter(Boolean)
      .sort();

    const response: GetIndividualReportsListResponse = {
      success: true,
      message: "Individual reports list retrieved successfully",
      data: {
        individuals,
        pagination: {
          current_page: query.page,
          per_page: query.per_page,
          total: totalCount,
          total_pages: totalPages,
          has_next_page: query.page < totalPages,
          has_prev_page: query.page > 1,
        },
        summary: {
          total_users_with_reports: usersWithReports,
          average_completion_rate: Math.round(avgCompletionRate * 100) / 100,
          total_sessions_represented: allSessions.size,
          date_range: {
            earliest_test: allTestDates[0] || null,
            latest_test: allTestDates[allTestDates.length - 1] || null,
          },
        },
      },
      timestamp: new Date().toISOString(),
    };

    return c.json(response, 200);
  } catch (error) {
    console.error("Error getting individual reports list:", error);

    const errorResponse: ReportErrorResponse = {
      success: false,
      message: "Failed to retrieve individual reports list",
      timestamp: new Date().toISOString(),
    };

    return c.json(errorResponse, 500);
  }
}
