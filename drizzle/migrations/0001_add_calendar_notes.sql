CREATE TABLE IF NOT EXISTS "calendar_notes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"chat_id" uuid,
	"date" timestamp with time zone NOT NULL,
	"content" text NOT NULL,
	"location_tags" jsonb,
	"user_tags" text[],
	"map_feature_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "calendar_notes" ADD CONSTRAINT "calendar_notes_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "calendar_notes" ADD CONSTRAINT "calendar_notes_chat_id_chats_id_fk" FOREIGN KEY ("chat_id") REFERENCES "chats"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
ALTER TABLE "calendar_notes" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY "user_select_own_notes" ON "calendar_notes"
  FOR SELECT
  USING (auth.uid() = user_id);
--> statement-breakpoint
CREATE POLICY "user_insert_own_notes" ON "calendar_notes"
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);
--> statement-breakpoint
CREATE POLICY "user_update_own_notes" ON "calendar_notes"
  FOR UPDATE
  USING (auth.uid() = user_id);
--> statement-breakpoint
CREATE POLICY "user_delete_own_notes" ON "calendar_notes"
  FOR DELETE
  USING (auth.uid() = user_id);
