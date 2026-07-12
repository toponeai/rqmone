
CREATE INDEX IF NOT EXISTS entities_published_location_gist
  ON public.entities USING GIST (location)
  WHERE published = true;

CREATE OR REPLACE FUNCTION public.entities_cluster(
  min_lng double precision,
  min_lat double precision,
  max_lng double precision,
  max_lat double precision,
  p_precision integer DEFAULT 5,
  filter_types public.entity_type[] DEFAULT NULL,
  search_query text DEFAULT NULL,
  max_results integer DEFAULT 500
)
RETURNS TABLE (
  cluster_key text,
  lat double precision,
  lng double precision,
  cnt integer,
  cluster_type public.entity_type,
  sample_id uuid
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH params AS (
    SELECT (90.0 / power(2, GREATEST(1, LEAST(p_precision, 14))))::double precision AS step
  ),
  filtered AS (
    SELECT
      e.id,
      e.type,
      ST_X(e.location) AS lng_val,
      ST_Y(e.location) AS lat_val
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
  ),
  cells AS (
    SELECT
      floor(f.lng_val / p.step)::int AS cx,
      floor(f.lat_val / p.step)::int AS cy,
      f.id,
      f.type,
      f.lng_val,
      f.lat_val
    FROM filtered f, params p
  )
  SELECT
    (cx::text || ':' || cy::text) AS cluster_key,
    AVG(lat_val) AS lat,
    AVG(lng_val) AS lng,
    COUNT(*)::int AS cnt,
    CASE WHEN COUNT(DISTINCT type) = 1 THEN (array_agg(type))[1] ELSE NULL END AS cluster_type,
    CASE WHEN COUNT(*) = 1 THEN (array_agg(id))[1] ELSE NULL END AS sample_id
  FROM cells
  GROUP BY cx, cy
  ORDER BY COUNT(*) DESC
  LIMIT LEAST(max_results, 2000);
$$;

GRANT EXECUTE ON FUNCTION public.entities_cluster(
  double precision, double precision, double precision, double precision,
  integer, public.entity_type[], text, integer
) TO anon, authenticated, service_role;

WITH cities(name, lat, lng) AS (
  VALUES
    ('New York', 40.7128::double precision, -74.0060::double precision),
    ('Los Angeles', 34.0522, -118.2437),
    ('Chicago', 41.8781, -87.6298),
    ('Toronto', 43.6532, -79.3832),
    ('Mexico City', 19.4326, -99.1332),
    ('Sao Paulo', -23.5505, -46.6333),
    ('Buenos Aires', -34.6037, -58.3816),
    ('Lima', -12.0464, -77.0428),
    ('London', 51.5074, -0.1278),
    ('Paris', 48.8566, 2.3522),
    ('Berlin', 52.5200, 13.4050),
    ('Madrid', 40.4168, -3.7038),
    ('Rome', 41.9028, 12.4964),
    ('Amsterdam', 52.3676, 4.9041),
    ('Stockholm', 59.3293, 18.0686),
    ('Istanbul', 41.0082, 28.9784),
    ('Moscow', 55.7558, 37.6173),
    ('Dubai', 25.2048, 55.2708),
    ('Mumbai', 19.0760, 72.8777),
    ('Delhi', 28.6139, 77.2090),
    ('Bangkok', 13.7563, 100.5018),
    ('Singapore', 1.3521, 103.8198),
    ('Jakarta', -6.2088, 106.8456),
    ('Hong Kong', 22.3193, 114.1694),
    ('Shanghai', 31.2304, 121.4737),
    ('Tokyo', 35.6762, 139.6503),
    ('Seoul', 37.5665, 126.9780),
    ('Sydney', -33.8688, 151.2093),
    ('Melbourne', -37.8136, 144.9631),
    ('Auckland', -36.8485, 174.7633),
    ('Cape Town', -33.9249, 18.4241),
    ('Nairobi', -1.2921, 36.8219),
    ('Cairo', 30.0444, 31.2357),
    ('Lagos', 6.5244, 3.3792)
),
gen AS (
  SELECT
    c.name,
    c.lat + (random() - 0.5) * 0.55 AS lat_j,
    c.lng + (random() - 0.5) * 0.55 AS lng_j,
    (ARRAY['business','property','event','product']::public.entity_type[])[1 + (n % 4)] AS etype,
    n
  FROM cities c
  CROSS JOIN generate_series(1, 60) AS n
)
INSERT INTO public.entities (type, title, description, location, metadata)
SELECT
  etype,
  CASE etype
    WHEN 'business' THEN name || ' — Local Business #' || n
    WHEN 'property' THEN name || ' Apartment #' || n
    WHEN 'event'    THEN name || ' Meetup #' || n
    WHEN 'product'  THEN name || ' Marketplace Item #' || n
  END,
  CASE etype
    WHEN 'business' THEN 'A neighborhood spot discoverable on the R.Q.M.1 Earth.'
    WHEN 'property' THEN 'Listed on the interactive Earth. Contact owner for details.'
    WHEN 'event'    THEN 'Public event happening in ' || name || '. See you there.'
    WHEN 'product'  THEN 'For sale in ' || name || '. Ships from local seller.'
  END,
  ST_SetSRID(ST_MakePoint(lng_j, lat_j), 4326),
  CASE etype
    WHEN 'business' THEN jsonb_build_object('category','Local','hours','9am - 9pm')
    WHEN 'property' THEN jsonb_build_object('price','$' || ((300 + n * 7) * 1000)::text, 'beds', 1 + (n % 4), 'baths', 1 + (n % 3))
    WHEN 'event'    THEN jsonb_build_object('date','2026-0' || (1 + (n % 9))::text || '-15', 'time','7:00 PM', 'price', CASE WHEN n % 3 = 0 THEN 'Free' ELSE '$' || (10 + n)::text END)
    WHEN 'product'  THEN jsonb_build_object('price','$' || (20 + n * 3)::text, 'condition', CASE WHEN n % 2 = 0 THEN 'New' ELSE 'Used' END)
  END
FROM gen;
