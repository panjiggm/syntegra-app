import { Context } from "hono";
import { eq, and, sql, gt, gte, lt, lte } from "drizzle-orm";
import { getDbFromEnv, tests, questions, isDatabaseConfigured } from "@/db";
import { getEnv, type CloudflareBindings } from "@/lib/env";
import {
  type UpdateQuestionSequenceByIdRequest,
  type UpdateQuestionSequenceRequest,
  type UpdateQuestionSequenceResponse,
  type QuestionErrorResponse,
} from "shared-types";

export async function updateQuestionSequenceHandler(
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

    // Get path parameters and body data
    const { testId, questionId } =
      c.req.param() as UpdateQuestionSequenceByIdRequest;
    const { sequence: newSequence } =
      (await c.req.json()) as UpdateQuestionSequenceRequest;

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
            message: "Only admin users can update question sequence",
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
        status: tests.status,
        total_questions: tests.total_questions,
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
        message: "Cannot update sequence for archived test",
        errors: [
          {
            field: "status",
            message: "Question sequences cannot be updated for archived tests",
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
        sequence: questions.sequence,
        question_type: questions.question_type,
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

    const oldSequence = existingQuestion.sequence;

    // Check if the sequence is already the same
    if (oldSequence === newSequence) {
      const response: UpdateQuestionSequenceResponse = {
        success: true,
        message: `Question sequence is already ${newSequence}`,
        data: {
          id: existingQuestion.id,
          test_id: existingQuestion.test_id,
          question: existingQuestion.question,
          old_sequence: oldSequence,
          new_sequence: newSequence,
          updated_at: new Date(),
        },
        timestamp: new Date().toISOString(),
      };

      return c.json(response, 200);
    }

    // Get the current max sequence for the test
    const [maxSequenceResult] = await db
      .select({
        max_sequence: sql<number>`COALESCE(MAX(${questions.sequence}), 0)`,
      })
      .from(questions)
      .where(eq(questions.test_id, testId));

    const maxSequence = maxSequenceResult?.max_sequence || 0;

    // Validate new sequence doesn't exceed reasonable bounds
    if (newSequence > maxSequence + 1) {
      const errorResponse: QuestionErrorResponse = {
        success: false,
        message: "Invalid sequence number",
        errors: [
          {
            field: "sequence",
            message: `Sequence cannot be greater than ${maxSequence + 1}. Current maximum sequence is ${maxSequence}.`,
            code: "INVALID_SEQUENCE",
          },
        ],
        timestamp: new Date().toISOString(),
      };
      return c.json(errorResponse, 400);
    }

    // Start transaction-like operations
    const updatedAt = new Date();
    const conflictingQuestions: Array<{
      question_id: string;
      question: string;
      old_sequence: number;
      new_sequence: number;
    }> = [];

    try {
      // Check if the new sequence is already taken by another question
      const [conflictingQuestion] = await db
        .select({
          id: questions.id,
          question: questions.question,
          sequence: questions.sequence,
        })
        .from(questions)
        .where(
          and(
            eq(questions.test_id, testId),
            eq(questions.sequence, newSequence),
            sql`${questions.id} != ${questionId}` // Exclude the current question
          )
        )
        .limit(1);

      if (conflictingQuestion) {
        // Handle sequence conflict by shifting other questions
        if (newSequence > oldSequence) {
          // Moving question down: shift questions between oldSequence+1 and newSequence up by 1
          const questionsToShift = await db
            .select({
              id: questions.id,
              question: questions.question,
              sequence: questions.sequence,
            })
            .from(questions)
            .where(
              and(
                eq(questions.test_id, testId),
                gt(questions.sequence, oldSequence),
                lte(questions.sequence, newSequence),
                sql`${questions.id} != ${questionId}`
              )
            );

          // Shift questions up
          for (const questionToShift of questionsToShift) {
            const newSeq = questionToShift.sequence - 1;
            await db
              .update(questions)
              .set({
                sequence: newSeq,
                updated_at: updatedAt,
              })
              .where(eq(questions.id, questionToShift.id));

            conflictingQuestions.push({
              question_id: questionToShift.id,
              question: questionToShift.question,
              old_sequence: questionToShift.sequence,
              new_sequence: newSeq,
            });
          }
        } else {
          // Moving question up: shift questions between newSequence and oldSequence-1 down by 1
          const questionsToShift = await db
            .select({
              id: questions.id,
              question: questions.question,
              sequence: questions.sequence,
            })
            .from(questions)
            .where(
              and(
                eq(questions.test_id, testId),
                gte(questions.sequence, newSequence),
                lt(questions.sequence, oldSequence),
                sql`${questions.id} != ${questionId}`
              )
            );

          // Shift questions down
          for (const questionToShift of questionsToShift) {
            const newSeq = questionToShift.sequence + 1;
            await db
              .update(questions)
              .set({
                sequence: newSeq,
                updated_at: updatedAt,
              })
              .where(eq(questions.id, questionToShift.id));

            conflictingQuestions.push({
              question_id: questionToShift.id,
              question: questionToShift.question,
              old_sequence: questionToShift.sequence,
              new_sequence: newSeq,
            });
          }
        }
      }

      // Update the target question with new sequence
      const [updatedQuestion] = await db
        .update(questions)
        .set({
          sequence: newSequence,
          updated_at: updatedAt,
        })
        .where(eq(questions.id, questionId))
        .returning({
          id: questions.id,
          test_id: questions.test_id,
          question: questions.question,
          sequence: questions.sequence,
          updated_at: questions.updated_at,
        });

      if (!updatedQuestion) {
        const errorResponse: QuestionErrorResponse = {
          success: false,
          message: "Failed to update question sequence",
          timestamp: new Date().toISOString(),
        };
        return c.json(errorResponse, 500);
      }

      // Update test's updated_at timestamp
      await db
        .update(tests)
        .set({
          updated_at: updatedAt,
          updated_by: auth.user.id,
        })
        .where(eq(tests.id, testId));

      // Prepare success response
      const response: UpdateQuestionSequenceResponse = {
        success: true,
        message: `Question sequence updated from ${oldSequence} to ${newSequence} in test '${targetTest.name}'${
          conflictingQuestions.length > 0
            ? ` (${conflictingQuestions.length} other question(s) automatically adjusted)`
            : ""
        }`,
        data: {
          id: updatedQuestion.id,
          test_id: updatedQuestion.test_id,
          question: updatedQuestion.question,
          old_sequence: oldSequence,
          new_sequence: updatedQuestion.sequence,
          updated_at: updatedQuestion.updated_at,
        },
        ...(conflictingQuestions.length > 0 && {
          conflicts: conflictingQuestions,
        }),
        timestamp: new Date().toISOString(),
      };

      console.log(
        `✅ Question sequence updated by admin ${auth.user.email}: "${existingQuestion.question.substring(0, 50)}..." from sequence ${oldSequence} to ${newSequence} in test ${targetTest.name}${
          conflictingQuestions.length > 0
            ? ` (${conflictingQuestions.length} conflicts resolved)`
            : ""
        }`
      );

      return c.json(response, 200);
    } catch (dbError) {
      console.error("Database transaction error:", dbError);
      throw dbError; // Re-throw to be handled by the outer catch block
    }
  } catch (error) {
    console.error("Error updating question sequence:", error);

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

      // Handle unique constraint violations (sequence conflicts)
      if (
        error.message.includes("unique constraint") ||
        error.message.includes("duplicate key")
      ) {
        const errorResponse: QuestionErrorResponse = {
          success: false,
          message: "Sequence conflict detected",
          errors: [
            {
              field: "sequence",
              message:
                "Another question already has this sequence number. Please try again.",
              code: "SEQUENCE_CONFLICT",
            },
          ],
          timestamp: new Date().toISOString(),
        };
        return c.json(errorResponse, 409);
      }

      // Handle transaction errors
      if (error.message.includes("transaction")) {
        const errorResponse: QuestionErrorResponse = {
          success: false,
          message: "Database transaction failed",
          errors: [
            {
              message: "Failed to complete sequence update transaction",
              code: "TRANSACTION_ERROR",
            },
          ],
          timestamp: new Date().toISOString(),
        };
        return c.json(errorResponse, 500);
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
