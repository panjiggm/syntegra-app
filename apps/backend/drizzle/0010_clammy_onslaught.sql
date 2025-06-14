ALTER TABLE "tests" ADD COLUMN "question_type" "question_type" DEFAULT 'multiple_choice';--> statement-breakpoint
CREATE INDEX "tests_question_type_idx" ON "tests" USING btree ("question_type");