
-- Fix: Remove materialized view from public API by revoking access
REVOKE SELECT ON public.incident_heatmap_data FROM anon, authenticated;

-- Create a secure function to query heatmap data instead
CREATE OR REPLACE FUNCTION public.get_heatmap_data(
  min_lat DOUBLE PRECISION,
  max_lat DOUBLE PRECISION,
  min_lng DOUBLE PRECISION,
  max_lng DOUBLE PRECISION
)
RETURNS TABLE(
  lat_bucket NUMERIC,
  lng_bucket NUMERIC,
  incident_type TEXT,
  incident_count BIGINT,
  latest_at TIMESTAMPTZ
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT lat_bucket, lng_bucket, incident_type, incident_count, latest_at
  FROM incident_heatmap_data
  WHERE lat_bucket BETWEEN min_lat AND max_lat
    AND lng_bucket BETWEEN min_lng AND max_lng;
$$;
