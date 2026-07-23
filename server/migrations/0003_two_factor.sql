ALTER TABLE "user" ADD COLUMN "two_factor_enabled" boolean DEFAULT false;

CREATE TABLE "two_factor" (
   "id" text PRIMARY KEY NOT NULL,
   "user_id" text NOT NULL REFERENCES "user"("id") ON DELETE cascade,
   "secret" text NOT NULL,
   "backup_codes" text NOT NULL,
   "verified" boolean DEFAULT false,
   "failed_verification_count" integer NOT NULL DEFAULT 0,
   "locked_until" timestamp
);
