-- Migration 0009: Add messageType and messageName columns to messages table
-- These columns store the AI message 'type' and 'name' fields, which are essential
-- for rehydrating chat state from the database when navigating to /search/[id].
-- The 'type' field determines how messages are rendered (response, input, related,
-- followup, resolution_search_result, tool, definition, etc.) and without it,
-- getUIStateFromAIState filters out all messages and the chat appears empty.
-- The 'name' field stores tool names (e.g., 'search', 'retrieve', 'videoSearch')
-- for tool-type messages.

ALTER TABLE "messages" ADD COLUMN "message_type" text;
--> statement-breakpoint
ALTER TABLE "messages" ADD COLUMN "message_name" text;
