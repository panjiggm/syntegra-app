import { Context } from "hono";
import { eq, and, count, isNull, isNotNull } from "drizzle-orm";
import {
  getDbFromEnv,
  userAnswers,
  testAttempts,
  tests,
  questions,
} from "@/db";
import { type CloudflareBindings } from "@/lib/env";
import {
  type SubmitAnswerRequest,
  type SubmitAnswerResponse,
  type AnswerErrorResponse,
  validateAnswerByQuestionType,
  calculateAnswerScore,
  canModifyAnswer,
} from "shared-types";

export async function submitAnswerHandler(
  c: Context<{ Bindings: CloudflareBindings; Variables: { user: any } }>
): Promise<Response> {
  try {
    const db = getDbFromEnv(c.env);
    const auth = c.get("auth");
    const user = auth.user;
    const { attemptId } = c.req.param();
    const requestData: SubmitAnswerRequest = await c.req.json();

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
          eq(testAttempts.user_id, user.id) // Ensure user can only submit to their own attempts
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
        message: "Cannot submit answer to completed or expired attempt",
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

    // Validate answer based on question type
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

    if (!validation.isValid) {
      const errorResponse: AnswerErrorResponse = {
        success: false,
        message: "Invalid answer format",
        errors: [
          {
            field: "answer",
            message: validation.errorMessage || "Invalid answer",
            code: "INVALID_ANSWER_FORMAT",
          },
        ],
        timestamp: new Date().toISOString(),
      };
      return c.json(errorResponse, 400);
    }

    // Calculate score if not a draft
    let score: number | null = null;
    let isCorrect: boolean | null = null;

    if (!requestData.is_draft) {
      const scoreResult = calculateAnswerScore(
        requestData.answer || null,
        requestData.answer_data || null,
        question.question_type,
        question.correct_answer,
        (question.scoring_key as Record<string, number>) || undefined,
        (question.options as Array<{
          value: string;
          label: string;
          score?: number;
        }>) || undefined
      );
      score = scoreResult.score;
      isCorrect = scoreResult.isCorrect;
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

    let userAnswer;

    if (existingAnswer.length > 0) {
      // Update existing answer
      const updateData = {
        answer: requestData.answer || null,
        answer_data: requestData.answer_data || null,
        score: score?.toString() || null,
        time_taken: requestData.time_taken || null,
        is_correct: isCorrect,
        confidence_level: requestData.confidence_level || null,
        answered_at: now,
      };

      const [updatedAnswer] = await db
        .update(userAnswers)
        .set(updateData)
        .where(eq(userAnswers.id, existingAnswer[0].id))
        .returning();

      userAnswer = updatedAnswer;
    } else {
      // Create new answer
      const insertData = {
        user_id: user.id,
        question_id: requestData.question_id,
        attempt_id: attemptId,
        answer: requestData.answer || null,
        answer_data: requestData.answer_data || null,
        score: score?.toString() || null,
        time_taken: requestData.time_taken || null,
        is_correct: isCorrect,
        confidence_level: requestData.confidence_level || null,
        answered_at: now,
      };

      const [newAnswer] = await db
        .insert(userAnswers)
        .values(insertData)
        .returning();

      userAnswer = newAnswer;
    }

    // Update attempt progress if not a draft
    if (!requestData.is_draft) {
      // Count answered questions
      const answeredCount = await db
        .select({ count: count() })
        .from(userAnswers)
        .where(
          and(
            eq(userAnswers.attempt_id, attemptId),
            eq(userAnswers.user_id, user.id),
            isNotNull(userAnswers.answer)
          )
        );

      // Update attempt with new question count
      await db
        .update(testAttempts)
        .set({
          questions_answered: answeredCount.length,
          updated_at: now,
        })
        .where(eq(testAttempts.id, attemptId));
    }

    // Get attempt progress
    const totalQuestions = test.total_questions || 0;
    const answeredQuestions =
      (attempt.questions_answered || 0) + (existingAnswer.length === 0 ? 1 : 0);
    const progressPercentage =
      totalQuestions > 0
        ? Math.round((answeredQuestions / totalQuestions) * 100)
        : 0;

    // Calculate time remaining
    const timeRemaining = attempt.end_time
      ? Math.max(
          0,
          Math.floor((attempt.end_time.getTime() - now.getTime()) / 1000)
        )
      : 0;

    // Find next question
    const nextQuestion = await db
      .select({
        id: questions.id,
        sequence: questions.sequence,
        question_type: questions.question_type,
      })
      .from(questions)
      .leftJoin(
        userAnswers,
        and(
          eq(userAnswers.question_id, questions.id),
          eq(userAnswers.attempt_id, attemptId),
          eq(userAnswers.user_id, user.id)
        )
      )
      .where(
        and(
          eq(questions.test_id, test.id),
          isNull(userAnswers.id) // Question not answered yet
        )
      )
      .orderBy(questions.sequence)
      .limit(1);

    const response: SubmitAnswerResponse = {
      success: true,
      message: requestData.is_draft
        ? "Answer draft saved successfully"
        : "Answer submitted successfully",
      data: {
        answer: {
          id: userAnswer.id,
          user_id: userAnswer.user_id,
          question_id: userAnswer.question_id,
          attempt_id: userAnswer.attempt_id,
          answer: userAnswer.answer,
          answer_data: (userAnswer.answer_data as Record<string, any>) || null,
          score: userAnswer.score ? parseFloat(userAnswer.score) : null,
          time_taken: userAnswer.time_taken,
          is_correct: userAnswer.is_correct,
          confidence_level: userAnswer.confidence_level,
          answered_at: userAnswer.answered_at,
          created_at: userAnswer.created_at,
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
          is_answered: Boolean(userAnswer.answer || userAnswer.answer_data),
        },
        attempt_progress: {
          total_questions: totalQuestions,
          answered_questions: answeredQuestions,
          progress_percentage: progressPercentage,
          time_remaining: timeRemaining,
        },
        next_question: nextQuestion.length > 0 ? nextQuestion[0] : null,
      },
      timestamp: new Date().toISOString(),
    };

    return c.json(response, 200);
  } catch (error) {
    console.error("Error submitting answer:", error);

    const errorResponse: AnswerErrorResponse = {
      success: false,
      message: "Failed to submit answer",
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
