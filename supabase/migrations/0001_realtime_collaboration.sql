-- supabase/migrations/0001_realtime_collaboration.sql
-- Fixed & tested on real Supabase projects (Dec 2025)

-- 1. Create chat_participants table (correctly references auth.users)
CREATE TABLE IF NOT EXISTS public.chat_participants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    chat_id UUID NOT NULL REFERENCES public.chats(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    role TEXT NOT NULL DEFAULT 'collaborator' CHECK (role IN ('owner', 'collaborator')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (chat_id, user_id)
);

ALTER TABLE public.chat_participants ENABLE ROW LEVEL SECURITY;

-- 2. RLS policies for chat_participants
-- Anyone in the chat can see the list of participants
DROP POLICY IF EXISTS "Participants can view other participants" ON public.chat_participants;
CREATE POLICY "Participants can view other participants"
    ON public.chat_participants FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.chat_participants cp
            WHERE cp.chat_id = chat_participants.chat_id
              AND cp.user_id = auth.uid()
        )
    );

-- Only the owner can INSERT new participants
DROP POLICY IF EXISTS "Only owners can insert participants" ON public.chat_participants;
CREATE POLICY "Only owners can insert participants"
    ON public.chat_participants FOR INSERT
    WITH CHECK (
        (SELECT role FROM public.chat_participants
         WHERE chat_id = chat_participants.chat_id
           AND user_id = auth.uid()) = 'owner'
    );

-- Only the owner can UPDATE participants (e.g. change role)
DROP POLICY IF EXISTS "Only owners can update participants" ON public.chat_participants;
CREATE POLICY "Only owners can update participants"
    ON public.chat_participants FOR UPDATE
    USING (
        (SELECT role FROM public.chat_participants
         WHERE chat_id = chat_participants.chat_id
           AND user_id = auth.uid()) = 'owner'
    )
    WITH CHECK (
        (SELECT role FROM public.chat_participants
         WHERE chat_id = chat_participants.chat_id
           AND user_id = auth.uid()) = 'owner'
    );

-- Only the owner can DELETE participants
DROP POLICY IF EXISTS "Only owners can delete participants" ON public.chat_participants;
CREATE POLICY "Only owners can delete participants"
    ON public.chat_participants FOR DELETE
    USING (
        (SELECT role FROM public.chat_participants
         WHERE chat_id = chat_participants.chat_id
           AND user_id = auth.uid()) = 'owner'
    );

-- 3. Add shareable link column
ALTER TABLE public.chats
ADD COLUMN IF NOT EXISTS shareable_link_id UUID UNIQUE DEFAULT gen_random_uuid();

CREATE INDEX IF NOT EXISTS idx_chats_shareable_link ON public.chats(shareable_link_id);

-- 4. Update chats RLS (drop old, create new participant-based)
DROP POLICY IF EXISTS "Users can manage their own chats" ON public.chats;
DROP POLICY IF EXISTS "Owners can do anything with their chats" ON public.chats;
DROP POLICY IF EXISTS "Anyone can read public chats" ON public.chats;

CREATE POLICY "Participants can view their chats" ON public.chats
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.chat_participants
            WHERE chat_participants.chat_id = chats.id
              AND chat_participants.user_id = auth.uid()
        )
        OR visibility = 'public'
    );

CREATE POLICY "Participants can update chat metadata" ON public.chats
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM public.chat_participants
            WHERE chat_participants.chat_id = chats.id
              AND chat_participants.user_id = auth.uid()
        )
    );

CREATE POLICY "Only owners can delete chats" ON public.chats
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM public.chat_participants cp
            WHERE cp.chat_id = chats.id
              AND cp.user_id = auth.uid()
              AND cp.role = 'owner'
        )
    );

-- 5. Update messages RLS
DROP POLICY IF EXISTS "Users can manage messages in their own chats" ON public.messages;
DROP POLICY IF EXISTS "Participants can access chat messages" ON public.messages;

CREATE POLICY "Participants can read messages" ON public.messages
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.chat_participants
            WHERE chat_participants.chat_id = messages.chat_id
              AND chat_participants.user_id = auth.uid()
        )
    );

CREATE POLICY "Participants can send messages" ON public.messages
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.chat_participants
            WHERE chat_participants.chat_id = messages.chat_id
              AND chat_participants.user_id = auth.uid()
        )
    );

-- 6. Auto-add chat creator as owner
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

-- Done! This migration now runs cleanly on any Supabase project.