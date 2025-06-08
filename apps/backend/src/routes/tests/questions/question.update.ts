import { Context } from "hono";
import { eq, and, sql } from "drizzle-orm";
import { getDbFromEnv, tests, questions, isDatabaseConfigured } from "@/db";
import { getEnv, type CloudflareBindings } from "@/lib/env";
import {
  type UpdateQuestionRequest,
  type UpdateQuestionByIdRequest,
  type UpdateQuestionResponse,
  type QuestionErrorResponse,
  type UpdateQuestionDB,
  validateQuestionOptions,
  questionTypeRequiresOptions,
  getDefaultTimeLimitByQuestionType,
} from "shared-types";

export async function updateQuestionHandler(
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
    const { testId, questionId } = c.req.param() as UpdateQuestionByIdRequest;

    // Get validated data from request
    const data = (await c.req.json()) as UpdateQuestionRequest;

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
            message: "Only admin users can update questions",
            code: "ACCESS_DENIED",
          },
        ],
        timestamp: new Date().toISOString(),
      };
      return c.json(errorResponse, 403);
    }

    // Check if test exists and is not archived
    const [targetTest] = await db
      .select({
        id: tests.id,
        name: tests.name,
        category: tests.category,
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

    // Check if test is archived
    if (targetTest.status === "archived") {
      const errorResponse: QuestionErrorResponse = {
        success: false,
        message: "Cannot update questions in archived test",
        errors: [
          {
            field: "status",
            message: "Questions cannot be updated in archived tests",
            code: "TEST_ARCHIVED",
          },
        ],
        timestamp: new Date().toISOString(),
      };
      return c.json(errorResponse, 400);
    }

    // Check if question exists and belongs to the test
    const [existingQuestion] = await db
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
      .where(and(eq(questions.id, questionId), eq(questions.test_id, testId)))
      .limit(1);

    if (!existingQuestion) {
      const errorResponse: QuestionErrorResponse = {
        success: false,
        message: "Question not found",
        errors: [
          {
            field: "questionId",
            message: `Question with ID "${questionId}" not found in test "${targetTest.name}"`,
            code: "QUESTION_NOT_FOUND",
          },
        ],
        timestamp: new Date().toISOString(),
      };
      return c.json(errorResponse, 404);
    }

    // Validate question options if question_type is being updated or if options are provided
    const newQuestionType =
      data.question_type || existingQuestion.question_type;
    if (data.question_type || data.options !== undefined) {
      const newOptions =
        data.options !== undefined ? data.options : existingQuestion.options;

      if (questionTypeRequiresOptions(newQuestionType)) {
        if (
          !newOptions ||
          !validateQuestionOptions(newQuestionType, newOptions)
        ) {
          const errorResponse: QuestionErrorResponse = {
            success: false,
            message: "Invalid options for question type",
            errors: [
              {
                field: "options",
                message: `Question type '${newQuestionType}' requires valid options`,
                code: "INVALID_OPTIONS",
              },
            ],
            timestamp: new Date().toISOString(),
          };
          return c.json(errorResponse, 400);
        }
      }
    }

    // Check if sequence number already exists for this test (if sequence is being updated)
    if (data.sequence && data.sequence !== existingQuestion.sequence) {
      const [sequenceConflict] = await db
        .select({ id: questions.id, sequence: questions.sequence })
        .from(questions)
        .where(
          and(
            eq(questions.test_id, testId),
            eq(questions.sequence, data.sequence),
            sql`${questions.id} != ${questionId}` // Exclude current question
          )
        )
        .limit(1);

      if (sequenceConflict) {
        const errorResponse: QuestionErrorResponse = {
          success: false,
          message: "Sequence number already exists",
          errors: [
            {
              field: "sequence",
              message: `A question with sequence number ${data.sequence} already exists for this test`,
              code: "SEQUENCE_EXISTS",
            },
          ],
          timestamp: new Date().toISOString(),
        };
        return c.json(errorResponse, 409);
      }
    }

    // Prepare update data
    const updateData: UpdateQuestionDB = {
      updated_at: new Date(),
    };

    // Only update fields that are provided
    if (data.question !== undefined) {
      updateData.question = data.question;
    }
    if (data.question_type !== undefined) {
      updateData.question_type = data.question_type;
    }
    if (data.options !== undefined) {
      updateData.options = data.options;
    }
    if (data.correct_answer !== undefined) {
      updateData.correct_answer = data.correct_answer;
    }
    if (data.sequence !== undefined) {
      updateData.sequence = data.sequence;
    }
    if (data.time_limit !== undefined) {
      updateData.time_limit = data.time_limit;
    }
    if (data.image_url !== undefined) {
      updateData.image_url = data.image_url;
    }
    if (data.audio_url !== undefined) {
      updateData.audio_url = data.audio_url;
    }
    if (data.scoring_key !== undefined) {
      updateData.scoring_key = data.scoring_key;
    }
    if (data.is_required !== undefined) {
      updateData.is_required = data.is_required;
    }

    // Update question in database
    const [updatedQuestion] = await db
      .update(questions)
      .set(updateData)
      .where(eq(questions.id, questionId))
      .returning();

    if (!updatedQuestion) {
      const errorResponse: QuestionErrorResponse = {
        success: false,
        message: "Failed to update question",
        timestamp: new Date().toISOString(),
      };
      return c.json(errorResponse, 500);
    }

    // Prepare success response
    const responseData = {
      id: updatedQuestion.id,
      test_id: updatedQuestion.test_id,
      question: updatedQuestion.question,
      question_type: updatedQuestion.question_type,
      options: updatedQuestion.options,
      correct_answer: updatedQuestion.correct_answer,
      sequence: updatedQuestion.sequence,
      time_limit: updatedQuestion.time_limit,
      image_url: updatedQuestion.image_url,
      audio_url: updatedQuestion.audio_url,
      scoring_key: updatedQuestion.scoring_key,
      is_required: updatedQuestion.is_required ?? true,
      created_at: updatedQuestion.created_at,
      updated_at: updatedQuestion.updated_at,
    };

    const response: UpdateQuestionResponse = {
      success: true,
      message: `Question #${updatedQuestion.sequence} updated successfully in test '${targetTest.name}'`,
      data: responseData,
      timestamp: new Date().toISOString(),
    };

    console.log(
      `✅ Question updated by admin ${auth.user.email}: Sequence ${updatedQuestion.sequence} in test ${targetTest.name} (${targetTest.category})`
    );

    return c.json(response, 200);
  } catch (error) {
    console.error("Error updating question:", error);

    // Get environment for error handling
    const env = getEnv(c);

    // Handle specific database errors
    if (error instanceof Error) {
      // Handle unique constraint violations (sequence number)
      if (
        error.message.includes("unique constraint") ||
        error.message.includes("duplicate key")
      ) {
        const errorResponse: QuestionErrorResponse = {
          success: false,
          message: "Sequence number already exists",
          errors: [
            {
              field: "sequence",
              message: "A question with this sequence number already exists",
              code: "UNIQUE_CONSTRAINT",
            },
          ],
          timestamp: new Date().toISOString(),
        };
        return c.json(errorResponse, 409);
      }

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
          message: "Invalid ID format",
          errors: [
            {
              field: "id",
              message: "Test ID or Question ID must be a valid UUID",
              code: "INVALID_UUID",
            },
          ],
          timestamp: new Date().toISOString(),
        };
        return c.json(errorResponse, 400);
      }

      // Handle invalid JSON in options or scoring_key fields
      if (error.message.includes("JSON") || error.message.includes("json")) {
        const errorResponse: QuestionErrorResponse = {
          success: false,
          message: "Invalid JSON data in request",
          errors: [
            {
              message: "Options or scoring key contain invalid data",
              code: "INVALID_JSON",
            },
          ],
          timestamp: new Date().toISOString(),
        };
        return c.json(errorResponse, 400);
      }

      // Handle enum constraint violations (invalid question_type)
      if (error.message.includes("invalid input value for enum")) {
        const errorResponse: QuestionErrorResponse = {
          success: false,
          message: "Invalid question type",
          errors: [
            {
              field: "question_type",
              message: "Invalid question type provided",
              code: "INVALID_ENUM",
            },
          ],
          timestamp: new Date().toISOString(),
        };
        return c.json(errorResponse, 400);
      }

      // Handle check constraint violations
      if (error.message.includes("check constraint")) {
        const errorResponse: QuestionErrorResponse = {
          success: false,
          message: "Invalid data provided",
          errors: [
            {
              message: "Data violates database constraints",
              code: "CHECK_CONSTRAINT",
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
      message: "Internal server error",
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
