-- Add missing columns to chats table for proper chat persistence
ALTER TABLE public.chats 
ADD COLUMN IF NOT EXISTS path TEXT,
ADD COLUMN IF NOT EXISTS share_path TEXT;

-- Handle duplicate share_path values before adding unique constraint
DO $$
BEGIN
    IF EXISTS (
        SELECT share_path FROM public.chats
        WHERE share_path IS NOT NULL
        GROUP BY share_path HAVING COUNT(*) > 1
    ) THEN
        UPDATE public.chats c
        SET share_path = share_path || '-' || id::text
        WHERE id IN (
            SELECT id FROM (
                SELECT id, ROW_NUMBER() OVER (PARTITION BY share_path ORDER BY created_at) as rn
                FROM public.chats
                WHERE share_path IS NOT NULL
            ) t WHERE rn > 1
        );
    END IF;
END $$;

-- Add unique index for share_path lookups
CREATE UNIQUE INDEX IF NOT EXISTS idx_chats_share_path_unique ON public.chats(share_path) WHERE share_path IS NOT NULL;
