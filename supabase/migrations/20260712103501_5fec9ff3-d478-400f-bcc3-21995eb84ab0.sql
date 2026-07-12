-- Geospatial support
CREATE EXTENSION IF NOT EXISTS postgis;

-- Universal entity type enum (extensible: add a value to support a new category)
CREATE TYPE public.entity_type AS ENUM ('business', 'property', 'event', 'product');

-- Universal entities table: everything on the platform is an entity
CREATE TABLE public.entities (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  type public.entity_type NOT NULL,
  owner_id uuid,
  title text NOT NULL,
  description text NOT NULL DEFAULT '',
  published boolean NOT NULL DEFAULT true,
  location geometry(Point, 4326) NOT NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Geospatial index for fast viewport / proximity queries
CREATE INDEX entities_location_gist ON public.entities USING GIST (location);
CREATE INDEX entities_type_idx ON public.entities (type);
CREATE INDEX entities_published_idx ON public.entities (published);

-- Grants (Data API requires explicit grants; RLS still governs row access)
GRANT SELECT, INSERT, UPDATE, DELETE ON public.entities TO authenticated;
GRANT SELECT, INSERT ON public.entities TO anon;
GRANT ALL ON public.entities TO service_role;

-- RLS
ALTER TABLE public.entities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Published entities are viewable by everyone"
  ON public.entities FOR SELECT
  USING (published = true);

-- Open create for now (will be scoped to auth.uid() = owner_id when accounts land)
CREATE POLICY "Anyone can create entities for now"
  ON public.entities FOR INSERT
  WITH CHECK (true);

-- updated_at trigger
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_entities_updated_at
  BEFORE UPDATE ON public.entities
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- RPC: entities within a viewport bounding box, with optional type + text filters
CREATE OR REPLACE FUNCTION public.entities_in_viewport(
  min_lng double precision,
  min_lat double precision,
  max_lng double precision,
  max_lat double precision,
  filter_types public.entity_type[] DEFAULT NULL,
  search_query text DEFAULT NULL,
  max_results integer DEFAULT 2000
)
RETURNS TABLE (
  id uuid,
  type public.entity_type,
  title text,
  lat double precision,
  lng double precision
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    e.id,
    e.type,
    e.title,
    ST_Y(e.location) AS lat,
    ST_X(e.location) AS lng
  FROM public.entities e
  WHERE e.published = true
    AND e.location && ST_MakeEnvelope(min_lng, min_lat, max_lng, max_lat, 4326)
    AND (filter_types IS NULL OR e.type = ANY(filter_types))
    AND (
      search_query IS NULL
      OR search_query = ''
      OR e.title ILIKE '%' || search_query || '%'
      OR e.description ILIKE '%' || search_query || '%'
    )
  ORDER BY e.created_at DESC
  LIMIT LEAST(max_results, 5000);
$$;

-- RPC: text/type search across the whole planet (no viewport)
CREATE OR REPLACE FUNCTION public.search_entities(
  search_query text DEFAULT NULL,
  filter_types public.entity_type[] DEFAULT NULL,
  max_results integer DEFAULT 50
)
RETURNS TABLE (
  id uuid,
  type public.entity_type,
  title text,
  description text,
  lat double precision,
  lng double precision
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    e.id,
    e.type,
    e.title,
    e.description,
    ST_Y(e.location) AS lat,
    ST_X(e.location) AS lng
  FROM public.entities e
  WHERE e.published = true
    AND (filter_types IS NULL OR e.type = ANY(filter_types))
    AND (
      search_query IS NULL
      OR search_query = ''
      OR e.title ILIKE '%' || search_query || '%'
      OR e.description ILIKE '%' || search_query || '%'
    )
  ORDER BY e.created_at DESC
  LIMIT LEAST(max_results, 200);
$$;

-- RPC: single entity by id (with decoded lat/lng)
CREATE OR REPLACE FUNCTION public.get_entity(entity_id uuid)
RETURNS TABLE (
  id uuid,
  type public.entity_type,
  title text,
  description text,
  metadata jsonb,
  lat double precision,
  lng double precision,
  created_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    e.id,
    e.type,
    e.title,
    e.description,
    e.metadata,
    ST_Y(e.location) AS lat,
    ST_X(e.location) AS lng,
    e.created_at
  FROM public.entities e
  WHERE e.id = entity_id AND e.published = true;
$$;

-- RPC: create an entity from lat/lng (encodes the PostGIS point)
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
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_id uuid;
BEGIN
  IF p_title IS NULL OR length(trim(p_title)) = 0 THEN
    RAISE EXCEPTION 'Title is required';
  END IF;
  IF p_lat < -90 OR p_lat > 90 OR p_lng < -180 OR p_lng > 180 THEN
    RAISE EXCEPTION 'Invalid coordinates';
  END IF;

  INSERT INTO public.entities (type, title, description, location, metadata)
  VALUES (
    p_type,
    left(trim(p_title), 200),
    left(coalesce(p_description, ''), 5000),
    ST_SetSRID(ST_MakePoint(p_lng, p_lat), 4326),
    coalesce(p_metadata, '{}'::jsonb)
  )
  RETURNING id INTO new_id;

  RETURN new_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.entities_in_viewport(double precision, double precision, double precision, double precision, public.entity_type[], text, integer) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.search_entities(text, public.entity_type[], integer) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_entity(uuid) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.create_entity(public.entity_type, text, text, double precision, double precision, jsonb) TO anon, authenticated, service_role;

-- Seed demo entities across major world cities
INSERT INTO public.entities (type, title, description, location, metadata) VALUES
  ('business', 'Aurora Coffee Roasters', 'Specialty single-origin coffee and pastries in the heart of the city.', ST_SetSRID(ST_MakePoint(-73.9857, 40.7484), 4326), '{"category":"Cafe","hours":"7am - 7pm"}'),
  ('business', 'Nakamura Ramen House', 'Handmade tonkotsu ramen served late into the night.', ST_SetSRID(ST_MakePoint(139.7005, 35.6595), 4326), '{"category":"Restaurant","hours":"11am - 12am"}'),
  ('business', 'Thames Tailoring Co.', 'Bespoke suits crafted on Savile Row since 1962.', ST_SetSRID(ST_MakePoint(-0.1419, 51.5127), 4326), '{"category":"Retail","hours":"9am - 6pm"}'),
  ('business', 'Marina Dive Center', 'PADI-certified diving trips along the coral reefs.', ST_SetSRID(ST_MakePoint(55.2708, 25.1972), 4326), '{"category":"Recreation","hours":"6am - 8pm"}'),
  ('property', 'Skyline Penthouse', 'Three-bedroom penthouse with panoramic skyline views.', ST_SetSRID(ST_MakePoint(-118.2437, 34.0522), 4326), '{"price":"$2,450,000","beds":3,"baths":3,"sqft":2800}'),
  ('property', 'Canal House Loft', 'Restored 17th-century canal house, now a modern loft.', ST_SetSRID(ST_MakePoint(4.8952, 52.3702), 4326), '{"price":"€1,180,000","beds":2,"baths":2,"sqft":1600}'),
  ('property', 'Harbour View Apartment', 'Waterfront apartment overlooking the Opera House.', ST_SetSRID(ST_MakePoint(151.2153, -33.8568), 4326), '{"price":"A$1,900,000","beds":2,"baths":2,"sqft":1400}'),
  ('event', 'Neon Nights Music Festival', 'Two-day electronic music festival on the waterfront.', ST_SetSRID(ST_MakePoint(2.3522, 48.8566), 4326), '{"date":"2026-08-14","time":"6:00 PM","price":"€89"}'),
  ('event', 'Global Tech Summit 2026', 'The premier gathering of founders, engineers and investors.', ST_SetSRID(ST_MakePoint(-122.4194, 37.7749), 4326), '{"date":"2026-09-22","time":"9:00 AM","price":"$499"}'),
  ('event', 'Rio Street Carnival', 'A vibrant open-air celebration of music and dance.', ST_SetSRID(ST_MakePoint(-43.1729, -22.9068), 4326), '{"date":"2026-02-16","time":"2:00 PM","price":"Free"}'),
  ('product', 'Handwoven Alpaca Throw', 'Ethically sourced alpaca wool blanket from the Andes.', ST_SetSRID(ST_MakePoint(-71.9675, -13.5320), 4326), '{"price":"$120","condition":"New","shipping":"Worldwide"}'),
  ('product', 'Vintage Vespa 150', 'Fully restored 1965 Vespa in classic sky blue.', ST_SetSRID(ST_MakePoint(12.4964, 41.9028), 4326), '{"price":"€4,800","condition":"Restored","year":1965}'),
  ('product', 'Artisan Ceramic Set', 'Hand-thrown stoneware dinner set, 12 pieces.', ST_SetSRID(ST_MakePoint(126.9780, 37.5665), 4326), '{"price":"$260","condition":"New","pieces":12}'),
  ('business', 'Table Mountain Tours', 'Guided hikes and cable-car experiences up Table Mountain.', ST_SetSRID(ST_MakePoint(18.4241, -33.9249), 4326), '{"category":"Tourism","hours":"8am - 5pm"}'),
  ('property', 'Alpine Chalet Retreat', 'Ski-in ski-out chalet with mountain and lake views.', ST_SetSRID(ST_MakePoint(7.7491, 46.0207), 4326), '{"price":"CHF 3,200,000","beds":5,"baths":4,"sqft":4200}'),
  ('event', 'Marina Bay Light Show', 'Nightly synchronized light and water spectacular.', ST_SetSRID(ST_MakePoint(103.8607, 1.2834), 4326), '{"date":"2026-07-01","time":"8:00 PM","price":"Free"}');