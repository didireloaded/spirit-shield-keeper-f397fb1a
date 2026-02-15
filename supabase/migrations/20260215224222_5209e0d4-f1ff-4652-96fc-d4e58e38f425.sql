
-- Fix: Remove SECURITY DEFINER from the view by recreating it as a regular view
-- and revoke direct API access
DROP VIEW IF EXISTS public.query_performance_stats;

CREATE VIEW public.query_performance_stats
WITH (security_invoker = true)
AS
SELECT 
    query_name,
    COUNT(*) AS total_queries,
    AVG(execution_time_ms)::INT AS avg_time_ms,
    MIN(execution_time_ms) AS min_time_ms,
    MAX(execution_time_ms) AS max_time_ms,
    PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY execution_time_ms)::INT AS p95_time_ms
FROM public.query_performance_log
WHERE created_at > NOW() - INTERVAL '24 hours'
GROUP BY query_name
ORDER BY avg_time_ms DESC;

-- Also fix the incident_heatmap_data materialized view if it exists
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_matviews WHERE schemaname = 'public' AND matviewname = 'incident_heatmap_data') THEN
        REVOKE SELECT ON public.incident_heatmap_data FROM anon, authenticated;
    END IF;
END $$;
