ALTER TABLE "collections" DROP CONSTRAINT "collections_created_by_user_id_fk";
--> statement-breakpoint
ALTER TABLE "collections" ADD CONSTRAINT "collections_created_by_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;