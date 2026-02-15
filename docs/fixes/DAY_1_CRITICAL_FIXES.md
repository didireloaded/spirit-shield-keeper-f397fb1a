# DAY 1 CRITICAL FIXES - Database Performance & Security
## ⏱️ Time Required: 2-3 hours
## 🎯 Priority: CRITICAL - DO THIS FIRST

---

## Part 1: Database Indexes (30 minutes)

### Step 1: Open Supabase SQL Editor
1. Go to your Supabase project dashboard
2. Click "SQL Editor" in left sidebar
3. Click "New Query"

### Step 2: Copy and Run ALL These Indexes

```sql
-- ========================================
-- CRITICAL INDEXES FOR PERFORMANCE
-- Run ALL of these in your Supabase SQL Editor
-- ========================================

-- ============= INCIDENTS TABLE =============
-- Location-based queries (MAP PERFORMANCE)
CREATE INDEX IF NOT EXISTS incidents_location_gist_idx 
ON incidents USING GIST (location);

-- Time-based queries (FEED PERFORMANCE)
CREATE INDEX IF NOT EXISTS incidents_created_at_idx 
ON incidents (created_at DESC);

-- Active incidents filter (MOST COMMON QUERY)
CREATE INDEX IF NOT EXISTS incidents_active_status_idx 
ON incidents (status, created_at DESC) 
WHERE status = 'active';

-- Incident type filtering
CREATE INDEX IF NOT EXISTS incidents_type_idx 
ON incidents (incident_type, created_at DESC);

-- User's incidents
CREATE INDEX IF NOT EXISTS incidents_user_id_idx 
ON incidents (user_id, created_at DESC);

-- Verification status
CREATE INDEX IF NOT EXISTS incidents_verification_idx 
ON incidents (verification_status, created_at DESC);

-- Confirmation count (for sorting)
CREATE INDEX IF NOT EXISTS incidents_confirmation_count_idx 
ON incidents (confirmation_count DESC);


-- ============= USERS TABLE =============
-- Credibility-based queries
CREATE INDEX IF NOT EXISTS users_credibility_idx 
ON users (credibility_score DESC);

-- Banned users check
CREATE INDEX IF NOT EXISTS users_banned_idx 
ON users (banned) 
WHERE banned = true;

-- Email lookup (login)
CREATE INDEX IF NOT EXISTS users_email_idx 
ON users (email);

-- Username lookup
CREATE INDEX IF NOT EXISTS users_username_idx 
ON users (username);


-- ============= PANIC ALERTS TABLE =============
-- Active panic alerts (EMERGENCY)
CREATE INDEX IF NOT EXISTS panic_alerts_active_idx 
ON panic_alerts (status, created_at DESC) 
WHERE status = 'active';

-- Location-based panic alerts
CREATE INDEX IF NOT EXISTS panic_alerts_location_gist_idx 
ON panic_alerts USING GIST (location);

-- User's panic history
CREATE INDEX IF NOT EXISTS panic_alerts_user_id_idx 
ON panic_alerts (user_id, created_at DESC);


-- ============= AMBER ALERTS TABLE =============
-- Active amber alerts (CRITICAL)
CREATE INDEX IF NOT EXISTS amber_alerts_active_idx 
ON amber_alerts (status, created_at DESC) 
WHERE status = 'active';

-- Location-based amber alerts
CREATE INDEX IF NOT EXISTS amber_alerts_location_gist_idx 
ON amber_alerts USING GIST (location);


-- ============= COMMUNITY POSTS TABLE =============
-- Feed queries (COMMUNITY PAGE)
CREATE INDEX IF NOT EXISTS community_posts_created_at_idx 
ON community_posts (created_at DESC);

-- Flagged content (MODERATION)
CREATE INDEX IF NOT EXISTS community_posts_flagged_idx 
ON community_posts (flagged, created_at DESC) 
WHERE flagged = true;

-- Hidden content
CREATE INDEX IF NOT EXISTS community_posts_hidden_idx 
ON community_posts (hidden) 
WHERE hidden = true;

-- User's posts
CREATE INDEX IF NOT EXISTS community_posts_user_id_idx 
ON community_posts (user_id, created_at DESC);


-- ============= NOTIFICATIONS TABLE =============
-- Unread notifications (MOST COMMON)
CREATE INDEX IF NOT EXISTS notifications_user_unread_idx 
ON notifications (user_id, created_at DESC) 
WHERE read = false;

-- All user notifications
CREATE INDEX IF NOT EXISTS notifications_user_id_idx 
ON notifications (user_id, created_at DESC);


-- ============= WATCHERS TABLE =============
-- User's watchers list
CREATE INDEX IF NOT EXISTS watchers_user_id_idx 
ON watchers (user_id);

-- Reverse lookup (who watches me)
CREATE INDEX IF NOT EXISTS watchers_watcher_id_idx 
ON watchers (watcher_id);

-- Accepted watchers only
CREATE INDEX IF NOT EXISTS watchers_accepted_idx 
ON watchers (user_id, status) 
WHERE status = 'accepted';


-- ============= LOOK AFTER ME SESSIONS =============
-- Active sessions (TRIP MONITORING)
CREATE INDEX IF NOT EXISTS look_after_me_active_idx 
ON look_after_me_sessions (status, start_time DESC) 
WHERE status = 'active';

-- User's sessions
CREATE INDEX IF NOT EXISTS look_after_me_user_id_idx 
ON look_after_me_sessions (user_id, start_time DESC);


-- ============= COMMENTS TABLE =============
-- Comments by post (COMMUNITY)
CREATE INDEX IF NOT EXISTS comments_post_id_idx 
ON comments (post_id, created_at ASC);


-- ============= MARKERS TABLE =============
-- Active markers on map
CREATE INDEX IF NOT EXISTS markers_expires_at_idx 
ON markers (expires_at DESC) 
WHERE expires_at >= NOW();

-- Location-based markers
CREATE INDEX IF NOT EXISTS markers_location_gist_idx 
ON markers USING GIST (location);


-- ========================================
-- VERIFY INDEXES WERE CREATED
-- ========================================
SELECT 
    schemaname,
    tablename,
    indexname,
    indexdef
FROM pg_indexes
WHERE schemaname = 'public'
ORDER BY tablename, indexname;
```

