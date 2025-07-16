CREATE TABLE "user_performance_stats" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"total_tests_taken" integer DEFAULT 0,
	"total_tests_completed" integer DEFAULT 0,
	"average_raw_score" numeric(8, 2),
	"average_scaled_score" numeric(8, 2),
	"highest_raw_score" numeric(8, 2),
	"lowest_raw_score" numeric(8, 2),
	"highest_scaled_score" numeric(8, 2),
	"lowest_scaled_score" numeric(8, 2),
	"total_time_spent" integer DEFAULT 0,
	"average_time_per_test" integer DEFAULT 0,
	"completion_rate" numeric(5, 2),
	"consistency_score" numeric(5, 2),
	"performance_rank" integer,
	"performance_percentile" numeric(5, 2),
	"last_test_date" timestamp,
	"calculation_date" timestamp DEFAULT now() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "user_performance_stats" ADD CONSTRAINT "user_performance_stats_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "user_performance_unique" ON "user_performance_stats" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "user_performance_user_idx" ON "user_performance_stats" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "user_performance_avg_raw_score_idx" ON "user_performance_stats" USING btree ("average_raw_score");--> statement-breakpoint
CREATE INDEX "user_performance_avg_scaled_score_idx" ON "user_performance_stats" USING btree ("average_scaled_score");--> statement-breakpoint
CREATE INDEX "user_performance_rank_idx" ON "user_performance_stats" USING btree ("performance_rank");--> statement-breakpoint
CREATE INDEX "user_performance_calculation_date_idx" ON "user_performance_stats" USING btree ("calculation_date");