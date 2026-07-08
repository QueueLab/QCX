-- Create a function to extract the Clerk user ID from the JWT
CREATE OR REPLACE FUNCTION public.clerk_id()
RETURNS text AS $$
  SELECT (auth.jwt() ->> 'sub');
$$ LANGUAGE sql STABLE;
--> statement-breakpoint

-- Create a function to check if a user matches the Clerk ID
CREATE OR REPLACE FUNCTION public.is_clerk_user(user_id uuid)
RETURNS boolean AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.users
    WHERE id = user_id AND clerk_user_id = public.clerk_id()
  );
$$ LANGUAGE sql STABLE;
--> statement-breakpoint

-- Update RLS policies for users table
DROP POLICY IF EXISTS "Users can manage their own profile" ON public.users;
CREATE POLICY "Users can manage their own profile" ON public.users
FOR ALL USING (
  id = auth.uid() -- Original Supabase Auth
  OR
  clerk_user_id = public.clerk_id() -- Clerk Auth
);
--> statement-breakpoint

-- Update RLS policies for chats table
DROP POLICY IF EXISTS "Users can manage their own chats" ON public.chats;
CREATE POLICY "Users can manage their own chats" ON public.chats
FOR ALL USING (
  user_id = auth.uid() -- Original Supabase Auth
  OR
  public.is_clerk_user(user_id) -- Clerk Auth
);
--> statement-breakpoint

DROP POLICY IF EXISTS "Users can insert their own chats" ON public.chats;
CREATE POLICY "Users can insert their own chats" ON public.chats
FOR INSERT WITH CHECK (
  user_id = auth.uid() -- Original Supabase Auth
  OR
  public.is_clerk_user(user_id) -- Clerk Auth
);
--> statement-breakpoint

DROP POLICY IF EXISTS "Users can select chats they are a part of" ON public.chats;
CREATE POLICY "Users can select chats they are a part of" ON public.chats
FOR SELECT USING (
  user_id = auth.uid() -- Original Supabase Auth
  OR
  public.is_clerk_user(user_id) -- Clerk Auth
  OR
  EXISTS (
    SELECT 1 FROM public.chat_participants
    WHERE chat_id = chats.id AND (user_id = auth.uid() OR public.is_clerk_user(user_id))
  )
);
--> statement-breakpoint

-- Messages
DROP POLICY IF EXISTS "messages_owner_participant_access" ON public.messages;
CREATE POLICY "messages_owner_participant_access" ON public.messages
FOR ALL USING (
  user_id = auth.uid()
  OR
  public.is_clerk_user(user_id)
  OR
  EXISTS (
    SELECT 1 FROM public.chats
    WHERE chats.id = messages.chat_id AND (chats.user_id = auth.uid() OR public.is_clerk_user(chats.user_id))
  )
  OR
  EXISTS (
    SELECT 1 FROM public.chat_participants
    WHERE chat_participants.chat_id = messages.chat_id AND (chat_participants.user_id = auth.uid() OR public.is_clerk_user(chat_participants.user_id))
  )
);
--> statement-breakpoint

-- Calendar Notes
DROP POLICY IF EXISTS "Users can manage their own calendar notes" ON public.calendar_notes;
CREATE POLICY "Users can manage their own calendar notes" ON public.calendar_notes
FOR ALL USING (
  user_id = auth.uid()
  OR
  public.is_clerk_user(user_id)
);
--> statement-breakpoint

-- System Prompts
DROP POLICY IF EXISTS "Users can manage their own system prompts" ON public.system_prompts;
CREATE POLICY "Users can manage their own system prompts" ON public.system_prompts
FOR ALL USING (
  user_id = auth.uid()
  OR
  public.is_clerk_user(user_id)
);
--> statement-breakpoint

-- Locations
DROP POLICY IF EXISTS "Users can manage their own locations" ON public.locations;
CREATE POLICY "Users can manage their own locations" ON public.locations
FOR ALL USING (
  user_id = auth.uid()
  OR
  public.is_clerk_user(user_id)
);
--> statement-breakpoint

-- Visualizations
DROP POLICY IF EXISTS "Users can manage their own visualizations" ON public.visualizations;
CREATE POLICY "Users can manage their own visualizations" ON public.visualizations
FOR ALL USING (
  user_id = auth.uid()
  OR
  public.is_clerk_user(user_id)
);
--> statement-breakpoint

-- Chat Participants
DROP POLICY IF EXISTS "Only owners can delete participants" ON public.chat_participants;
CREATE POLICY "Only owners can delete participants" ON public.chat_participants
FOR DELETE USING (
  EXISTS (
    SELECT 1 FROM public.chat_participants cp
    WHERE cp.chat_id = chat_participants.chat_id
    AND (cp.user_id = auth.uid() OR public.is_clerk_user(cp.user_id))
    AND cp.role = 'owner'
  )
);
--> statement-breakpoint

DROP POLICY IF EXISTS "Only owners can insert participants" ON public.chat_participants;
CREATE POLICY "Only owners can insert participants" ON public.chat_participants
FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.chat_participants cp
    WHERE cp.chat_id = chat_participants.chat_id
    AND (cp.user_id = auth.uid() OR public.is_clerk_user(cp.user_id))
    AND cp.role = 'owner'
  )
);
--> statement-breakpoint

DROP POLICY IF EXISTS "Only owners can update participants" ON public.chat_participants;
CREATE POLICY "Only owners can update participants" ON public.chat_participants
FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM public.chat_participants cp
    WHERE cp.chat_id = chat_participants.chat_id
    AND (cp.user_id = auth.uid() OR public.is_clerk_user(cp.user_id))
    AND cp.role = 'owner'
  )
);
--> statement-breakpoint

DROP POLICY IF EXISTS "Participants can view other participants" ON public.chat_participants;
CREATE POLICY "Participants can view other participants" ON public.chat_participants
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.chat_participants cp
    WHERE cp.chat_id = chat_participants.chat_id
    AND (cp.user_id = auth.uid() OR public.is_clerk_user(cp.user_id))
  )
);
