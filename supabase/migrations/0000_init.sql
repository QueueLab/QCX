-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "postgis";
CREATE EXTENSION IF NOT EXISTS "vector";

-- Users Table (assuming Supabase Auth's public.users table exists)
-- We'll add RLS policies to it.
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Enable read access for all users" ON public.users FOR SELECT USING (true);
CREATE POLICY "Enable insert for authenticated users only" ON public.users FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Enable update for users based on email" ON public.users FOR UPDATE USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- Chats Table
CREATE TABLE public.chats (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL DEFAULT 'Untitled Chat',
    visibility TEXT DEFAULT 'private' CHECK (visibility IN ('private', 'public')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE public.chats ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage their own chats" ON public.chats FOR ALL USING (auth.uid() = user_id);

-- Messages Table
CREATE TABLE public.messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    chat_id UUID NOT NULL REFERENCES public.chats(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system', 'tool')),
    content TEXT NOT NULL,
    embedding VECTOR(1536),
    location_id UUID, -- Defer FK constraint until locations table is created
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage messages in their own chats" ON public.messages FOR ALL USING (
    (SELECT user_id FROM public.chats WHERE id = chat_id) = auth.uid()
);

-- System Prompts Table
CREATE TABLE public.system_prompts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    prompt TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE public.system_prompts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage their own system prompts" ON public.system_prompts FOR ALL USING (auth.uid() = user_id);

-- Locations Table (for drawings/map states)
CREATE TABLE public.locations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    chat_id UUID REFERENCES public.chats(id) ON DELETE CASCADE,
    geojson JSONB NOT NULL,
    geometry GEOMETRY(GEOMETRY, 4326),
    name TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE public.locations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage their own locations" ON public.locations FOR ALL USING (auth.uid() = user_id);
CREATE INDEX locations_geometry_idx ON public.locations USING GIST (geometry);

-- Now, add the foreign key constraint from messages to locations
ALTER TABLE public.messages
ADD CONSTRAINT fk_location
FOREIGN KEY (location_id)
REFERENCES public.locations(id)
ON DELETE SET NULL;

-- Visualizations Table
CREATE TABLE public.visualizations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    chat_id UUID REFERENCES public.chats(id) ON DELETE CASCADE,
    type TEXT NOT NULL DEFAULT 'map_layer',
    data JSONB NOT NULL,
    geometry GEOMETRY(GEOMETRY, 4326),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE public.visualizations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage their own visualizations" ON public.visualizations FOR ALL USING (auth.uid() = user_id);
CREATE INDEX visualizations_geometry_idx ON public.visualizations USING GIST (geometry) WHERE geometry IS NOT NULL;

-- PL/pgSQL function to generate embeddings
CREATE OR REPLACE FUNCTION generate_embedding(input TEXT)
RETURNS VECTOR(1536)
LANGUAGE plpgsql
AS $$
DECLARE
    embedding VECTOR(1536);
BEGIN
    -- This is a placeholder for the actual Supabase embedding function call.
    -- In a real Supabase project, you would use the http extension or a direct call
    -- to the embedding endpoint. For now, we'll return a zero vector.
    SELECT ARRAY_FILL(0, ARRAY[1536])::VECTOR INTO embedding;
    RETURN embedding;
END;
$$;

-- PL/pgSQL function for hybrid search
CREATE OR REPLACE FUNCTION hybrid_search(
    query_emb VECTOR(1536),
    geo_filter TEXT,
    chat_id_filter UUID DEFAULT NULL
)
RETURNS TABLE (content_snippet TEXT, similarity FLOAT)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT
        LEFT(m.content, 500) as content_snippet,
        (m.embedding <=> query_emb)::FLOAT as similarity
    FROM public.messages m
    LEFT JOIN public.locations l ON m.location_id = l.id
    WHERE
        (chat_id_filter IS NULL OR m.chat_id = chat_id_filter) AND
        (m.embedding <=> query_emb) < 0.8
        AND (geo_filter IS NULL OR ST_DWithin(l.geometry, ST_GeomFromText(geo_filter, 4326), 1000))
    ORDER BY similarity
    LIMIT 5;
END;
$$;

CREATE OR REPLACE FUNCTION save_chat_with_messages(chat_id UUID, user_id UUID, title TEXT, messages JSONB)
RETURNS UUID
LANGUAGE plpgsql
AS $$
DECLARE
  new_chat_id UUID;
  message JSONB;
BEGIN
  INSERT INTO public.chats (id, user_id, title)
  VALUES (chat_id, user_id, title)
  RETURNING id INTO new_chat_id;

  INSERT INTO public.chat_participants (chat_id, user_id, role)
  VALUES (new_chat_id, user_id, 'owner');

  FOR message IN SELECT * FROM jsonb_array_elements(messages)
  LOOP
    INSERT INTO public.messages (id, chat_id, user_id, role, content, created_at)
    VALUES (
      (message->>'id')::UUID,
      new_chat_id,
      user_id,
      message->>'role',
      message->>'content',
      (message->>'createdAt')::TIMESTAMPTZ
    );
  END LOOP;

  RETURN new_chat_id;
END;
$$;

CREATE OR REPLACE FUNCTION populate_geometry_from_geojson()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.geometry = ST_GeomFromGeoJSON(NEW.geojson);
  RETURN NEW;
END;
$$;

CREATE TRIGGER populate_geometry_trigger
BEFORE INSERT OR UPDATE ON public.locations
FOR EACH ROW
EXECUTE FUNCTION populate_geometry_from_geojson();
