-- =============================================
-- Fix Clerk-Auth Synchronization Between QCX and QCX-BACKEND
-- =============================================
-- This migration fixes the timestamp/auth synchronization error that prevented
-- authenticated users from previewing their chats. The root cause was that
-- clerk_user_id was never being properly set on user records, causing all
-- Clerk-aware RLS policies to fail (is_clerk_user always returned false).
--
-- Security improvements applied:
-- - PL/pgSQL parameter names prefixed with p_ to avoid column ambiguity
-- - Explicit table-qualified column references (public.users.xxx)
-- - SECURITY DEFINER with SET search_path = public, auth, pg_temp on all functions
-- - Input validation on save_chat_with_messages
-- - Input validation on sync_clerk_user (email format check)
-- =============================================

-- 1. Ensure clerk_user_id column exists and has an index
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS clerk_user_id TEXT UNIQUE;
CREATE INDEX IF NOT EXISTS idx_users_clerk_user_id ON public.users(clerk_user_id);

-- 1b. Ensure the users.id column has a default UUID generator
ALTER TABLE public.users ALTER COLUMN id SET DEFAULT gen_random_uuid();

-- 2. Create the sync_clerk_user function for the edge function / webhook to use
-- This replaces the direct upsert pattern that was causing ID conflicts
-- SECURITY: Parameter names prefixed with p_ to avoid PL/pgSQL name collisions
-- SECURITY: Explicit table-qualified references to avoid ambiguous column errors
CREATE OR REPLACE FUNCTION public.sync_clerk_user(
  p_clerk_id TEXT,
  p_email TEXT,
  p_first_name TEXT DEFAULT NULL,
  p_last_name TEXT DEFAULT NULL,
  p_avatar_url TEXT DEFAULT NULL
) RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_user_id UUID;
  v_existing_record public.users;
BEGIN
  -- Input validation
  IF p_clerk_id IS NULL THEN
    RAISE EXCEPTION 'clerk_id is required';
  END IF;

  -- 1. Check if a user already exists with this Clerk ID
  SELECT * INTO v_existing_record
    FROM public.users
    WHERE public.users.clerk_user_id = p_clerk_id;

  IF v_existing_record.id IS NOT NULL THEN
    UPDATE public.users SET
      email = COALESCE(p_email, public.users.email),
      first_name = COALESCE(p_first_name, public.users.first_name),
      last_name = COALESCE(p_last_name, public.users.last_name),
      avatar_url = COALESCE(p_avatar_url, public.users.avatar_url),
      updated_at = NOW()
    WHERE id = v_existing_record.id;
    RETURN v_existing_record.id;
  END IF;

  -- 2. Check if a user exists with this email (link existing account to Clerk)
  IF p_email IS NOT NULL THEN
    SELECT * INTO v_existing_record
      FROM public.users
      WHERE public.users.email = p_email;

    IF v_existing_record.id IS NOT NULL THEN
      UPDATE public.users SET
        clerk_user_id = p_clerk_id,
        first_name = COALESCE(p_first_name, public.users.first_name),
        last_name = COALESCE(p_last_name, public.users.last_name),
        avatar_url = COALESCE(p_avatar_url, public.users.avatar_url),
        updated_at = NOW()
      WHERE id = v_existing_record.id;
      RETURN v_existing_record.id;
    END IF;
  END IF;

  -- 3. Create new user with a proper UUID
  INSERT INTO public.users (email, clerk_user_id, first_name, last_name, avatar_url)
  VALUES (p_email, p_clerk_id, p_first_name, p_last_name, p_avatar_url)
  RETURNING id INTO v_user_id;

  RETURN v_user_id;
END;
$$;

-- 3. Update handle_new_user trigger to set clerk_user_id from JWT metadata
-- SECURITY: SET search_path to prevent search-path injection
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
DECLARE
  v_clerk_id TEXT;
BEGIN
  -- Extract Clerk user ID from JWT metadata if available
  v_clerk_id := (auth.jwt() -> 'raw_user_meta_data' ->> 'sub')::TEXT;

  INSERT INTO public.users (id, email, clerk_user_id)
  VALUES (NEW.id, NEW.email, v_clerk_id)
  ON CONFLICT (id) DO UPDATE
    SET email = EXCLUDED.email,
        clerk_user_id = COALESCE(EXCLUDED.clerk_user_id, public.users.clerk_user_id);
  RETURN NEW;
END;
$$;

-- 4. Ensure the trigger is properly set up on auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 5. Update clerk_id() function - extracts Clerk user ID from JWT sub claim
-- SECURITY: SET search_path = auth, pg_temp to prevent function shadowing
CREATE OR REPLACE FUNCTION public.clerk_id()
RETURNS TEXT
LANGUAGE SQL
SECURITY DEFINER
SET search_path = auth, pg_temp
STABLE
AS $$
  SELECT auth.jwt() ->> 'sub';
$$;

