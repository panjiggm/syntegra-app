/**
 * Question type definitions
 */
export type QuestionType =
  | "multiple_choice"
  | "true_false"
  | "text"
  | "rating_scale"
  | "drawing"
  | "sequence"
  | "matrix";

/**
 * Default time limits for different question types (in seconds)
 */
const DEFAULT_TIME_LIMITS: Record<QuestionType, number> = {
  multiple_choice: 60, // 1 minute
  true_false: 30, // 30 seconds
  text: 300, // 5 minutes
  rating_scale: 45, // 45 seconds
  drawing: 600, // 10 minutes
  sequence: 120, // 2 minutes
  matrix: 180, // 3 minutes
};

/**
 * Get default time limit for a specific question type
 * @param questionType - The type of question
 * @returns Default time limit in seconds
 */
export function getDefaultTimeLimitByQuestionType(
  questionType: QuestionType
): number {
  return DEFAULT_TIME_LIMITS[questionType] || 60; // Default to 60 seconds if type not found
}

/**
 * Format time limit from seconds to readable format
 * @param seconds - Time in seconds
 * @returns Formatted time string
 */
export function formatTimeLimit(seconds: number): string {
  if (seconds < 60) {
    return `${seconds} detik`;
  } else if (seconds < 3600) {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    if (remainingSeconds === 0) {
      return `${minutes} menit`;
    }
    return `${minutes} menit ${remainingSeconds} detik`;
  } else {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    if (minutes === 0) {
      return `${hours} jam`;
    }
    return `${hours} jam ${minutes} menit`;
  }
}

/**
 * Question type labels in Indonesian
 */
export const QUESTION_TYPE_LABELS: Record<QuestionType, string> = {
  multiple_choice: "Pilihan Ganda",
  true_false: "Benar/Salah",
  text: "Esai",
  rating_scale: "Skala Rating",
  drawing: "Gambar",
  sequence: "Urutan",
  matrix: "Matriks",
};
