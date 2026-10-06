ALTER TABLE "transcriptions" DROP CONSTRAINT "transcriptions_user_id_user_id_fk";
--> statement-breakpoint
ALTER TABLE "transcriptions" ALTER COLUMN "user_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "transcriptions" ADD CONSTRAINT "transcriptions_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;