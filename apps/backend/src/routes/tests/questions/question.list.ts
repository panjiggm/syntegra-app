import { Context } from "hono";
import { eq, and, ilike, sql, asc, desc, gte, lte } from "drizzle-orm";
import { getDbFromEnv, tests, questions, isDatabaseConfigured } from "@/db";
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

    // Get database connection
    const env = getEnv(c);
    const db = getDbFromEnv(c.env);

    // Get authenticated admin user
    const auth = c.get("auth");
    if (!auth || auth.user.role !== "admin") {
      const errorResponse: QuestionErrorResponse = {
        success: false,
        message: "Access denied",
        errors: [
          {
            field: "authorization",
            message: "Only admin users can access questions",
            code: "ACCESS_DENIED",
          },
        ],
        timestamp: new Date().toISOString(),
      };
      return c.json(errorResponse, 403);
    }

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
    const page = queryParams.page || 1;
    const limit = queryParams.limit || 20;
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

    // Transform database results to response format
    const questionsData: QuestionData[] = questionsList.map((question) => ({
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
    }));

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

    const filters = {
      question_types: availableQuestionTypes.map((qt) => qt.question_type),
      time_limit_range: {
        min: timeLimitRange?.min || 0,
        max: timeLimitRange?.max || 0,
      },
    };

    // Build response
    const response: GetQuestionsResponse = {
      success: true,
      message: `${total} question(s) found for test '${targetTest.name}'`,
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
      timestamp: new Date().toISOString(),
    };

    console.log(
      `✅ Questions list retrieved for test ${targetTest.name} by admin: ${auth.user.email} (${total} questions, page ${page})`
    );

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
