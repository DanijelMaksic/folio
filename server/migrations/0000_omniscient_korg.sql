CREATE TYPE "public"."document_status" AS ENUM('processing', 'ready', 'failed');--> statement-breakpoint
CREATE TYPE "public"."global_role" AS ENUM('viewer', 'contributor', 'editor', 'admin');--> statement-breakpoint
CREATE TYPE "public"."transcription_status" AS ENUM('draft', 'submitted', 'approved', 'rejected');--> statement-breakpoint
CREATE TABLE "account" (
	"id" text PRIMARY KEY NOT NULL,
	"account_id" text NOT NULL,
	"provider_id" text NOT NULL,
	"user_id" text NOT NULL,
	"access_token" text,
	"refresh_token" text,
	"id_token" text,
	"access_token_expires_at" timestamp,
	"refresh_token_expires_at" timestamp,
	"scope" text,
	"password" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "session" (
	"id" text PRIMARY KEY NOT NULL,
	"expires_at" timestamp NOT NULL,
	"token" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp NOT NULL,
	"ip_address" text,
	"user_agent" text,
	"user_id" text NOT NULL,
	CONSTRAINT "session_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "two_factor" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"secret" text NOT NULL,
	"backup_codes" text NOT NULL,
	"verified" boolean DEFAULT false,
	"failed_verification_count" integer DEFAULT 0 NOT NULL,
	"locked_until" timestamp
);
--> statement-breakpoint
CREATE TABLE "user" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"email_verified" boolean DEFAULT false NOT NULL,
	"image" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"username" text NOT NULL,
	"global_role" "global_role" DEFAULT 'viewer' NOT NULL,
	"two_factor_enabled" boolean DEFAULT false,
	CONSTRAINT "user_email_unique" UNIQUE("email"),
	CONSTRAINT "user_username_unique" UNIQUE("username")
);
--> statement-breakpoint
CREATE TABLE "verification" (
	"id" text PRIMARY KEY NOT NULL,
	"identifier" text NOT NULL,
	"value" text NOT NULL,
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "documents" (
	"id" text PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"uploaded_by" text NOT NULL,
	"version" integer NOT NULL,
	"cloudinary_public_id" text NOT NULL,
	"cloudinary_url" text NOT NULL,
	"status" "document_status" DEFAULT 'ready' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
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
	"rejected_reason" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "transcriptions_document_user_unique" UNIQUE("document_id","user_id")
);
--> statement-breakpoint
ALTER TABLE "account" ADD CONSTRAINT "account_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session" ADD CONSTRAINT "session_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "two_factor" ADD CONSTRAINT "two_factor_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "documents" ADD CONSTRAINT "documents_uploaded_by_user_id_fk" FOREIGN KEY ("uploaded_by") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transcription_revisions" ADD CONSTRAINT "transcription_revisions_transcription_id_transcriptions_id_fk" FOREIGN KEY ("transcription_id") REFERENCES "public"."transcriptions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transcriptions" ADD CONSTRAINT "transcriptions_document_id_documents_id_fk" FOREIGN KEY ("document_id") REFERENCES "public"."documents"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transcriptions" ADD CONSTRAINT "transcriptions_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "account_userId_idx" ON "account" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "session_userId_idx" ON "session" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "verification_identifier_idx" ON "verification" USING btree ("identifier");--> statement-breakpoint
CREATE INDEX "revisions_transcription_id_idx" ON "transcription_revisions" USING btree ("transcription_id");--> statement-breakpoint
CREATE INDEX "transcriptions_document_id_idx" ON "transcriptions" USING btree ("document_id");--> statement-breakpoint
CREATE INDEX "transcriptions_user_id_idx" ON "transcriptions" USING btree ("user_id");