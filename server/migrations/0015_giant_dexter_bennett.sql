CREATE TABLE "categories" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "categories_name_unique" UNIQUE("name"),
	CONSTRAINT "categories_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
DROP INDEX "transcriptions_one_open_per_user_page";--> statement-breakpoint
ALTER TABLE "documents" ADD COLUMN "category_id" text;--> statement-breakpoint
ALTER TABLE "collections" ADD COLUMN "category_id" text;--> statement-breakpoint
ALTER TABLE "documents" ADD CONSTRAINT "documents_category_id_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "collections" ADD CONSTRAINT "collections_category_id_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "transcriptions_one_approved_per_page" ON "transcriptions" USING btree ("page_id") WHERE "transcriptions"."status" = 'approved';--> statement-breakpoint
CREATE UNIQUE INDEX "transcriptions_one_open_per_user_page" ON "transcriptions" USING btree ("page_id","user_id") WHERE "transcriptions"."status" in ('draft', 'submitted', 'rejected');