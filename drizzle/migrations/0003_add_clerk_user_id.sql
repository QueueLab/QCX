-- Custom migration to add clerk_user_id if it's missing (it was added in schema but generate says no changes)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='clerk_user_id') THEN
        ALTER TABLE "users" ADD COLUMN "clerk_user_id" text;
        ALTER TABLE "users" ADD CONSTRAINT "users_clerk_user_id_unique" UNIQUE("clerk_user_id");
    END IF;
END $$;
