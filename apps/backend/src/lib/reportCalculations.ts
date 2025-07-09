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
  testModuleType?: string;
  testCategory?: string;
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
    let scorableQuestions = 0; // Track questions that contribute to score
    
    for (const { answer, question } of answersResult) {
      if (!question) continue;
      
      // Check if answer has any content
      const hasAnswer = answer.answer || answer.answer_data;
      if (!hasAnswer) continue;

      answeredQuestions++;

      // Skip rating_scale questions from score calculation
      if (question.question_type === "rating_scale") {
        continue;
      }

      scorableQuestions++;

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
        // For other non-rating_scale types, consider answered as "correct"
        correctAnswers++;
      }
    }

    const totalQuestions = test.total_questions || 0;
    // Use scorableQuestions for scaled score if there are rating_scale questions
    const questionsForScaling = scorableQuestions > 0 ? scorableQuestions : totalQuestions;
    const scaledScore = questionsForScaling > 0 ? (rawScore / questionsForScaling) * 100 : 0;
    const accuracyRate = scorableQuestions > 0 ? (correctAnswers / scorableQuestions) * 100 : 0;
    const completionPercentage = totalQuestions > 0 ? (answeredQuestions / totalQuestions) * 100 : 0;

    return {
      attemptId,
      userId: attempt.user_id,
      testId: test.id,
      testModuleType: test.module_type,
      testCategory: test.category,
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

  const attemptIds = userAttempts.map((attempt: { id: string }) => attempt.id);
  
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

  const attemptIds = sessionAttempts.map((attempt: { id: string }) => attempt.id);
  
  return calculateFreshScoresForMultipleAttempts(db, attemptIds);
}

export async function calculateFreshScoresForUsers(
  db: any,
  userIds: string[],
  sessionFilter?: string,
  dateFrom?: string,
  dateTo?: string
): Promise<FreshScoreResult[]> {
  // Process users in parallel for optimal performance
  const promises = userIds.map(userId => 
    calculateFreshScoresForUser(db, userId, sessionFilter, dateFrom, dateTo)
  );
  
  const allUserScores = await Promise.all(promises);
  
  // Flatten the results from all users into a single array
  return allUserScores.flat();
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

// Helper function to check if test is rating scale based
export function isRatingScaleTest(moduleType?: string, category?: string): boolean {
  return moduleType === "personality" || 
    category === "mbti" || category === "big_five" || 
    category === "disc" || category === "papi_kostick";
}

// Helper function to calculate user averages from fresh scores (excluding rating scale tests)
export function calculateUserAverageFromFreshScores(userScores: FreshScoreResult[]) {
  // Filter out rating scale tests for score calculations
  const scorableScores = userScores.filter(score => 
    !isRatingScaleTest(score.testModuleType, score.testCategory)
  );

  if (scorableScores.length === 0) {
    return {
      overallScore: 0,
      overallPercentile: 0,
      totalAttempts: userScores.length, // Still count all attempts
      completedAttempts: 0,
      averageCompletionRate: userScores.length > 0 ? 
        userScores.reduce((sum, score) => sum + score.completionPercentage, 0) / userScores.length : 0,
      totalCorrectAnswers: 0,
      totalAnsweredQuestions: 0,
      overallAccuracyRate: 0,
    };
  }

  const totalScore = scorableScores.reduce((sum, score) => sum + score.scaledScore, 0);
  const totalCompletionRate = userScores.reduce((sum, score) => sum + score.completionPercentage, 0);
  const totalCorrectAnswers = scorableScores.reduce((sum, score) => sum + score.correctAnswers, 0);
  const totalAnsweredQuestions = scorableScores.reduce((sum, score) => sum + score.answeredQuestions, 0);

  return {
    overallScore: totalScore / scorableScores.length,
    overallPercentile: Math.min(100, (totalScore / scorableScores.length)), // Simplified percentile
    totalAttempts: userScores.length, // Count all attempts including rating scale
    completedAttempts: userScores.filter(score => score.completionPercentage >= 90).length,
    averageCompletionRate: totalCompletionRate / userScores.length, // Use all scores for completion rate
    totalCorrectAnswers,
    totalAnsweredQuestions,
    overallAccuracyRate: totalAnsweredQuestions > 0 ? (totalCorrectAnswers / totalAnsweredQuestions) * 100 : 0,
  };
}