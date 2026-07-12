
-- Profiles table
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name text,
  avatar_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT SELECT ON public.profiles TO anon;
GRANT ALL ON public.profiles TO service_role;

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Profiles are viewable by everyone"
  ON public.profiles FOR SELECT USING (true);

CREATE POLICY "Users can insert their own profile"
  ON public.profiles FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE TO authenticated
  USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- updated_at trigger
CREATE OR REPLACE FUNCTION public.tg_set_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

DROP TRIGGER IF EXISTS profiles_set_updated_at ON public.profiles;
CREATE TRIGGER profiles_set_updated_at BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name, avatar_url)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    NEW.raw_user_meta_data->>'avatar_url'
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Entities: owner-scoped policies
-- Drop old permissive policies
DROP POLICY IF EXISTS "Anyone can create entities for now" ON public.entities;
DROP POLICY IF EXISTS "Published entities are viewable by everyone" ON public.entities;

CREATE POLICY "Published entities are viewable by everyone"
  ON public.entities FOR SELECT USING (published = true);

CREATE POLICY "Owners can view their own entities"
  ON public.entities FOR SELECT TO authenticated
  USING (auth.uid() = owner_id);

CREATE POLICY "Authenticated users can create entities they own"
  ON public.entities FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Owners can update their own entities"
  ON public.entities FOR UPDATE TO authenticated
  USING (auth.uid() = owner_id) WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Owners can delete their own entities"
  ON public.entities FOR DELETE TO authenticated
  USING (auth.uid() = owner_id);

-- updated_at trigger for entities
DROP TRIGGER IF EXISTS entities_set_updated_at ON public.entities;
CREATE TRIGGER entities_set_updated_at BEFORE UPDATE ON public.entities
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- Rewrite create_entity to require caller (auth.uid())
CREATE OR REPLACE FUNCTION public.create_entity(
  p_type public.entity_type,
  p_title text,
  p_description text,
  p_lat double precision,
  p_lng double precision,
  p_metadata jsonb DEFAULT '{}'::jsonb
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  new_id uuid;
  uid uuid := auth.uid();
BEGIN
  IF uid IS NULL THEN
    RAISE EXCEPTION 'Sign in required to place an entity on Earth';
  END IF;
  IF p_title IS NULL OR length(trim(p_title)) = 0 THEN
    RAISE EXCEPTION 'Title is required';
  END IF;
  IF p_lat < -90 OR p_lat > 90 OR p_lng < -180 OR p_lng > 180 THEN
    RAISE EXCEPTION 'Invalid coordinates';
  END IF;

  INSERT INTO public.entities (type, title, description, location, metadata, owner_id)
  VALUES (
    p_type,
    left(trim(p_title), 200),
    left(coalesce(p_description, ''), 5000),
    ST_SetSRID(ST_MakePoint(p_lng, p_lat), 4326),
    coalesce(p_metadata, '{}'::jsonb),
    uid
  )
  RETURNING id INTO new_id;

  RETURN new_id;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.create_entity(public.entity_type, text, text, double precision, double precision, jsonb) FROM anon;
GRANT EXECUTE ON FUNCTION public.create_entity(public.entity_type, text, text, double precision, double precision, jsonb) TO authenticated, service_role;

-- List entities owned by the caller (drafts + published)
CREATE OR REPLACE FUNCTION public.my_entities()
RETURNS TABLE (
  id uuid,
  type public.entity_type,
  title text,
  description text,
  published boolean,
  metadata jsonb,
  lat double precision,
  lng double precision,
  created_at timestamptz,
  updated_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT
    e.id, e.type, e.title, e.description, e.published, e.metadata,
    ST_Y(e.location) AS lat, ST_X(e.location) AS lng,
    e.created_at, e.updated_at
  FROM public.entities e
  WHERE e.owner_id = auth.uid()
  ORDER BY e.created_at DESC;
$$;

GRANT EXECUTE ON FUNCTION public.my_entities() TO authenticated, service_role;

-- Update entity (owner only, enforced by RLS since SECURITY INVOKER)
CREATE OR REPLACE FUNCTION public.update_entity(
  p_id uuid,
  p_title text,
  p_description text,
  p_lat double precision,
  p_lng double precision,
  p_metadata jsonb,
  p_published boolean
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  updated uuid;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Sign in required';
  END IF;
  IF p_title IS NULL OR length(trim(p_title)) = 0 THEN
    RAISE EXCEPTION 'Title is required';
  END IF;
  IF p_lat < -90 OR p_lat > 90 OR p_lng < -180 OR p_lng > 180 THEN
    RAISE EXCEPTION 'Invalid coordinates';
  END IF;

  UPDATE public.entities
     SET title = left(trim(p_title), 200),
         description = left(coalesce(p_description, ''), 5000),
         location = ST_SetSRID(ST_MakePoint(p_lng, p_lat), 4326),
         metadata = coalesce(p_metadata, '{}'::jsonb),
         published = coalesce(p_published, true)
   WHERE id = p_id
   RETURNING id INTO updated;

  IF updated IS NULL THEN
    RAISE EXCEPTION 'Entity not found or you do not own it';
  END IF;

  RETURN updated;
END;
$$;

GRANT EXECUTE ON FUNCTION public.update_entity(uuid, text, text, double precision, double precision, jsonb, boolean) TO authenticated, service_role;

-- Delete entity (owner only)
CREATE OR REPLACE FUNCTION public.delete_entity(p_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  deleted_count int;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Sign in required';
  END IF;
  DELETE FROM public.entities WHERE id = p_id;
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count > 0;
END;
$$;

GRANT EXECUTE ON FUNCTION public.delete_entity(uuid) TO authenticated, service_role;
