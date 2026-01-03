-- Add missing columns to chats table for proper chat persistence
ALTER TABLE public.chats 
ADD COLUMN IF NOT EXISTS path TEXT,
ADD COLUMN IF NOT EXISTS share_path TEXT;

-- Add index for share_path lookups
CREATE INDEX IF NOT EXISTS idx_chats_share_path ON public.chats(share_path);
