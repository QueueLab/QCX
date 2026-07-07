-- We need to drop the constraints first because we are changing the data type of the columns they depend on.
-- Drizzle's auto-generated migration might miss this order or depend on implicit behavior.
-- Since it's Postgres, we can do it in a transaction.

DO $$
BEGIN
    -- Drop foreign keys
    ALTER TABLE "calendar_notes" DROP CONSTRAINT IF EXISTS "calendar_notes_user_id_users_id_fk";
    ALTER TABLE "chat_participants" DROP CONSTRAINT IF EXISTS "chat_participants_user_id_users_id_fk";
    ALTER TABLE "chats" DROP CONSTRAINT IF EXISTS "chats_user_id_users_id_fk";
    ALTER TABLE "locations" DROP CONSTRAINT IF EXISTS "locations_user_id_users_id_fk";
    ALTER TABLE "messages" DROP CONSTRAINT IF EXISTS "messages_user_id_users_id_fk";
    ALTER TABLE "prompt_generation_jobs" DROP CONSTRAINT IF EXISTS "prompt_generation_jobs_user_id_users_id_fk";
    ALTER TABLE "system_prompts" DROP CONSTRAINT IF EXISTS "system_prompts_user_id_users_id_fk";
    ALTER TABLE "visualizations" DROP CONSTRAINT IF EXISTS "visualizations_user_id_users_id_fk";

    -- Alter columns
    ALTER TABLE "users" ALTER COLUMN "id" SET DATA TYPE text;
    ALTER TABLE "users" ALTER COLUMN "id" DROP DEFAULT;

    ALTER TABLE "calendar_notes" ALTER COLUMN "user_id" SET DATA TYPE text;
    ALTER TABLE "chat_participants" ALTER COLUMN "user_id" SET DATA TYPE text;
    ALTER TABLE "chats" ALTER COLUMN "user_id" SET DATA TYPE text;
    ALTER TABLE "locations" ALTER COLUMN "user_id" SET DATA TYPE text;
    ALTER TABLE "messages" ALTER COLUMN "user_id" SET DATA TYPE text;
    ALTER TABLE "prompt_generation_jobs" ALTER COLUMN "user_id" SET DATA TYPE text;
    ALTER TABLE "system_prompts" ALTER COLUMN "user_id" SET DATA TYPE text;
    ALTER TABLE "visualizations" ALTER COLUMN "user_id" SET DATA TYPE text;

    -- Re-add foreign keys
    ALTER TABLE "calendar_notes" ADD CONSTRAINT "calendar_notes_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
    ALTER TABLE "chat_participants" ADD CONSTRAINT "chat_participants_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
    ALTER TABLE "chats" ADD CONSTRAINT "chats_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
    ALTER TABLE "locations" ADD CONSTRAINT "locations_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
    ALTER TABLE "messages" ADD CONSTRAINT "messages_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
    ALTER TABLE "prompt_generation_jobs" ADD CONSTRAINT "prompt_generation_jobs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
    ALTER TABLE "system_prompts" ADD CONSTRAINT "system_prompts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
    ALTER TABLE "visualizations" ADD CONSTRAINT "visualizations_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;

    -- Handle existing data if any (optional, usually would need casting)
    -- In this case, UUID to TEXT is straightforward.
END $$;

ALTER TABLE "users" DROP COLUMN IF EXISTS "clerk_user_id";
