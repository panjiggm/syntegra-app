import { Context } from "hono";
import { eq, and } from "drizzle-orm";
import {
  getDbFromEnv,
  userAnswers,
  testAttempts,
  tests,
  questions,
} from "@/db";
import { type CloudflareBindings } from "@/lib/env";
import {
  type AutoSaveAnswerRequest,
  type AutoSaveAnswerResponse,
  type AnswerErrorResponse,
  validateAnswerByQuestionType,
  canModifyAnswer,
} from "shared-types";

export async function autoSaveAnswerHandler(
  c: Context<{ Bindings: CloudflareBindings; Variables: { user: any } }>
): Promise<Response> {
  try {
    const db = getDbFromEnv(c.env);
    const auth = c.get("auth");
    const user = auth.user;
    const { attemptId } = c.req.param();
    const requestData: AutoSaveAnswerRequest = await c.req.json();

    // Get attempt with related test data
    const attemptResult = await db
      .select({
        attempt: testAttempts,
        test: tests,
      })
      .from(testAttempts)
      .leftJoin(tests, eq(testAttempts.test_id, tests.id))
      .where(
        and(
          eq(testAttempts.id, attemptId),
          eq(testAttempts.user_id, user.id) // Ensure user can only auto-save to their own attempts
        )
      )
      .limit(1);

    if (attemptResult.length === 0) {
      const errorResponse: AnswerErrorResponse = {
        success: false,
        message: "Test attempt not found",
        errors: [
          {
            field: "attempt_id",
            message:
              "Test attempt with the provided ID does not exist or you don't have access to it",
            code: "NOT_FOUND",
          },
        ],
        timestamp: new Date().toISOString(),
      };
      return c.json(errorResponse, 404);
    }

    const { attempt, test } = attemptResult[0];

    if (!test) {
      const errorResponse: AnswerErrorResponse = {
        success: false,
        message: "Associated test not found",
        errors: [
          {
            field: "test_data",
            message: "Test data is missing",
            code: "DATA_INTEGRITY_ERROR",
          },
        ],
        timestamp: new Date().toISOString(),
      };
      return c.json(errorResponse, 500);
    }

    // Check if answer can be modified
    const canModify = canModifyAnswer(attempt.status, attempt.end_time);

    if (!canModify) {
      const errorResponse: AnswerErrorResponse = {
        success: false,
        message: "Cannot auto-save answer to completed or expired attempt",
        errors: [
          {
            field: "attempt_status",
            message:
              "This attempt is no longer active and cannot accept answers",
            code: "ATTEMPT_NOT_ACTIVE",
          },
        ],
        timestamp: new Date().toISOString(),
      };
      return c.json(errorResponse, 400);
    }

    // Get question details
    const questionResult = await db
      .select()
      .from(questions)
      .where(
        and(
          eq(questions.id, requestData.question_id),
          eq(questions.test_id, test.id) // Ensure question belongs to the test
        )
      )
      .limit(1);

    if (questionResult.length === 0) {
      const errorResponse: AnswerErrorResponse = {
        success: false,
        message: "Question not found",
        errors: [
          {
            field: "question_id",
            message: "Question does not exist or does not belong to this test",
            code: "NOT_FOUND",
          },
        ],
        timestamp: new Date().toISOString(),
      };
      return c.json(errorResponse, 404);
    }

    const question = questionResult[0];

    // For auto-save, we allow partial/incomplete answers
    // Only validate if there's actual content to validate
    if (requestData.answer || requestData.answer_data) {
      const validation = validateAnswerByQuestionType(
        question.question_type,
        requestData.answer || null,
        requestData.answer_data || null,
        (question.options as Array<{
          value: string;
          label: string;
          score?: number;
        }>) || undefined
      );

      // For auto-save, we're more lenient with validation
      // We'll save even if it's not completely valid, but log a warning
      if (!validation.isValid) {
        console.warn(
          `Auto-save: Invalid answer format for question ${requestData.question_id}: ${validation.errorMessage}`
        );
      }
    }

    const now = new Date();

    // Check if answer already exists
    const existingAnswer = await db
      .select()
      .from(userAnswers)
      .where(
        and(
          eq(userAnswers.user_id, user.id),
          eq(userAnswers.question_id, requestData.question_id),
          eq(userAnswers.attempt_id, attemptId)
        )
      )
      .limit(1);

    let answerId: string;
    let isNew = false;

    if (existingAnswer.length > 0) {
      // Update existing answer (auto-save doesn't calculate score)
      const updateData = {
        answer: requestData.answer || null,
        answer_data: requestData.answer_data || null,
        time_taken: requestData.time_taken || null,
        confidence_level: requestData.confidence_level || null,
        answered_at: now,
      };

      await db
        .update(userAnswers)
        .set(updateData)
        .where(eq(userAnswers.id, existingAnswer[0].id));

      answerId = existingAnswer[0].id;
      isNew = false;
    } else {
      // Create new answer (auto-save doesn't calculate score)
      const insertData = {
        user_id: user.id,
        question_id: requestData.question_id,
        attempt_id: attemptId,
        answer: requestData.answer || null,
        answer_data: requestData.answer_data || null,
        score: null, // Auto-save doesn't calculate score
        time_taken: requestData.time_taken || null,
        is_correct: null, // Auto-save doesn't determine correctness
        confidence_level: requestData.confidence_level || null,
        answered_at: now,
      };

      const [newAnswer] = await db
        .insert(userAnswers)
        .values(insertData)
        .returning();

      answerId = newAnswer.id;
      isNew = true;
    }

    const response: AutoSaveAnswerResponse = {
      success: true,
      message: "Answer auto-saved successfully",
      data: {
        answer_id: answerId,
        is_new: isNew,
        auto_saved_at: now.toISOString(),
      },
      timestamp: new Date().toISOString(),
    };

    return c.json(response, 200);
  } catch (error) {
    console.error("Error auto-saving answer:", error);

    const errorResponse: AnswerErrorResponse = {
      success: false,
      message: "Failed to auto-save answer",
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
