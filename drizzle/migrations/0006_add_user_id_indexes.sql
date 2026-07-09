-- Migration: add_user_id_indexes
-- Description: Add performance indexes on user_id columns.
-- These use CREATE INDEX CONCURRENTLY to avoid blocking writes.
-- IMPORTANT: This migration MUST run outside a transaction.
-- CREATE INDEX CONCURRENTLY cannot execute inside a transaction block.
-- Run this file manually against the database:
--   psql $POSTGRES_URL -f 0006_add_user_id_indexes.sql
-- Or use the Supabase dashboard SQL editor (which does not wrap in transactions).
-- Do NOT use drizzle-kit migrate for this file; it wraps in a transaction.

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_chats_user_id ON public.chats(user_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_messages_user_id ON public.messages(user_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_system_prompts_user_id ON public.system_prompts(user_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_locations_user_id ON public.locations(user_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_visualizations_user_id ON public.visualizations(user_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_chat_participants_user_id ON public.chat_participants(user_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_prompt_generation_jobs_user_id ON public.prompt_generation_jobs(user_id);
