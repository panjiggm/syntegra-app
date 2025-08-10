CREATE TABLE "administration_documents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"document_type_id" uuid NOT NULL,
	"score" numeric(8, 2),
	"file_url" varchar(500) NOT NULL,
	"uploaded_at" timestamp DEFAULT now() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "document_types" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"key" varchar(100) NOT NULL,
	"name" varchar(255) NOT NULL,
	"weight" numeric(5, 2) DEFAULT '1.00',
	"max_score" numeric(8, 2),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "administration_documents" ADD CONSTRAINT "administration_documents_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "administration_documents" ADD CONSTRAINT "administration_documents_document_type_id_document_types_id_fk" FOREIGN KEY ("document_type_id") REFERENCES "public"."document_types"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "admin_docs_user_idx" ON "administration_documents" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "admin_docs_type_idx" ON "administration_documents" USING btree ("document_type_id");--> statement-breakpoint
CREATE INDEX "admin_docs_uploaded_idx" ON "administration_documents" USING btree ("uploaded_at");--> statement-breakpoint
CREATE UNIQUE INDEX "document_types_key_idx" ON "document_types" USING btree ("key");