-- =============================================
-- Fix clerk_id() function to return actual Clerk user ID
-- =============================================
-- Problem: The previous clerk_id() function returned auth.jwt() ->> 'sub'
-- which is the Supabase auth.users UUID, NOT the Clerk user ID string.
-- This caused is_clerk_user() and all RLS policies to never match,
-- blocking all Clerk-authenticated users from accessing data.
--
-- Fix: clerk_id() now looks up the Clerk user ID from the public.users
-- table by matching the current session's auth.uid() (Supabase UUID).
-- =============================================

-- 1. Fix clerk_id() function — returns the Clerk ID from public.users
CREATE OR REPLACE FUNCTION public.clerk_id()
RETURNS text
LANGUAGE SQL
SECURITY DEFINER
SET search_path = public, auth, pg_temp
STABLE
AS $$
  SELECT public.users.clerk_user_id
  FROM public.users
  WHERE public.users.id = auth.uid()
  LIMIT 1;
$$;

-- 2. Fix is_clerk_user() function — simplified since clerk_id() now returns the correct value
CREATE OR REPLACE FUNCTION public.is_clerk_user(p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL
SECURITY DEFINER
SET search_path = public, auth, pg_temp
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.users
    WHERE public.users.id = p_user_id
      AND public.users.clerk_user_id IS NOT NULL
      AND public.users.clerk_user_id = public.clerk_id()
  );
$$;

-- 3. Re-apply all RLS policies (DROP + CREATE to ensure clean state)

-- Users table
DROP POLICY IF EXISTS "Users can manage their own profile" ON public.users;
CREATE POLICY "Users can manage their own profile" ON public.users
  FOR ALL USING (
    id = auth.uid()
    OR clerk_user_id = public.clerk_id()
  );

-- Chats table
DROP POLICY IF EXISTS "Users can select chats they are a part of" ON public.chats;
CREATE POLICY "Users can select chats they are a part of" ON public.chats
  FOR SELECT USING (
    user_id = auth.uid()
    OR public.is_clerk_user(user_id)
    OR EXISTS (
      SELECT 1 FROM public.chat_participants
      WHERE chat_participants.chat_id = chats.id
        AND (chat_participants.user_id = auth.uid() OR public.is_clerk_user(chat_participants.user_id))
    )
  );

DROP POLICY IF EXISTS "Users can insert their own chats" ON public.chats;
CREATE POLICY "Users can insert their own chats" ON public.chats
  FOR INSERT WITH CHECK (
    user_id = auth.uid() OR public.is_clerk_user(user_id)
  );

DROP POLICY IF EXISTS "Users can manage their own chats" ON public.chats;
CREATE POLICY "Users can manage their own chats" ON public.chats
  FOR ALL USING (
    user_id = auth.uid() OR public.is_clerk_user(user_id)
  );

-- Messages table
DROP POLICY IF EXISTS "messages_owner_participant_access" ON public.messages;
CREATE POLICY "messages_owner_participant_access" ON public.messages
  FOR ALL USING (
    user_id = auth.uid()
    OR public.is_clerk_user(user_id)
    OR EXISTS (
      SELECT 1 FROM public.chats
      WHERE chats.id = messages.chat_id
        AND (chats.user_id = auth.uid() OR public.is_clerk_user(chats.user_id))
    )
    OR EXISTS (
      SELECT 1 FROM public.chat_participants
      WHERE chat_participants.chat_id = messages.chat_id
        AND (chat_participants.user_id = auth.uid() OR public.is_clerk_user(chat_participants.user_id))
    )
  );

-- Calendar notes
DROP POLICY IF EXISTS "Users can manage their own calendar notes" ON public.calendar_notes;
CREATE POLICY "Users can manage their own calendar notes" ON public.calendar_notes
  FOR ALL USING (user_id = auth.uid() OR public.is_clerk_user(user_id));

-- System prompts
DROP POLICY IF EXISTS "Users can manage their own system prompts" ON public.system_prompts;
CREATE POLICY "Users can manage their own system prompts" ON public.system_prompts
  FOR ALL USING (user_id = auth.uid() OR public.is_clerk_user(user_id));

-- Locations
DROP POLICY IF EXISTS "Users can manage their own locations" ON public.locations;
CREATE POLICY "Users can manage their own locations" ON public.locations
  FOR ALL USING (user_id = auth.uid() OR public.is_clerk_user(user_id));

-- Visualizations
DROP POLICY IF EXISTS "Users can manage their own visualizations" ON public.visualizations;
CREATE POLICY "Users can manage their own visualizations" ON public.visualizations
  FOR ALL USING (user_id = auth.uid() OR public.is_clerk_user(user_id));

-- Chat participants
DROP POLICY IF EXISTS "Only owners can insert participants" ON public.chat_participants;
CREATE POLICY "Only owners can insert participants" ON public.chat_participants
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.chat_participants cp
      WHERE cp.chat_id = chat_participants.chat_id
        AND (cp.user_id = auth.uid() OR public.is_clerk_user(cp.user_id))
        AND cp.role = 'owner'
    )
    OR public.is_clerk_user(user_id)
  );

DROP POLICY IF EXISTS "Only owners can update participants" ON public.chat_participants;
CREATE POLICY "Only owners can update participants" ON public.chat_participants
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.chat_participants cp
      WHERE cp.chat_id = chat_participants.chat_id
        AND (cp.user_id = auth.uid() OR public.is_clerk_user(cp.user_id))
        AND cp.role = 'owner'
    )
    OR public.is_clerk_user(user_id)
  );

DROP POLICY IF EXISTS "Only owners can delete participants" ON public.chat_participants;
CREATE POLICY "Only owners can delete participants" ON public.chat_participants
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.chat_participants cp
      WHERE cp.chat_id = chat_participants.chat_id
        AND (cp.user_id = auth.uid() OR public.is_clerk_user(cp.user_id))
        AND cp.role = 'owner'
    )
    OR public.is_clerk_user(user_id)
  );

DROP POLICY IF EXISTS "Participants can view other participants" ON public.chat_participants;
CREATE POLICY "Participants can view other participants" ON public.chat_participants
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.chat_participants cp
      WHERE cp.chat_id = chat_participants.chat_id
        AND (cp.user_id = auth.uid() OR public.is_clerk_user(cp.user_id))
    )
  );
