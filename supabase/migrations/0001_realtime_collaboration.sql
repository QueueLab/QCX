-- supabase/migrations/0001_realtime_collaboration.sql

-- 1. Create the chat_participants table
CREATE TABLE public.chat_participants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    chat_id UUID NOT NULL REFERENCES public.chats(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    role TEXT NOT NULL DEFAULT 'collaborator' CHECK (role IN ('owner', 'collaborator')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (chat_id, user_id)
);

ALTER TABLE public.chat_participants ENABLE ROW LEVEL SECURITY;

-- 2. Add RLS policies for chat_participants
CREATE POLICY "Chat participants can be viewed by other participants" ON public.chat_participants
FOR SELECT USING (
    chat_id IN (
        SELECT chat_id FROM public.chat_participants WHERE user_id = auth.uid()
    )
);

CREATE POLICY "Chat owners can manage participants" ON public.chat_participants
FOR ALL USING (
    (SELECT role FROM public.chat_participants WHERE chat_id = chat_participants.chat_id AND user_id = auth.uid()) = 'owner'
);


-- 3. Update chats table for shareable links
ALTER TABLE public.chats
ADD COLUMN shareable_link_id UUID UNIQUE DEFAULT gen_random_uuid();

-- 4. Update RLS policies on chats table
-- Drop the old policy first
DROP POLICY "Users can manage their own chats" ON public.chats;

-- Create new policies
CREATE POLICY "Users can select chats they are a part of" ON public.chats
FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM public.chat_participants
        WHERE chat_participants.chat_id = chats.id AND chat_participants.user_id = auth.uid()
    )
);

CREATE POLICY "Chat owners can update and delete their chats" ON public.chats
FOR UPDATE, DELETE USING (
    (SELECT role FROM public.chat_participants WHERE chat_id = chats.id AND user_id = auth.uid()) = 'owner'
);

-- 5. Update RLS policies on messages table
-- Drop the old policy first
DROP POLICY "Users can manage messages in their own chats" ON public.messages;

-- Create new policies
CREATE POLICY "Users can select messages in chats they are a part of" ON public.messages
FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM public.chat_participants
        WHERE chat_participants.chat_id = messages.chat_id AND chat_participants.user_id = auth.uid()
    )
);

CREATE POLICY "Users can insert messages in chats they are a part of" ON public.messages
FOR INSERT WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.chat_participants
        WHERE chat_participants.chat_id = messages.chat_id AND chat_participants.user_id = auth.uid()
    )
);
