-- Migration 0007: Create missing prompt_generation_jobs table
-- This table was defined in schema.ts and migration 0002 but was never applied to production.

CREATE TABLE IF NOT EXISTS "prompt_generation_jobs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"domain" text NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"result_prompt" text,
	"error_message" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "prompt_generation_jobs" ADD CONSTRAINT "prompt_generation_jobs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action NOT VALID;
--> statement-breakpoint
ALTER TABLE "prompt_generation_jobs" VALIDATE CONSTRAINT "prompt_generation_jobs_user_id_fkey";