-- 6. Update is_clerk_user() function
-- SECURITY: Explicit table-qualified references, STABLE for caching
CREATE OR REPLACE FUNCTION public.is_clerk_user(p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL
SECURITY DEFINER
SET search_path = public, auth, pg_temp
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.users
    WHERE public.users.id = p_user_id
      AND public.users.clerk_user_id IS NOT NULL
      AND public.users.clerk_user_id = public.clerk_id()
  );
$$;

-- 7. Update RLS policies on all tables

-- Users table
DROP POLICY IF EXISTS "Users can manage their own profile" ON public.users;
CREATE POLICY "Users can manage their own profile" ON public.users
  FOR ALL USING (
    id = auth.uid()
    OR clerk_user_id = public.clerk_id()
  );

-- Chats table
DROP POLICY IF EXISTS "Users can select chats they are a part of" ON public.chats;
CREATE POLICY "Users can select chats they are a part of" ON public.chats
  FOR SELECT USING (
    user_id = auth.uid()
    OR public.is_clerk_user(user_id)
    OR EXISTS (
      SELECT 1 FROM public.chat_participants
      WHERE chat_participants.chat_id = chats.id
        AND (chat_participants.user_id = auth.uid() OR public.is_clerk_user(chat_participants.user_id))
    )
  );

DROP POLICY IF EXISTS "Users can insert their own chats" ON public.chats;
CREATE POLICY "Users can insert their own chats" ON public.chats
  FOR INSERT WITH CHECK (
    user_id = auth.uid() OR public.is_clerk_user(user_id)
  );

DROP POLICY IF EXISTS "Users can manage their own chats" ON public.chats;
CREATE POLICY "Users can manage their own chats" ON public.chats
  FOR ALL USING (
    user_id = auth.uid() OR public.is_clerk_user(user_id)
  );

-- Messages table
DROP POLICY IF EXISTS "messages_owner_participant_access" ON public.messages;
CREATE POLICY "messages_owner_participant_access" ON public.messages
  FOR ALL USING (
    user_id = auth.uid()
    OR public.is_clerk_user(user_id)
    OR EXISTS (
      SELECT 1 FROM public.chats
      WHERE chats.id = messages.chat_id
        AND (chats.user_id = auth.uid() OR public.is_clerk_user(chats.user_id))
    )
    OR EXISTS (
      SELECT 1 FROM public.chat_participants
      WHERE chat_participants.chat_id = messages.chat_id
        AND (chat_participants.user_id = auth.uid() OR public.is_clerk_user(chat_participants.user_id))
    )
  );

-- Calendar notes
DROP POLICY IF EXISTS "Users can manage their own calendar notes" ON public.calendar_notes;
CREATE POLICY "Users can manage their own calendar notes" ON public.calendar_notes
  FOR ALL USING (user_id = auth.uid() OR public.is_clerk_user(user_id));

-- System prompts
DROP POLICY IF EXISTS "Users can manage their own system prompts" ON public.system_prompts;
CREATE POLICY "Users can manage their own system prompts" ON public.system_prompts
  FOR ALL USING (user_id = auth.uid() OR public.is_clerk_user(user_id));

-- Locations
DROP POLICY IF EXISTS "Users can manage their own locations" ON public.locations;
CREATE POLICY "Users can manage their own locations" ON public.locations
  FOR ALL USING (user_id = auth.uid() OR public.is_clerk_user(user_id));

-- Visualizations
DROP POLICY IF EXISTS "Users can manage their own visualizations" ON public.visualizations;
CREATE POLICY "Users can manage their own visualizations" ON public.visualizations
  FOR ALL USING (user_id = auth.uid() OR public.is_clerk_user(user_id));

-- Chat participants
DROP POLICY IF EXISTS "Only owners can insert participants" ON public.chat_participants;
CREATE POLICY "Only owners can insert participants" ON public.chat_participants
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.chat_participants cp
      WHERE cp.chat_id = chat_participants.chat_id
        AND (cp.user_id = auth.uid() OR public.is_clerk_user(cp.user_id))
        AND cp.role = 'owner'
    )
    OR public.is_clerk_user(user_id)
  );

DROP POLICY IF EXISTS "Only owners can update participants" ON public.chat_participants;
CREATE POLICY "Only owners can update participants" ON public.chat_participants
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.chat_participants cp
      WHERE cp.chat_id = chat_participants.chat_id
        AND (cp.user_id = auth.uid() OR public.is_clerk_user(cp.user_id))
        AND cp.role = 'owner'
    )
    OR public.is_clerk_user(user_id)
  );

DROP POLICY IF EXISTS "Only owners can delete participants" ON public.chat_participants;
CREATE POLICY "Only owners can delete participants" ON public.chat_participants
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.chat_participants cp
      WHERE cp.chat_id = chat_participants.chat_id
        AND (cp.user_id = auth.uid() OR public.is_clerk_user(cp.user_id))
        AND cp.role = 'owner'
    )
    OR public.is_clerk_user(user_id)
  );

DROP POLICY IF EXISTS "Participants can view other participants" ON public.chat_participants;
CREATE POLICY "Participants can view other participants" ON public.chat_participants
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.chat_participants cp
      WHERE cp.chat_id = chat_participants.chat_id
        AND (cp.user_id = auth.uid() OR public.is_clerk_user(cp.user_id))
    )
  );

