-- In a real scenario, this migration might need to handle casting text to uuid.
-- Since the environment doesn't allow live migration application, I will ensure the SQL is theoretically sound.

DO $$
BEGIN
    -- Drop existing text foreign keys if any (from previous aborted migration)
    ALTER TABLE "calendar_notes" DROP CONSTRAINT IF EXISTS "calendar_notes_user_id_users_id_fk";
    ALTER TABLE "chat_participants" DROP CONSTRAINT IF EXISTS "chat_participants_user_id_users_id_fk";
    ALTER TABLE "chats" DROP CONSTRAINT IF EXISTS "chats_user_id_users_id_fk";
    ALTER TABLE "locations" DROP CONSTRAINT IF EXISTS "locations_user_id_users_id_fk";
    ALTER TABLE "messages" DROP CONSTRAINT IF EXISTS "messages_user_id_users_id_fk";
    ALTER TABLE "prompt_generation_jobs" DROP CONSTRAINT IF EXISTS "prompt_generation_jobs_user_id_users_id_fk";
    ALTER TABLE "system_prompts" DROP CONSTRAINT IF EXISTS "system_prompts_user_id_users_id_fk";
    ALTER TABLE "visualizations" DROP CONSTRAINT IF EXISTS "visualizations_user_id_users_id_fk";

    -- Alter columns back to UUID (casting if necessary)
    ALTER TABLE "users" ALTER COLUMN "id" SET DATA TYPE uuid USING (id::uuid);
    ALTER TABLE "users" ALTER COLUMN "id" SET DEFAULT gen_random_uuid();

    ALTER TABLE "calendar_notes" ALTER COLUMN "user_id" SET DATA TYPE uuid USING (user_id::uuid);
    ALTER TABLE "chat_participants" ALTER COLUMN "user_id" SET DATA TYPE uuid USING (user_id::uuid);
    ALTER TABLE "chats" ALTER COLUMN "user_id" SET DATA TYPE uuid USING (user_id::uuid);
    ALTER TABLE "locations" ALTER COLUMN "user_id" SET DATA TYPE uuid USING (user_id::uuid);
    ALTER TABLE "messages" ALTER COLUMN "user_id" SET DATA TYPE uuid USING (user_id::uuid);
    ALTER TABLE "prompt_generation_jobs" ALTER COLUMN "user_id" SET DATA TYPE uuid USING (user_id::uuid);
    ALTER TABLE "system_prompts" ALTER COLUMN "user_id" SET DATA TYPE uuid USING (user_id::uuid);
    ALTER TABLE "visualizations" ALTER COLUMN "user_id" SET DATA TYPE uuid USING (user_id::uuid);

    -- Re-add foreign keys as UUIDs
    ALTER TABLE "calendar_notes" ADD CONSTRAINT "calendar_notes_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
    ALTER TABLE "chat_participants" ADD CONSTRAINT "chat_participants_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
    ALTER TABLE "chats" ADD CONSTRAINT "chats_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
    ALTER TABLE "locations" ADD CONSTRAINT "locations_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
    ALTER TABLE "messages" ADD CONSTRAINT "messages_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
    ALTER TABLE "prompt_generation_jobs" ADD CONSTRAINT "prompt_generation_jobs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
    ALTER TABLE "system_prompts" ADD CONSTRAINT "system_prompts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
    ALTER TABLE "visualizations" ADD CONSTRAINT "visualizations_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;

    -- Add clerk_user_id column if not exists
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='clerk_user_id') THEN
        ALTER TABLE "users" ADD COLUMN "clerk_user_id" text;
        ALTER TABLE "users" ADD CONSTRAINT "users_clerk_user_id_unique" UNIQUE("clerk_user_id");
    END IF;
END $$;
