import { Context } from "hono";
import { eq, and, isNotNull } from "drizzle-orm";
import { getDbFromEnv, userAnswers, questions, testAttempts } from "@/db";
import { type CloudflareBindings } from "@/lib/env";
import { calculateAnswerScore } from "shared-types";

export async function recalculateScoresHandler(
  c: Context<{ Bindings: CloudflareBindings; Variables: { user: any } }>
): Promise<Response> {
  try {
    const db = getDbFromEnv(c.env);
    const { attemptId } = c.req.param();

    // Get all answered questions for this attempt
    const answersWithQuestions = await db
      .select({
        answer: userAnswers,
        question: questions,
      })
      .from(userAnswers)
      .leftJoin(questions, eq(userAnswers.question_id, questions.id))
      .where(eq(userAnswers.attempt_id, attemptId));

    console.log(
      `Found ${answersWithQuestions.length} answers to recalculate for attempt ${attemptId}`
    );

    let updatedCount = 0;
    const updates: Array<{
      questionId: string;
      oldScore: number | null;
      newScore: number;
      oldIsCorrect: boolean | null;
      newIsCorrect: boolean;
    }> = [];

    for (const { answer, question } of answersWithQuestions) {
      if (!question) {
        console.log(`Skipping answer ${answer.id} - missing question`);
        continue;
      }

      // Check if answer has any content (answer text, answer_data, or existing score)
      const hasAnswer = answer.answer || answer.answer_data || answer.score;
      if (!hasAnswer) {
        console.log(`Skipping answer ${answer.id} - no content to recalculate`);
        continue;
      }

      // Calculate new score and is_correct
      const scoreResult = calculateAnswerScore(
        answer.answer,
        (answer.answer_data as Record<string, any>) || null,
        question.question_type,
        question.correct_answer,
        (question.scoring_key as Record<string, number | string>) || undefined,
        (question.options as Array<{
          value: string;
          label: string;
          score?: number;
        }>) || undefined
      );

      const newScore = scoreResult.score;
      const newIsCorrect = scoreResult.isCorrect;
      const oldScore = answer.score ? parseFloat(answer.score) : null;
      const oldIsCorrect = answer.is_correct;

      // Only update if values have changed
      if (oldScore !== newScore || oldIsCorrect !== newIsCorrect) {
        await db
          .update(userAnswers)
          .set({
            score: newScore.toString(),
            is_correct: newIsCorrect,
          })
          .where(eq(userAnswers.id, answer.id));

        updatedCount++;
        updates.push({
          questionId: question.id,
          oldScore,
          newScore,
          oldIsCorrect,
          newIsCorrect,
        });

        console.log(
          `Updated answer for question ${question.id}: score ${oldScore} -> ${newScore}, is_correct ${oldIsCorrect} -> ${newIsCorrect}`
        );
      }
    }

    // Update attempt timestamp
    await db
      .update(testAttempts)
      .set({ updated_at: new Date() })
      .where(eq(testAttempts.id, attemptId));

    const response = {
      success: true,
      message: `Successfully recalculated scores for ${updatedCount} out of ${answersWithQuestions.length} answers`,
      data: {
        attempt_id: attemptId,
        total_answers: answersWithQuestions.length,
        updated_count: updatedCount,
        skipped_count: answersWithQuestions.length - updatedCount,
        updates: updates,
      },
      timestamp: new Date().toISOString(),
    };

    return c.json(response, 200);
  } catch (error) {
    console.error("Error recalculating scores:", error);

    const errorResponse = {
      success: false,
      message: "Failed to recalculate scores",
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
