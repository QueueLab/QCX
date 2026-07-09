-- Migration: fix_chat_db_normalization
-- Description: Redirect all user_id foreign keys from auth.users to public.users
-- to support Clerk-authenticated users who exist only in public.users.
-- This normalizes the schema so public.users is the canonical identity table.
-- Root cause: Clerk users authenticate via Clerk (not Supabase Auth), so their
-- user IDs exist in public.users but NOT in auth.users. The FK constraint
-- chats_user_id_fkey pointed to auth.users.id, causing foreign key violations
-- when inserting chats for Clerk-authenticated users.

-- Step 1: Drop all affected foreign key constraints referencing auth.users
ALTER TABLE public.chats
  DROP CONSTRAINT IF EXISTS chats_user_id_fkey;

ALTER TABLE public.messages
  DROP CONSTRAINT IF EXISTS messages_user_id_fkey;

ALTER TABLE public.system_prompts
  DROP CONSTRAINT IF EXISTS system_prompts_user_id_fkey;

ALTER TABLE public.locations
  DROP CONSTRAINT IF EXISTS locations_user_id_fkey;

ALTER TABLE public.visualizations
  DROP CONSTRAINT IF EXISTS visualizations_user_id_fkey;

ALTER TABLE public.chat_participants
  DROP CONSTRAINT IF EXISTS chat_participants_user_id_fkey;

-- Step 2: Add new foreign key constraints referencing public.users.id
ALTER TABLE public.chats
  ADD CONSTRAINT chats_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;

ALTER TABLE public.messages
  ADD CONSTRAINT messages_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;

ALTER TABLE public.system_prompts
  ADD CONSTRAINT system_prompts_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;

ALTER TABLE public.locations
  ADD CONSTRAINT locations_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;

ALTER TABLE public.visualizations
  ADD CONSTRAINT visualizations_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;

ALTER TABLE public.chat_participants
  ADD CONSTRAINT chat_participants_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;

-- Step 3: Add indexes on user_id columns for query performance
CREATE INDEX IF NOT EXISTS idx_chats_user_id ON public.chats(user_id);
CREATE INDEX IF NOT EXISTS idx_messages_user_id ON public.messages(user_id);
CREATE INDEX IF NOT EXISTS idx_system_prompts_user_id ON public.system_prompts(user_id);
CREATE INDEX IF NOT EXISTS idx_locations_user_id ON public.locations(user_id);
CREATE INDEX IF NOT EXISTS idx_visualizations_user_id ON public.visualizations(user_id);
CREATE INDEX IF NOT EXISTS idx_chat_participants_user_id ON public.chat_participants(user_id);
