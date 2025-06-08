CREATE TYPE "public"."attempt_status" AS ENUM('started', 'in_progress', 'completed', 'abandoned', 'expired');--> statement-breakpoint
CREATE TYPE "public"."category" AS ENUM('wais', 'mbti', 'wartegg', 'riasec', 'kraepelin', 'pauli', 'big_five', 'papi_kostick', 'dap', 'raven', 'epps', 'army_alpha', 'htp', 'disc', 'iq', 'eq');--> statement-breakpoint
CREATE TYPE "public"."education" AS ENUM('sd', 'smp', 'sma', 'diploma', 's1', 's2', 's3', 'other');--> statement-breakpoint
CREATE TYPE "public"."gender" AS ENUM('male', 'female');--> statement-breakpoint
CREATE TYPE "public"."module_type" AS ENUM('intelligence', 'personality', 'aptitude', 'interest', 'projective', 'cognitive');--> statement-breakpoint
CREATE TYPE "public"."question_type" AS ENUM('multiple_choice', 'true_false', 'text', 'rating_scale', 'drawing', 'sequence', 'matrix');--> statement-breakpoint
CREATE TYPE "public"."religion" AS ENUM('islam', 'kristen', 'katolik', 'hindu', 'buddha', 'konghucu', 'other');--> statement-breakpoint
CREATE TYPE "public"."role" AS ENUM('admin', 'participant');--> statement-breakpoint
CREATE TYPE "public"."session_status" AS ENUM('draft', 'active', 'expired', 'completed', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."test_status" AS ENUM('active', 'inactive', 'archived');--> statement-breakpoint
CREATE TABLE "audit_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid,
	"session_id" uuid,
	"attempt_id" uuid,
	"action" varchar(100) NOT NULL,
	"entity" varchar(50) NOT NULL,
	"entity_id" uuid,
	"old_values" json,
	"new_values" json,
	"ip_address" varchar(45),
	"user_agent" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "questions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"test_id" uuid NOT NULL,
	"question" text NOT NULL,
	"question_type" "question_type" NOT NULL,
	"options" json,
	"correct_answer" text,
	"sequence" integer NOT NULL,
	"time_limit" integer,
	"image_url" varchar(500),
	"audio_url" varchar(500),
	"scoring_key" json,
	"is_required" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "session_modules" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"session_id" uuid NOT NULL,
	"test_id" uuid NOT NULL,
	"sequence" integer NOT NULL,
	"is_required" boolean DEFAULT true,
	"weight" numeric(3, 2) DEFAULT '1.00',
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "session_participants" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"session_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"status" "participant_status" DEFAULT 'invited',
	"registered_at" timestamp,
	"invitation_sent_at" timestamp,
	"unique_link" varchar(255),
	"link_expires_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "session_participants_unique_link_unique" UNIQUE("unique_link")
);
--> statement-breakpoint
CREATE TABLE "session_results" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"session_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"total_score" numeric(8, 2),
	"weighted_score" numeric(8, 2),
	"overall_percentile" numeric(5, 2),
	"overall_grade" varchar(10),
	"recommended_positions" json,
	"primary_traits" json,
	"personality_summary" text,
	"strengths" json,
	"areas_for_development" json,
	"summary_description" text,
	"completion_rate" numeric(5, 2),
	"time_efficiency" numeric(5, 2),
	"consistency_score" numeric(5, 2),
	"is_final" boolean DEFAULT false,
	"completed_at" timestamp,
	"reviewed_by" uuid,
	"reviewed_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "test_attempts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"test_id" uuid NOT NULL,
	"session_test_id" uuid,
	"start_time" timestamp NOT NULL,
	"end_time" timestamp,
	"actual_end_time" timestamp,
	"status" "attempt_status" DEFAULT 'started' NOT NULL,
	"ip_address" varchar(45),
	"user_agent" text,
	"browser_info" json,
	"attempt_number" integer DEFAULT 1,
	"time_spent" integer,
	"questions_answered" integer DEFAULT 0,
	"total_questions" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "test_results" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"attempt_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"test_id" uuid NOT NULL,
	"session_result_id" uuid,
	"raw_score" numeric(8, 2),
	"scaled_score" numeric(8, 2),
	"percentile" numeric(5, 2),
	"grade" varchar(10),
	"traits" json,
	"trait_names" json,
	"description" text,
	"recommendations" text,
	"detailed_analysis" json,
	"is_passed" boolean,
	"completion_percentage" numeric(5, 2),
	"calculated_at" timestamp DEFAULT now() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "test_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"session_name" varchar(255) NOT NULL,
	"session_code" varchar(50) NOT NULL,
	"start_time" timestamp NOT NULL,
	"end_time" timestamp NOT NULL,
	"target_position" varchar(100),
	"max_participants" integer,
	"current_participants" integer DEFAULT 0,
	"status" "session_status" DEFAULT 'draft',
	"description" text,
	"location" varchar(255),
	"proctor_id" uuid,
	"auto_expire" boolean DEFAULT true,
	"allow_late_entry" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"created_by" uuid,
	"updated_by" uuid,
	CONSTRAINT "test_sessions_session_code_unique" UNIQUE("session_code")
);
--> statement-breakpoint
CREATE TABLE "tests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(255) NOT NULL,
	"description" text,
	"module_type" "module_type" NOT NULL,
	"category" "category" NOT NULL,
	"time_limit" integer NOT NULL,
	"icon_url" varchar(500),
	"card_color" varchar(100),
	"test_prerequisites" json,
	"display_order" integer DEFAULT 0,
	"subcategory" json,
	"total_questions" integer DEFAULT 0,
	"passing_score" numeric(5, 2),
	"status" "test_status" DEFAULT 'active',
	"instructions" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"created_by" uuid,
	"updated_by" uuid
);
--> statement-breakpoint
CREATE TABLE "user_answers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"question_id" uuid NOT NULL,
	"attempt_id" uuid NOT NULL,
	"answer" text,
	"answer_data" json,
	"score" numeric(5, 2),
	"time_taken" integer,
	"is_correct" boolean,
	"confidence_level" integer,
	"answered_at" timestamp DEFAULT now() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"nik" varchar(20) NOT NULL,
	"name" varchar(255) NOT NULL,
	"role" "role" DEFAULT 'participant' NOT NULL,
	"email" varchar(255) NOT NULL,
	"gender" "gender" NOT NULL,
	"phone" varchar(20) NOT NULL,
	"birth_place" varchar(100),
	"birth_date" timestamp,
	"religion" "religion",
	"education" "education",
	"address" text,
	"province" varchar(100),
	"regency" varchar(100),
	"district" varchar(100),
	"village" varchar(100),
	"postal_code" varchar(10),
	"profile_picture_url" varchar(500),
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"created_by" uuid,
	"updated_by" uuid,
	CONSTRAINT "users_nik_unique" UNIQUE("nik"),
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_session_id_test_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."test_sessions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_attempt_id_test_attempts_id_fk" FOREIGN KEY ("attempt_id") REFERENCES "public"."test_attempts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "questions" ADD CONSTRAINT "questions_test_id_tests_id_fk" FOREIGN KEY ("test_id") REFERENCES "public"."tests"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session_modules" ADD CONSTRAINT "session_modules_session_id_test_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."test_sessions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session_modules" ADD CONSTRAINT "session_modules_test_id_tests_id_fk" FOREIGN KEY ("test_id") REFERENCES "public"."tests"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session_participants" ADD CONSTRAINT "session_participants_session_id_test_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."test_sessions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session_participants" ADD CONSTRAINT "session_participants_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session_results" ADD CONSTRAINT "session_results_session_id_test_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."test_sessions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session_results" ADD CONSTRAINT "session_results_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session_results" ADD CONSTRAINT "session_results_reviewed_by_users_id_fk" FOREIGN KEY ("reviewed_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "test_attempts" ADD CONSTRAINT "test_attempts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "test_attempts" ADD CONSTRAINT "test_attempts_test_id_tests_id_fk" FOREIGN KEY ("test_id") REFERENCES "public"."tests"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "test_attempts" ADD CONSTRAINT "test_attempts_session_test_id_test_sessions_id_fk" FOREIGN KEY ("session_test_id") REFERENCES "public"."test_sessions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "test_results" ADD CONSTRAINT "test_results_attempt_id_test_attempts_id_fk" FOREIGN KEY ("attempt_id") REFERENCES "public"."test_attempts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "test_results" ADD CONSTRAINT "test_results_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "test_results" ADD CONSTRAINT "test_results_test_id_tests_id_fk" FOREIGN KEY ("test_id") REFERENCES "public"."tests"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "test_results" ADD CONSTRAINT "test_results_session_result_id_session_results_id_fk" FOREIGN KEY ("session_result_id") REFERENCES "public"."session_results"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "test_sessions" ADD CONSTRAINT "test_sessions_proctor_id_users_id_fk" FOREIGN KEY ("proctor_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "test_sessions" ADD CONSTRAINT "test_sessions_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "test_sessions" ADD CONSTRAINT "test_sessions_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_answers" ADD CONSTRAINT "user_answers_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_answers" ADD CONSTRAINT "user_answers_question_id_questions_id_fk" FOREIGN KEY ("question_id") REFERENCES "public"."questions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_answers" ADD CONSTRAINT "user_answers_attempt_id_test_attempts_id_fk" FOREIGN KEY ("attempt_id") REFERENCES "public"."test_attempts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "audit_user_idx" ON "audit_logs" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "audit_action_idx" ON "audit_logs" USING btree ("action");--> statement-breakpoint
CREATE INDEX "audit_entity_idx" ON "audit_logs" USING btree ("entity","entity_id");--> statement-breakpoint
CREATE INDEX "audit_created_at_idx" ON "audit_logs" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "questions_test_id_idx" ON "questions" USING btree ("test_id");--> statement-breakpoint
CREATE INDEX "questions_sequence_idx" ON "questions" USING btree ("test_id","sequence");--> statement-breakpoint
CREATE UNIQUE INDEX "questions_test_sequence_unique" ON "questions" USING btree ("test_id","sequence");--> statement-breakpoint
CREATE INDEX "session_modules_session_idx" ON "session_modules" USING btree ("session_id");--> statement-breakpoint
CREATE INDEX "session_modules_test_idx" ON "session_modules" USING btree ("test_id");--> statement-breakpoint
CREATE UNIQUE INDEX "session_modules_unique" ON "session_modules" USING btree ("session_id","sequence");--> statement-breakpoint
CREATE UNIQUE INDEX "session_test_unique" ON "session_modules" USING btree ("session_id","test_id");--> statement-breakpoint
CREATE UNIQUE INDEX "participants_unique" ON "session_participants" USING btree ("session_id","user_id");--> statement-breakpoint
CREATE INDEX "participants_session_idx" ON "session_participants" USING btree ("session_id");--> statement-breakpoint
CREATE INDEX "participants_status_idx" ON "session_participants" USING btree ("status");--> statement-breakpoint
CREATE INDEX "participants_link_idx" ON "session_participants" USING btree ("unique_link");--> statement-breakpoint
CREATE UNIQUE INDEX "session_results_unique" ON "session_results" USING btree ("session_id","user_id");--> statement-breakpoint
CREATE INDEX "session_results_session_idx" ON "session_results" USING btree ("session_id");--> statement-breakpoint
CREATE INDEX "session_results_user_idx" ON "session_results" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "session_results_completed_idx" ON "session_results" USING btree ("completed_at");--> statement-breakpoint
CREATE INDEX "attempts_user_id_idx" ON "test_attempts" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "attempts_test_id_idx" ON "test_attempts" USING btree ("test_id");--> statement-breakpoint
CREATE INDEX "attempts_session_id_idx" ON "test_attempts" USING btree ("session_test_id");--> statement-breakpoint
CREATE INDEX "attempts_status_idx" ON "test_attempts" USING btree ("status");--> statement-breakpoint
CREATE INDEX "attempts_start_time_idx" ON "test_attempts" USING btree ("start_time");--> statement-breakpoint
CREATE UNIQUE INDEX "results_attempt_unique" ON "test_results" USING btree ("attempt_id");--> statement-breakpoint
CREATE INDEX "results_user_test_idx" ON "test_results" USING btree ("user_id","test_id");--> statement-breakpoint
CREATE INDEX "results_session_idx" ON "test_results" USING btree ("session_result_id");--> statement-breakpoint
CREATE UNIQUE INDEX "session_code_unique_idx" ON "test_sessions" USING btree ("session_code");--> statement-breakpoint
CREATE INDEX "sessions_status_idx" ON "test_sessions" USING btree ("status");--> statement-breakpoint
CREATE INDEX "sessions_start_time_idx" ON "test_sessions" USING btree ("start_time");--> statement-breakpoint
CREATE INDEX "sessions_target_position_idx" ON "test_sessions" USING btree ("target_position");--> statement-breakpoint
CREATE INDEX "tests_category_idx" ON "tests" USING btree ("category");--> statement-breakpoint
CREATE INDEX "tests_module_type_idx" ON "tests" USING btree ("module_type");--> statement-breakpoint
CREATE INDEX "tests_status_idx" ON "tests" USING btree ("status");--> statement-breakpoint
CREATE INDEX "tests_display_order_idx" ON "tests" USING btree ("display_order");--> statement-breakpoint
CREATE INDEX "answers_user_question_idx" ON "user_answers" USING btree ("user_id","question_id");--> statement-breakpoint
CREATE INDEX "answers_attempt_idx" ON "user_answers" USING btree ("attempt_id");--> statement-breakpoint
CREATE UNIQUE INDEX "answers_unique" ON "user_answers" USING btree ("user_id","question_id","attempt_id");--> statement-breakpoint
CREATE INDEX "users_nik_idx" ON "users" USING btree ("nik");--> statement-breakpoint
CREATE INDEX "users_email_idx" ON "users" USING btree ("email");--> statement-breakpoint
CREATE INDEX "users_role_idx" ON "users" USING btree ("role");