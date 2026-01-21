-- =============================================
-- Fix RLS Policies for Chat Creation and Access
-- =============================================
-- This migration ensures authenticated users can create and access their own chats

-- =============================================
-- 1. Fix INSERT Policy on chats table
-- =============================================

-- Drop all existing INSERT policies on chats (they might conflict)
DROP POLICY IF EXISTS "Allow insert for authenticated users" ON public.chats;
DROP POLICY IF EXISTS "Users can insert their own chats" ON public.chats;

-- Create a clear INSERT policy that allows authenticated users to create chats
-- when they are the owner
CREATE POLICY "Authenticated users can create chats"
ON public.chats FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- =============================================
-- 2. Ensure proper SELECT policies on chats
-- =============================================

DROP POLICY IF EXISTS "Participants can view their chats" ON public.chats;

-- Users can view chats they are a participant in or public chats
CREATE POLICY "Users can view their chats"
ON public.chats FOR SELECT
TO authenticated
USING (
    auth.uid() = user_id
    OR visibility = 'public'
    OR EXISTS (
        SELECT 1 FROM public.chat_participants
        WHERE chat_participants.chat_id = chats.id
          AND chat_participants.user_id = auth.uid()
    )
);

-- =============================================
-- 3. Fix UPDATE policy on chats
-- =============================================

DROP POLICY IF EXISTS "Participants can update chat metadata" ON public.chats;

CREATE POLICY "Chat owners can update chats"
ON public.chats FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- =============================================
-- 4. Ensure Trigger Creates Participant Record
-- =============================================

-- Recreate the trigger function with proper security context
CREATE OR REPLACE FUNCTION public.handle_new_chat()
RETURNS TRIGGER AS $$
BEGIN
    -- Insert the chat creator as an owner in chat_participants
    INSERT INTO public.chat_participants (chat_id, user_id, role)
    VALUES (NEW.id, NEW.user_id, 'owner')
    ON CONFLICT (chat_id, user_id) DO NOTHING;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Ensure the trigger exists
DROP TRIGGER IF EXISTS trigger_handle_new_chat ON public.chats;
CREATE TRIGGER trigger_handle_new_chat
    AFTER INSERT ON public.chats
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_chat();

-- =============================================
-- 5. Fix INSERT policy on chat_participants
-- =============================================

-- Allow the trigger to insert the initial owner record
DROP POLICY IF EXISTS "Only owners can insert participants" ON public.chat_participants;

CREATE POLICY "System can add owner, users can add if owner"
ON public.chat_participants FOR INSERT
TO authenticated
WITH CHECK (
    -- Either: System trigger is creating the owner record (no need to check)
    -- Or: Current user is the owner of the chat
    auth.uid() = user_id
    AND (
        auth.uid() = (SELECT user_id FROM public.chats WHERE id = chat_id)
        OR EXISTS (
            SELECT 1 FROM public.chat_participants cp
            WHERE cp.chat_id = chat_participants.chat_id
              AND cp.user_id = auth.uid()
              AND cp.role = 'owner'
        )
    )
);

-- =============================================
-- 6. Ensure all tables have RLS enabled
-- =============================================

ALTER TABLE public.chats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- =============================================
-- 7. Grant necessary permissions
-- =============================================

-- Ensure the authenticated role can access these tables
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.chats TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.chat_participants TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.messages TO authenticated;

-- =============================================
-- Done!
-- =============================================