### Step 3: Verify Indexes Created
After running, you should see output showing all indexes. Look for:
- `incidents_location_gist_idx` ✓
- `incidents_created_at_idx` ✓
- `users_credibility_idx` ✓
- etc.

---

## Part 2: Database Functions (20 minutes)

### Add Helper Functions for Common Queries

```sql
-- ========================================
-- OPTIMIZED QUERY FUNCTIONS
-- ========================================

-- Get nearby incidents efficiently
CREATE OR REPLACE FUNCTION get_nearby_incidents(
    user_lat FLOAT,
    user_lng FLOAT,
    radius_km FLOAT DEFAULT 5,
    max_results INT DEFAULT 50
)
RETURNS TABLE (
    id UUID,
    incident_type TEXT,
    description TEXT,
    location GEOGRAPHY,
    distance_km FLOAT,
    created_at TIMESTAMP,
    verification_status TEXT,
    confirmation_count INT
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        i.id,
        i.incident_type,
        i.description,
        i.location,
        ST_Distance(
            i.location,
            ST_SetSRID(ST_MakePoint(user_lng, user_lat), 4326)::geography
        ) / 1000 AS distance_km,
        i.created_at,
        i.verification_status,
        i.confirmation_count
    FROM incidents i
    WHERE 
        i.status = 'active'
        AND ST_DWithin(
            i.location,
            ST_SetSRID(ST_MakePoint(user_lng, user_lat), 4326)::geography,
            radius_km * 1000
        )
    ORDER BY distance_km ASC
    LIMIT max_results;
END;
$$;


-- Get incidents in map bounds efficiently
CREATE OR REPLACE FUNCTION get_incidents_in_bounds(
    min_lat FLOAT,
    min_lng FLOAT,
    max_lat FLOAT,
    max_lng FLOAT,
    max_results INT DEFAULT 100
)
RETURNS TABLE (
    id UUID,
    incident_type TEXT,
    description TEXT,
    latitude FLOAT,
    longitude FLOAT,
    created_at TIMESTAMP,
    verification_status TEXT
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        i.id,
        i.incident_type,
        i.description,
        ST_Y(i.location::geometry) AS latitude,
        ST_X(i.location::geometry) AS longitude,
        i.created_at,
        i.verification_status
    FROM incidents i
    WHERE 
        i.status = 'active'
        AND ST_Intersects(
            i.location::geometry,
            ST_MakeEnvelope(min_lng, min_lat, max_lng, max_lat, 4326)
        )
    ORDER BY i.created_at DESC
    LIMIT max_results;
END;
$$;


-- Get user's personalized feed (nearby incidents + followed users)
CREATE OR REPLACE FUNCTION get_user_feed(
    user_id_param UUID,
    user_lat FLOAT,
    user_lng FLOAT,
    radius_km FLOAT DEFAULT 10,
    limit_results INT DEFAULT 20
)
RETURNS TABLE (
    id UUID,
    type TEXT,
    content TEXT,
    created_at TIMESTAMP,
    distance_km FLOAT,
    user_name TEXT,
    credibility_score INT
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        i.id,
        'incident' AS type,
        i.description AS content,
        i.created_at,
        ST_Distance(
            i.location,
            ST_SetSRID(ST_MakePoint(user_lng, user_lat), 4326)::geography
        ) / 1000 AS distance_km,
        u.full_name AS user_name,
        u.credibility_score
    FROM incidents i
    JOIN users u ON i.user_id = u.id
    WHERE 
        i.status = 'active'
        AND ST_DWithin(
            i.location,
            ST_SetSRID(ST_MakePoint(user_lng, user_lat), 4326)::geography,
            radius_km * 1000
        )
    
    UNION ALL
    
    SELECT 
        cp.id,
        'post' AS type,
        cp.content,
        cp.created_at,
        NULL AS distance_km,
        u.full_name AS user_name,
        u.credibility_score
    FROM community_posts cp
    JOIN users u ON cp.user_id = u.id
    WHERE 
        cp.hidden = false
        AND cp.flagged = false
    
    ORDER BY created_at DESC
    LIMIT limit_results;
END;
$$;
```

