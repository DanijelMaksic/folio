ALTER TABLE "user" ALTER COLUMN "global_role" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "user" ALTER COLUMN "global_role" SET DEFAULT 'contributor'::text;--> statement-breakpoint
ALTER TABLE "role_requests" ALTER COLUMN "requested_role" SET DATA TYPE text;--> statement-breakpoint
DROP TYPE "public"."global_role";--> statement-breakpoint
CREATE TYPE "public"."global_role" AS ENUM('contributor', 'editor', 'admin');--> statement-breakpoint
ALTER TABLE "user" ALTER COLUMN "global_role" SET DEFAULT 'contributor'::"public"."global_role";--> statement-breakpoint
ALTER TABLE "user" ALTER COLUMN "global_role" SET DATA TYPE "public"."global_role" USING "global_role"::"public"."global_role";--> statement-breakpoint
ALTER TABLE "role_requests" ALTER COLUMN "requested_role" SET DATA TYPE "public"."global_role" USING "requested_role"::"public"."global_role";