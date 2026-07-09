-- Migration 0008: Allow 'data' as a valid message role
-- The messages_role_check constraint currently only allows: user, assistant, system, tool
-- Internal context messages (drawing context, calendar notes) use role 'data'
-- This migration adds 'data' to the allowed values.
-- NOTE: updateDrawingContext and calendar.ts have been updated to use 'tool' instead of 'data'.
-- This migration is preventive: if any future code needs role 'data', it will be available.

ALTER TABLE "messages" DROP CONSTRAINT IF EXISTS "messages_role_check";
--> statement-breakpoint
ALTER TABLE "messages" ADD CONSTRAINT "messages_role_check" CHECK (role = ANY (ARRAY['user'::text, 'assistant'::text, 'system'::text, 'tool'::text, 'data'::text])) NOT VALID;
--> statement-breakpoint
ALTER TABLE "messages" VALIDATE CONSTRAINT "messages_role_check";