---

## Part 3: Rate Limiting Tables (10 minutes)

### Create Rate Limiting Infrastructure

```sql
-- ========================================
-- RATE LIMITING TABLES
-- ========================================

-- Rate limit tracking
CREATE TABLE IF NOT EXISTS rate_limits (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    action_type TEXT NOT NULL, -- 'panic', 'amber', 'report', 'post'
    action_count INT DEFAULT 1,
    window_start TIMESTAMP DEFAULT NOW(),
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(user_id, action_type, window_start)
);

CREATE INDEX IF NOT EXISTS rate_limits_user_action_idx 
ON rate_limits (user_id, action_type, window_start DESC);


-- Function to check rate limit
CREATE OR REPLACE FUNCTION check_rate_limit(
    user_id_param UUID,
    action_type_param TEXT,
    max_actions INT,
    window_minutes INT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
AS $$
DECLARE
    action_count INT;
BEGIN
    -- Count actions in the time window
    SELECT COALESCE(SUM(action_count), 0)
    INTO action_count
    FROM rate_limits
    WHERE 
        user_id = user_id_param
        AND action_type = action_type_param
        AND window_start > NOW() - (window_minutes || ' minutes')::INTERVAL;
    
    -- Return true if under limit
    RETURN action_count < max_actions;
END;
$$;


-- Function to record rate limited action
CREATE OR REPLACE FUNCTION record_rate_limit(
    user_id_param UUID,
    action_type_param TEXT
)
RETURNS VOID
LANGUAGE plpgsql
AS $$
BEGIN
    INSERT INTO rate_limits (user_id, action_type, window_start)
    VALUES (user_id_param, action_type_param, DATE_TRUNC('hour', NOW()))
    ON CONFLICT (user_id, action_type, window_start)
    DO UPDATE SET action_count = rate_limits.action_count + 1;
END;
$$;
```

---

## Part 4: Cleanup Jobs (15 minutes)

### Automated Maintenance

