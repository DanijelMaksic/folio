ALTER TABLE "refresh_tokens" RENAME TO "sessions";--> statement-breakpoint
ALTER TABLE "sessions" DROP CONSTRAINT "refresh_tokens_tokenHash_unique";--> statement-breakpoint
ALTER TABLE "sessions" DROP CONSTRAINT "refresh_tokens_userId_users_id_fk";
--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_userId_users_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" DROP COLUMN "tokenHash";--> statement-breakpoint
ALTER TABLE "sessions" DROP COLUMN "family";--> statement-breakpoint
ALTER TABLE "sessions" DROP COLUMN "revoked";
