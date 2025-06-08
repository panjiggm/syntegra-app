import { Context } from "hono";
import {
  eq,
  and,
  desc,
  asc,
  count,
  avg,
  sum,
  or,
  isNull,
  isNotNull,
  sql,
} from "drizzle-orm";
import {
  getDbFromEnv,
  userAnswers,
  testAttempts,
  tests,
  questions,
} from "@/db";
import { type CloudflareBindings } from "@/lib/env";
import {
  type GetAttemptAnswersResponse,
  type AnswerErrorResponse,
  type GetAttemptAnswersQuery,
  formatAnswerForDisplay,
} from "shared-types";

export async function getAttemptAnswersHandler(
  c: Context<{ Bindings: CloudflareBindings; Variables: { user: any } }>
): Promise<Response> {
  try {
    const db = getDbFromEnv(c.env);
    const auth = c.get("auth");
    const user = auth.user;
    const { attemptId } = c.req.param();
    const rawQuery = c.req.query();

    const queryParams: GetAttemptAnswersQuery = {
      page: parseInt(rawQuery.page) || 1,
      limit: Math.min(parseInt(rawQuery.limit) || 50, 100),
      sort_by: (rawQuery.sort_by as any) || "answered_at",
      sort_order: (rawQuery.sort_order as any) || "asc",
      question_id: rawQuery.question_id,
      is_answered: rawQuery.is_answered
        ? rawQuery.is_answered === "true"
        : undefined,
      confidence_level: rawQuery.confidence_level
        ? parseInt(rawQuery.confidence_level)
        : undefined,
      include_correct_answers: rawQuery.include_correct_answers === "true",
      include_score: rawQuery.include_score === "true",
    };

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

    // Build filter conditions
    const filterConditions: any[] = [
      eq(userAnswers.attempt_id, attemptId),
      eq(userAnswers.user_id, attempt.user_id),
    ];

    if (queryParams.question_id) {
      filterConditions.push(
        eq(userAnswers.question_id, queryParams.question_id)
      );
    }

    if (queryParams.is_answered !== undefined) {
      if (queryParams.is_answered) {
        // Has answer or answer_data
        filterConditions.push(
          or(isNotNull(userAnswers.answer), isNotNull(userAnswers.answer_data))
        );
      } else {
        // No answer and no answer_data
        filterConditions.push(
          and(isNull(userAnswers.answer), isNull(userAnswers.answer_data))
        );
      }
    }

    if (queryParams.confidence_level) {
      filterConditions.push(
        eq(userAnswers.confidence_level, queryParams.confidence_level)
      );
    }

    // Count total records
    const [totalCount] = await db
      .select({ count: count() })
      .from(userAnswers)
      .leftJoin(questions, eq(userAnswers.question_id, questions.id))
      .where(and(...filterConditions));

    const total = totalCount.count;
    const totalPages = Math.ceil(total / queryParams.limit);
    const offset = (queryParams.page - 1) * queryParams.limit;

    // Build sort order
    let orderBy;
    const sortDirection = queryParams.sort_order === "desc" ? desc : asc;

    switch (queryParams.sort_by) {
      case "answered_at":
        orderBy = sortDirection(userAnswers.answered_at);
        break;
      case "time_taken":
        orderBy = sortDirection(userAnswers.time_taken);
        break;
      case "confidence_level":
        orderBy = sortDirection(userAnswers.confidence_level);
        break;
      case "sequence":
        orderBy = sortDirection(questions.sequence);
        break;
      default:
        orderBy = asc(questions.sequence); // Default sort by question sequence
    }

    // Get answers with related question data
    const answersResult = await db
      .select({
        answer: userAnswers,
        question: questions,
      })
      .from(userAnswers)
      .leftJoin(questions, eq(userAnswers.question_id, questions.id))
      .where(and(...filterConditions))
      .orderBy(orderBy)
      .limit(queryParams.limit)
      .offset(offset);

    // Process answers
    const processedAnswers = answersResult.map(({ answer, question }) => {
      if (!question) {
        throw new Error(`Question data missing for answer ${answer.id}`);
      }

      const isAnswered = Boolean(answer.answer || answer.answer_data);
      const answerDisplay = formatAnswerForDisplay(
        answer.answer,
        (answer.answer_data as Record<string, any>) || null,
        question.question_type,
        (question.options as Array<{ value: string; label: string }>) ||
          undefined
      );

      return {
        id: answer.id,
        user_id: answer.user_id,
        question_id: answer.question_id,
        attempt_id: answer.attempt_id,
        answer: answer.answer,
        answer_data: (answer.answer_data as Record<string, any>) || null,
        score:
          queryParams.include_score && answer.score
            ? parseFloat(answer.score)
            : null,
        time_taken: answer.time_taken,
        is_correct: queryParams.include_correct_answers
          ? answer.is_correct
          : null,
        confidence_level: answer.confidence_level,
        answered_at: answer.answered_at,
        created_at: answer.created_at,
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
          correct_answer: queryParams.include_correct_answers
            ? question.correct_answer
            : null,
          time_limit: question.time_limit,
          image_url: question.image_url,
          audio_url: question.audio_url,
          is_required: question.is_required || false,
        },
        is_answered: isAnswered,
        answer_display: answerDisplay,
      };
    });

    // Calculate summary statistics
    const [statsResult] = await db
      .select({
        total_answers: count(),
        answered_count: sum(
          sql`CASE WHEN ${userAnswers.answer} IS NOT NULL OR ${userAnswers.answer_data} IS NOT NULL THEN 1 ELSE 0 END`
        ),
        avg_time: avg(userAnswers.time_taken),
        total_time: sum(userAnswers.time_taken),
        avg_confidence: avg(userAnswers.confidence_level),
      })
      .from(userAnswers)
      .where(
        and(
          eq(userAnswers.attempt_id, attemptId),
          eq(userAnswers.user_id, attempt.user_id)
        )
      );

    const totalQuestions = test.total_questions || 0;
    const answeredQuestions = Number(statsResult.answered_count) || 0;
    const unansweredQuestions = totalQuestions - answeredQuestions;
    const progressPercentage =
      totalQuestions > 0
        ? Math.round((answeredQuestions / totalQuestions) * 100)
        : 0;

    const summary = {
      total_questions: totalQuestions,
      answered_questions: answeredQuestions,
      unanswered_questions: unansweredQuestions,
      progress_percentage: progressPercentage,
      average_time_per_question: statsResult.avg_time
        ? Math.round(Number(statsResult.avg_time))
        : 0,
      total_time_spent: statsResult.total_time
        ? Number(statsResult.total_time)
        : 0,
      average_confidence_level: statsResult.avg_confidence
        ? Number(statsResult.avg_confidence)
        : null,
    };

    const response: GetAttemptAnswersResponse = {
      success: true,
      message: "Test attempt answers retrieved successfully",
      data: processedAnswers,
      meta: {
        current_page: queryParams.page,
        per_page: queryParams.limit,
        total: total,
        total_pages: totalPages,
        has_next_page: queryParams.page < totalPages,
        has_prev_page: queryParams.page > 1,
      },
      summary,
      timestamp: new Date().toISOString(),
    };

    return c.json(response, 200);
  } catch (error) {
    console.error("Error getting attempt answers:", error);

    const errorResponse: AnswerErrorResponse = {
      success: false,
      message: "Failed to retrieve attempt answers",
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
