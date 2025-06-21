import { eq, and, sql } from "drizzle-orm";
import { userAnswers, questions, testAttempts, tests } from "@/db";
import { calculateAnswerScore } from "shared-types";

/**
 * Fresh calculation utilities for reports
 * This ensures reports use real-time calculated scores instead of potentially outdated stored results
 */

interface FreshScoreResult {
  attemptId: string;
  userId: string;
  testId: string;
  rawScore: number;
  scaledScore: number;
  correctAnswers: number;
  totalQuestions: number;
  answeredQuestions: number;
  accuracyRate: number;
  completionPercentage: number;
}

export async function calculateFreshScoreForAttempt(
  db: any,
  attemptId: string
): Promise<FreshScoreResult | null> {
  try {
    // Get attempt and test data
    const attemptResult = await db
      .select({
        attempt: testAttempts,
        test: tests,
      })
      .from(testAttempts)
      .leftJoin(tests, eq(testAttempts.test_id, tests.id))
      .where(eq(testAttempts.id, attemptId))
      .limit(1);

    if (attemptResult.length === 0 || !attemptResult[0].test) {
      return null;
    }

    const { attempt, test } = attemptResult[0];

    // Get all answers for this attempt with question details
    const answersResult = await db
      .select({
        answer: userAnswers,
        question: questions,
      })
      .from(userAnswers)
      .leftJoin(questions, eq(userAnswers.question_id, questions.id))
      .where(
        and(
          eq(userAnswers.attempt_id, attemptId),
          eq(userAnswers.user_id, attempt.user_id)
        )
      );

    // Calculate fresh scores
    let rawScore = 0;
    let correctAnswers = 0;
    let answeredQuestions = 0;

    for (const { answer, question } of answersResult) {
      if (!question) continue;
      
      // Check if answer has any content
      const hasAnswer = answer.answer || answer.answer_data;
      if (!hasAnswer) continue;

      answeredQuestions++;

      // Calculate fresh score using the same logic as answer.submit.ts
      const scoreResult = calculateAnswerScore(
        answer.answer || null,
        (answer.answer_data as Record<string, any>) || null,
        question.question_type,
        question.correct_answer,
        (question.scoring_key as Record<string, number>) || undefined,
        (question.options as Array<{
          value: string;
          label: string;
          score?: number;
        }>) || undefined
      );

      const questionScore = scoreResult.score;
      const isCorrect = scoreResult.isCorrect;

      rawScore += questionScore;

      // Count correct answers for accuracy
      if (question.question_type === "multiple_choice" || question.question_type === "true_false") {
        if (isCorrect) {
          correctAnswers++;
        }
      } else {
        // For other types (rating_scale, etc.), consider answered as "correct"
        correctAnswers++;
      }
    }

    const totalQuestions = test.total_questions || 0;
    const scaledScore = totalQuestions > 0 ? (rawScore / totalQuestions) * 100 : 0;
    const accuracyRate = answeredQuestions > 0 ? (correctAnswers / answeredQuestions) * 100 : 0;
    const completionPercentage = totalQuestions > 0 ? (answeredQuestions / totalQuestions) * 100 : 0;

    return {
      attemptId,
      userId: attempt.user_id,
      testId: test.id,
      rawScore,
      scaledScore,
      correctAnswers,
      totalQuestions,
      answeredQuestions,
      accuracyRate,
      completionPercentage,
    };
  } catch (error) {
    console.error(`Error calculating fresh score for attempt ${attemptId}:`, error);
    return null;
  }
}

export async function calculateFreshScoresForMultipleAttempts(
  db: any,
  attemptIds: string[]
): Promise<FreshScoreResult[]> {
  const results: FreshScoreResult[] = [];
  
  // Process in parallel for better performance
  const promises = attemptIds.map(attemptId => 
    calculateFreshScoreForAttempt(db, attemptId)
  );
  
  const freshScores = await Promise.all(promises);
  
  for (const score of freshScores) {
    if (score) {
      results.push(score);
    }
  }
  
  return results;
}

export async function calculateFreshScoresForUser(
  db: any,
  userId: string,
  sessionFilter?: string,
  dateFrom?: string,
  dateTo?: string
): Promise<FreshScoreResult[]> {
  // Build filter conditions
  const conditions: any[] = [eq(testAttempts.user_id, userId)];
  
  if (sessionFilter) {
    conditions.push(eq(testAttempts.session_test_id, sessionFilter));
  }
  
  if (dateFrom) {
    conditions.push(sql`${testAttempts.start_time} >= ${new Date(dateFrom)}`);
  }
  
  if (dateTo) {
    conditions.push(sql`${testAttempts.start_time} <= ${new Date(dateTo)}`);
  }

  // Get all attempts for user
  const userAttempts = await db
    .select({ id: testAttempts.id })
    .from(testAttempts)
    .where(and(...conditions));

  const attemptIds = userAttempts.map(attempt => attempt.id);
  
  return calculateFreshScoresForMultipleAttempts(db, attemptIds);
}

export async function calculateFreshScoresForSession(
  db: any,
  sessionId: string
): Promise<FreshScoreResult[]> {
  // Get all attempts for session
  const sessionAttempts = await db
    .select({ id: testAttempts.id })
    .from(testAttempts)
    .where(eq(testAttempts.session_test_id, sessionId));

  const attemptIds = sessionAttempts.map(attempt => attempt.id);
  
  return calculateFreshScoresForMultipleAttempts(db, attemptIds);
}

// Helper function to group fresh scores by user
export function groupFreshScoresByUser(freshScores: FreshScoreResult[]): Record<string, FreshScoreResult[]> {
  return freshScores.reduce((groups, score) => {
    if (!groups[score.userId]) {
      groups[score.userId] = [];
    }
    groups[score.userId].push(score);
    return groups;
  }, {} as Record<string, FreshScoreResult[]>);
}

// Helper function to calculate user averages from fresh scores
export function calculateUserAverageFromFreshScores(userScores: FreshScoreResult[]) {
  if (userScores.length === 0) {
    return {
      overallScore: 0,
      overallPercentile: 0,
      totalAttempts: 0,
      completedAttempts: 0,
      averageCompletionRate: 0,
      totalCorrectAnswers: 0,
      totalAnsweredQuestions: 0,
      overallAccuracyRate: 0,
    };
  }

  const totalScore = userScores.reduce((sum, score) => sum + score.scaledScore, 0);
  const totalCompletionRate = userScores.reduce((sum, score) => sum + score.completionPercentage, 0);
  const totalCorrectAnswers = userScores.reduce((sum, score) => sum + score.correctAnswers, 0);
  const totalAnsweredQuestions = userScores.reduce((sum, score) => sum + score.answeredQuestions, 0);

  return {
    overallScore: totalScore / userScores.length,
    overallPercentile: Math.min(100, (totalScore / userScores.length)), // Simplified percentile
    totalAttempts: userScores.length,
    completedAttempts: userScores.filter(score => score.completionPercentage >= 90).length,
    averageCompletionRate: totalCompletionRate / userScores.length,
    totalCorrectAnswers,
    totalAnsweredQuestions,
    overallAccuracyRate: totalAnsweredQuestions > 0 ? (totalCorrectAnswers / totalAnsweredQuestions) * 100 : 0,
  };
}