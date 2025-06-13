import { Context } from "hono";
import { eq, and, ilike, sql, asc, desc, gte, lte } from "drizzle-orm";
import {
  getDbFromEnv,
  tests,
  questions,
  sessionModules,
  testSessions,
  isDatabaseConfigured,
} from "@/db";
import { getEnv, type CloudflareBindings } from "@/lib/env";
import {
  type GetQuestionsRequest,
  type GetQuestionsByTestIdRequest,
  type GetQuestionsResponse,
  type QuestionErrorResponse,
  type QuestionData,
  type QuestionPaginationMeta,
} from "shared-types";

export async function getQuestionsListHandler(
  c: Context<{ Bindings: CloudflareBindings }>
) {
  try {
    // Check if database is configured first
    if (!isDatabaseConfigured(c.env)) {
      const errorResponse: QuestionErrorResponse = {
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

    // Get path parameters (already validated by zValidator)
    const { testId } = c.req.param() as GetQuestionsByTestIdRequest;

    // Get query parameters (already validated by zValidator)
    const queryParams = c.req.query() as unknown as GetQuestionsRequest;

    // Parse and validate numeric parameters
    const page = parseInt(queryParams.page?.toString() || "1") || 1;
    const limit = parseInt(queryParams.limit?.toString() || "20") || 20;

    // Get database connection
    const db = getDbFromEnv(c.env);

    // Check if test exists
    const [targetTest] = await db
      .select({
        id: tests.id,
        name: tests.name,
        category: tests.category,
        module_type: tests.module_type,
        total_questions: tests.total_questions,
        status: tests.status,
      })
      .from(tests)
      .where(eq(tests.id, testId))
      .limit(1);

    if (!targetTest) {
      const errorResponse: QuestionErrorResponse = {
        success: false,
        message: "Test not found",
        errors: [
          {
            field: "testId",
            message: `Test with ID "${testId}" not found`,
            code: "TEST_NOT_FOUND",
          },
        ],
        timestamp: new Date().toISOString(),
      };
      return c.json(errorResponse, 404);
    }

    // **NEW: Get session constraints for this test**
    const sessionConstraints = await db
      .select({
        session_id: sessionModules.session_id,
        session_name: testSessions.session_name,
        session_code: testSessions.session_code,
        session_status: testSessions.status,
        start_time: testSessions.start_time,
        end_time: testSessions.end_time,
        forced_question_type: sessionModules.forced_question_type,
        uniform_question_settings: sessionModules.uniform_question_settings,
        sequence: sessionModules.sequence,
        is_required: sessionModules.is_required,
      })
      .from(sessionModules)
      .leftJoin(testSessions, eq(sessionModules.session_id, testSessions.id))
      .where(eq(sessionModules.test_id, testId))
      .orderBy(asc(testSessions.start_time));

    // **NEW: Get primary session constraint (most recent active/upcoming)**
    const activeConstraint = sessionConstraints.find(
      (constraint) =>
        constraint.session_status === "active" ||
        (constraint.session_status === "draft" &&
          new Date(constraint.start_time!) > new Date())
    );

    // Build where conditions
    const whereConditions = [eq(questions.test_id, testId)];

    // Add search filter
    if (queryParams.search) {
      whereConditions.push(
        ilike(questions.question, `%${queryParams.search}%`)
      );
    }

    // Add question type filter
    if (queryParams.question_type) {
      whereConditions.push(
        eq(questions.question_type, queryParams.question_type)
      );
    }

    // **NEW: Add session constraint filter**
    if (
      queryParams.session_compliant !== undefined &&
      activeConstraint?.forced_question_type
    ) {
      if (queryParams.session_compliant) {
        whereConditions.push(
          eq(questions.question_type, activeConstraint.forced_question_type)
        );
      } else {
        whereConditions.push(
          sql`${questions.question_type} != ${activeConstraint.forced_question_type}`
        );
      }
    }

    // Add required filter
    if (queryParams.is_required !== undefined) {
      whereConditions.push(eq(questions.is_required, queryParams.is_required));
    }

    // Add time limit range filters
    if (queryParams.time_limit_min !== undefined) {
      whereConditions.push(
        gte(questions.time_limit, queryParams.time_limit_min)
      );
    }
    if (queryParams.time_limit_max !== undefined) {
      whereConditions.push(
        lte(questions.time_limit, queryParams.time_limit_max)
      );
    }

    // Add image/audio filters
    if (queryParams.has_image !== undefined) {
      if (queryParams.has_image) {
        whereConditions.push(sql`${questions.image_url} IS NOT NULL`);
      } else {
        whereConditions.push(sql`${questions.image_url} IS NULL`);
      }
    }

    if (queryParams.has_audio !== undefined) {
      if (queryParams.has_audio) {
        whereConditions.push(sql`${questions.audio_url} IS NOT NULL`);
      } else {
        whereConditions.push(sql`${questions.audio_url} IS NULL`);
      }
    }

    // Build order clause
    const orderColumn = (() => {
      switch (queryParams.sort_by) {
        case "sequence":
          return questions.sequence;
        case "question_type":
          return questions.question_type;
        case "time_limit":
          return questions.time_limit;
        case "created_at":
          return questions.created_at;
        case "updated_at":
          return questions.updated_at;
        default:
          return questions.sequence;
      }
    })();

    const orderDirection = queryParams.sort_order === "desc" ? desc : asc;

    // Calculate pagination
    const offset = (page - 1) * limit;

    // Get total count for pagination
    const [totalCount] = await db
      .select({
        count: sql<number>`count(*)`,
      })
      .from(questions)
      .where(and(...whereConditions));

    const total = totalCount?.count || 0;
    const totalPages = Math.ceil(total / limit);

    // Get questions with pagination
    const questionsList = await db
      .select({
        id: questions.id,
        test_id: questions.test_id,
        question: questions.question,
        question_type: questions.question_type,
        options: questions.options,
        correct_answer: questions.correct_answer,
        sequence: questions.sequence,
        time_limit: questions.time_limit,
        image_url: questions.image_url,
        audio_url: questions.audio_url,
        scoring_key: questions.scoring_key,
        is_required: questions.is_required,
        created_at: questions.created_at,
        updated_at: questions.updated_at,
      })
      .from(questions)
      .where(and(...whereConditions))
      .orderBy(orderDirection(orderColumn))
      .limit(limit)
      .offset(offset);

    // **NEW: Helper function to check constraint compliance**
    const checkConstraintCompliance = (question: any) => {
      if (!activeConstraint?.forced_question_type) {
        return { is_compliant: true, issues: [] };
      }

      const issues: string[] = [];
      let is_compliant = true;

      // Check question type
      if (question.question_type !== activeConstraint.forced_question_type) {
        is_compliant = false;
        issues.push(
          `Expected ${activeConstraint.forced_question_type}, got ${question.question_type}`
        );
      }

      // Check uniform settings if applicable
      if (
        activeConstraint.uniform_question_settings &&
        question.question_type === activeConstraint.forced_question_type
      ) {
        const settings = activeConstraint.uniform_question_settings as any;

        switch (question.question_type) {
          case "multiple_choice":
            if (settings.options_count && question.options) {
              const optionCount = Array.isArray(question.options)
                ? question.options.length
                : 0;
              if (optionCount !== settings.options_count) {
                is_compliant = false;
                issues.push(
                  `Expected ${settings.options_count} options, has ${optionCount}`
                );
              }
            }
            break;

          case "text":
            if (
              settings.text_max_length &&
              question.question.length > settings.text_max_length
            ) {
              is_compliant = false;
              issues.push(
                `Text exceeds ${settings.text_max_length} character limit`
              );
            }
            break;

          case "rating_scale":
            if (settings.rating_scale_max && question.options) {
              const maxRating = Array.isArray(question.options)
                ? Math.max(
                    ...question.options.map(
                      (opt: any) => parseInt(opt.value) || 0
                    )
                  )
                : 0;
              if (maxRating !== settings.rating_scale_max) {
                is_compliant = false;
                issues.push(
                  `Expected max rating ${settings.rating_scale_max}, has ${maxRating}`
                );
              }
            }
            break;
        }
      }

      return { is_compliant, issues };
    };

    // **NEW: Transform database results with constraint compliance**
    const questionsData: QuestionData[] = questionsList.map((question) => {
      const compliance = checkConstraintCompliance(question);

      return {
        id: question.id,
        test_id: question.test_id,
        question: question.question,
        question_type: question.question_type,
        options: question.options,
        correct_answer: question.correct_answer,
        sequence: question.sequence,
        time_limit: question.time_limit,
        image_url: question.image_url,
        audio_url: question.audio_url,
        scoring_key: question.scoring_key,
        is_required: question.is_required ?? true,
        created_at: question.created_at,
        updated_at: question.updated_at,
        // **NEW: Add constraint compliance info**
        session_compliance: {
          is_compliant: compliance.is_compliant,
          issues: compliance.issues,
          applicable_constraint: activeConstraint
            ? {
                session_name: activeConstraint.session_name,
                session_status: activeConstraint.session_status,
                forced_question_type: activeConstraint.forced_question_type,
              }
            : null,
        },
      };
    });

    // Build pagination metadata
    const paginationMeta: QuestionPaginationMeta = {
      current_page: page,
      per_page: limit,
      total,
      total_pages: totalPages,
      has_next_page: page < totalPages,
      has_prev_page: page > 1,
    };

    // Get available filter options for frontend
    const availableQuestionTypes = await db
      .selectDistinct({
        question_type: questions.question_type,
      })
      .from(questions)
      .where(eq(questions.test_id, testId));

    const [timeLimitRange] = await db
      .select({
        min: sql<number>`MIN(${questions.time_limit})`,
        max: sql<number>`MAX(${questions.time_limit})`,
      })
      .from(questions)
      .where(
        and(
          eq(questions.test_id, testId),
          sql`${questions.time_limit} IS NOT NULL`
        )
      );

    // **NEW: Calculate constraint compliance statistics**
    const complianceStats = activeConstraint
      ? {
          total_questions: questionsList.length,
          compliant_questions: questionsData.filter(
            (q) => q.session_compliance.is_compliant
          ).length,
          non_compliant_questions: questionsData.filter(
            (q) => !q.session_compliance.is_compliant
          ).length,
          compliance_percentage:
            questionsList.length > 0
              ? Math.round(
                  (questionsData.filter(
                    (q) => q.session_compliance.is_compliant
                  ).length /
                    questionsList.length) *
                    100
                )
              : 100,
        }
      : null;

    const filters = {
      question_types: availableQuestionTypes.map((qt) => qt.question_type),
      time_limit_range: {
        min: timeLimitRange?.min || 0,
        max: timeLimitRange?.max || 0,
      },
      // **NEW: Add constraint-specific filters**
      session_constraints: sessionConstraints.map((constraint) => ({
        session_name: constraint.session_name,
        session_code: constraint.session_code,
        session_status: constraint.session_status,
        forced_question_type: constraint.forced_question_type,
        uniform_question_settings: constraint.uniform_question_settings,
      })),
    };

    // Build response
    const response: GetQuestionsResponse = {
      success: true,
      message: `${total} question(s) found for test '${targetTest.name}'${activeConstraint ? ` (Session: ${activeConstraint.session_name})` : ""}`,
      data: questionsData,
      meta: paginationMeta,
      test_info: {
        id: targetTest.id,
        name: targetTest.name,
        category: targetTest.category,
        module_type: targetTest.module_type,
        total_questions: targetTest.total_questions || 0,
      },
      filters,
      session_constraints: {
        active_constraint: activeConstraint
          ? {
              session_name: activeConstraint.session_name,
              session_code: activeConstraint.session_code,
              session_status: activeConstraint.session_status,
              start_time: activeConstraint.start_time?.toISOString() ?? null,
              end_time: activeConstraint.end_time?.toISOString() ?? null,
              forced_question_type: activeConstraint.forced_question_type,
              uniform_question_settings:
                activeConstraint.uniform_question_settings,
            }
          : null,
        all_constraints: sessionConstraints.map((constraint) => ({
          session_name: constraint.session_name,
          session_code: constraint.session_code,
          session_status: constraint.session_status,
          forced_question_type: constraint.forced_question_type,
          uniform_question_settings: constraint.uniform_question_settings,
        })),
        compliance_stats: complianceStats,
      },
      timestamp: new Date().toISOString(),
    };

    return c.json(response, 200);
  } catch (error) {
    console.error("Error getting questions list:", error);

    // Get environment for error handling
    const env = getEnv(c);

    // Handle specific database errors
    if (error instanceof Error) {
      // Handle database connection errors
      if (
        error.message.includes("database") ||
        error.message.includes("connection")
      ) {
        const errorResponse: QuestionErrorResponse = {
          success: false,
          message: "Database connection error",
          timestamp: new Date().toISOString(),
        };
        return c.json(errorResponse, 503);
      }

      // Handle invalid UUID errors
      if (error.message.includes("invalid input syntax for type uuid")) {
        const errorResponse: QuestionErrorResponse = {
          success: false,
          message: "Invalid test ID format",
          errors: [
            {
              field: "testId",
              message: "Test ID must be a valid UUID",
              code: "INVALID_UUID",
            },
          ],
          timestamp: new Date().toISOString(),
        };
        return c.json(errorResponse, 400);
      }

      // Handle SQL syntax errors
      if (error.message.includes("syntax error")) {
        const errorResponse: QuestionErrorResponse = {
          success: false,
          message: "Invalid query parameters",
          errors: [
            {
              message: "One or more query parameters contain invalid values",
              code: "INVALID_QUERY",
            },
          ],
          timestamp: new Date().toISOString(),
        };
        return c.json(errorResponse, 400);
      }
    }

    // Generic error response
    const errorResponse: QuestionErrorResponse = {
      success: false,
      message: "Failed to retrieve questions",
      ...(env.NODE_ENV === "development" && {
        errors: [
          {
            message: error instanceof Error ? error.message : "Unknown error",
            code: "INTERNAL_ERROR",
          },
        ],
      }),
      timestamp: new Date().toISOString(),
    };

    return c.json(errorResponse, 500);
  }
}
