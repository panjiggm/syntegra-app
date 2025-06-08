import { Context } from "hono";
import { eq, and, desc, asc, sql, count } from "drizzle-orm";
import {
  getDbFromEnv,
  testResults,
  testAttempts,
  tests,
  users,
  testSessions,
} from "@/db";
import { type CloudflareBindings } from "@/lib/env";
import {
  type GetTestResultsResponse,
  type TestResultErrorResponse,
  type GetTestResultsQuery,
} from "shared-types";

export async function getTestResultsHandler(
  c: Context<{ Bindings: CloudflareBindings; Variables: { user: any } }>
): Promise<Response> {
  try {
    const db = getDbFromEnv(c.env);
    const auth = c.get("auth");
    const currentUser = auth.user;
    const { testId } = c.req.param();
    const rawQuery = c.req.query();

    // Validate that current user is an admin
    if (currentUser.role !== "admin") {
      const errorResponse: TestResultErrorResponse = {
        success: false,
        message: "Access denied. Admin privileges required.",
        errors: [
          {
            field: "user_role",
            message: "Only administrators can view test results",
            code: "FORBIDDEN",
          },
        ],
        timestamp: new Date().toISOString(),
      };
      return c.json(errorResponse, 403);
    }

    const queryParams: GetTestResultsQuery = {
      page: parseInt(rawQuery.page) || 1,
      limit: Math.min(parseInt(rawQuery.limit) || 10, 100),
      sort_by: (rawQuery.sort_by as any) || "calculated_at",
      sort_order: (rawQuery.sort_order as any) || "desc",
      user_id: rawQuery.user_id,
      session_id: rawQuery.session_id,
      is_passed: rawQuery.is_passed ? rawQuery.is_passed === "true" : undefined,
      grade: rawQuery.grade as any,
      calculated_from: rawQuery.calculated_from,
      calculated_to: rawQuery.calculated_to,
      min_score: rawQuery.min_score
        ? parseFloat(rawQuery.min_score)
        : undefined,
      max_score: rawQuery.max_score
        ? parseFloat(rawQuery.max_score)
        : undefined,
      min_percentile: rawQuery.min_percentile
        ? parseFloat(rawQuery.min_percentile)
        : undefined,
      max_percentile: rawQuery.max_percentile
        ? parseFloat(rawQuery.max_percentile)
        : undefined,
      include_analysis: rawQuery.include_analysis === "true",
      include_recommendations: rawQuery.include_recommendations === "true",
      include_user_details: rawQuery.include_user_details !== "false", // Default true
    };

    // Check if the target test exists
    const targetTest = await db
      .select({
        id: tests.id,
        name: tests.name,
        category: tests.category,
        module_type: tests.module_type,
        time_limit: tests.time_limit,
        total_questions: tests.total_questions,
        passing_score: tests.passing_score,
        status: tests.status,
      })
      .from(tests)
      .where(eq(tests.id, testId))
      .limit(1);

    if (targetTest.length === 0) {
      const errorResponse: TestResultErrorResponse = {
        success: false,
        message: "Test not found",
        errors: [
          {
            field: "test_id",
            message: "Test with the provided ID does not exist",
            code: "NOT_FOUND",
          },
        ],
        timestamp: new Date().toISOString(),
      };
      return c.json(errorResponse, 404);
    }

    const testData = targetTest[0];

    // Build filter conditions
    const filterConditions: any[] = [eq(testResults.test_id, testId)];

    if (queryParams.user_id) {
      filterConditions.push(eq(testResults.user_id, queryParams.user_id));
    }

    if (queryParams.session_id) {
      filterConditions.push(
        eq(testAttempts.session_test_id, queryParams.session_id)
      );
    }

    if (queryParams.is_passed !== undefined) {
      filterConditions.push(eq(testResults.is_passed, queryParams.is_passed));
    }

    if (queryParams.grade) {
      filterConditions.push(eq(testResults.grade, queryParams.grade));
    }

    if (queryParams.calculated_from) {
      filterConditions.push(
        sql`${testResults.calculated_at} >= ${new Date(queryParams.calculated_from)}`
      );
    }

    if (queryParams.calculated_to) {
      filterConditions.push(
        sql`${testResults.calculated_at} <= ${new Date(queryParams.calculated_to)}`
      );
    }

    if (queryParams.min_score !== undefined) {
      filterConditions.push(
        sql`CAST(${testResults.scaled_score} AS DECIMAL) >= ${queryParams.min_score}`
      );
    }

    if (queryParams.max_score !== undefined) {
      filterConditions.push(
        sql`CAST(${testResults.scaled_score} AS DECIMAL) <= ${queryParams.max_score}`
      );
    }

    if (queryParams.min_percentile !== undefined) {
      filterConditions.push(
        sql`CAST(${testResults.percentile} AS DECIMAL) >= ${queryParams.min_percentile}`
      );
    }

    if (queryParams.max_percentile !== undefined) {
      filterConditions.push(
        sql`CAST(${testResults.percentile} AS DECIMAL) <= ${queryParams.max_percentile}`
      );
    }

    // Count total records
    const [totalCount] = await db
      .select({ count: count() })
      .from(testResults)
      .leftJoin(testAttempts, eq(testResults.attempt_id, testAttempts.id))
      .where(and(...filterConditions));

    const total = totalCount.count;
    const totalPages = Math.ceil(total / queryParams.limit);
    const offset = (queryParams.page - 1) * queryParams.limit;

    // Build sort order
    let orderBy;
    const sortDirection = queryParams.sort_order === "desc" ? desc : asc;

    switch (queryParams.sort_by) {
      case "calculated_at":
        orderBy = sortDirection(testResults.calculated_at);
        break;
      case "raw_score":
        orderBy = sortDirection(sql`CAST(${testResults.raw_score} AS DECIMAL)`);
        break;
      case "scaled_score":
        orderBy = sortDirection(
          sql`CAST(${testResults.scaled_score} AS DECIMAL)`
        );
        break;
      case "percentile":
        orderBy = sortDirection(
          sql`CAST(${testResults.percentile} AS DECIMAL)`
        );
        break;
      case "grade":
        orderBy = sortDirection(testResults.grade);
        break;
      case "user_name":
        orderBy = sortDirection(users.name);
        break;
      case "completion_percentage":
        orderBy = sortDirection(
          sql`CAST(${testResults.completion_percentage} AS DECIMAL)`
        );
        break;
      default:
        orderBy = desc(testResults.calculated_at);
    }

    // Get results with related data
    const resultRows = await db
      .select({
        result: testResults,
        user: {
          id: users.id,
          name: users.name,
          email: users.email,
          nik: users.nik || "",
        },
        attempt: testAttempts,
        session: testSessions,
      })
      .from(testResults)
      .leftJoin(testAttempts, eq(testResults.attempt_id, testAttempts.id))
      .leftJoin(users, eq(testResults.user_id, users.id))
      .leftJoin(testSessions, eq(testAttempts.session_test_id, testSessions.id))
      .where(and(...filterConditions))
      .orderBy(orderBy)
      .limit(queryParams.limit)
      .offset(offset);

    // Process results
    const processedResults = resultRows.map(
      ({ result, user, attempt, session }) => {
        if (!attempt) {
          throw new Error(`Attempt data missing for result ${result.id}`);
        }

        // Parse traits data if exists
        let parsedTraits = null;
        if (result.traits) {
          try {
            parsedTraits = Array.isArray(result.traits)
              ? result.traits
              : typeof result.traits === "string"
                ? JSON.parse(result.traits)
                : result.traits;
          } catch (error) {
            console.warn("Failed to parse traits data:", error);
            parsedTraits = null;
          }
        }

        // Parse detailed analysis if exists
        let parsedDetailedAnalysis = null;
        if (result.detailed_analysis && queryParams.include_analysis) {
          try {
            parsedDetailedAnalysis =
              typeof result.detailed_analysis === "string"
                ? JSON.parse(result.detailed_analysis)
                : result.detailed_analysis;
          } catch (error) {
            console.warn("Failed to parse detailed analysis:", error);
            parsedDetailedAnalysis = null;
          }
        }

        return {
          id: result.id,
          attempt_id: result.attempt_id,
          user_id: result.user_id,
          test_id: result.test_id,
          session_result_id: result.session_result_id,
          raw_score: result.raw_score ? parseFloat(result.raw_score) : null,
          scaled_score: result.scaled_score
            ? parseFloat(result.scaled_score)
            : null,
          percentile: result.percentile ? parseFloat(result.percentile) : null,
          grade: result.grade,
          traits: parsedTraits,
          trait_names: Array.isArray(result.trait_names)
            ? result.trait_names
            : null,
          description: result.description,
          recommendations: queryParams.include_recommendations
            ? result.recommendations
            : null,
          detailed_analysis: parsedDetailedAnalysis,
          is_passed: result.is_passed,
          completion_percentage: parseFloat(
            result.completion_percentage || "0"
          ),
          calculated_at: result.calculated_at,
          created_at: result.created_at,
          updated_at: result.updated_at,
          user:
            queryParams.include_user_details && user
              ? {
                  id: user.id,
                  name: user.name,
                  email: user.email,
                  nik: user.nik || "",
                }
              : undefined,
          test: {
            id: testData.id,
            name: testData.name,
            category: testData.category,
            module_type: testData.module_type,
            time_limit: testData.time_limit || 0,
            total_questions: testData.total_questions || 0,
            passing_score: testData.passing_score
              ? parseFloat(testData.passing_score)
              : null,
          },
          attempt: {
            id: attempt.id,
            start_time: attempt.start_time,
            end_time: attempt.end_time,
            actual_end_time: attempt.actual_end_time,
            status: attempt.status,
            time_spent: attempt.time_spent,
            questions_answered: attempt.questions_answered || 0,
          },
          session: session
            ? {
                id: session.id,
                session_name: session.session_name,
                session_code: session.session_code,
                target_position: session.target_position || "",
              }
            : null,
        };
      }
    );

    // Calculate summary statistics for all test results (not just current page)
    const allTestResults = await db
      .select({
        raw_score: testResults.raw_score,
        scaled_score: testResults.scaled_score,
        percentile: testResults.percentile,
        is_passed: testResults.is_passed,
        grade: testResults.grade,
        completion_percentage: testResults.completion_percentage,
        user_id: testResults.user_id,
      })
      .from(testResults)
      .where(eq(testResults.test_id, testId));

    // Calculate summary
    const totalResults = allTestResults.length;
    const passedParticipants = allTestResults.filter(
      (r) => r.is_passed === true
    ).length;
    const failedParticipants = allTestResults.filter(
      (r) => r.is_passed === false
    ).length;
    const uniqueParticipants = new Set(allTestResults.map((r) => r.user_id))
      .size;

    const scores = allTestResults
      .map((r) => r.scaled_score || r.raw_score)
      .filter((s): s is string => s !== null)
      .map((s) => parseFloat(s));

    const averageScore =
      scores.length > 0
        ? Math.round(
            scores.reduce((sum, score) => sum + score, 0) / scores.length
          )
        : 0;
    const highestScore = scores.length > 0 ? Math.max(...scores) : 0;
    const lowestScore = scores.length > 0 ? Math.min(...scores) : 0;

    const percentiles = allTestResults
      .map((r) => r.percentile)
      .filter((p): p is string => p !== null)
      .map((p) => parseFloat(p));

    const completionRates = allTestResults.map((r) =>
      parseFloat(r.completion_percentage || "0")
    );
    const completionRate =
      completionRates.length > 0
        ? Math.round(
            completionRates.reduce((sum, rate) => sum + rate, 0) /
              completionRates.length
          )
        : 0;

    // Grade distribution
    const gradeDistribution = allTestResults.reduce(
      (acc, result) => {
        if (result.grade) {
          acc[result.grade] = (acc[result.grade] || 0) + 1;
        }
        return acc;
      },
      {} as Record<string, number>
    );

    // Percentile range distribution
    const percentileRanges = {
      "0-25": percentiles.filter((p) => p >= 0 && p <= 25).length,
      "26-50": percentiles.filter((p) => p > 25 && p <= 50).length,
      "51-75": percentiles.filter((p) => p > 50 && p <= 75).length,
      "76-100": percentiles.filter((p) => p > 75 && p <= 100).length,
    };

    // Test statistics (difficulty analysis)
    const passingScore = testData.passing_score
      ? parseFloat(testData.passing_score)
      : 60;
    const passRate =
      totalResults > 0 ? (passedParticipants / totalResults) * 100 : 0;

    let difficultyLevel = "moderate";
    if (passRate >= 80) difficultyLevel = "easy";
    else if (passRate >= 60) difficultyLevel = "moderate";
    else if (passRate >= 40) difficultyLevel = "difficult";
    else difficultyLevel = "very_difficult";

    // Simple discrimination index calculation (simplified)
    const discriminationIndex =
      scores.length > 0 ? Math.min(1.0, (highestScore - lowestScore) / 100) : 0;

    // Simple reliability coefficient estimation (simplified)
    const reliabilityCoefficient =
      scores.length > 0
        ? Math.min(
            1.0,
            1 -
              scores.reduce(
                (sum, score) => sum + Math.pow(score - averageScore, 2),
                0
              ) /
                scores.length /
                100
          )
        : 0;

    const summary = {
      total_results: totalResults,
      passed_participants: passedParticipants,
      failed_participants: failedParticipants,
      average_score: averageScore,
      highest_score: highestScore,
      lowest_score: lowestScore,
      completion_rate: completionRate,
      by_grade: gradeDistribution,
      by_percentile_range: percentileRanges,
      test_statistics: {
        difficulty_level: difficultyLevel,
        discrimination_index: Math.round(discriminationIndex * 100) / 100,
        reliability_coefficient: Math.round(reliabilityCoefficient * 100) / 100,
      },
    };

    const response: GetTestResultsResponse = {
      success: true,
      message: `Test results for "${testData.name}" retrieved successfully`,
      data: processedResults,
      meta: {
        current_page: queryParams.page,
        per_page: queryParams.limit,
        total: total,
        total_pages: totalPages,
        has_next_page: queryParams.page < totalPages,
        has_prev_page: queryParams.page > 1,
      },
      summary,
      timestamp: new Date().toISOString(),
    };

    return c.json(response, 200);
  } catch (error) {
    console.error("Error getting test results:", error);

    const errorResponse: TestResultErrorResponse = {
      success: false,
      message: "Failed to retrieve test results",
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
