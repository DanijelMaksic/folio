CREATE TYPE "public"."transcription_status" AS ENUM('draft', 'submitted', 'approved', 'rejected');--> statement-breakpoint
CREATE TABLE "transcription_revisions" (
	"id" text NOT NULL,
	"transcription_id" text NOT NULL,
	"content" text NOT NULL,
	"saved_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "transcriptions" (
	"id" text PRIMARY KEY NOT NULL,
	"document_id" text NOT NULL,
	"user_id" text NOT NULL,
	"content" text DEFAULT '' NOT NULL,
	"status" "transcription_status" DEFAULT 'draft' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "transcriptions_document_user_unique" UNIQUE("document_id","user_id")
);
--> statement-breakpoint
ALTER TABLE "transcription_revisions" ADD CONSTRAINT "transcription_revisions_transcription_id_transcriptions_id_fk" FOREIGN KEY ("transcription_id") REFERENCES "public"."transcriptions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transcriptions" ADD CONSTRAINT "transcriptions_document_id_documents_id_fk" FOREIGN KEY ("document_id") REFERENCES "public"."documents"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transcriptions" ADD CONSTRAINT "transcriptions_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "revisions_transcription_id_idx" ON "transcription_revisions" USING btree ("transcription_id");--> statement-breakpoint
CREATE INDEX "transcriptions_document_id_idx" ON "transcriptions" USING btree ("document_id");--> statement-breakpoint
CREATE INDEX "transcriptions_user_id_idx" ON "transcriptions" USING btree ("user_id");