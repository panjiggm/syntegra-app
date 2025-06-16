CREATE TYPE "public"."test_progress_status" AS ENUM('not_started', 'in_progress', 'completed', 'auto_completed');--> statement-breakpoint
CREATE TABLE "participant_test_progress" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"participant_id" uuid NOT NULL,
	"session_id" uuid NOT NULL,
	"test_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"status" "test_progress_status" DEFAULT 'not_started' NOT NULL,
	"started_at" timestamp,
	"completed_at" timestamp,
	"expected_completion_at" timestamp,
	"answered_questions" integer DEFAULT 0,
	"total_questions" integer DEFAULT 0,
	"time_spent" integer DEFAULT 0,
	"is_auto_completed" boolean DEFAULT false,
	"last_activity_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "participant_test_progress" ADD CONSTRAINT "participant_test_progress_participant_id_session_participants_id_fk" FOREIGN KEY ("participant_id") REFERENCES "public"."session_participants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "participant_test_progress" ADD CONSTRAINT "participant_test_progress_session_id_test_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."test_sessions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "participant_test_progress" ADD CONSTRAINT "participant_test_progress_test_id_tests_id_fk" FOREIGN KEY ("test_id") REFERENCES "public"."tests"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "participant_test_progress" ADD CONSTRAINT "participant_test_progress_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "participant_test_unique" ON "participant_test_progress" USING btree ("participant_id","test_id");--> statement-breakpoint
CREATE UNIQUE INDEX "session_user_test_unique" ON "participant_test_progress" USING btree ("session_id","user_id","test_id");--> statement-breakpoint
CREATE INDEX "progress_participant_idx" ON "participant_test_progress" USING btree ("participant_id");--> statement-breakpoint
CREATE INDEX "progress_session_idx" ON "participant_test_progress" USING btree ("session_id");--> statement-breakpoint
CREATE INDEX "progress_test_idx" ON "participant_test_progress" USING btree ("test_id");--> statement-breakpoint
CREATE INDEX "progress_user_idx" ON "participant_test_progress" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "progress_status_idx" ON "participant_test_progress" USING btree ("status");--> statement-breakpoint
CREATE INDEX "progress_started_at_idx" ON "participant_test_progress" USING btree ("started_at");--> statement-breakpoint
CREATE INDEX "progress_expected_completion_idx" ON "participant_test_progress" USING btree ("expected_completion_at");