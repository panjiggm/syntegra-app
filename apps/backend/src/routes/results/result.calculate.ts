import { Context } from "hono";
import { eq, and, count } from "drizzle-orm";
import {
  getDbFromEnv,
  testResults,
  testAttempts,
  tests,
  users,
  userAnswers,
  questions,
} from "@/db";
import { type CloudflareBindings } from "@/lib/env";
import {
  type CalculateTestResultRequest,
  type CalculateTestResultResponse,
  type TestResultErrorResponse,
  calculateGrade,
  determinePassStatus,
} from "shared-types";

export async function calculateTestResultHandler(
  c: Context<{ Bindings: CloudflareBindings; Variables: { user: any } }>
): Promise<Response> {
  try {
    const db = getDbFromEnv(c.env);
    const auth = c.get("auth");
    const currentUser = auth.user;
    const requestData: CalculateTestResultRequest = await c.req.json();

    // Validate that current user is an admin
    if (currentUser.role !== "admin") {
      const errorResponse: TestResultErrorResponse = {
        success: false,
        message: "Access denied. Admin privileges required.",
        errors: [
          {
            field: "user_role",
            message: "Only administrators can calculate test results",
            code: "FORBIDDEN",
          },
        ],
        timestamp: new Date().toISOString(),
      };
      return c.json(errorResponse, 403);
    }

    const startTime = Date.now();
    let attempt = null;
    let existingResult = null;

    // Get attempt and existing result data
    if (requestData.attempt_id) {
      // Calculate from attempt
      const attemptResult = await db
        .select({
          attempt: testAttempts,
          test: tests,
          user: users,
        })
        .from(testAttempts)
        .leftJoin(tests, eq(testAttempts.test_id, tests.id))
        .leftJoin(users, eq(testAttempts.user_id, users.id))
        .where(eq(testAttempts.id, requestData.attempt_id))
        .limit(1);

      if (attemptResult.length === 0) {
        const errorResponse: TestResultErrorResponse = {
          success: false,
          message: "Test attempt not found",
          errors: [
            {
              field: "attempt_id",
              message: "Test attempt with the provided ID does not exist",
              code: "NOT_FOUND",
            },
          ],
          timestamp: new Date().toISOString(),
        };
        return c.json(errorResponse, 404);
      }

      attempt = attemptResult[0];

      // Check if result already exists
      const existingResults = await db
        .select()
        .from(testResults)
        .where(eq(testResults.attempt_id, requestData.attempt_id))
        .limit(1);

      existingResult = existingResults.length > 0 ? existingResults[0] : null;
    } else if (requestData.result_id) {
      // Recalculate existing result
      const resultQuery = await db
        .select({
          result: testResults,
          attempt: testAttempts,
          test: tests,
          user: users,
        })
        .from(testResults)
        .leftJoin(testAttempts, eq(testResults.attempt_id, testAttempts.id))
        .leftJoin(tests, eq(testResults.test_id, tests.id))
        .leftJoin(users, eq(testResults.user_id, users.id))
        .where(eq(testResults.id, requestData.result_id))
        .limit(1);

      if (resultQuery.length === 0) {
        const errorResponse: TestResultErrorResponse = {
          success: false,
          message: "Test result not found",
          errors: [
            {
              field: "result_id",
              message: "Test result with the provided ID does not exist",
              code: "NOT_FOUND",
            },
          ],
          timestamp: new Date().toISOString(),
        };
        return c.json(errorResponse, 404);
      }

      const resultData = resultQuery[0];
      attempt = {
        attempt: resultData.attempt,
        test: resultData.test,
        user: resultData.user,
      };
      existingResult = resultData.result;
    }

    if (!attempt?.attempt || !attempt?.test || !attempt?.user) {
      const errorResponse: TestResultErrorResponse = {
        success: false,
        message: "Missing required data",
        errors: [
          {
            field: "data_integrity",
            message: "Attempt, test, or user data is missing",
            code: "DATA_INTEGRITY_ERROR",
          },
        ],
        timestamp: new Date().toISOString(),
      };
      return c.json(errorResponse, 500);
    }

    // Check if we should proceed with calculation
    if (existingResult && !requestData.force_recalculate) {
      const errorResponse: TestResultErrorResponse = {
        success: false,
        message: "Result already exists",
        errors: [
          {
            field: "result_exists",
            message:
              "Test result already exists. Use force_recalculate=true to recalculate",
            code: "RESULT_EXISTS",
          },
        ],
        timestamp: new Date().toISOString(),
      };
      return c.json(errorResponse, 409);
    }

    // Check if attempt is completed
    if (attempt.attempt.status !== "completed") {
      const errorResponse: TestResultErrorResponse = {
        success: false,
        message: "Cannot calculate result for incomplete attempt",
        errors: [
          {
            field: "attempt_status",
            message: "Test attempt must be completed before calculating result",
            code: "ATTEMPT_NOT_COMPLETED",
          },
        ],
        timestamp: new Date().toISOString(),
      };
      return c.json(errorResponse, 400);
    }

    // Get all answers for this attempt
    const answersResult = await db
      .select({
        answer: userAnswers,
        question: questions,
      })
      .from(userAnswers)
      .leftJoin(questions, eq(userAnswers.question_id, questions.id))
      .where(
        and(
          eq(userAnswers.attempt_id, attempt.attempt.id),
          eq(userAnswers.user_id, attempt.user.id)
        )
      );

    const options = requestData.calculation_options || {};

    // Calculate basic scores
    const totalQuestions = attempt.test.total_questions || 0;
    const answeredQuestions = attempt.attempt.questions_answered || 0;
    const completionPercentage =
      totalQuestions > 0 ? (answeredQuestions / totalQuestions) * 100 : 0;

    // Calculate raw score (simple scoring for now)
    let rawScore = 0;
    let correctAnswers = 0;
    const scoredAnswers: Array<{
      trait: string;
      raw_score: number;
      scaled_score: number;
      percentile: number;
    }> = [];

    for (const { answer, question } of answersResult) {
      if (!question || !answer.answer) continue;

      // Simple scoring logic (can be extended based on test type)
      let questionScore = 0;
      if (answer.is_correct === true) {
        questionScore = 1;
        correctAnswers++;
      } else if (answer.score) {
        questionScore = parseFloat(answer.score);
      }

      rawScore += questionScore;

      // For trait-based tests, we would calculate trait scores here
      // This is a simplified version
      scoredAnswers.push({
        trait: question.question_type || "general",
        raw_score: questionScore,
        scaled_score: questionScore * 10, // Simple scaling
        percentile: Math.min(100, questionScore * 20), // Simple percentile
      });
    }

    // Calculate scaled score
    const scaledScore =
      totalQuestions > 0 ? (rawScore / totalQuestions) * 100 : 0;

    // Calculate percentile (simplified - in real system would compare with norms)
    const percentile = Math.min(100, scaledScore);

    // Calculate grade
    const passingScore = attempt.test.passing_score
      ? parseFloat(attempt.test.passing_score)
      : 60;
    const grade = calculateGrade(scaledScore, passingScore);
    const isPassed = determinePassStatus(scaledScore, passingScore);

    // Generate traits based on test category
    let traits = null;
    if (
      (options as any).include_personality_analysis &&
      attempt.test.module_type === "personality"
    ) {
      traits = generatePersonalityTraits(answersResult, attempt.test.category);
    } else if (
      (options as any).include_intelligence_scoring &&
      attempt.test.module_type === "intelligence"
    ) {
      traits = generateIntelligenceTraits(answersResult, attempt.test.category);
    }

    // Generate description and recommendations
    let description = `Test completed with ${Math.round(completionPercentage)}% completion rate. `;
    description += `Scored ${Math.round(scaledScore)} out of 100 (${grade}).`;

    let recommendations = null;
    if ((options as any).include_recommendations) {
      recommendations = generateRecommendations(
        scaledScore,
        grade,
        isPassed,
        attempt.test
      );
    }

    // Prepare detailed analysis
    const detailedAnalysis = {
      calculation_method: "standard_scoring",
      total_questions: totalQuestions,
      answered_questions: answeredQuestions,
      correct_answers: correctAnswers,
      accuracy_rate:
        answeredQuestions > 0 ? (correctAnswers / answeredQuestions) * 100 : 0,
      time_efficiency: attempt.attempt.time_spent
        ? Math.max(
            0,
            100 -
              (attempt.attempt.time_spent / (attempt.test.time_limit * 60)) *
                100
          )
        : 0,
      scoring_breakdown: scoredAnswers,
    };

    const now = new Date();

    // Create or update result
    let result;
    if (existingResult) {
      // Update existing result
      const [updatedResult] = await db
        .update(testResults)
        .set({
          raw_score: rawScore.toString(),
          scaled_score: scaledScore.toString(),
          percentile: percentile.toString(),
          grade,
          traits,
          trait_names: traits?.map((t: any) => t.name) || null,
          description,
          recommendations,
          detailed_analysis: detailedAnalysis,
          is_passed: isPassed,
          completion_percentage: completionPercentage.toString(),
          calculated_at: now,
          updated_at: now,
        })
        .where(eq(testResults.id, existingResult.id))
        .returning();

      result = updatedResult;
    } else {
      // Create new result
      const [newResult] = await db
        .insert(testResults)
        .values({
          attempt_id: attempt.attempt.id,
          user_id: attempt.user.id,
          test_id: attempt.test.id,
          session_result_id: null,
          raw_score: rawScore.toString(),
          scaled_score: scaledScore.toString(),
          percentile: percentile.toString(),
          grade,
          traits,
          trait_names: traits?.map((t: any) => t.name) || null,
          description,
          recommendations,
          detailed_analysis: detailedAnalysis,
          is_passed: isPassed,
          completion_percentage: completionPercentage.toString(),
          calculated_at: now,
          created_at: now,
          updated_at: now,
        })
        .returning();

      result = newResult;
    }

    const processingTime = Date.now() - startTime;

    // Build response
    const responseData = {
      id: result.id,
      attempt_id: result.attempt_id,
      user_id: result.user_id,
      test_id: result.test_id,
      session_result_id: result.session_result_id,
      raw_score: parseFloat(result.raw_score || "0"),
      scaled_score: parseFloat(result.scaled_score || "0"),
      percentile: parseFloat(result.percentile || "0"),
      grade: result.grade,
      traits: result.traits as any,
      trait_names: result.trait_names as string[] | null,
      description: result.description,
      recommendations: result.recommendations,
      detailed_analysis: result.detailed_analysis as any,
      is_passed: result.is_passed,
      completion_percentage: parseFloat(result.completion_percentage || "0"),
      calculated_at: result.calculated_at,
      created_at: result.created_at,
      updated_at: result.updated_at,
      user: {
        id: attempt.user.id,
        name: attempt.user.name,
        email: attempt.user.email,
        nik: attempt.user.nik || "",
      },
      test: {
        id: attempt.test.id,
        name: attempt.test.name,
        category: attempt.test.category,
        module_type: attempt.test.module_type,
        time_limit: attempt.test.time_limit || 0,
        total_questions: attempt.test.total_questions || 0,
        passing_score: attempt.test.passing_score
          ? parseFloat(attempt.test.passing_score)
          : null,
      },
      attempt: {
        id: attempt.attempt.id,
        start_time: attempt.attempt.start_time,
        end_time: attempt.attempt.end_time,
        actual_end_time: attempt.attempt.actual_end_time,
        status: attempt.attempt.status,
        time_spent: attempt.attempt.time_spent,
        questions_answered: attempt.attempt.questions_answered || 0,
      },
      session: null, // Will be populated if session data is needed
    };

    const response: CalculateTestResultResponse = {
      success: true,
      message: existingResult
        ? "Test result recalculated successfully"
        : "Test result calculated successfully",
      data: {
        result: responseData,
        calculation_details: {
          calculation_method: "standard_scoring",
          raw_answers_processed: answersResult.length,
          scores_calculated: scoredAnswers,
          processing_time_ms: processingTime,
          recalculated: !!existingResult,
        },
      },
      timestamp: new Date().toISOString(),
    };

    return c.json(response, existingResult ? 200 : 201);
  } catch (error) {
    console.error("Error calculating test result:", error);

    const errorResponse: TestResultErrorResponse = {
      success: false,
      message: "Failed to calculate test result",
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

// Helper function to generate personality traits
function generatePersonalityTraits(answersResult: any[], category: string) {
  // This is a simplified implementation
  // In a real system, this would use proper psychometric scoring algorithms

  const traits = [];

  if (category === "mbti") {
    traits.push(
      {
        name: "Extraversion",
        score: 75,
        description: "Outgoing and energetic",
        category: "personality",
      },
      {
        name: "Sensing",
        score: 60,
        description: "Practical and realistic",
        category: "personality",
      },
      {
        name: "Thinking",
        score: 80,
        description: "Logical and analytical",
        category: "personality",
      },
      {
        name: "Judging",
        score: 70,
        description: "Organized and decisive",
        category: "personality",
      }
    );
  } else if (category === "big_five") {
    traits.push(
      {
        name: "Openness",
        score: 75,
        description: "Open to new experiences",
        category: "personality",
      },
      {
        name: "Conscientiousness",
        score: 85,
        description: "Organized and responsible",
        category: "personality",
      },
      {
        name: "Extraversion",
        score: 70,
        description: "Sociable and assertive",
        category: "personality",
      },
      {
        name: "Agreeableness",
        score: 80,
        description: "Cooperative and trusting",
        category: "personality",
      },
      {
        name: "Neuroticism",
        score: 40,
        description: "Emotionally stable",
        category: "personality",
      }
    );
  }

  return traits;
}

// Helper function to generate intelligence traits
function generateIntelligenceTraits(answersResult: any[], category: string) {
  const traits = [];

  if (category === "wais") {
    traits.push(
      {
        name: "Verbal Comprehension",
        score: 110,
        description: "Verbal reasoning abilities",
        category: "intelligence",
      },
      {
        name: "Perceptual Reasoning",
        score: 105,
        description: "Non-verbal reasoning",
        category: "intelligence",
      },
      {
        name: "Working Memory",
        score: 115,
        description: "Memory and attention",
        category: "intelligence",
      },
      {
        name: "Processing Speed",
        score: 100,
        description: "Mental processing speed",
        category: "intelligence",
      }
    );
  }

  return traits;
}

// Helper function to generate recommendations
function generateRecommendations(
  score: number,
  grade: string,
  isPassed: boolean,
  test: any
): string {
  let recommendations = "";

  if (isPassed) {
    if (score >= 90) {
      recommendations =
        "Excellent performance! Consider advanced roles and leadership positions.";
    } else if (score >= 80) {
      recommendations =
        "Good performance. Suitable for target position with minor skill development.";
    } else {
      recommendations =
        "Adequate performance. Recommend additional training in key areas.";
    }
  } else {
    recommendations =
      "Performance below passing threshold. Recommend retesting after skill development or consider alternative positions.";
  }

  // Add test-specific recommendations
  if (test.module_type === "personality") {
    recommendations +=
      " Focus on personality development and self-awareness training.";
  } else if (test.module_type === "intelligence") {
    recommendations +=
      " Consider cognitive training and problem-solving skill enhancement.";
  }

  return recommendations;
}
