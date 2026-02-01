CREATE TABLE "calendar_notes" (
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
ALTER TABLE "messages" ADD COLUMN "attachments" jsonb;--> statement-breakpoint
ALTER TABLE "messages" ADD COLUMN "tool_name" varchar(100);--> statement-breakpoint
ALTER TABLE "messages" ADD COLUMN "tool_call_id" varchar(100);--> statement-breakpoint
ALTER TABLE "messages" ADD COLUMN "type" varchar(50);--> statement-breakpoint
ALTER TABLE "calendar_notes" ADD CONSTRAINT "calendar_notes_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "calendar_notes" ADD CONSTRAINT "calendar_notes_chat_id_chats_id_fk" FOREIGN KEY ("chat_id") REFERENCES "public"."chats"("id") ON DELETE cascade ON UPDATE no action;