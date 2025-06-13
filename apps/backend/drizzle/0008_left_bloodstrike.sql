ALTER TABLE "auth_sessions" ALTER COLUMN "updated_at" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "session_modules" ADD COLUMN "forced_question_type" "question_type";--> statement-breakpoint
ALTER TABLE "session_modules" ADD COLUMN "uniform_question_settings" json;