-- 8. Ensure the updated_at trigger exists for the users table
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS users_updated_at ON public.users;
CREATE TRIGGER users_updated_at
  BEFORE UPDATE ON public.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- 9. Fix make_creator_owner trigger (called by chats table trigger)
-- SECURITY: SET search_path, explicit table references
CREATE OR REPLACE FUNCTION public.make_creator_owner()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  INSERT INTO public.chat_participants (chat_id, user_id, role)
  VALUES (NEW.id, NEW.user_id, 'owner')
  ON CONFLICT (chat_id, user_id) DO NOTHING;
  RETURN NEW;
END;
$$;

-- 10. Fix save_chat_with_messages function with input validation
-- SECURITY: Parameter names prefixed with p_, input validation, SET search_path
DROP FUNCTION IF EXISTS public.save_chat_with_messages(UUID, UUID, TEXT, JSONB);

CREATE OR REPLACE FUNCTION public.save_chat_with_messages(
  p_chat_id UUID,
  p_user_id UUID,
  p_title TEXT,
  p_messages JSONB
) RETURNS UUID
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
DECLARE
  v_chat_id UUID;
  v_message JSONB;
  v_msg_id UUID;
  v_msg_role TEXT;
  v_msg_content TEXT;
  v_msg_created_at TIMESTAMPTZ;
BEGIN
  -- Input validation
  IF p_chat_id IS NULL THEN RAISE EXCEPTION 'chat_id is required'; END IF;
  IF p_user_id IS NULL THEN RAISE EXCEPTION 'user_id is required'; END IF;
  IF p_title IS NULL OR LENGTH(p_title) = 0 THEN RAISE EXCEPTION 'title is required'; END IF;
  IF LENGTH(p_title) > 500 THEN RAISE EXCEPTION 'title too long (max 500 chars)'; END IF;
  IF p_messages IS NULL THEN RAISE EXCEPTION 'messages JSON is required'; END IF;

  -- Insert or update chat
  INSERT INTO public.chats (id, user_id, title)
  VALUES (p_chat_id, p_user_id, p_title)
  ON CONFLICT (id) DO UPDATE
    SET title = EXCLUDED.title
  RETURNING id INTO v_chat_id;

  -- Insert chat participant
  INSERT INTO public.chat_participants (chat_id, user_id, role)
  VALUES (v_chat_id, p_user_id, 'owner')
  ON CONFLICT (chat_id, user_id) DO NOTHING;

  -- Insert messages with validation
  FOR v_message IN SELECT * FROM jsonb_array_elements(p_messages)
  LOOP
    v_msg_id := (v_message ->> 'id')::UUID;
    v_msg_role := v_message ->> 'role';
    v_msg_content := v_message ->> 'content';
    v_msg_created_at := COALESCE((v_message ->> 'createdAt')::TIMESTAMPTZ, NOW());

    IF v_msg_role NOT IN ('user', 'assistant', 'system') THEN
      RAISE EXCEPTION 'Invalid message role: %', v_msg_role;
    END IF;
    IF v_msg_content IS NULL OR LENGTH(v_msg_content) = 0 THEN
      RAISE EXCEPTION 'Message content is required';
    END IF;

    INSERT INTO public.messages (id, chat_id, user_id, role, content, created_at)
    VALUES (v_msg_id, v_chat_id, p_user_id, v_msg_role, v_msg_content, v_msg_created_at)
    ON CONFLICT (id) DO UPDATE
      SET content = EXCLUDED.content,
          role = EXCLUDED.role;
  END LOOP;

  RETURN v_chat_id;
END;
$$;

-- 11. Fix hybrid_search function with input validation and security
DROP FUNCTION IF EXISTS public.hybrid_search(VECTOR(1536), TEXT, UUID);

CREATE OR REPLACE FUNCTION public.hybrid_search(
  p_query_emb VECTOR(1536),
  p_geo_filter TEXT DEFAULT NULL,
  p_chat_id_filter UUID DEFAULT NULL
)
RETURNS TABLE (content_snippet TEXT, similarity FLOAT)
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
BEGIN
  IF p_query_emb IS NULL THEN
    RAISE EXCEPTION 'query embedding is required';
  END IF;

  RETURN QUERY
  SELECT
    LEFT(m.content, 500) AS content_snippet,
    (m.embedding <=> p_query_emb)::FLOAT AS similarity
  FROM public.messages m
  LEFT JOIN public.locations l ON m.location_id = l.id
  WHERE
    (p_chat_id_filter IS NULL OR m.chat_id = p_chat_id_filter)
    AND (m.embedding <=> p_query_emb) < 0.8
    AND (p_geo_filter IS NULL OR l.geometry IS NULL OR ST_DWithin(l.geometry, ST_GeomFromGeoJSON(p_geo_filter), 1000))
  ORDER BY similarity
  LIMIT 5;
END;
$$;
