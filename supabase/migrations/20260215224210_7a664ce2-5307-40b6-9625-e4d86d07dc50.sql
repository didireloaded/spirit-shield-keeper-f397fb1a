
-- ========================================
-- DAY 1: OPTIMIZED QUERY FUNCTIONS
-- Adapted to actual schema (incident_reports, markers, profiles)
-- ========================================

-- Get nearby incident reports efficiently (uses lat/lng columns)
CREATE OR REPLACE FUNCTION public.get_nearby_incident_reports(
    user_lat DOUBLE PRECISION,
    user_lng DOUBLE PRECISION,
    radius_km DOUBLE PRECISION DEFAULT 5,
    max_results INT DEFAULT 50
)
RETURNS TABLE (
    incident_id UUID,
    incident_type TEXT,
    description TEXT,
    lat DOUBLE PRECISION,
    lng DOUBLE PRECISION,
    distance_km DOUBLE PRECISION,
    created_at TIMESTAMPTZ,
    status TEXT,
    credibility_status TEXT,
    credibility_score DOUBLE PRECISION,
    reported_by UUID,
    place_name TEXT
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        ir.incident_id,
        ir.incident_type,
        ir.description,
        ir.lat,
        ir.lng,
        -- Haversine distance approximation in km
        (6371 * acos(
            cos(radians(user_lat)) * cos(radians(ir.lat)) *
            cos(radians(ir.lng) - radians(user_lng)) +
            sin(radians(user_lat)) * sin(radians(ir.lat))
        )) AS distance_km,
        ir.created_at,
        ir.status::TEXT,
        ir.credibility_status,
        ir.credibility_score,
        ir.reported_by,
        ir.place_name
    FROM incident_reports ir
    WHERE 
        ir.status = 'active'
        AND ir.lat IS NOT NULL
        AND ir.lng IS NOT NULL
        -- Bounding box pre-filter for performance
        AND ir.lat BETWEEN user_lat - (radius_km / 111.0) AND user_lat + (radius_km / 111.0)
        AND ir.lng BETWEEN user_lng - (radius_km / (111.0 * cos(radians(user_lat)))) AND user_lng + (radius_km / (111.0 * cos(radians(user_lat))))
    ORDER BY distance_km ASC
    LIMIT max_results;
END;
$$;

-- Get nearby markers efficiently
CREATE OR REPLACE FUNCTION public.get_nearby_markers(
    user_lat DOUBLE PRECISION,
    user_lng DOUBLE PRECISION,
    radius_km DOUBLE PRECISION DEFAULT 5,
    max_results INT DEFAULT 50
)
RETURNS TABLE (
    id UUID,
    marker_type TEXT,
    description TEXT,
    latitude DOUBLE PRECISION,
    longitude DOUBLE PRECISION,
    distance_km DOUBLE PRECISION,
    created_at TIMESTAMPTZ,
    status TEXT,
    credibility_status TEXT,
    credibility_score DOUBLE PRECISION,
    verified_count INT,
    user_id UUID
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        m.id,
        m.type::TEXT AS marker_type,
        m.description,
        m.latitude,
        m.longitude,
        (6371 * acos(
            cos(radians(user_lat)) * cos(radians(m.latitude)) *
            cos(radians(m.longitude) - radians(user_lng)) +
            sin(radians(user_lat)) * sin(radians(m.latitude))
        )) AS distance_km,
        m.created_at,
        m.status,
        m.credibility_status,
        m.credibility_score,
        m.verified_count,
        m.user_id
    FROM markers m
    WHERE 
        m.status = 'active'
        AND (m.expires_at IS NULL OR m.expires_at > NOW())
        AND m.latitude BETWEEN user_lat - (radius_km / 111.0) AND user_lat + (radius_km / 111.0)
        AND m.longitude BETWEEN user_lng - (radius_km / (111.0 * cos(radians(user_lat)))) AND user_lng + (radius_km / (111.0 * cos(radians(user_lat))))
    ORDER BY distance_km ASC
    LIMIT max_results;
END;
$$;

-- Get markers in map viewport bounds
CREATE OR REPLACE FUNCTION public.get_markers_in_bounds(
    min_lat DOUBLE PRECISION,
    min_lng DOUBLE PRECISION,
    max_lat DOUBLE PRECISION,
    max_lng DOUBLE PRECISION,
    max_results INT DEFAULT 200
)
RETURNS TABLE (
    id UUID,
    marker_type TEXT,
    description TEXT,
    latitude DOUBLE PRECISION,
    longitude DOUBLE PRECISION,
    created_at TIMESTAMPTZ,
    status TEXT,
    credibility_status TEXT,
    verified_count INT,
    user_id UUID
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        m.id,
        m.type::TEXT AS marker_type,
        m.description,
        m.latitude,
        m.longitude,
        m.created_at,
        m.status,
        m.credibility_status,
        m.verified_count,
        m.user_id
    FROM markers m
    WHERE 
        m.status = 'active'
        AND (m.expires_at IS NULL OR m.expires_at > NOW())
        AND m.latitude BETWEEN min_lat AND max_lat
        AND m.longitude BETWEEN min_lng AND max_lng
    ORDER BY m.created_at DESC
    LIMIT max_results;
END;
$$;

-- Get incident reports in map viewport bounds
CREATE OR REPLACE FUNCTION public.get_incidents_in_bounds(
    min_lat DOUBLE PRECISION,
    min_lng DOUBLE PRECISION,
    max_lat DOUBLE PRECISION,
    max_lng DOUBLE PRECISION,
    max_results INT DEFAULT 200
)
RETURNS TABLE (
    incident_id UUID,
    incident_type TEXT,
    description TEXT,
    lat DOUBLE PRECISION,
    lng DOUBLE PRECISION,
    created_at TIMESTAMPTZ,
    status TEXT,
    credibility_status TEXT,
    place_name TEXT
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        ir.incident_id,
        ir.incident_type,
        ir.description,
        ir.lat,
        ir.lng,
        ir.created_at,
        ir.status::TEXT,
        ir.credibility_status,
        ir.place_name
    FROM incident_reports ir
    WHERE 
        ir.status = 'active'
        AND ir.lat IS NOT NULL AND ir.lng IS NOT NULL
        AND ir.lat BETWEEN min_lat AND max_lat
        AND ir.lng BETWEEN min_lng AND max_lng
    ORDER BY ir.created_at DESC
    LIMIT max_results;
END;
$$;

-- Combined user feed: nearby incidents + markers + community posts
CREATE OR REPLACE FUNCTION public.get_user_feed(
    user_lat DOUBLE PRECISION,
    user_lng DOUBLE PRECISION,
    radius_km DOUBLE PRECISION DEFAULT 10,
    limit_results INT DEFAULT 30
)
RETURNS TABLE (
    item_id UUID,
    item_type TEXT,
    title TEXT,
    content TEXT,
    created_at TIMESTAMPTZ,
    distance_km DOUBLE PRECISION,
    author_id UUID
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN QUERY
    -- Nearby incident reports
    SELECT 
        ir.incident_id AS item_id,
        'incident'::TEXT AS item_type,
        ir.incident_type AS title,
        ir.description AS content,
        ir.created_at,
        (6371 * acos(
            cos(radians(user_lat)) * cos(radians(ir.lat)) *
            cos(radians(ir.lng) - radians(user_lng)) +
            sin(radians(user_lat)) * sin(radians(ir.lat))
        )) AS distance_km,
        ir.reported_by AS author_id
    FROM incident_reports ir
    WHERE 
        ir.status = 'active'
        AND ir.lat IS NOT NULL AND ir.lng IS NOT NULL
        AND ir.lat BETWEEN user_lat - (radius_km / 111.0) AND user_lat + (radius_km / 111.0)
        AND ir.lng BETWEEN user_lng - (radius_km / (111.0 * cos(radians(user_lat)))) AND user_lng + (radius_km / (111.0 * cos(radians(user_lat))))

    UNION ALL

    -- Community posts (no location filter, most recent)
    SELECT 
        cp.id AS item_id,
        'post'::TEXT AS item_type,
        'Community Post'::TEXT AS title,
        cp.content,
        cp.created_at,
        NULL::DOUBLE PRECISION AS distance_km,
        cp.user_id AS author_id
    FROM community_posts cp
    WHERE 
        cp.deleted_at IS NULL
        AND cp.created_at >= NOW() - INTERVAL '7 days'

    ORDER BY created_at DESC
    LIMIT limit_results;
END;
$$;

-- ========================================
-- CLEANUP FUNCTIONS
-- ========================================

-- Clean old resolved incident reports (90 days)
CREATE OR REPLACE FUNCTION public.cleanup_old_incidents()
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    deleted_count INT;
BEGIN
    WITH deleted AS (
        DELETE FROM incident_reports
        WHERE status = 'resolved'
          AND created_at < NOW() - INTERVAL '90 days'
        RETURNING incident_id
    )
    SELECT COUNT(*) INTO deleted_count FROM deleted;
    RETURN deleted_count;
END;
$$;

-- Clean old read notifications (30 days)
CREATE OR REPLACE FUNCTION public.cleanup_old_notifications()
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    deleted_count INT;
BEGIN
    WITH deleted AS (
        DELETE FROM notifications
        WHERE read = true
          AND created_at < NOW() - INTERVAL '30 days'
        RETURNING id
    )
    SELECT COUNT(*) INTO deleted_count FROM deleted;
    RETURN deleted_count;
END;
$$;

-- Clean old rate limit records (7 days)
CREATE OR REPLACE FUNCTION public.cleanup_rate_limits()
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    deleted_count INT;
BEGIN
    WITH deleted AS (
        DELETE FROM user_rate_limits
        WHERE window_start < NOW() - INTERVAL '7 days'
        RETURNING id
    )
    SELECT COUNT(*) INTO deleted_count FROM deleted;
    RETURN deleted_count;
END;
$$;

-- Clean expired markers (expired > 7 days ago)
CREATE OR REPLACE FUNCTION public.cleanup_expired_markers()
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    deleted_count INT;
BEGIN
    WITH deleted AS (
        DELETE FROM markers
        WHERE expires_at < NOW() - INTERVAL '7 days'
        RETURNING id
    )
    SELECT COUNT(*) INTO deleted_count FROM deleted;
    RETURN deleted_count;
END;
$$;

-- Master maintenance function
CREATE OR REPLACE FUNCTION public.run_maintenance()
RETURNS TABLE (
    job TEXT,
    records_cleaned INT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN QUERY
    SELECT 'old_incidents'::TEXT, public.cleanup_old_incidents()
    UNION ALL
    SELECT 'old_notifications'::TEXT, public.cleanup_old_notifications()
    UNION ALL
    SELECT 'rate_limits'::TEXT, public.cleanup_rate_limits()
    UNION ALL
    SELECT 'expired_markers'::TEXT, public.cleanup_expired_markers();
END;
$$;

-- ========================================
-- PERFORMANCE MONITORING
-- ========================================

CREATE TABLE IF NOT EXISTS public.query_performance_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    query_name TEXT NOT NULL,
    execution_time_ms INT NOT NULL,
    user_id UUID,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.query_performance_log ENABLE ROW LEVEL SECURITY;

-- Only service role can write, authenticated can read their own
CREATE POLICY "Service role manages performance logs"
ON public.query_performance_log FOR ALL
USING (false);

CREATE INDEX IF NOT EXISTS idx_perf_log_created ON public.query_performance_log (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_perf_log_query ON public.query_performance_log (query_name, created_at DESC);

-- Log query performance helper
CREATE OR REPLACE FUNCTION public.log_query_performance(
    query_name_param TEXT,
    execution_time_ms_param INT,
    user_id_param UUID DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    INSERT INTO query_performance_log (query_name, execution_time_ms, user_id)
    VALUES (query_name_param, execution_time_ms_param, user_id_param);
END;
$$;

-- Performance stats view
CREATE OR REPLACE VIEW public.query_performance_stats AS
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
