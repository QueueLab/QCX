-- Temporary: Disable RLS for testing
-- This allows testing without authentication
-- Re-enable RLS in production!

ALTER TABLE public.chats DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_participants DISABLE ROW LEVEL SECURITY;

-- Add INSERT policy for chats
CREATE POLICY "Allow all inserts on chats" ON public.chats FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow all inserts on messages" ON public.messages FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow all inserts on chat_participants" ON public.chat_participants FOR INSERT WITH CHECK (true);
