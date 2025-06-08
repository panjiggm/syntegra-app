import { Context } from "hono";
import { eq, and, desc, asc, count, sql, avg } from "drizzle-orm";
import {
  getDbFromEnv,
  testSessions,
  sessionParticipants,
  testAttempts,
  testResults,
  tests,
  users,
  sessionModules,
} from "@/db";
import { type CloudflareBindings } from "@/lib/env";
import {
  type GetBatchReportQuery,
  type GetBatchReportResponse,
  type ReportErrorResponse,
  type BatchReportData,
  calculateCompletionRate,
  calculateReportTimeEfficiency,
  calculateStrengthLevel,
  generateTraitInterpretation,
  determineRecommendationCategory,
  REPORT_LIMITS,
} from "shared-types";

export async function getBatchReportHandler(
  c: Context<{ Bindings: CloudflareBindings; Variables: { user: any } }>
): Promise<Response> {
  try {
    const db = getDbFromEnv(c.env);
    const auth = c.get("auth");
    const currentUser = auth.user;
    const { sessionId } = c.req.param();
    const rawQuery = c.req.query();

    // Parse query parameters
    const queryParams: GetBatchReportQuery = {
      format: (rawQuery.format as any) || "excel",
      include_personal_data: rawQuery.include_personal_data !== "false",
      include_detailed_scores: rawQuery.include_detailed_scores !== "false",
      include_trait_breakdown: rawQuery.include_trait_breakdown === "true",
      include_recommendations: rawQuery.include_recommendations === "true",
      include_raw_answers: rawQuery.include_raw_answers === "true",
      sort_by: (rawQuery.sort_by as any) || "name",
      sort_order: (rawQuery.sort_order as any) || "asc",
      language: (rawQuery.language as any) || "id",
    };

    // Get session information
    const [session] = await db
      .select({
        id: testSessions.id,
        session_name: testSessions.session_name,
        session_code: testSessions.session_code,
        target_position: testSessions.target_position,
        start_time: testSessions.start_time,
        end_time: testSessions.end_time,
        status: testSessions.status,
        created_at: testSessions.created_at,
      })
      .from(testSessions)
      .where(eq(testSessions.id, sessionId))
      .limit(1);

    if (!session) {
      const errorResponse: ReportErrorResponse = {
        success: false,
        message: "Session not found",
        errors: [
          {
            field: "session_id",
            message: "Session with the provided ID does not exist",
            code: "NOT_FOUND",
          },
        ],
        timestamp: new Date().toISOString(),
      };
      return c.json(errorResponse, 404);
    }

    // Get all participants in the session
    const sessionParticipantsData = await db
      .select({
        user_id: users.id,
        name: users.name,
        email: users.email,
        nik: users.nik || "",
        gender: users.gender,
        birth_date: users.birth_date,
        education: users.education,
        phone: users.phone,
        address: users.address,
        province: users.province,
        regency: users.regency,
        participation_status: sessionParticipants.status,
        registered_at: sessionParticipants.registered_at,
        invitation_sent_at: sessionParticipants.invitation_sent_at,
      })
      .from(sessionParticipants)
      .innerJoin(users, eq(sessionParticipants.user_id, users.id))
      .where(eq(sessionParticipants.session_id, sessionId))
      .orderBy(users.name);

    if (sessionParticipantsData.length === 0) {
      const errorResponse: ReportErrorResponse = {
        success: false,
        message: "No participants found in this session",
        errors: [
          {
            field: "participants",
            message: "Session has no registered participants",
            code: "NO_DATA",
          },
        ],
        timestamp: new Date().toISOString(),
      };
      return c.json(errorResponse, 404);
    }

    // Check participant limit
    if (sessionParticipantsData.length > REPORT_LIMITS.MAX_PARTICIPANTS_BATCH) {
      const errorResponse: ReportErrorResponse = {
        success: false,
        message: `Too many participants for batch report. Maximum ${REPORT_LIMITS.MAX_PARTICIPANTS_BATCH} participants allowed.`,
        errors: [
          {
            field: "participants",
            message: `Participant count (${sessionParticipantsData.length}) exceeds limit`,
            code: "LIMIT_EXCEEDED",
          },
        ],
        timestamp: new Date().toISOString(),
      };
      return c.json(errorResponse, 400);
    }

    // Get all tests in this session
    const sessionTests = await db
      .select({
        test_id: tests.id,
        test_name: tests.name,
        test_category: tests.category,
        module_type: tests.module_type,
        sequence: sessionModules.sequence,
        time_limit: tests.time_limit,
        total_questions: tests.total_questions,
        passing_score: tests.passing_score,
      })
      .from(sessionModules)
      .innerJoin(tests, eq(sessionModules.test_id, tests.id))
      .where(eq(sessionModules.session_id, sessionId))
      .orderBy(sessionModules.sequence);

    // Process each participant's data
    const participantResults = await Promise.all(
      sessionParticipantsData.map(async (participant) => {
        // Get participant's test attempts
        const participantAttempts = await db
          .select({
            attempt_id: testAttempts.id,
            test_id: testAttempts.test_id,
            start_time: testAttempts.start_time,
            end_time: testAttempts.end_time,
            actual_end_time: testAttempts.actual_end_time,
            status: testAttempts.status,
            time_spent: testAttempts.time_spent,
            questions_answered: testAttempts.questions_answered,
            total_questions: testAttempts.total_questions,
          })
          .from(testAttempts)
          .where(
            and(
              eq(testAttempts.user_id, participant.user_id),
              eq(testAttempts.session_test_id, sessionId)
            )
          );

        // Get participant's test results
        const participantTestResults = await db
          .select({
            test_id: testResults.test_id,
            attempt_id: testResults.attempt_id,
            raw_score: testResults.raw_score,
            scaled_score: testResults.scaled_score,
            percentile: testResults.percentile,
            grade: testResults.grade,
            traits: testResults.traits,
            is_passed: testResults.is_passed,
            completion_percentage: testResults.completion_percentage,
            calculated_at: testResults.calculated_at,
          })
          .from(testResults)
          .where(
            sql`${testResults.attempt_id} IN (${participantAttempts.map((a) => `'${a.attempt_id}'`).join(",")})`
          );

        // Calculate overall metrics
        const totalTests = sessionTests.length;
        const attemptedTests = participantAttempts.length;
        const completedTests = participantAttempts.filter(
          (a) => a.status === "completed"
        ).length;
        const completionRate = calculateCompletionRate(
          completedTests,
          attemptedTests
        );

        // Calculate overall scores
        const validResults = participantTestResults.filter(
          (r) => r.scaled_score !== null
        );
        const overallScore =
          validResults.length > 0
            ? validResults.reduce(
                (sum, r) => sum + parseFloat(r.scaled_score!),
                0
              ) / validResults.length
            : null;

        const overallPercentile =
          validResults.length > 0
            ? validResults.reduce(
                (sum, r) => sum + parseFloat(r.percentile || "0"),
                0
              ) / validResults.length
            : null;

        // Determine overall grade
        let overallGrade = null;
        if (overallScore !== null) {
          if (overallScore >= 90) overallGrade = "A";
          else if (overallScore >= 80) overallGrade = "B";
          else if (overallScore >= 70) overallGrade = "C";
          else if (overallScore >= 60) overallGrade = "D";
          else overallGrade = "E";
        }

        // Calculate total time spent
        const totalTimeMinutes =
          participantAttempts.reduce(
            (sum, attempt) => sum + (attempt.time_spent || 0),
            0
          ) / 60;

        // Get start and completion times
        const allStartTimes = participantAttempts
          .map((a) => a.start_time)
          .filter((time): time is Date => time !== null);
        const startTime =
          allStartTimes.length > 0
            ? new Date(Math.min(...allStartTimes.map((t) => t.getTime())))
            : null;

        const allEndTimes = participantAttempts
          .map((a) => a.end_time || a.actual_end_time)
          .filter((time): time is Date => time !== null);
        const completionTime =
          allEndTimes.length > 0
            ? new Date(Math.max(...allEndTimes.map((t) => t.getTime())))
            : null;

        // Process test-by-test results
        const testResultsFormatted = sessionTests.map((test) => {
          const attempt = participantAttempts.find(
            (a) => a.test_id === test.test_id
          );
          const result = participantTestResults.find(
            (r) => r.test_id === test.test_id
          );

          return {
            test_name: test.test_name,
            test_category: test.test_category,
            raw_score: result?.raw_score ? parseFloat(result.raw_score) : null,
            scaled_score: result?.scaled_score
              ? parseFloat(result.scaled_score)
              : null,
            percentile: result?.percentile
              ? parseFloat(result.percentile)
              : null,
            grade: result?.grade || null,
            time_spent_minutes: attempt?.time_spent
              ? Math.round(attempt.time_spent / 60)
              : 0,
            status: attempt?.status || "not_attempted",
          };
        });

        // Process trait scores (if requested)
        let traitScores = undefined;
        if (queryParams.include_trait_breakdown) {
          const allTraits: any[] = [];
          participantTestResults.forEach((result) => {
            if (result.traits) {
              try {
                const traits = Array.isArray(result.traits)
                  ? result.traits
                  : JSON.parse(result.traits as string);
                allTraits.push(...traits);
              } catch (error) {
                console.warn("Failed to parse traits:", error);
              }
            }
          });

          // Group and average traits by name
          const traitGroups = allTraits.reduce(
            (groups, trait) => {
              if (!groups[trait.name]) {
                groups[trait.name] = [];
              }
              groups[trait.name].push(trait);
              return groups;
            },
            {} as Record<string, any[]>
          );

          traitScores = Object.entries(traitGroups).map(
            ([traitName, traits]) => {
              const avgScore =
                (traits as any[]).reduce(
                  (sum: number, trait: any) => sum + trait.score,
                  0
                ) / (traits as any[]).length;
              const strengthLevel = calculateStrengthLevel(avgScore);
              const interpretation = generateTraitInterpretation(
                traitName,
                avgScore,
                strengthLevel,
                queryParams.language
              );

              return {
                trait_name: traitName,
                trait_category: (traits as any[])[0]?.category || "General",
                score: Math.round(avgScore),
                interpretation,
              };
            }
          );
        }

        // Generate recommendation summary (if requested)
        let recommendationSummary = undefined;
        let positionFitScore = undefined;
        if (queryParams.include_recommendations && overallScore !== null) {
          positionFitScore = Math.round(overallPercentile || overallScore);
          const recommendationCategory = determineRecommendationCategory(
            overallScore,
            completionRate,
            positionFitScore
          );

          const categoryLabels = {
            id: {
              highly_recommended:
                "Sangat Direkomendasikan - Kandidat memiliki performa luar biasa dan sangat cocok untuk posisi.",
              recommended:
                "Direkomendasikan - Kandidat memiliki performa baik dan cocok untuk posisi.",
              conditional:
                "Dengan Syarat - Kandidat memiliki potensi tapi memerlukan pengembangan di beberapa area.",
              not_recommended:
                "Tidak Direkomendasikan - Kandidat memerlukan pengembangan signifikan sebelum siap untuk posisi.",
            },
            en: {
              highly_recommended:
                "Highly Recommended - Candidate shows exceptional performance and is very suitable for the position.",
              recommended:
                "Recommended - Candidate shows good performance and is suitable for the position.",
              conditional:
                "Conditional - Candidate has potential but requires development in some areas.",
              not_recommended:
                "Not Recommended - Candidate requires significant development before being ready for the position.",
            },
          };

          recommendationSummary =
            categoryLabels[queryParams.language][recommendationCategory];
        }

        // Calculate data quality metrics
        const totalPossibleAnswers = sessionTests.reduce(
          (sum, test) => sum + (test.total_questions || 0),
          0
        );
        const actualAnswers = participantAttempts.reduce(
          (sum, attempt) => sum + (attempt.questions_answered || 0),
          0
        );
        const completionConsistency =
          totalPossibleAnswers > 0 ? actualAnswers / totalPossibleAnswers : 0;

        // Simple response pattern validity (check if participant answered too quickly or too slowly)
        const expectedTimeMinutes = sessionTests.reduce(
          (sum, test) => sum + (test.time_limit || 60),
          0
        );
        const responsePatternValidity =
          expectedTimeMinutes > 0
            ? Math.min(
                1,
                Math.max(
                  0.1,
                  1 -
                    Math.abs(totalTimeMinutes - expectedTimeMinutes) /
                      expectedTimeMinutes
                )
              )
            : 1;

        const timeEfficiency = calculateReportTimeEfficiency(
          totalTimeMinutes,
          expectedTimeMinutes
        );

        return {
          // Personal Data
          user_id: participant.user_id,
          name: participant.name,
          email: participant.email,
          nik: queryParams.include_personal_data
            ? participant.nik || ""
            : "***",
          gender: queryParams.include_personal_data ? participant.gender : null,
          birth_date:
            queryParams.include_personal_data && participant.birth_date
              ? participant.birth_date.toISOString().split("T")[0]
              : null,
          education: queryParams.include_personal_data
            ? participant.education
            : null,
          phone: queryParams.include_personal_data ? participant.phone : null,

          // Registration & Participation
          registration_date: participant.registered_at?.toISOString() || null,
          participation_status:
            participant.participation_status || "registered",
          start_time: startTime?.toISOString() || null,
          completion_time: completionTime?.toISOString() || null,

          // Overall Performance
          overall_score: overallScore ? Math.round(overallScore) : null,
          overall_percentile: overallPercentile
            ? Math.round(overallPercentile)
            : null,
          overall_grade: overallGrade,
          completion_rate: Math.round(completionRate),
          total_time_minutes: Math.round(totalTimeMinutes),

          // Test-by-Test Results
          test_results: queryParams.include_detailed_scores
            ? testResultsFormatted
            : testResultsFormatted.map((tr) => ({
                test_name: tr.test_name,
                test_category: tr.test_category,
                raw_score: tr.raw_score,
                scaled_score: tr.scaled_score,
                percentile: tr.percentile,
                grade: tr.grade,
                time_spent_minutes: tr.time_spent_minutes,
                status: tr.status,
              })),

          // Trait Scores (if requested)
          trait_scores: traitScores,

          // Recommendations (if requested)
          recommendation_summary: recommendationSummary,
          position_fit_score: positionFitScore,

          // Quality Indicators
          data_quality: {
            completion_consistency:
              Math.round(completionConsistency * 100) / 100,
            response_pattern_validity:
              Math.round(responsePatternValidity * 100) / 100,
            time_efficiency: Math.round(timeEfficiency),
          },
        };
      })
    );

    // Sort participants based on sort criteria
    participantResults.sort((a, b) => {
      let aValue: any, bValue: any;

      switch (queryParams.sort_by) {
        case "name":
          aValue = a.name.toLowerCase();
          bValue = b.name.toLowerCase();
          break;
        case "score":
          aValue = a.overall_score || 0;
          bValue = b.overall_score || 0;
          break;
        case "completion_rate":
          aValue = a.completion_rate;
          bValue = b.completion_rate;
          break;
        case "registration_order":
          aValue = new Date(a.registration_date || 0).getTime();
          bValue = new Date(b.registration_date || 0).getTime();
          break;
        default:
          aValue = a.name.toLowerCase();
          bValue = b.name.toLowerCase();
      }

      if (queryParams.sort_order === "desc") {
        return aValue < bValue ? 1 : aValue > bValue ? -1 : 0;
      } else {
        return aValue > bValue ? 1 : aValue < bValue ? -1 : 0;
      }
    });

    // Calculate summary statistics
    const completedParticipants = participantResults.filter(
      (p) => p.overall_score !== null
    );
    const totalCompleted = completedParticipants.length;

    const scores = completedParticipants.map((p) => p.overall_score!);
    const averageScore =
      scores.length > 0
        ? Math.round(
            scores.reduce((sum, score) => sum + score, 0) / scores.length
          )
        : 0;

    const minScore = scores.length > 0 ? Math.min(...scores) : 0;
    const maxScore = scores.length > 0 ? Math.max(...scores) : 0;

    // Grade distribution
    const gradeDistribution = completedParticipants.reduce(
      (acc, participant) => {
        if (participant.overall_grade) {
          acc[participant.overall_grade] =
            (acc[participant.overall_grade] || 0) + 1;
        }
        return acc;
      },
      {} as Record<string, number>
    );

    // Completion rate average
    const completionRateAverage =
      participantResults.length > 0
        ? Math.round(
            participantResults.reduce((sum, p) => sum + p.completion_rate, 0) /
              participantResults.length
          )
        : 0;

    // Time efficiency average
    const timeEfficiencyAverage =
      participantResults.length > 0
        ? Math.round(
            participantResults.reduce(
              (sum, p) => sum + p.data_quality.time_efficiency,
              0
            ) / participantResults.length
          )
        : 0;

    // Build report data
    const reportData: BatchReportData = {
      session_info: {
        session_id: session.id,
        session_name: session.session_name,
        session_code: session.session_code,
        target_position: session.target_position,
        assessment_date: session.start_time.toISOString().split("T")[0],
        total_participants: participantResults.length,
      },
      participant_results: participantResults,
      summary_statistics: {
        total_completed: totalCompleted,
        average_score: averageScore,
        score_range: {
          min: minScore,
          max: maxScore,
        },
        grade_distribution: gradeDistribution,
        completion_rate_average: completionRateAverage,
        time_efficiency_average: timeEfficiencyAverage,
      },
      export_info: {
        format: queryParams.format,
        generated_at: new Date().toISOString(),
        generated_by: currentUser.name || currentUser.email,
        file_size_kb: Math.round(
          JSON.stringify(participantResults).length / 1024
        ),
        download_expires_at: new Date(
          Date.now() + REPORT_LIMITS.REPORT_EXPIRY_HOURS * 60 * 60 * 1000
        ).toISOString(),
      },
    };

    const response: GetBatchReportResponse = {
      success: true,
      message: `Batch results report for session "${session.session_name}" generated successfully`,
      data: reportData,
      timestamp: new Date().toISOString(),
    };

    return c.json(response, 200);
  } catch (error) {
    console.error("Error generating batch results report:", error);

    const errorResponse: ReportErrorResponse = {
      success: false,
      message: "Failed to generate batch results report",
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
