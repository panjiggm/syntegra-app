import { Context } from "hono";
import { eq, and } from "drizzle-orm";
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

    // Determine scoring method based on test type
    const isPersonalityTest = attempt.test.module_type === "personality";
    const isRatingScaleTest = attempt.test.question_type === "rating_scale";

    let rawScore = 0;
    let correctAnswers = 0;
    let grade = null;
    let scaledScore = 0;
    let percentile = null;
    let isPassed = null;

    // For personality/rating_scale tests: Calculate trait distribution
    const ratingDistribution: Record<string, number> = {
      "1": 0,
      "2": 0,
      "3": 0,
      "4": 0,
      "5": 0,
    };
    // Store trait-based answers for personality tests
    const traitAnswers: Record<string, number[]> = {};

    // Process answers based on test type
    if (isPersonalityTest || isRatingScaleTest) {
      // PERSONALITY/RATING_SCALE: Collect answers by trait
      for (const { answer, question } of answersResult) {
        if (!question) continue;

        // Get trait from scoring_key
        let traitName = null;
        if (question.scoring_key && typeof question.scoring_key === "object") {
          traitName = (question.scoring_key as any).trait;
        }

        // Get rating value from answer
        let ratingValue = null;
        if (answer.answer) {
          ratingValue = parseInt(answer.answer);
        } else if (
          answer.answer_data &&
          typeof answer.answer_data === "object"
        ) {
          ratingValue = parseInt(
            (answer.answer_data as any).value ||
              (answer.answer_data as any).rating
          );
        }

        // Store trait-based answer
        if (traitName && ratingValue && ratingValue >= 1 && ratingValue <= 5) {
          if (!traitAnswers[traitName]) {
            traitAnswers[traitName] = [];
          }
          traitAnswers[traitName].push(ratingValue);
        }

        // Also count for general rating distribution
        if (
          ratingValue &&
          ratingDistribution.hasOwnProperty(ratingValue.toString())
        ) {
          ratingDistribution[ratingValue.toString()]++;
        }
      }

      // For personality tests, no grade/pass/fail - just completion
      const totalRatings = Object.values(ratingDistribution).reduce(
        (sum, count) => sum + count,
        0
      );
      rawScore = totalRatings;
      scaledScore = completionPercentage;
      percentile = null; // No percentile for personality tests
      grade = null; // No grade for personality tests
      isPassed = null; // No pass/fail for personality tests
    } else {
      // COGNITIVE TESTS (multiple_choice, true_false): Calculate score and grade
      for (const { answer, question } of answersResult) {
        if (!question) continue;

        // Check if answer has any content
        const hasAnswer = answer.answer || answer.answer_data || answer.score;
        if (!hasAnswer) continue;

        let questionScore = 0;
        let isAnswerCorrect = false;

        // Use stored score if available (already calculated)
        if (answer.score !== null && answer.score !== undefined) {
          questionScore = parseFloat(answer.score) || 0;
          isAnswerCorrect = questionScore > 0;
        }
        // Fallback: use is_correct if no score available
        else if (answer.is_correct === true) {
          questionScore = 1;
          isAnswerCorrect = true;
        }

        // Count correct answers for accuracy calculation
        if (isAnswerCorrect) {
          correctAnswers++;
        }

        rawScore += questionScore;
      }

      // Calculate scaled score and grade for cognitive tests
      scaledScore = totalQuestions > 0 ? (rawScore / totalQuestions) * 100 : 0;
      percentile = Math.min(100, scaledScore);

      // Calculate grade and pass/fail
      const passingScore = attempt.test.passing_score
        ? parseFloat(attempt.test.passing_score)
        : 60;
      grade = calculateGrade(scaledScore, passingScore);
      isPassed = determinePassStatus(scaledScore, passingScore);
    }

    // Generate traits based on test category
    let traits = null;
    if (
      (options as any).include_personality_analysis &&
      attempt.test.module_type === "personality"
    ) {
      traits = generatePersonalityTraits(traitAnswers, attempt.test.category);
    }

    // Generate description and recommendations
    let description = `Test completed with ${Math.round(completionPercentage)}% completion rate. `;

    if (isPersonalityTest || isRatingScaleTest) {
      // Description for personality tests - focus on trait distribution
      const dominantRating = Object.entries(ratingDistribution).reduce(
        (max, [rating, count]) => (count > max.count ? { rating, count } : max),
        { rating: "3", count: 0 }
      );
      description += `Most responses in rating ${dominantRating.rating} (${Math.round((dominantRating.count / rawScore) * 100)}% of answers).`;
    } else {
      // Description for cognitive tests - focus on score and grade
      description += `Scored ${Math.round(scaledScore)} out of 100 (${grade || "N/A"}).`;
    }

    let recommendations = null;
    if ((options as any).include_recommendations) {
      recommendations = generateRecommendations(
        scaledScore,
        grade,
        isPassed,
        attempt.test,
        isPersonalityTest || isRatingScaleTest,
        ratingDistribution
      );
    }

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
          percentile: percentile?.toString() || null,
          grade,
          traits,
          trait_names: traits?.map((t: any) => t.name) || null,
          description,
          recommendations,
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
          percentile: percentile?.toString() || null,
          grade,
          traits,
          trait_names: traits?.map((t: any) => t.name) || null,
          description,
          recommendations,
          is_passed: isPassed,
          completion_percentage: completionPercentage.toString(),
          calculated_at: now,
          created_at: now,
          updated_at: now,
        })
        .returning();

      result = newResult;
    }

    // Build response
    const responseData = {
      id: result.id,
      attempt_id: result.attempt_id,
      user_id: result.user_id,
      test_id: result.test_id,
      session_result_id: result.session_result_id,
      raw_score: parseFloat(result.raw_score || "0"),
      scaled_score: parseFloat(result.scaled_score || "0"),
      percentile: result.percentile ? parseFloat(result.percentile) : null,
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
      data: responseData,
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
function generatePersonalityTraits(
  traitAnswers: Record<string, number[]>,
  category: string
) {
  const traits = [];

  // Define complete trait sets and descriptions by category (for Radar Charts)
  const categoryTraits: Record<
    string,
    Array<{ name: string; key: string; description: string }>
  > = {
    disc: [
      {
        name: "Dominance",
        key: "dominance",
        description: "Assertive, results-oriented, strong-willed, and forceful",
      },
      {
        name: "Influence",
        key: "influence",
        description: "Enthusiastic, optimistic, open, trusting, and energetic",
      },
      {
        name: "Steadiness",
        key: "steadiness",
        description:
          "Even-tempered, accommodating, patient, humble, and tactful",
      },
      {
        name: "Compliance",
        key: "compliance",
        description: "Private, analytical, logical, critical, and reserved",
      },
    ],
    mbti: [
      {
        name: "Extraversion",
        key: "extraversion",
        description: "Outgoing, energetic, assertive, and sociable",
      },
      {
        name: "Sensing",
        key: "sensing",
        description: "Practical, realistic, detailed, and factual",
      },
      {
        name: "Thinking",
        key: "thinking",
        description: "Logical, analytical, objective, and critical",
      },
      {
        name: "Judging",
        key: "judging",
        description: "Organized, decisive, scheduled, and structured",
      },
    ],
    big_five: [
      {
        name: "Openness",
        key: "openness",
        description: "Creative, curious, open to new experiences and ideas",
      },
      {
        name: "Conscientiousness",
        key: "conscientiousness",
        description:
          "Organized, responsible, dependable, and achievement-oriented",
      },
      {
        name: "Extraversion",
        key: "extraversion",
        description: "Sociable, assertive, energetic, and outgoing",
      },
      {
        name: "Agreeableness",
        key: "agreeableness",
        description: "Cooperative, trusting, helpful, and good-natured",
      },
      {
        name: "Neuroticism",
        key: "neuroticism",
        description:
          "Anxious, emotionally reactive, and prone to negative emotions",
      },
    ],
    epps: [
      {
        name: "Achievement",
        key: "achievement",
        description: "Driven to accomplish difficult tasks and excel",
      },
      {
        name: "Deference",
        key: "deference",
        description: "Respectful to authority and willing to follow others",
      },
      {
        name: "Order",
        key: "order",
        description: "Organized, neat, and values structure and planning",
      },
      {
        name: "Exhibition",
        key: "exhibition",
        description:
          "Enjoys being the center of attention and impressing others",
      },
      {
        name: "Autonomy",
        key: "autonomy",
        description: "Independent, self-reliant, and values freedom",
      },
      {
        name: "Affiliation",
        key: "affiliation",
        description: "Enjoys close relationships and being part of groups",
      },
      {
        name: "Intraception",
        key: "intraception",
        description:
          "Analytical, introspective, and interested in understanding motives",
      },
      {
        name: "Succorance",
        key: "succorance",
        description: "Seeks help and support from others when needed",
      },
      {
        name: "Dominance",
        key: "dominance",
        description: "Assertive, influential, and enjoys leading others",
      },
      {
        name: "Abasement",
        key: "abasement",
        description:
          "Self-critical, accepts blame, and feels inferior at times",
      },
      {
        name: "Nurturance",
        key: "nurturance",
        description: "Caring, helpful, and enjoys taking care of others",
      },
      {
        name: "Change",
        key: "change",
        description: "Enjoys variety, novelty, and new experiences",
      },
      {
        name: "Endurance",
        key: "endurance",
        description: "Persistent, determined, and works hard to completion",
      },
      {
        name: "Heterosexuality",
        key: "heterosexuality",
        description: "Interested in and attracted to the opposite sex",
      },
      {
        name: "Aggression",
        key: "aggression",
        description: "Competitive, argumentative, and easily angered",
      },
    ],
  };

  // Get expected traits for this category
  const expectedTraits = categoryTraits[category] || [];

  // Calculate scores for all expected traits (ensure complete data for Radar Chart)
  for (const traitDef of expectedTraits) {
    let score = 0; // Default score for Radar Chart
    let rawAverage = 0; // Default average
    let questionCount = 0;

    // If we have actual data for this trait, calculate real score
    if (traitAnswers[traitDef.key] && traitAnswers[traitDef.key].length > 0) {
      const ratings = traitAnswers[traitDef.key];
      rawAverage =
        ratings.reduce((sum, rating) => sum + rating, 0) / ratings.length;
      score = Math.round(((rawAverage - 1) / 4) * 100); // Convert 1-5 to 0-100
      questionCount = ratings.length;
    }

    traits.push({
      name: traitDef.name,
      key: traitDef.key, // For frontend identification
      score: Math.max(0, Math.min(100, score)), // Clamp to 0-100
      description: traitDef.description,
      category: "personality",
      raw_average: Math.round(rawAverage * 10) / 10, // Round to 1 decimal
      question_count: questionCount,
    });
  }

  // For Radar Charts, maintain original order (don't sort by score)
  // This ensures consistent positioning on the radar

  return traits;
}

// Helper function to generate recommendations
function generateRecommendations(
  score: number,
  grade: string | null,
  isPassed: boolean | null,
  test: any,
  isPersonalityTest: boolean = false,
  ratingDistribution: Record<string, number> = {}
): string {
  let recommendations = "";

  if (isPersonalityTest) {
    const dominantRating = Object.entries(ratingDistribution).reduce(
      (max, [rating, count]) => (count > max.count ? { rating, count } : max),
      { rating: "3", count: 0 }
    );

    if (parseInt(dominantRating.rating) >= 4) {
      recommendations =
        "Terdeteksi kepribadian yang kuat. Pertimbangkan peran kepemimpinan atau posisi dengan tanggung jawab tinggi yang memanfaatkan kekuatan ini.";
    } else if (parseInt(dominantRating.rating) === 3) {
      recommendations =
        "Profil kepribadian yang seimbang. Cocok untuk peran kolaboratif dan posisi berbasis tim.";
    } else {
      recommendations =
        "Profil kepribadian introspektif. Pertimbangkan peran yang memerlukan analisis teliti dan kerja mandiri.";
    }

    recommendations +=
      " Fokus pada pengembangan kepribadian dan pelatihan kesadaran diri untuk meningkatkan kekuatan.";
  } else {
    // Rekomendasi untuk tes kognitif berdasarkan skor dan nilai
    if (isPassed) {
      if (score >= 90) {
        recommendations =
          "Performa sangat baik! Pertimbangkan peran lanjutan dan posisi kepemimpinan.";
      } else if (score >= 80) {
        recommendations =
          "Performa baik. Cocok untuk posisi target dengan sedikit pengembangan keterampilan.";
      } else {
        recommendations =
          "Performa biasa saja. Disarankan pelatihan tambahan untuk meningkatkan kemampuan.";
      }
    } else {
      recommendations =
        "Performa di bawah ambang batas kelulusan. Disarankan tes ulang setelah pengembangan keterampilan atau pertimbangkan posisi alternatif.";
    }

    // Tambahkan rekomendasi spesifik tes untuk tes kognitif
    if (test.module_type === "intelligence") {
      recommendations +=
        " Pertimbangkan pelatihan kognitif dan peningkatan keterampilan pemecahan masalah.";
    } else if (test.module_type === "aptitude") {
      recommendations +=
        " Fokus pada pelatihan spesifik keterampilan dan latihan di area yang relevan.";
    }
  }

  return recommendations;
}
