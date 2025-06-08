import { Context } from "hono";
import { eq } from "drizzle-orm";
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
  type GetResultReportResponse,
  type TestResultErrorResponse,
  type GetResultReportQuery,
  type ReportFormat,
} from "shared-types";

export async function generateResultReportHandler(
  c: Context<{ Bindings: CloudflareBindings; Variables: { user: any } }>
): Promise<Response> {
  try {
    const db = getDbFromEnv(c.env);
    const auth = c.get("auth");
    const currentUser = auth.user;
    const { resultId } = c.req.param();
    const rawQuery = c.req.query();

    const queryParams: GetResultReportQuery = {
      format: (rawQuery.format as ReportFormat) || "html",
      language: (rawQuery.language as "id" | "en") || "id",
      include_charts: rawQuery.include_charts !== "false", // Default true
      include_recommendations: rawQuery.include_recommendations !== "false", // Default true
      include_detailed_analysis: rawQuery.include_detailed_analysis !== "false", // Default true
      include_trait_explanations:
        rawQuery.include_trait_explanations !== "false", // Default true
      template:
        (rawQuery.template as "standard" | "detailed" | "summary") ||
        "standard",
    };

    // Get result with related data
    const resultQuery = await db
      .select({
        result: testResults,
        user: {
          id: users.id,
          name: users.name,
          email: users.email,
          nik: users.nik,
        },
        test: tests,
        attempt: testAttempts,
        session: testSessions,
      })
      .from(testResults)
      .leftJoin(users, eq(testResults.user_id, users.id))
      .leftJoin(tests, eq(testResults.test_id, tests.id))
      .leftJoin(testAttempts, eq(testResults.attempt_id, testAttempts.id))
      .leftJoin(testSessions, eq(testAttempts.session_test_id, testSessions.id))
      .where(eq(testResults.id, resultId))
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

    const { result, user, test, attempt, session } = resultQuery[0];

    if (!user || !test || !attempt) {
      const errorResponse: TestResultErrorResponse = {
        success: false,
        message: "Missing required data",
        errors: [
          {
            field: "data_integrity",
            message: "User, test, or attempt data is missing",
            code: "DATA_INTEGRITY_ERROR",
          },
        ],
        timestamp: new Date().toISOString(),
      };
      return c.json(errorResponse, 500);
    }

    // Authorization check - participants can only view their own reports, admins can view all
    if (
      currentUser.role === "participant" &&
      result.user_id !== currentUser.id
    ) {
      const errorResponse: TestResultErrorResponse = {
        success: false,
        message: "Access denied",
        errors: [
          {
            field: "report_access",
            message: "You can only view your own test reports",
            code: "FORBIDDEN",
          },
        ],
        timestamp: new Date().toISOString(),
      };
      return c.json(errorResponse, 403);
    }

    // Parse traits and detailed analysis
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

    let parsedDetailedAnalysis = null;
    if (result.detailed_analysis && queryParams.include_detailed_analysis) {
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

    // Generate report content based on language and template
    const content = generateReportContent(
      {
        result,
        user,
        test,
        attempt,
        session,
        traits: parsedTraits,
        detailedAnalysis: parsedDetailedAnalysis,
      },
      queryParams
    );

    // Generate charts data if requested
    let chartsData = null;
    if (queryParams.include_charts) {
      chartsData = generateChartsData(parsedTraits, result, test);
    }

    // Generate trait explanations if requested
    let traitExplanations = null;
    if (queryParams.include_trait_explanations && parsedTraits) {
      traitExplanations = generateTraitExplanations(
        parsedTraits,
        queryParams.language
      );
    }

    // Build result data
    const testResultData = {
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
      completion_percentage: parseFloat(result.completion_percentage || "0"),
      calculated_at: result.calculated_at,
      created_at: result.created_at,
      updated_at: result.updated_at,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        nik: user.nik || "",
      },
      test: {
        id: test.id,
        name: test.name,
        category: test.category,
        module_type: test.module_type,
        time_limit: test.time_limit || 0,
        total_questions: test.total_questions || 0,
        passing_score: test.passing_score
          ? parseFloat(test.passing_score)
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

    // For PDF format, you would typically generate a file and return URL
    // For now, we'll return the content that can be used to generate PDF client-side
    let fileUrl = null;
    if (queryParams.format === "pdf") {
      // In a real implementation, you would:
      // 1. Generate PDF using a library like puppeteer, jsPDF, or similar
      // 2. Upload to cloud storage (Cloudflare R2, AWS S3, etc.)
      // 3. Return the download URL
      fileUrl = `/api/v1/results/${resultId}/report/download?format=pdf&token=${generateTempToken()}`;
    }

    const reportData = {
      result: testResultData,
      report_metadata: {
        generated_at: new Date(),
        format: queryParams.format,
        language: queryParams.language,
        template: queryParams.template,
        version: "1.0",
      },
      content: {
        summary: content.summary,
        detailed_analysis: queryParams.include_detailed_analysis
          ? content.detailedAnalysis
          : undefined,
        trait_explanations: traitExplanations || undefined,
        recommendations: queryParams.include_recommendations
          ? content.recommendations
          : undefined,
        charts_data: chartsData || undefined,
      },
      file_url: fileUrl || undefined,
    };

    const response: GetResultReportResponse = {
      success: true,
      message: "Test result report generated successfully",
      data: reportData,
      timestamp: new Date().toISOString(),
    };

    return c.json(response, 200);
  } catch (error) {
    console.error("Error generating test result report:", error);

    const errorResponse: TestResultErrorResponse = {
      success: false,
      message: "Failed to generate test result report",
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

// Helper function to generate report content
function generateReportContent(
  data: {
    result: any;
    user: any;
    test: any;
    attempt: any;
    session: any;
    traits: any;
    detailedAnalysis: any;
  },
  params: GetResultReportQuery
) {
  const { result, user, test, attempt, traits, detailedAnalysis } = data;
  const isIndonesian = params.language === "id";

  // Generate summary
  const summary = isIndonesian
    ? generateIndonesianSummary(result, user, test, attempt)
    : generateEnglishSummary(result, user, test, attempt);

  // Generate detailed analysis
  let detailedAnalysisText = "";
  if (params.include_detailed_analysis && detailedAnalysis) {
    detailedAnalysisText = isIndonesian
      ? generateIndonesianDetailedAnalysis(detailedAnalysis, test)
      : generateEnglishDetailedAnalysis(detailedAnalysis, test);
  }

  // Generate recommendations
  const recommendations = isIndonesian
    ? generateIndonesianRecommendations(result, test, traits)
    : generateEnglishRecommendations(result, test, traits);

  return {
    summary,
    detailedAnalysis: detailedAnalysisText,
    recommendations: recommendations.split("\n").filter((r) => r.trim()),
  };
}

// Helper functions for Indonesian content
function generateIndonesianSummary(
  result: any,
  user: any,
  test: any,
  attempt: any
): string {
  const score = result.scaled_score ? parseFloat(result.scaled_score) : 0;
  const grade = result.grade || "N/A";
  const status = result.is_passed ? "LULUS" : "TIDAK LULUS";
  const completion = parseFloat(result.completion_percentage || "0");

  return `
    Laporan Hasil Tes Psikologi
    
    Peserta: ${user.name} (${user.nik})
    Tes: ${test.name} (${test.category.toUpperCase()})
    Tanggal: ${new Date(attempt.start_time).toLocaleDateString("id-ID")}
    
    HASIL:
    - Skor: ${Math.round(score)}/100
    - Grade: ${grade}
    - Status: ${status}
    - Tingkat Penyelesaian: ${Math.round(completion)}%
    
    ${result.description || "Tes telah diselesaikan dengan baik."}
  `;
}

function generateIndonesianDetailedAnalysis(analysis: any, test: any): string {
  const accuracy = analysis.accuracy_rate || 0;
  const efficiency = analysis.time_efficiency || 0;

  return `
    ANALISIS DETAIL:
    
    Metode Perhitungan: ${analysis.calculation_method || "Standard"}
    Total Soal: ${analysis.total_questions || 0}
    Soal Dijawab: ${analysis.answered_questions || 0}
    Jawaban Benar: ${analysis.correct_answers || 0}
    Tingkat Akurasi: ${Math.round(accuracy)}%
    Efisiensi Waktu: ${Math.round(efficiency)}%
    
    Berdasarkan hasil analisis, peserta menunjukkan ${
      accuracy >= 80
        ? "tingkat akurasi yang sangat baik"
        : accuracy >= 60
          ? "tingkat akurasi yang cukup baik"
          : "tingkat akurasi yang perlu ditingkatkan"
    } dalam mengerjakan tes ${test.name}.
  `;
}

function generateIndonesianRecommendations(
  result: any,
  test: any,
  traits: any
): string {
  let recommendations = result.recommendations || "";

  if (traits && traits.length > 0) {
    recommendations += "\n\nRekomendasi berdasarkan profil kepribadian:\n";
    traits.forEach((trait: any) => {
      if (trait.score >= 80) {
        recommendations += `- ${trait.name}: Kekuatan utama yang dapat dimaksimalkan\n`;
      } else if (trait.score <= 40) {
        recommendations += `- ${trait.name}: Area yang perlu pengembangan\n`;
      }
    });
  }

  return recommendations;
}

// Helper functions for English content
function generateEnglishSummary(
  result: any,
  user: any,
  test: any,
  attempt: any
): string {
  const score = result.scaled_score ? parseFloat(result.scaled_score) : 0;
  const grade = result.grade || "N/A";
  const status = result.is_passed ? "PASSED" : "FAILED";
  const completion = parseFloat(result.completion_percentage || "0");

  return `
    Psychological Test Result Report
    
    Participant: ${user.name} (${user.nik})
    Test: ${test.name} (${test.category.toUpperCase()})
    Date: ${new Date(attempt.start_time).toLocaleDateString("en-US")}
    
    RESULTS:
    - Score: ${Math.round(score)}/100
    - Grade: ${grade}
    - Status: ${status}
    - Completion Rate: ${Math.round(completion)}%
    
    ${result.description || "Test completed successfully."}
  `;
}

function generateEnglishDetailedAnalysis(analysis: any, test: any): string {
  const accuracy = analysis.accuracy_rate || 0;
  const efficiency = analysis.time_efficiency || 0;

  return `
    DETAILED ANALYSIS:
    
    Calculation Method: ${analysis.calculation_method || "Standard"}
    Total Questions: ${analysis.total_questions || 0}
    Questions Answered: ${analysis.answered_questions || 0}
    Correct Answers: ${analysis.correct_answers || 0}
    Accuracy Rate: ${Math.round(accuracy)}%
    Time Efficiency: ${Math.round(efficiency)}%
    
    Based on the analysis, the participant demonstrates ${
      accuracy >= 80
        ? "excellent accuracy"
        : accuracy >= 60
          ? "good accuracy"
          : "accuracy that needs improvement"
    } in completing the ${test.name} test.
  `;
}

function generateEnglishRecommendations(
  result: any,
  test: any,
  traits: any
): string {
  let recommendations = result.recommendations || "";

  if (traits && traits.length > 0) {
    recommendations += "\n\nRecommendations based on personality profile:\n";
    traits.forEach((trait: any) => {
      if (trait.score >= 80) {
        recommendations += `- ${trait.name}: Key strength that can be maximized\n`;
      } else if (trait.score <= 40) {
        recommendations += `- ${trait.name}: Area for development\n`;
      }
    });
  }

  return recommendations;
}

// Helper function to generate charts data
function generateChartsData(traits: any, result: any, test: any) {
  if (!traits) return null;

  return {
    personality_radar: {
      labels: traits.map((t: any) => t.name),
      data: traits.map((t: any) => t.score),
      backgroundColor: "rgba(54, 162, 235, 0.2)",
      borderColor: "rgba(54, 162, 235, 1)",
    },
    score_gauge: {
      value: result.scaled_score ? parseFloat(result.scaled_score) : 0,
      max: 100,
      label: test.name,
    },
    percentile_bar: {
      percentile: result.percentile ? parseFloat(result.percentile) : 0,
      grade: result.grade,
    },
  };
}

// Helper function to generate trait explanations
function generateTraitExplanations(traits: any, language: string) {
  if (!traits || !Array.isArray(traits)) return null;

  const isIndonesian = language === "id";

  return traits.map((trait: any) => ({
    trait_name: trait.name,
    explanation: isIndonesian
      ? getIndonesianTraitExplanation(trait.name, trait.category)
      : getEnglishTraitExplanation(trait.name, trait.category),
    score_interpretation: isIndonesian
      ? getIndonesianScoreInterpretation(trait.score)
      : getEnglishScoreInterpretation(trait.score),
  }));
}

function getIndonesianTraitExplanation(
  traitName: string,
  category: string
): string {
  // Simplified trait explanations
  const explanations: Record<string, string> = {
    Extraversion:
      "Kecenderungan untuk bersikap terbuka dan energik dalam interaksi sosial",
    Openness: "Keterbukaan terhadap pengalaman baru dan ide-ide kreatif",
    Conscientiousness:
      "Tingkat kedisiplinan dan tanggung jawab dalam menjalankan tugas",
    // Add more trait explanations
  };

  return (
    explanations[traitName] || `Aspek ${traitName} dalam kategori ${category}`
  );
}

function getEnglishTraitExplanation(
  traitName: string,
  category: string
): string {
  const explanations: Record<string, string> = {
    Extraversion:
      "Tendency to be outgoing and energetic in social interactions",
    Openness: "Openness to new experiences and creative ideas",
    Conscientiousness:
      "Level of discipline and responsibility in task execution",
    // Add more trait explanations
  };

  return (
    explanations[traitName] || `${traitName} aspect in ${category} category`
  );
}

function getIndonesianScoreInterpretation(score: number): string {
  if (score >= 80)
    return "Sangat Tinggi - Menunjukkan karakteristik yang sangat kuat";
  if (score >= 60) return "Tinggi - Menunjukkan karakteristik yang jelas";
  if (score >= 40) return "Sedang - Menunjukkan karakteristik yang seimbang";
  if (score >= 20) return "Rendah - Menunjukkan karakteristik yang terbatas";
  return "Sangat Rendah - Menunjukkan karakteristik yang minimal";
}

function getEnglishScoreInterpretation(score: number): string {
  if (score >= 80) return "Very High - Shows very strong characteristics";
  if (score >= 60) return "High - Shows clear characteristics";
  if (score >= 40) return "Moderate - Shows balanced characteristics";
  if (score >= 20) return "Low - Shows limited characteristics";
  return "Very Low - Shows minimal characteristics";
}

// Helper function to generate temporary token for file downloads
function generateTempToken(): string {
  return (
    Math.random().toString(36).substring(2, 15) +
    Math.random().toString(36).substring(2, 15)
  );
}
