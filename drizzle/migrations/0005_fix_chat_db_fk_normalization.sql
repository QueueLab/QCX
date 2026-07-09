-- Migration: fix_chat_db_fk_normalization
-- Description: Redirect all user_id foreign keys from auth.users to public.users
-- to support Clerk-authenticated users who exist only in public.users.
-- This normalizes the schema so public.users is the canonical identity table.
-- Root cause: Clerk users authenticate via Clerk (not Supabase Auth), so their
-- user IDs exist in public.users but NOT in auth.users. The FK constraint
-- chats_user_id_fkey pointed to auth.users.id, causing foreign key violations
-- when inserting chats for Clerk-authenticated users.
--
-- Note: The 0001_sync_schema_full.sql migration creates the tables with
-- correct public.users FKs, but pre-existing FKs from the original schema
-- (pointing to auth.users) may still exist in some deployments.
-- This migration ensures all FKs are corrected.
--
-- FK creation uses NOT VALID to avoid blocking writes during creation,
-- then VALIDATE CONSTRAINT is called separately to enforce the constraint
-- only after existing data is verified. See migration 0006 for index creation.

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

ALTER TABLE public.prompt_generation_jobs
  DROP CONSTRAINT IF EXISTS prompt_generation_jobs_user_id_fkey;

-- Step 2: Add new foreign key constraints referencing public.users.id (NOT VALID)
ALTER TABLE public.chats
  ADD CONSTRAINT chats_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE NOT VALID;

ALTER TABLE public.messages
  ADD CONSTRAINT messages_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE NOT VALID;

ALTER TABLE public.system_prompts
  ADD CONSTRAINT system_prompts_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE NOT VALID;

ALTER TABLE public.locations
  ADD CONSTRAINT locations_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE NOT VALID;

ALTER TABLE public.visualizations
  ADD CONSTRAINT visualizations_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE NOT VALID;

ALTER TABLE public.chat_participants
  ADD CONSTRAINT chat_participants_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE NOT VALID;

ALTER TABLE public.prompt_generation_jobs
  ADD CONSTRAINT prompt_generation_jobs_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE NOT VALID;

-- Step 3: Validate all constraints (safe to run after data is verified)
ALTER TABLE public.chats
  VALIDATE CONSTRAINT chats_user_id_fkey;

ALTER TABLE public.messages
  VALIDATE CONSTRAINT messages_user_id_fkey;

ALTER TABLE public.system_prompts
  VALIDATE CONSTRAINT system_prompts_user_id_fkey;

ALTER TABLE public.locations
  VALIDATE CONSTRAINT locations_user_id_fkey;

ALTER TABLE public.visualizations
  VALIDATE CONSTRAINT visualizations_user_id_fkey;

ALTER TABLE public.chat_participants
  VALIDATE CONSTRAINT chat_participants_user_id_fkey;

ALTER TABLE public.prompt_generation_jobs
  VALIDATE CONSTRAINT prompt_generation_jobs_user_id_fkey;