```sql
-- ========================================
-- CLEANUP FUNCTIONS
-- ========================================

-- Clean old resolved incidents
CREATE OR REPLACE FUNCTION cleanup_old_incidents()
RETURNS INT
LANGUAGE plpgsql
AS $$
DECLARE
    deleted_count INT;
BEGIN
    WITH deleted AS (
        DELETE FROM incidents
        WHERE 
            status = 'resolved'
            AND created_at < NOW() - INTERVAL '90 days'
        RETURNING id
    )
    SELECT COUNT(*) INTO deleted_count FROM deleted;
    
    RETURN deleted_count;
END;
$$;


-- Clean old read notifications
CREATE OR REPLACE FUNCTION cleanup_old_notifications()
RETURNS INT
LANGUAGE plpgsql
AS $$
DECLARE
    deleted_count INT;
BEGIN
    WITH deleted AS (
        DELETE FROM notifications
        WHERE 
            read = true
            AND created_at < NOW() - INTERVAL '30 days'
        RETURNING id
    )
    SELECT COUNT(*) INTO deleted_count FROM deleted;
    
    RETURN deleted_count;
END;
$$;


-- Clean old rate limit records
CREATE OR REPLACE FUNCTION cleanup_rate_limits()
RETURNS INT
LANGUAGE plpgsql
AS $$
DECLARE
    deleted_count INT;
BEGIN
    WITH deleted AS (
        DELETE FROM rate_limits
        WHERE window_start < NOW() - INTERVAL '7 days'
        RETURNING id
    )
    SELECT COUNT(*) INTO deleted_count FROM deleted;
    
    RETURN deleted_count;
END;
$$;


-- Run all cleanup jobs
CREATE OR REPLACE FUNCTION run_maintenance()
RETURNS TABLE (
    job TEXT,
    records_cleaned INT
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT 'old_incidents'::TEXT, cleanup_old_incidents()
    UNION ALL
    SELECT 'old_notifications'::TEXT, cleanup_old_notifications()
    UNION ALL
    SELECT 'rate_limits'::TEXT, cleanup_rate_limits();
END;
$$;
```

---

## Part 5: Database Security Audit (30 minutes)

### Verify RLS Policies

```sql
-- ========================================
-- CHECK RLS IS ENABLED
-- ========================================

-- Check which tables have RLS enabled
SELECT 
    schemaname,
    tablename,
    rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;

-- Should see rowsecurity = true for all tables


-- ========================================
-- VERIFY RLS POLICIES EXIST
-- ========================================

SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;


-- ========================================
-- ADD MISSING RLS POLICIES (if needed)
-- ========================================

-- Ensure incidents are properly protected
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'incidents' 
        AND policyname = 'Users can view active incidents'
    ) THEN
        CREATE POLICY "Users can view active incidents"
        ON incidents FOR SELECT
        USING (status = 'active' OR user_id = auth.uid());
    END IF;
END $$;


-- Ensure users can only edit their own data
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'users' 
        AND policyname = 'Users can update own profile'
    ) THEN
        CREATE POLICY "Users can update own profile"
        ON users FOR UPDATE
        USING (id = auth.uid());
    END IF;
END $$;


-- Ensure panic alerts are properly protected
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'panic_alerts' 
        AND policyname = 'Users can view nearby panic alerts'
    ) THEN
        CREATE POLICY "Users can view nearby panic alerts"
        ON panic_alerts FOR SELECT
        USING (status = 'active');
    END IF;
END $$;
```

---

## Part 6: Performance Monitoring (20 minutes)

### Add Query Performance Tracking

```sql
-- ========================================
-- QUERY PERFORMANCE LOG
-- ========================================

CREATE TABLE IF NOT EXISTS query_performance_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    query_name TEXT NOT NULL,
    execution_time_ms INT NOT NULL,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS query_performance_log_created_at_idx 
ON query_performance_log (created_at DESC);

CREATE INDEX IF NOT EXISTS query_performance_log_query_name_idx 
ON query_performance_log (query_name, created_at DESC);


-- Function to log query performance
CREATE OR REPLACE FUNCTION log_query_performance(
    query_name_param TEXT,
    execution_time_ms_param INT,
    user_id_param UUID DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
AS $$
BEGIN
    INSERT INTO query_performance_log (query_name, execution_time_ms, user_id)
    VALUES (query_name_param, execution_time_ms_param, user_id_param);
END;
$$;


-- View average query performance
CREATE OR REPLACE VIEW query_performance_stats AS
SELECT 
    query_name,
    COUNT(*) AS total_queries,
    AVG(execution_time_ms) AS avg_time_ms,
    MIN(execution_time_ms) AS min_time_ms,
    MAX(execution_time_ms) AS max_time_ms,
    PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY execution_time_ms) AS p95_time_ms
FROM query_performance_log
WHERE created_at > NOW() - INTERVAL '24 hours'
GROUP BY query_name
ORDER BY avg_time_ms DESC;
```

