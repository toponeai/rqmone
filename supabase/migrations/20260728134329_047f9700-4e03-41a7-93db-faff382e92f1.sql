-- 1. Public read helpers: run as the caller so RLS on public.entities applies.
ALTER FUNCTION public.entities_in_viewport(double precision, double precision, double precision, double precision, entity_type[], text, integer) SECURITY INVOKER;
ALTER FUNCTION public.entities_cluster(double precision, double precision, double precision, double precision, integer, entity_type[], text, integer) SECURITY INVOKER;
ALTER FUNCTION public.search_entities(text, entity_type[], integer) SECURITY INVOKER;
ALTER FUNCTION public.get_entity(uuid) SECURITY INVOKER;

-- Ensure the Data API roles can read entities (RLS still restricts to published rows for anon).
GRANT SELECT ON public.entities TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.entities TO authenticated;
GRANT ALL ON public.entities TO service_role;

-- 2. Internal SECURITY DEFINER routines must not be callable through the API.
REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.fanout_message_notification() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.tg_add_creator_participant() FROM PUBLIC, anon, authenticated;

-- Used inside RLS policies, so signed-in users need EXECUTE; anonymous callers do not.
REVOKE ALL ON FUNCTION public.is_conversation_participant(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_conversation_participant(uuid, uuid) TO authenticated;

-- 3. Fixed search_path on the remaining helper.
CREATE OR REPLACE FUNCTION public.tg_set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $function$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$function$;

-- 4. PostGIS reference table: remove Data API exposure, enable RLS when permitted.
REVOKE ALL ON TABLE public.spatial_ref_sys FROM anon, authenticated;
DO $do$
BEGIN
  EXECUTE 'ALTER TABLE public.spatial_ref_sys ENABLE ROW LEVEL SECURITY';
EXCEPTION WHEN insufficient_privilege OR wrong_object_type THEN
  RAISE NOTICE 'spatial_ref_sys is extension-owned; access revoked instead.';
END
$do$;