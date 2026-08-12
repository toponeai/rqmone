REVOKE ALL ON TABLE public.spatial_ref_sys FROM anon, authenticated;
REVOKE ALL ON TABLE public.geography_columns FROM anon, authenticated;
REVOKE ALL ON TABLE public.geometry_columns FROM anon, authenticated;

REVOKE EXECUTE ON FUNCTION public.st_estimatedextent(text, text) FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.st_estimatedextent(text, text, text) FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.st_estimatedextent(text, text, text, boolean) FROM anon, authenticated, public;