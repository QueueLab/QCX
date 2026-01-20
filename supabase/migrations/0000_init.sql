-- =============================================
-- Supabase Chat App Schema (Fixed & Production Ready)
-- =============================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "postgis";
CREATE EXTENSION IF NOT EXISTS "vector";

-- =============================================
-- 1. Chats
-- =============================================
CREATE TABLE public.chats (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,  -- owner
    title TEXT NOT NULL DEFAULT 'Untitled Chat',
    visibility TEXT NOT NULL DEFAULT 'private' CHECK (visibility IN ('private', 'public')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.chats ENABLE ROW LEVEL SECURITY;

-- Owner has full control
CREATE POLICY "Owners can do anything with their chats"
    ON public.chats FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Optional: allow reading public chats
CREATE POLICY "Anyone can read public chats"
    ON public.chats FOR SELECT
    USING (visibility = 'public');

-- =============================================
-- 2. Chat Participants (for future collaboration)
-- =============================================
CREATE TABLE public.chat_participants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    chat_id UUID NOT NULL REFERENCES public.chats(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    role TEXT NOT NULL DEFAULT 'collaborator' CHECK (role IN ('owner', 'collaborator')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (chat_id, user_id)
);

ALTER TABLE public.chat_participants ENABLE ROW LEVEL SECURITY;

-- Only the owner can add/remove participants
CREATE POLICY "Only chat owner can manage participants"
    ON public.chat_participants FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.chats c
            WHERE c.id = chat_id AND c.user_id = auth.uid()
        )
    );

-- Automatically insert the creator as owner
CREATE OR REPLACE FUNCTION public.handle_new_chat()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.chat_participants (chat_id, user_id, role)
    VALUES (NEW.id, NEW.user_id, 'owner');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trigger_handle_new_chat
    AFTER INSERT ON public.chats
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_chat();

-- =============================================
-- 3. Messages
-- =============================================
CREATE TABLE public.messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    chat_id UUID NOT NULL REFERENCES public.chats(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system', 'tool')),
    content TEXT NOT NULL,
    embedding VECTOR(1536),
    location_id UUID REFERENCES public.locations(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- Users can only access messages in chats they participate in
CREATE POLICY "Participants can access chat messages"
    ON public.messages FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.chat_participants cp
            WHERE cp.chat_id = messages.chat_id
              AND cp.user_id = auth.uid()
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.chat_participants cp
            WHERE cp.chat_id = messages.chat_id
              AND cp.user_id = auth.uid()
        )
    );

-- Index for vector search
CREATE INDEX messages_embedding_idx ON public.messages USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

-- =============================================
-- 4. System Prompts (personal)
-- =============================================
CREATE TABLE public.system_prompts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    prompt TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.system_prompts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage their own prompts"
    ON public.system_prompts FOR ALL
    USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- =============================================
-- 5. Locations (drawings, map pins, etc.)
-- =============================================
CREATE TABLE public.locations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    chat_id UUID REFERENCES public.chats(id) ON DELETE CASCADE,
    geojson JSONB NOT NULL,
    geometry GEOMETRY(GEOMETRY, 4326),
    name TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.locations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Participants can manage locations in their chats"
    ON public.locations FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.chat_participants cp
            WHERE cp.chat_id = locations.chat_id
              AND cp.user_id = auth.uid()
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.chat_participants cp
            WHERE cp.chat_id = locations.chat_id
              AND cp.user_id = auth.uid()
        )
    );

CREATE INDEX locations_geometry_idx ON public.locations USING GIST (geometry);

-- Auto-populate PostGIS geometry from GeoJSON
CREATE OR REPLACE FUNCTION populate_geometry_from_geojson()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.geojson IS NOT NULL THEN
        NEW.geometry := ST_GeomFromGeoJSON(NEW.geojson);
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_populate_geometry
    BEFORE INSERT OR UPDATE ON public.locations
    FOR EACH ROW
    EXECUTE FUNCTION populate_geometry_from_geojson();

-- =============================================
-- 6. Visualizations (map layers, charts, etc.)
-- =============================================
CREATE TABLE public.visualizations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    chat_id UUID REFERENCES public.chats(id) ON DELETE CASCADE,
    type TEXT NOT NULL DEFAULT 'map_layer',
    data JSONB NOT NULL,
    geometry GEOMETRY(GEOMETRY, 4326),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.visualizations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Participants can manage visualizations"
    ON public.visualizations FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.chat_participants cp
            WHERE cp.chat_id = visualizations.chat_id
              AND cp.user_id = auth.uid()
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.chat_participants cp
            WHERE cp.chat_id = visualizations.chat_id
              AND cp.user_id = auth.uid()
        )
    );

CREATE INDEX visualizations_geometry_idx ON public.visualizations USING GIST (geometry) WHERE geometry IS NOT NULL;

-- =============================================
-- 7. Helper Functions
-- =============================================

-- Placeholder embedding function (replace with real edge function call in production)
CREATE OR REPLACE FUNCTION generate_embedding(input TEXT)
RETURNS VECTOR(1536) AS $$
BEGIN
    -- In production: use http extension + your embeddings endpoint
    RETURN array_fill(0, ARRAY[1536])::vector;
END;
$$ LANGUAGE plpgsql;

-- Hybrid search (vector + optional geo + optional chat filter)
CREATE OR REPLACE FUNCTION hybrid_search(
    query_emb VECTOR(1536),
    geo_filter TEXT DEFAULT NULL,
    chat_id_filter UUID DEFAULT NULL,
    similarity_threshold FLOAT DEFAULT 0.8,
    geo_distance_meters FLOAT DEFAULT 1000
)
RETURNS TABLE (
    message_id UUID,
    content_snippet TEXT,
    similarity FLOAT,
    chat_id UUID
)
LANGUAGE plpgsql AS $$
BEGIN
    RETURN QUERY
    SELECT
        m.id,
        LEFT(m.content, 500) AS content_snippet,
        (m.embedding <=> query_emb)::FLOAT AS similarity,
        m.chat_id
    FROM public.messages m
    LEFT JOIN public.locations l ON m.location_id = l.id
    WHERE (chat_id_filter IS NULL OR m.chat_id = chat_id_filter)
      AND (query_emb IS NULL OR m.embedding <=> query_emb < similarity_threshold)
      AND (geo_filter IS NULL OR (l.geometry IS NOT NULL AND ST_DWithin(l.geometry, ST_GeomFromText(geo_filter, 4326), geo_distance_meters)))
    ORDER BY (m.embedding <=> query_emb)
    LIMIT 10;
END;
$$;

-- Optional: auto-update updated_at columns
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_chats_updated_at
    BEFORE UPDATE ON public.chats
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trigger_update_prompts_updated_at
    BEFORE UPDATE ON public.system_prompts
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
    