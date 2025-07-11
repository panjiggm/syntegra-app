import { Context } from "hono";
import { eq, and, desc, sql, count, gte, lte } from "drizzle-orm";
import {
  getDbFromEnv,
  users,
  testAttempts,
  testResults,
  tests,
  testSessions,
  userAnswers,
  questions,
} from "@/db";
import { type CloudflareBindings } from "@/lib/env";
import {
  type GetIndividualReportQuery,
  type GetIndividualReportResponse,
  type ReportErrorResponse,
  type IndividualReportData,
  calculateStrengthLevel,
  generateTraitInterpretation,
  determineRecommendationCategory,
  calculateReportTimeEfficiency,
  calculateReliabilityIndex,
  generateExecutiveSummary,
} from "shared-types";
import {
  calculateFreshScoresForUser,
  groupFreshScoresByUser,
  calculateUserAverageFromFreshScores,
  isRatingScaleTest,
} from "@/lib/reportCalculations";

export async function getIndividualReportHandler(
  c: Context<{ Bindings: CloudflareBindings; Variables: { user: any } }>
): Promise<Response> {
  try {
    const db = getDbFromEnv(c.env);
    const auth = c.get("auth");
    const currentUser = auth.user;
    const { userId } = c.req.param();
    const rawQuery = c.req.query();

    // Parse query parameters
    const queryParams: GetIndividualReportQuery = {
      format: (rawQuery.format as any) || "json",
      include_charts: rawQuery.include_charts !== "false",
      include_detailed_analysis: rawQuery.include_detailed_analysis !== "false",
      include_recommendations: rawQuery.include_recommendations !== "false",
      include_comparison_data: rawQuery.include_comparison_data === "true",
      session_filter: rawQuery.session_filter,
      date_from: rawQuery.date_from,
      date_to: rawQuery.date_to,
      language: (rawQuery.language as any) || "id",
    };

    // Authorization check: participant can only access their own report, admin can access any
    if (currentUser.role !== "admin" && currentUser.id !== userId) {
      const errorResponse: ReportErrorResponse = {
        success: false,
        message: "Access denied. You can only access your own report.",
        errors: [
          {
            field: "user_id",
            message: "Unauthorized access to user report",
            code: "FORBIDDEN",
          },
        ],
        timestamp: new Date().toISOString(),
      };
      return c.json(errorResponse, 403);
    }

    // Check if target user exists
    const [targetUser] = await db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        nik: users.nik,
        gender: users.gender,
        birth_date: users.birth_date,
        education: users.education,
        phone: users.phone,
        address: users.address,
        profile_picture_url: users.profile_picture_url,
        created_at: users.created_at,
      })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (!targetUser) {
      const errorResponse: ReportErrorResponse = {
        success: false,
        message: "User not found",
        errors: [
          {
            field: "user_id",
            message: "User with the provided ID does not exist",
            code: "NOT_FOUND",
          },
        ],
        timestamp: new Date().toISOString(),
      };
      return c.json(errorResponse, 404);
    }

    // Build date filter conditions
    const dateFilterConditions: any[] = [];
    if (queryParams.date_from) {
      dateFilterConditions.push(
        gte(testAttempts.start_time, new Date(queryParams.date_from))
      );
    }
    if (queryParams.date_to) {
      dateFilterConditions.push(
        lte(testAttempts.start_time, new Date(queryParams.date_to))
      );
    }

    // Build session filter conditions
    const sessionFilterConditions: any[] = [];
    if (queryParams.session_filter) {
      sessionFilterConditions.push(
        eq(testAttempts.session_test_id, queryParams.session_filter)
      );
    }

    // Get user's test attempts and results
    const userAttempts = await db
      .select({
        attempt: testAttempts,
        test: tests,
        result: testResults,
        session: testSessions,
      })
      .from(testAttempts)
      .leftJoin(tests, eq(testAttempts.test_id, tests.id))
      .leftJoin(testResults, eq(testAttempts.id, testResults.attempt_id))
      .leftJoin(testSessions, eq(testAttempts.session_test_id, testSessions.id))
      .where(
        and(
          eq(testAttempts.user_id, userId),
          ...dateFilterConditions,
          ...sessionFilterConditions
        )
      )
      .orderBy(desc(testAttempts.start_time));

    if (userAttempts.length === 0) {
      const errorResponse: ReportErrorResponse = {
        success: false,
        message: "No test data found for this user",
        errors: [
          {
            field: "user_data",
            message: "User has not completed any tests in the specified period",
            code: "NO_DATA",
          },
        ],
        timestamp: new Date().toISOString(),
      };
      return c.json(errorResponse, 404);
    }

    // Calculate assessment overview
    const totalTestsTaken = userAttempts.length;
    const totalTestsCompleted = userAttempts.filter(
      (attempt) => attempt.attempt.status === "completed"
    ).length;
    const overallCompletionRate = (totalTestsCompleted / totalTestsTaken) * 100;
    const totalTimeSpentMinutes =
      userAttempts.reduce(
        (sum, attempt) => sum + (attempt.attempt.time_spent || 0),
        0
      ) / 60; // Convert to minutes

    // Get assessment period
    const attemptDates = userAttempts
      .map((a) => a.attempt.start_time)
      .filter((date): date is Date => date !== null);
    const startDate =
      attemptDates.length > 0
        ? new Date(Math.min(...attemptDates.map((d) => d.getTime())))
        : new Date();
    const endDate =
      attemptDates.length > 0
        ? new Date(Math.max(...attemptDates.map((d) => d.getTime())))
        : new Date();

    // Get sessions participated
    const sessionsParticipated = Array.from(
      new Set(
        userAttempts
          .filter((attempt) => attempt.session)
          .map((attempt) => attempt.session!.id)
      )
    ).map((sessionId) => {
      const sessionAttempt = userAttempts.find(
        (attempt) => attempt.session?.id === sessionId
      );
      return {
        session_id: sessionId,
        session_name: sessionAttempt!.session!.session_name,
        target_position: sessionAttempt!.session!.target_position,
        participation_date: sessionAttempt!.attempt.start_time,
      };
    });

    // Calculate fresh scores for all user attempts
    const freshScores = await calculateFreshScoresForUser(
      db,
      userId,
      queryParams.session_filter,
      queryParams.date_from,
      queryParams.date_to
    );

    console.log(
      `Calculated ${freshScores.length} fresh scores for user ${userId}`
    );

    // Process test performances using fresh calculations
    const testPerformances = await Promise.all(
      userAttempts
        .filter((attempt) => attempt.test)
        .map(async (attempt) => {
          const test = attempt.test!;
          const attemptData = attempt.attempt;

          // Get fresh score for this attempt
          const freshScore = freshScores.find(
            (fs) => fs.attemptId === attemptData.id
          );

          // Check if this test contains only rating_scale questions
          const isRatingScaleTestResult = isRatingScaleTest(
            test.module_type,
            test.category
          );

          // For rating_scale tests, set scores to null
          let rawScore = null;
          let scaledScore = null;
          const result = attempt.result;

          if (!isRatingScaleTestResult) {
            // Fallback to stored result if fresh calculation failed
            rawScore =
              freshScore?.rawScore ??
              (result?.raw_score ? parseFloat(result.raw_score) : 0);
            scaledScore =
              freshScore?.scaledScore ??
              (result?.scaled_score ? parseFloat(result.scaled_score) : 0);
          }

          const completionRate =
            freshScore?.completionPercentage ??
            parseFloat(result?.completion_percentage || "0");

          // Parse traits from stored result (traits calculation logic remains the same)
          let traitScores: any[] = [];
          if (result?.traits) {
            try {
              traitScores = Array.isArray(result.traits)
                ? result.traits
                : JSON.parse(result.traits as string);
            } catch (error) {
              console.warn("Failed to parse traits:", error);
            }
          }

          // Calculate time efficiency
          const optimalTimeMinutes = test.time_limit || 60;
          const actualTimeMinutes = (attemptData.time_spent || 0) / 60;
          const timeEfficiency = calculateReportTimeEfficiency(
            actualTimeMinutes,
            optimalTimeMinutes
          );

          // Generate trait scores with interpretations
          const processedTraitScores = traitScores.map((trait) => {
            const strengthLevel = calculateStrengthLevel(trait.score);
            const interpretation = generateTraitInterpretation(
              trait.name,
              trait.score,
              strengthLevel,
              queryParams.language
            );

            return {
              trait_name: trait.name,
              trait_category: trait.category || "General",
              raw_score: trait.score,
              scaled_score: trait.score,
              percentile: null,
              interpretation,
              description: trait.description || interpretation,
              strength_level: strengthLevel,
            };
          });

          // Generate strengths and areas for development
          const highTraits = processedTraitScores
            .filter(
              (trait) =>
                trait.strength_level === "high" ||
                trait.strength_level === "very_high"
            )
            .map((trait) => trait.trait_name);

          const lowTraits = processedTraitScores
            .filter(
              (trait) =>
                trait.strength_level === "low" ||
                trait.strength_level === "very_low"
            )
            .map((trait) => trait.trait_name);

          // Determine grade based on fresh scaled score (only for non-rating_scale tests)
          let grade = null;
          if (!isRatingScaleTestResult && scaledScore !== null) {
            if (scaledScore >= 90) grade = "A";
            else if (scaledScore >= 80) grade = "B";
            else if (scaledScore >= 70) grade = "C";
            else if (scaledScore >= 60) grade = "D";
            else grade = "E";
          }

          return {
            test_id: test.id,
            test_name: test.name,
            test_category: test.category,
            module_type: test.module_type,
            icon: test.icon,
            attempt_id: attemptData.id,
            raw_score: rawScore,
            scaled_score: scaledScore,
            percentile: isRatingScaleTestResult
              ? null
              : scaledScore
                ? Math.min(100, scaledScore)
                : null, // Simplified percentile
            grade: grade,
            completion_rate: completionRate,
            time_spent_minutes: actualTimeMinutes,
            time_efficiency: timeEfficiency,
            trait_scores: processedTraitScores,
            strengths: highTraits,
            areas_for_development: lowTraits,
            status: attemptData.status,
            completed_at: attemptData.end_time
              ? attemptData.end_time.toISOString()
              : null,
          };
        })
    );

    // Generate psychological profile
    const allTraits = testPerformances.flatMap((perf) => perf.trait_scores);
    const dominantTraits = allTraits
      .filter(
        (trait) =>
          trait.strength_level === "high" ||
          trait.strength_level === "very_high"
      )
      .map((trait) => trait.trait_name)
      .slice(0, 5);

    const allStrengths = testPerformances.flatMap((perf) => perf.strengths);
    const allWeaknesses = testPerformances.flatMap(
      (perf) => perf.areas_for_development
    );

    // Calculate reliability index
    const allUserResponses = await db
      .select({
        question_id: userAnswers.question_id,
        answer: userAnswers.answer,
        time_taken: userAnswers.time_taken,
      })
      .from(userAnswers)
      .innerJoin(testAttempts, eq(userAnswers.attempt_id, testAttempts.id))
      .where(eq(testAttempts.user_id, userId));

    const reliabilityIndex = calculateReliabilityIndex(
      allUserResponses.filter(
        (r): r is typeof r & { time_taken: number } => r.time_taken !== null
      ),
      { time_limit: 3600, total_questions: allUserResponses.length }
    );

    const scorablePerformances = testPerformances.filter(
      (p) => p.scaled_score !== null
    );

    const psychologicalProfile = {
      dominant_traits: dominantTraits,
      personality_type: null, // Would be determined by specific test results
      cognitive_style: null,
      behavioral_tendencies: allStrengths.slice(0, 5),
      aptitude_areas: allStrengths.filter((s, i) => i < 3),
      interest_categories: allStrengths.filter((s, i) => i >= 3 && i < 6),
      overall_assessment: generateExecutiveSummary(
        "individual",
        {
          participant: targetUser,
          assessment_overview: {
            overall_completion_rate: overallCompletionRate,
          },
          overall_assessment: {
            composite_score:
              scorablePerformances.length > 0
                ? scorablePerformances.reduce(
                    (sum, p) => sum + (p.scaled_score || 0),
                    0
                  ) / scorablePerformances.length
                : 0,
          },
        },
        queryParams.language
      ),
      reliability_index: reliabilityIndex,
    };

    // Calculate overall assessment (excluding rating_scale tests)

    const compositeScore =
      scorablePerformances.length > 0
        ? scorablePerformances.reduce(
            (sum, p) => sum + (p.scaled_score || 0),
            0
          ) / scorablePerformances.length
        : null;

    const overallPercentile =
      scorablePerformances.length > 0
        ? scorablePerformances.reduce(
            (sum, p) => sum + (p.percentile || 0),
            0
          ) / scorablePerformances.length
        : null;

    // Determine grade based on composite score
    let overallGrade = null;
    if (compositeScore !== null) {
      if (compositeScore >= 90) overallGrade = "A";
      else if (compositeScore >= 80) overallGrade = "B";
      else if (compositeScore >= 70) overallGrade = "C";
      else if (compositeScore >= 60) overallGrade = "D";
      else overallGrade = "E";
    }

    const competencyMatch = overallPercentile || 0;
    let readinessLevel: "not_ready" | "developing" | "ready" | "exceeds" =
      "not_ready";
    if (compositeScore !== null) {
      if (compositeScore >= 85) readinessLevel = "exceeds";
      else if (compositeScore >= 75) readinessLevel = "ready";
      else if (compositeScore >= 60) readinessLevel = "developing";
    }

    // Generate recommendations
    const recommendations = [];

    if (queryParams.include_recommendations) {
      // Position fit recommendation
      const positionFitScore = competencyMatch;
      const recommendationCategory = determineRecommendationCategory(
        compositeScore || 0,
        overallCompletionRate,
        positionFitScore
      );

      recommendations.push({
        category: "position_fit" as const,
        title:
          queryParams.language === "id" ? "Kesesuaian Posisi" : "Position Fit",
        description:
          queryParams.language === "id"
            ? `Berdasarkan hasil assessment, kandidat ${
                recommendationCategory === "highly_recommended"
                  ? "sangat cocok"
                  : recommendationCategory === "recommended"
                    ? "cocok"
                    : recommendationCategory === "conditional"
                      ? "cocok dengan syarat"
                      : "kurang cocok"
              } untuk posisi yang dituju.`
            : `Based on assessment results, candidate is ${recommendationCategory.replace("_", " ")} for the target position.`,
        priority:
          recommendationCategory === "highly_recommended"
            ? ("high" as const)
            : recommendationCategory === "recommended"
              ? ("medium" as const)
              : ("low" as const),
        action_items: allStrengths.slice(0, 3),
        supporting_evidence: dominantTraits.slice(0, 3),
      });

      // Development recommendation if there are weaknesses
      if (allWeaknesses.length > 0) {
        recommendations.push({
          category: "development" as const,
          title:
            queryParams.language === "id"
              ? "Area Pengembangan"
              : "Development Areas",
          description:
            queryParams.language === "id"
              ? "Beberapa area yang perlu dikembangkan untuk meningkatkan performa."
              : "Several areas that need development to improve performance.",
          priority: "medium" as const,
          action_items: allWeaknesses.slice(0, 3),
          supporting_evidence: allWeaknesses.slice(0, 2),
        });
      }
    }

    // Get comparison data if requested
    let comparisonData = null;
    if (queryParams.include_comparison_data) {
      // Get peer group data (users who took similar tests)
      const testIds = testPerformances.map((p) => p.test_id);
      if (testIds.length > 0) {
        const [peerGroupSize] = await db
          .select({ count: count() })
          .from(testResults)
          .innerJoin(testAttempts, eq(testResults.attempt_id, testAttempts.id))
          .where(
            and(
              sql`${testResults.test_id} IN (${testIds.join(",")})`,
              sql`${testAttempts.user_id} != ${userId}`
            )
          );

        // Calculate user's percentile in group
        let percentileInGroup = 50; // Default
        let rankingInGroup = Math.floor(peerGroupSize.count / 2); // Default

        if (compositeScore !== null) {
          const [betterPerformers] = await db
            .select({ count: count() })
            .from(testResults)
            .innerJoin(
              testAttempts,
              eq(testResults.attempt_id, testAttempts.id)
            )
            .where(
              and(
                sql`${testResults.test_id} IN (${testIds.join(",")})`,
                sql`${testAttempts.user_id} != ${userId}`,
                sql`CAST(${testResults.scaled_score} AS DECIMAL) > ${compositeScore}`
              )
            );

          percentileInGroup = Math.round(
            ((peerGroupSize.count - betterPerformers.count) /
              peerGroupSize.count) *
              100
          );
          rankingInGroup = betterPerformers.count + 1;
        }

        comparisonData = {
          peer_group_size: peerGroupSize.count,
          percentile_in_group: percentileInGroup,
          ranking_in_group: rankingInGroup,
          above_average_traits: allStrengths.slice(0, 3),
          below_average_traits: allWeaknesses.slice(0, 3),
        };
      }
    }

    // Generate charts if requested
    let charts = undefined;
    if (queryParams.include_charts && testPerformances.length > 0) {
      charts = [];

      // Radar chart for personality traits (only if there are personality tests)
      const personalityPerformances = testPerformances.filter((perf) => {
        const test = userAttempts.find(
          (ua) => ua.test?.id === perf.test_id
        )?.test;
        return test && isRatingScaleTest(test.module_type, test.category);
      });

      if (personalityPerformances.length > 0) {
        // Calculate radar data based on rating scale distribution
        let radarData: Array<{ trait: string; score: number }> = [];

        // Get all user answers from personality tests
        const personalityTestIds = personalityPerformances.map(
          (perf) => perf.test_id
        );

        if (personalityTestIds.length > 0) {
          // Get all rating scale answers for personality tests
          const personalityAnswers = await db
            .select({
              answer: userAnswers.answer,
              question_type: questions.question_type,
            })
            .from(userAnswers)
            .innerJoin(
              testAttempts,
              eq(userAnswers.attempt_id, testAttempts.id)
            )
            .innerJoin(questions, eq(userAnswers.question_id, questions.id))
            .where(
              and(
                eq(testAttempts.user_id, userId),
                sql`${testAttempts.test_id} IN (${sql.join(personalityTestIds, sql`, `)})`
              )
            );

          // Filter only rating_scale answers and count distribution
          const ratingAnswers = personalityAnswers.filter(
            (ans) => ans.question_type === "rating_scale" && ans.answer
          );

          if (ratingAnswers.length > 0) {
            // Count distribution of ratings
            const ratingCounts: Record<string, number> = {
              "1": 0,
              "2": 0,
              "3": 0,
              "4": 0,
              "5": 0,
            };

            ratingAnswers.forEach((ans) => {
              if (ans.answer && ratingCounts.hasOwnProperty(ans.answer)) {
                ratingCounts[ans.answer]++;
              }
            });

            const totalAnswers = ratingAnswers.length;

            // Calculate percentages for each trait
            const traitMapping = {
              "1": "Extraversion",
              "2": "Conscientiousness",
              "3": "Openness",
              "4": "Agreeableness",
              "5": "Neuroticism",
            };

            radarData = Object.entries(traitMapping).map(
              ([rating, traitName]) => ({
                trait: traitName,
                score:
                  totalAnswers > 0
                    ? Math.round(
                        (ratingCounts[rating] / totalAnswers) * 100 * 10
                      ) / 10
                    : 0,
              })
            );
          }
        }

        // If no rating scale data available, use default structure
        if (radarData.length === 0) {
          const standardTraits = [
            "Extraversion",
            "Conscientiousness",
            "Openness",
            "Agreeableness",
            "Neuroticism",
          ];
          radarData = standardTraits.map((traitName) => ({
            trait: traitName,
            score: 20, // Default equal distribution (100% / 5 traits = 20%)
          }));
        }

        if (radarData.length > 0) {
          charts.push({
            type: "radar" as const,
            title:
              queryParams.language === "id"
                ? "Profil Trait Psikologis"
                : "Psychological Trait Profile",
            data: radarData,
            description:
              queryParams.language === "id"
                ? "Visualisasi kekuatan trait psikologis utama"
                : "Visualization of main psychological trait strengths",
          });
        }
      }

      // Bar chart for performance (excluding rating_scale tests)
      const scorableTestPerformances = testPerformances.filter(
        (perf) => perf.scaled_score !== null
      );
      if (scorableTestPerformances.length > 0) {
        charts.push({
          type: "bar" as const,
          title:
            queryParams.language === "id"
              ? "Performa per Tes"
              : "Performance by Test",
          data: scorableTestPerformances.map((perf) => ({
            test: perf.test_name,
            score: perf.scaled_score || 0,
            completion: perf.completion_rate,
          })),
          description:
            queryParams.language === "id"
              ? "Perbandingan skor dan tingkat penyelesaian per tes"
              : "Comparison of scores and completion rates per test",
        });
      }
    }

    // Build report data
    const reportData: IndividualReportData = {
      participant: {
        id: targetUser.id,
        name: targetUser.name,
        email: targetUser.email,
        nik: targetUser.nik || "",
        gender: targetUser.gender,
        birth_date: targetUser.birth_date?.toISOString() || null,
        education: targetUser.education,
        phone: targetUser.phone,
        address: targetUser.address,
        profile_picture_url: targetUser.profile_picture_url,
      },
      assessment_overview: {
        total_tests_taken: totalTestsTaken,
        total_tests_completed: totalTestsCompleted,
        overall_completion_rate: Math.round(overallCompletionRate),
        total_time_spent_minutes: Math.round(totalTimeSpentMinutes),
        assessment_period: {
          start_date: startDate.toISOString(),
          end_date: endDate.toISOString(),
        },
        sessions_participated: sessionsParticipated.map((session) => ({
          session_id: session.session_id,
          session_name: session.session_name,
          target_position: session.target_position,
          participation_date:
            session.participation_date?.toISOString() ||
            new Date().toISOString(),
        })),
      },
      test_performances: testPerformances,
      psychological_profile: psychologicalProfile,
      overall_assessment: {
        composite_score: compositeScore,
        overall_percentile: overallPercentile,
        overall_grade: overallGrade,
        competency_match: Math.round(competencyMatch),
        readiness_level: readinessLevel,
      },
      recommendations,
      comparison_data: comparisonData,
      charts,
      report_metadata: {
        generated_at: new Date().toISOString(),
        generated_by: currentUser.id,
        report_version: "1.0",
        data_sources: [
          "test_attempts",
          "test_results",
          "user_answers",
          "psychological_analysis",
        ],
        reliability_notes:
          reliabilityIndex < 0.7
            ? [
                queryParams.language === "id"
                  ? "Tingkat reliabilitas data di bawah optimal. Hasil perlu interpretasi hati-hati."
                  : "Data reliability level below optimal. Results require careful interpretation.",
              ]
            : [],
      },
    };

    const response: GetIndividualReportResponse = {
      success: true,
      message: `Individual assessment report for ${targetUser.name} generated successfully`,
      data: reportData,
      timestamp: new Date().toISOString(),
    };

    return c.json(response, 200);
  } catch (error) {
    console.error("Error generating individual report:", error);

    const errorResponse: ReportErrorResponse = {
      success: false,
      message: "Failed to generate individual report",
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
