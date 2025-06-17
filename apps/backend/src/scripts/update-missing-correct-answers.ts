import { drizzle } from "drizzle-orm/d1";
import { eq } from "drizzle-orm";
import { questions } from "../db/schema";

// Script to update missing correct_answer data
export async function updateMissingCorrectAnswers(db: any) {
  console.log("🔄 Starting update of missing correct answers...");

  try {
    // Get questions with null correct_answer
    const questionsWithoutAnswer = await db
      .select()
      .from(questions)
      .where(eq(questions.correct_answer, null));

    console.log(
      `📊 Found ${questionsWithoutAnswer.length} questions without correct answers`
    );

    let updatedCount = 0;

    for (const question of questionsWithoutAnswer) {
      let correctAnswer: string | null = null;

      // Analyze question content to determine correct answer
      const questionText = question.question.toLowerCase();

      // Pattern matching for common question types
      if (question.question_type === "multiple_choice") {
        // Mathematical questions
        if (
          questionText.includes("3, 6, 9, 12") &&
          questionText.includes("berikutnya")
        ) {
          correctAnswer = "C"; // 15
        } else if (
          questionText.includes("sinonim") &&
          questionText.includes("cerdas")
        ) {
          correctAnswer = "B"; // Pintar
        } else if (
          questionText.includes("jumat") &&
          questionText.includes("4 hari lagi")
        ) {
          correctAnswer = "B"; // Selasa (Jumat + 4 = Selasa)
        } else if (questionText.includes("18 ÷ 3 + 7")) {
          correctAnswer = "C"; // 13 (6 + 7 = 13)
        } else if (
          questionText.includes("andi lebih tua dari budi") &&
          questionText.includes("paling muda")
        ) {
          correctAnswer = "C"; // Cici
        } else if (
          questionText.includes("antonim") &&
          questionText.includes("tinggi")
        ) {
          correctAnswer = "A"; // Rendah
        } else if (
          questionText.includes("4, 8, 16, 32") &&
          questionText.includes("berikutnya")
        ) {
          correctAnswer = "D"; // 64 (geometric progression x2)
        } else if (questionText.includes("(5 × 3) - 4")) {
          correctAnswer = "B"; // 11 (15 - 4 = 11)
        } else if (
          questionText.includes("semua burung bisa terbang") &&
          questionText.includes("elang")
        ) {
          correctAnswer = "B"; // Terbang
        } else if (questionText.includes("bentuk geometri")) {
          correctAnswer = "A"; // Segitiga
        } else if (questionText.includes("24 ÷ 6 + 5")) {
          correctAnswer = "C"; // 9 (4 + 5 = 9)
        } else if (questionText.includes("mengukur suhu")) {
          correctAnswer = "A"; // Termometer
        } else if (questionText.includes("5 + 7 × 2")) {
          correctAnswer = "A"; // 19 (5 + 14 = 19, order of operations)
        } else if (
          questionText.includes("segitiga") &&
          questionText.includes("tiga sisi sama panjang")
        ) {
          correctAnswer = "C"; // Sama sisi
        } else if (
          questionText.includes("1, 4, 9, 16") &&
          questionText.includes("berikutnya")
        ) {
          correctAnswer = "B"; // 25 (perfect squares: 1², 2², 3², 4², 5²=25)
        } else if (
          questionText.includes("kasur") &&
          questionText.includes("dibalik")
        ) {
          correctAnswer = "A"; // RUSAK (KASUR dibalik = RUSAK)
        } else if (
          questionText.includes("25%") &&
          questionText.includes("15")
        ) {
          correctAnswer = "D"; // 60 (25% of 60 = 15)
        } else if (
          questionText.includes("planet") &&
          questionText.includes("tata surya")
        ) {
          correctAnswer = "C"; // Venus
        } else if (
          questionText.includes("7, 12, 17, 22") &&
          questionText.includes("berikutnya")
        ) {
          correctAnswer = "B"; // 27 (arithmetic progression +5)
        } else if (
          questionText.includes("semua kucing adalah hewan") &&
          questionText.includes("berenang")
        ) {
          correctAnswer = "B"; // Beberapa kucing bisa berenang
        }
      }

      // Update if we found a correct answer
      if (correctAnswer) {
        await db
          .update(questions)
          .set({ correct_answer: correctAnswer })
          .where(eq(questions.id, question.id));

        updatedCount++;
        console.log(
          `✅ Updated question "${question.question.substring(0, 50)}..." with correct answer: ${correctAnswer}`
        );
      } else {
        console.log(
          `⚠️  Could not determine correct answer for: "${question.question.substring(0, 50)}..."`
        );
      }
    }

    console.log(
      `✨ Update complete! Updated ${updatedCount} out of ${questionsWithoutAnswer.length} questions`
    );

    return {
      total: questionsWithoutAnswer.length,
      updated: updatedCount,
      skipped: questionsWithoutAnswer.length - updatedCount,
    };
  } catch (error) {
    console.error("❌ Error updating correct answers:", error);
    throw error;
  }
}

// For manual running
export async function runUpdateScript() {
  // This would be used with proper DB connection
  console.log("Run this script with proper database connection");
}
