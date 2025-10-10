-- Create chats table
CREATE TABLE IF NOT EXISTS public.chats (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    title VARCHAR(256) NOT NULL DEFAULT 'Untitled Chat',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    visibility VARCHAR(50) DEFAULT 'private'
);

-- Create messages table
CREATE TABLE IF NOT EXISTS public.messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    chat_id UUID NOT NULL REFERENCES public.chats(id) ON DELETE CASCADE,
    user_id UUID NOT NULL,
    role VARCHAR(50) NOT NULL,
    content TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create system_prompts table
CREATE TABLE IF NOT EXISTS public.system_prompts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL UNIQUE,
    prompt TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable RLS for the tables
ALTER TABLE public.chats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_prompts ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for chats
CREATE POLICY "Allow individual read access on chats" ON public.chats FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Allow individual insert access on chats" ON public.chats FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Allow individual update access on chats" ON public.chats FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Allow individual delete access on chats" ON public.chats FOR DELETE USING (auth.uid() = user_id);

-- Create RLS policies for messages
CREATE POLICY "Allow read access on messages to chat members" ON public.messages FOR SELECT USING (chat_id IN (SELECT id FROM public.chats WHERE user_id = auth.uid()));
CREATE POLICY "Allow insert access on messages to chat members" ON public.messages FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Allow individual update access on messages" ON public.messages FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Allow individual delete access on messages" ON public.messages FOR DELETE USING (auth.uid() = user_id);

-- Create RLS policies for system_prompts
CREATE POLICY "Allow individual read access on system_prompts" ON public.system_prompts FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Allow individual insert access on system_prompts" ON public.system_prompts FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Allow individual update access on system_prompts" ON public.system_prompts FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Allow individual delete access on system_prompts" ON public.system_prompts FOR DELETE USING (auth.uid() = user_id);

-- Stored procedure for saving a chat and its messages
CREATE OR REPLACE FUNCTION save_chat_with_messages(
    chat_id_input UUID,
    user_id_input UUID,
    title_input VARCHAR,
    messages_input JSONB
)
RETURNS UUID
LANGUAGE plpgsql
AS $$
DECLARE
    new_chat_id UUID;
BEGIN
    -- Upsert chat
    IF chat_id_input IS NOT NULL AND EXISTS (SELECT 1 FROM public.chats WHERE id = chat_id_input) THEN
        UPDATE public.chats
        SET title = title_input
        WHERE id = chat_id_input
        RETURNING id INTO new_chat_id;
    ELSE
        INSERT INTO public.chats (id, user_id, title)
        VALUES (COALESCE(chat_id_input, gen_random_uuid()), user_id_input, title_input)
        RETURNING id INTO new_chat_id;
    END IF;

    -- Insert messages
    IF jsonb_array_length(messages_input) > 0 THEN
        INSERT INTO public.messages (id, chat_id, user_id, role, content, created_at)
        SELECT
            (m->>'id')::UUID,
            new_chat_id,
            (m->>'userId')::UUID,
            m->>'role',
            m->>'content',
            (m->>'createdAt')::TIMESTAMPTZ
        FROM jsonb_array_elements(messages_input) AS m;
    END IF;

    RETURN new_chat_id;
END;
$$;