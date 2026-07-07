ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "clerk_user_id" text;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'users_clerk_user_id_unique') THEN
        ALTER TABLE "users" ADD CONSTRAINT "users_clerk_user_id_unique" UNIQUE("clerk_user_id");
    END IF;
END $$;
