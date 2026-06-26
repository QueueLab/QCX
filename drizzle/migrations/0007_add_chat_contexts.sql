-- Create the chat_contexts table
CREATE TABLE IF NOT EXISTS "chat_contexts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"chat_id" uuid NOT NULL,
	"data" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "chat_contexts_chat_id_unique" UNIQUE("chat_id")
);

-- Add foreign key with cascade delete if table was just created
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'chat_contexts_chat_id_chats_id_fk'
    ) THEN
        ALTER TABLE "chat_contexts" ADD CONSTRAINT "chat_contexts_chat_id_chats_id_fk" FOREIGN KEY ("chat_id") REFERENCES "chats"("id") ON DELETE cascade;
    END IF;
END $$;

-- Migrate existing drawing-context role:'data' rows from messages into the new table
INSERT INTO "chat_contexts" ("chat_id", "data", "created_at", "updated_at")
SELECT "chat_id", "content"::jsonb, "created_at", "created_at"
FROM "messages"
WHERE "role" = 'data'
AND ("content"::jsonb ? 'cameraState' OR "content"::jsonb ? 'drawnFeatures')
AND NOT ("content"::jsonb ? 'type' AND "content"::jsonb->>'type' = 'calendar_note')
ON CONFLICT ("chat_id") DO UPDATE
SET "data" = EXCLUDED."data", "updated_at" = EXCLUDED."updated_at";

-- Delete migrated messages from the messages table
DELETE FROM "messages"
WHERE "role" = 'data'
AND ("content"::jsonb ? 'cameraState' OR "content"::jsonb ? 'drawnFeatures')
AND NOT ("content"::jsonb ? 'type' AND "content"::jsonb->>'type' = 'calendar_note');

-- Add RLS for chat_contexts
ALTER TABLE "chat_contexts" ENABLE ROW LEVEL SECURITY;
-- Note: chat_contexts is linked to chats, so we need to check chat ownership.
-- For simplicity, let's assume we can join to chats or use a similar policy to calendar_notes if it had a user_id.
-- Since chat_contexts doesn't have user_id, we'll use a policy that checks the linked chat.
CREATE POLICY "user_select_own_chat_contexts" ON "chat_contexts"
  FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM "chats"
    WHERE "chats"."id" = "chat_contexts"."chat_id"
    AND "chats"."user_id" = auth.uid()
  ));

CREATE POLICY "user_insert_own_chat_contexts" ON "chat_contexts"
  FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM "chats"
    WHERE "chats"."id" = "chat_contexts"."chat_id"
    AND "chats"."user_id" = auth.uid()
  ));

CREATE POLICY "user_update_own_chat_contexts" ON "chat_contexts"
  FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM "chats"
    WHERE "chats"."id" = "chat_contexts"."chat_id"
    AND "chats"."user_id" = auth.uid()
  ));

CREATE POLICY "user_delete_own_chat_contexts" ON "chat_contexts"
  FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM "chats"
    WHERE "chats"."id" = "chat_contexts"."chat_id"
    AND "chats"."user_id" = auth.uid()
  ));
