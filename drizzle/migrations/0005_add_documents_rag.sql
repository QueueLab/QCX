-- 1. Create documents table
CREATE TABLE IF NOT EXISTS "documents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"chat_id" uuid,
	"storage_path" text NOT NULL,
	"mime" text,
	"status" text DEFAULT 'pending',
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

-- 2. Create document_chunks table
CREATE TABLE IF NOT EXISTS "document_chunks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"document_id" uuid NOT NULL,
	"chunk_text" text NOT NULL,
	"embedding" vector(1536),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);

-- 3. Add foreign keys
ALTER TABLE "documents" ADD CONSTRAINT "documents_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "documents" ADD CONSTRAINT "documents_chat_id_chats_id_fk" FOREIGN KEY ("chat_id") REFERENCES "public"."chats"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "document_chunks" ADD CONSTRAINT "document_chunks_document_id_documents_id_fk" FOREIGN KEY ("document_id") REFERENCES "public"."documents"("id") ON DELETE cascade ON UPDATE no action;

-- 4. Enable RLS on documents and document_chunks
ALTER TABLE "documents" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "document_chunks" ENABLE ROW LEVEL SECURITY;

-- 5. Add RLS policies for documents
DROP POLICY IF EXISTS "Users can manage their own documents" ON "documents";
CREATE POLICY "Users can manage their own documents" ON "documents"
  FOR ALL USING (
    user_id = auth.uid() OR public.is_clerk_user(user_id)
  );

-- 6. Add RLS policies for document_chunks
DROP POLICY IF EXISTS "Users can read document chunks" ON "document_chunks";
CREATE POLICY "Users can read document chunks" ON "document_chunks"
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.documents d
      WHERE d.id = document_chunks.document_id
        AND (d.user_id = auth.uid() OR public.is_clerk_user(d.user_id))
    )
  );

-- 7. Provision a private Supabase Storage bucket for chat attachments
INSERT INTO storage.buckets (id, name, public) VALUES ('chat-attachments', 'chat-attachments', false) ON CONFLICT DO NOTHING;

-- 8. Add Storage RLS policies keyed to is_clerk_user() / owner
DROP POLICY IF EXISTS "Allow users to upload attachments" ON storage.objects;
CREATE POLICY "Allow users to upload attachments" ON storage.objects
  FOR INSERT TO authenticated WITH CHECK (
    bucket_id = 'chat-attachments'
    AND (
      auth.uid() = owner
      OR public.is_clerk_user((SELECT id FROM public.users WHERE public.users.id = auth.uid()))
    )
  );

DROP POLICY IF EXISTS "Allow users to read their own attachments" ON storage.objects;
CREATE POLICY "Allow users to read their own attachments" ON storage.objects
  FOR SELECT TO authenticated USING (
    bucket_id = 'chat-attachments'
    AND (
      auth.uid() = owner
      OR public.is_clerk_user((SELECT id FROM public.users WHERE public.users.id = auth.uid()))
    )
  );

-- 9. Add a document-scoped vector retrieval RPC mirroring the hybrid_search() pattern
CREATE OR REPLACE FUNCTION match_document_chunks(
  query_embedding vector(1536),
  match_threshold float,
  match_count int,
  p_document_id uuid DEFAULT NULL
)
RETURNS TABLE (
  id uuid,
  document_id uuid,
  chunk_text text,
  similarity float
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    dc.id,
    dc.document_id,
    dc.chunk_text,
    (1 - (dc.embedding <=> query_embedding))::float AS similarity
  FROM document_chunks dc
  WHERE (p_document_id IS NULL OR dc.document_id = p_document_id)
    AND 1 - (dc.embedding <=> query_embedding) > match_threshold
  ORDER BY dc.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;
