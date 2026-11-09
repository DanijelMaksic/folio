CREATE TABLE "role_changes" (
	"id" text PRIMARY KEY NOT NULL,
	"actor_id" text,
	"target_id" text,
	"actor_username" text NOT NULL,
	"target_username" text NOT NULL,
	"old_role" text NOT NULL,
	"new_role" text NOT NULL,
	"source" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
DROP TABLE "notes" CASCADE;--> statement-breakpoint
ALTER TABLE "role_changes" ADD CONSTRAINT "role_changes_actor_id_user_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "role_changes" ADD CONSTRAINT "role_changes_target_id_user_id_fk" FOREIGN KEY ("target_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;