CREATE TABLE "document_pages" (
	"id" text PRIMARY KEY NOT NULL,
	"document_id" text,
	"title" text NOT NULL,
	"description" text,
	"page_number" integer NOT NULL,
	"image_url" text NOT NULL,
	"cloudinary_public_id" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "document_pages_document_id_page_number_unique" UNIQUE("document_id","page_number")
);
--> statement-breakpoint
ALTER TABLE "transcriptions" RENAME COLUMN "document_id" TO "page_id";--> statement-breakpoint
ALTER TABLE "transcriptions" DROP CONSTRAINT "transcriptions_document_user_unique";--> statement-breakpoint
ALTER TABLE "transcriptions" DROP CONSTRAINT "transcriptions_document_id_documents_id_fk";
--> statement-breakpoint
DROP INDEX "transcriptions_document_id_idx";--> statement-breakpoint
ALTER TABLE "document_pages" ADD CONSTRAINT "document_pages_document_id_documents_id_fk" FOREIGN KEY ("document_id") REFERENCES "public"."documents"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transcriptions" ADD CONSTRAINT "transcriptions_page_id_document_pages_id_fk" FOREIGN KEY ("page_id") REFERENCES "public"."document_pages"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "transcriptions_page_id_idx" ON "transcriptions" USING btree ("page_id");--> statement-breakpoint
ALTER TABLE "documents" DROP COLUMN "cloudinary_public_id";--> statement-breakpoint
ALTER TABLE "documents" DROP COLUMN "cloudinary_url";--> statement-breakpoint
ALTER TABLE "transcriptions" ADD CONSTRAINT "transcriptions_page_id_user_id_unique" UNIQUE("page_id","user_id");