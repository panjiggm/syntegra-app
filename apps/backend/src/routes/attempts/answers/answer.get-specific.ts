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
  type GetSpecificAnswerResponse,
  type AnswerErrorResponse,
  formatAnswerForDisplay,
  canModifyAnswer,
} from "shared-types";

export async function getSpecificAnswerHandler(
  c: Context<{ Bindings: CloudflareBindings; Variables: { user: any } }>
): Promise<Response> {
  try {
    const db = getDbFromEnv(c.env);
    const auth = c.get("auth");
    const user = auth.user;
    const { attemptId, questionId } = c.req.param();

    // Get attempt with related test data
    const attemptResult = await db
      .select({
        attempt: testAttempts,
        test: tests,
      })
      .from(testAttempts)
      .leftJoin(tests, eq(testAttempts.test_id, tests.id))
      .where(eq(testAttempts.id, attemptId))
      .limit(1);

    if (attemptResult.length === 0) {
      const errorResponse: AnswerErrorResponse = {
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

    // Authorization check - participants can only view their own attempts, admins can view all
    if (user.role === "participant" && attempt.user_id !== user.id) {
      const errorResponse: AnswerErrorResponse = {
        success: false,
        message: "Access denied",
        errors: [
          {
            field: "attempt_access",
            message: "You can only view your own test attempt answers",
            code: "FORBIDDEN",
          },
        ],
        timestamp: new Date().toISOString(),
      };
      return c.json(errorResponse, 403);
    }

    // Get question details
    const questionResult = await db
      .select()
      .from(questions)
      .where(
        and(
          eq(questions.id, questionId),
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

    // Get answer if exists
    const answerResult = await db
      .select()
      .from(userAnswers)
      .where(
        and(
          eq(userAnswers.user_id, attempt.user_id),
          eq(userAnswers.question_id, questionId),
          eq(userAnswers.attempt_id, attemptId)
        )
      )
      .limit(1);

    const existingAnswer = answerResult.length > 0 ? answerResult[0] : null;
    const isAnswered = Boolean(
      existingAnswer?.answer || existingAnswer?.answer_data
    );

    // Check if answer can be modified
    const canModify = canModifyAnswer(
      attempt.status,
      attempt.end_time,
      question.time_limit
    );

    let processedAnswer = null;

    if (existingAnswer) {
      const answerDisplay = formatAnswerForDisplay(
        existingAnswer.answer,
        (existingAnswer.answer_data as Record<string, any>) || null,
        question.question_type,
        (question.options as Array<{ value: string; label: string }>) ||
          undefined
      );

      processedAnswer = {
        id: existingAnswer.id,
        user_id: existingAnswer.user_id,
        question_id: existingAnswer.question_id,
        attempt_id: existingAnswer.attempt_id,
        answer: existingAnswer.answer,
        answer_data:
          (existingAnswer.answer_data as Record<string, any>) || null,
        score: existingAnswer.score ? parseFloat(existingAnswer.score) : null,
        time_taken: existingAnswer.time_taken,
        is_correct: existingAnswer.is_correct,
        confidence_level: existingAnswer.confidence_level,
        answered_at: existingAnswer.answered_at,
        created_at: existingAnswer.created_at,
        question: {
          id: question.id,
          question: question.question,
          question_type: question.question_type,
          sequence: question.sequence,
          options:
            (question.options as Array<{
              value: string;
              label: string;
              score?: number;
            }>) || null,
          correct_answer: question.correct_answer,
          time_limit: question.time_limit,
          image_url: question.image_url,
          audio_url: question.audio_url,
          is_required: question.is_required || false,
        },
        is_answered: isAnswered,
        answer_display: answerDisplay,
      };
    }

    const response: GetSpecificAnswerResponse = {
      success: true,
      message: isAnswered
        ? "Answer retrieved successfully"
        : "Question found but not answered yet",
      data: {
        answer: processedAnswer,
        question: {
          id: question.id,
          question: question.question,
          question_type: question.question_type,
          sequence: question.sequence,
          options:
            (question.options as Array<{
              value: string;
              label: string;
              score?: number;
            }>) || null,
          time_limit: question.time_limit,
          image_url: question.image_url,
          audio_url: question.audio_url,
          is_required: question.is_required || false,
        },
        is_answered: isAnswered,
        can_modify: canModify,
      },
      timestamp: new Date().toISOString(),
    };

    return c.json(response, 200);
  } catch (error) {
    console.error("Error getting specific answer:", error);

    const errorResponse: AnswerErrorResponse = {
      success: false,
      message: "Failed to retrieve answer",
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
