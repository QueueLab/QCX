-- =============================================
-- Fix Schema Discrepancies Between Code and Database
-- =============================================
-- This migration corrects all issues found in the QCX-BACKEND database
-- to match the expected schema from migration files and codebase

-- =============================================
-- 1. Add Missing Columns to chats Table
-- =============================================

-- Add updated_at column (expected by 0000_init.sql)
ALTER TABLE public.chats 
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

-- Add shareable_link_id column (expected by 0001_realtime_collaboration.sql)
ALTER TABLE public.chats 
ADD COLUMN IF NOT EXISTS shareable_link_id UUID UNIQUE DEFAULT gen_random_uuid();

-- Create index for shareable_link_id lookups
CREATE INDEX IF NOT EXISTS idx_chats_shareable_link ON public.chats(shareable_link_id);

-- =============================================
-- 2. Fix chat_participants Table Schema
-- =============================================

-- Update default role from 'participant' to 'collaborator'
ALTER TABLE public.chat_participants 
ALTER COLUMN role SET DEFAULT 'collaborator';

-- Add CHECK constraint for role values
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'chat_participants_role_check'
    ) THEN
        ALTER TABLE public.chat_participants 
        ADD CONSTRAINT chat_participants_role_check 
        CHECK (role IN ('owner', 'collaborator'));
    END IF;
END $$;

-- Add UNIQUE constraint on (chat_id, user_id) to prevent duplicates
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'chat_participants_chat_id_user_id_key'
    ) THEN
        ALTER TABLE public.chat_participants 
        ADD CONSTRAINT chat_participants_chat_id_user_id_key 
        UNIQUE (chat_id, user_id);
    END IF;
END $$;

-- =============================================
-- 3. Enable RLS on chat_participants (CRITICAL!)
-- =============================================

ALTER TABLE public.chat_participants ENABLE ROW LEVEL SECURITY;

-- =============================================
-- 4. Fix INSERT Policies (Security Issue)
-- =============================================

-- Drop weak INSERT policy on chats
DROP POLICY IF EXISTS "Users can insert their own chats" ON public.chats;

-- Create secure INSERT policy that enforces user_id = auth.uid()
CREATE POLICY "Users can insert their own chats" 
ON public.chats 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Drop weak INSERT policy on chat_participants
DROP POLICY IF EXISTS "Users can insert their own participation" ON public.chat_participants;

-- =============================================
-- 5. Create Proper RLS Policies for chat_participants
-- =============================================

-- Allow participants to view other participants in the same chat
CREATE POLICY "Participants can view other participants"
ON public.chat_participants FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM public.chat_participants cp
        WHERE cp.chat_id = chat_participants.chat_id
          AND cp.user_id = auth.uid()
    )
);

-- Only chat owners can add new participants
CREATE POLICY "Only owners can insert participants"
ON public.chat_participants FOR INSERT
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.chat_participants cp
        WHERE cp.chat_id = chat_participants.chat_id
          AND cp.user_id = auth.uid()
          AND cp.role = 'owner'
    )
);

-- Only chat owners can update participant roles
CREATE POLICY "Only owners can update participants"
ON public.chat_participants FOR UPDATE
USING (
    EXISTS (
        SELECT 1 FROM public.chat_participants cp
        WHERE cp.chat_id = chat_participants.chat_id
          AND cp.user_id = auth.uid()
          AND cp.role = 'owner'
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.chat_participants cp
        WHERE cp.chat_id = chat_participants.chat_id
          AND cp.user_id = auth.uid()
          AND cp.role = 'owner'
    )
);

-- Only chat owners can remove participants
CREATE POLICY "Only owners can delete participants"
ON public.chat_participants FOR DELETE
USING (
    EXISTS (
        SELECT 1 FROM public.chat_participants cp
        WHERE cp.chat_id = chat_participants.chat_id
          AND cp.user_id = auth.uid()
          AND cp.role = 'owner'
    )
);

-- =============================================
-- 6. Ensure Trigger Exists for Auto-adding Owner
-- =============================================

-- This trigger should already exist from 0001_realtime_collaboration.sql
-- but we'll recreate it to be safe
CREATE OR REPLACE FUNCTION public.make_creator_owner()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.chat_participants (chat_id, user_id, role)
    VALUES (NEW.id, NEW.user_id, 'owner')
    ON CONFLICT (chat_id, user_id) DO NOTHING;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_make_creator_owner ON public.chats;
CREATE TRIGGER trigger_make_creator_owner
    AFTER INSERT ON public.chats
    FOR EACH ROW
    EXECUTE FUNCTION public.make_creator_owner();

-- =============================================
-- 7. Verify All Tables Have RLS Enabled
-- =============================================

ALTER TABLE public.chats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_prompts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.visualizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_participants ENABLE ROW LEVEL SECURITY;

-- =============================================
-- Done! Schema now matches migration files and codebase
-- =============================================
