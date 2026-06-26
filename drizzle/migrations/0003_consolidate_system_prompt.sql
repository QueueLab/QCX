-- Ensure system_prompts has a unique constraint on user_id
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'system_prompts_user_id_unique'
    ) THEN
        ALTER TABLE "system_prompts" ADD CONSTRAINT "system_prompts_user_id_unique" UNIQUE("user_id");
    END IF;
END $$;

-- Backfill existing users.system_prompt values into system_prompts
INSERT INTO "system_prompts" ("user_id", "prompt", "updated_at")
SELECT "id", "system_prompt", NOW()
FROM "users"
WHERE "system_prompt" IS NOT NULL
ON CONFLICT ("user_id") DO UPDATE
SET "prompt" = EXCLUDED."prompt", "updated_at" = EXCLUDED."updated_at";

-- Drop the users.system_prompt column
ALTER TABLE "users" DROP COLUMN IF EXISTS "system_prompt";