---

## Part 7: Verification Tests (15 minutes)

### Test Query Performance

```sql
-- ========================================
-- PERFORMANCE TESTS
-- ========================================

-- Test 1: Nearby incidents query (should be <100ms)
EXPLAIN ANALYZE
SELECT * FROM get_nearby_incidents(
    -22.5597, -- Windhoek lat
    17.0832,  -- Windhoek lng
    5.0,      -- 5km radius
    20        -- 20 results
);


-- Test 2: Map bounds query (should be <100ms)
EXPLAIN ANALYZE
SELECT * FROM get_incidents_in_bounds(
    -22.6, 17.0,  -- min lat, lng
    -22.5, 17.1,  -- max lat, lng
    50            -- max results
);


-- Test 3: User feed query (should be <200ms)
EXPLAIN ANALYZE
SELECT * FROM get_user_feed(
    'YOUR_USER_ID'::UUID,  -- Replace with actual user ID
    -22.5597,
    17.0832,
    10.0,
    20
);


-- Test 4: Check all indexes exist
SELECT COUNT(*) AS total_indexes
FROM pg_indexes
WHERE schemaname = 'public';
-- Should be 30+ indexes


-- Test 5: Verify RLS is enabled
SELECT COUNT(*) AS tables_with_rls
FROM pg_tables
WHERE schemaname = 'public' AND rowsecurity = true;
-- Should match total number of tables
```

---

## ✅ Verification Checklist

After completing all steps:

- [ ] All indexes created (30+ indexes)
- [ ] Helper functions added (get_nearby_incidents, etc.)
- [ ] Rate limiting tables created
- [ ] Cleanup functions added
- [ ] RLS policies verified
- [ ] Performance monitoring enabled
- [ ] All tests passing (<100ms for critical queries)

---

## 🎯 Expected Results

**Before:**
- Incidents query: 2-5 seconds ❌
- Map load: 10+ seconds ❌
- Feed load: 3-5 seconds ❌

**After:**
- Incidents query: <100ms ✅
- Map load: <500ms ✅
- Feed load: <200ms ✅

**Performance improvement: 10-50x faster!**

---

## 🚨 Troubleshooting

### If indexes fail to create:
```sql
-- Check if PostGIS extension is enabled
CREATE EXTENSION IF NOT EXISTS postgis;

-- Check for conflicting indexes
DROP INDEX IF EXISTS old_index_name;
```

### If functions fail:
```sql
-- Check PostgreSQL version (need 12+)
SELECT version();

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS postgis;
```

### If RLS blocks queries:
```sql
-- Temporarily disable RLS for testing (DON'T DO IN PRODUCTION)
ALTER TABLE incidents DISABLE ROW LEVEL SECURITY;

-- Re-enable after fixing policies
ALTER TABLE incidents ENABLE ROW LEVEL SECURITY;
```

---

## 📊 Success Metrics

Run this to check performance:

```sql
SELECT 
    'Database Size' AS metric,
    pg_size_pretty(pg_database_size(current_database())) AS value
UNION ALL
SELECT 
    'Total Indexes' AS metric,
    COUNT(*)::TEXT AS value
FROM pg_indexes
WHERE schemaname = 'public'
UNION ALL
SELECT 
    'Tables with RLS' AS metric,
    COUNT(*)::TEXT AS value
FROM pg_tables
WHERE schemaname = 'public' AND rowsecurity = true;
```

---

## ⏭️ Next Steps

Once complete, move to:
- **DAY_2_CRITICAL_FIXES.md** - False Report Prevention
- **DAY_3_CRITICAL_FIXES.md** - Content Moderation
- **DAY_4_CRITICAL_FIXES.md** - Legal Compliance

---

**Estimated total time: 2-3 hours**  
**Impact: 10-50x performance improvement**  
**Status after completion: Database production-ready ✅**
