# Database Optimization Guide

## Overview
SQL queries, indexes, and database optimization strategies for Spirit Shield Keeper.

---

## Essential Indexes

### Add These First (High Priority)

```sql
-- ============================================
-- INCIDENTS TABLE
-- ============================================

-- Spatial index for location-based queries (MOST IMPORTANT)
CREATE INDEX IF NOT EXISTS incidents_location_gist_idx 
ON incidents USING GIST (location);

-- Time-based queries (recent incidents)
CREATE INDEX IF NOT EXISTS incidents_created_at_idx 
ON incidents (created_at DESC);

-- Active incidents only
CREATE INDEX IF NOT EXISTS incidents_active_idx 
ON incidents (status, created_at DESC) 
WHERE status = 'active';

-- Incident type filtering
CREATE INDEX IF NOT EXISTS incidents_type_idx 
ON incidents (incident_type);

-- User's own incidents
CREATE INDEX IF NOT EXISTS incidents_user_idx 
ON incidents (user_id, created_at DESC);

-- Verification status
CREATE INDEX IF NOT EXISTS incidents_verification_idx 
ON incidents (verification_status);

-- ============================================
-- USERS TABLE
-- ============================================

-- Credibility lookups
CREATE INDEX IF NOT EXISTS users_credibility_idx 
ON users (credibility_score DESC);

-- Banned users check
CREATE INDEX IF NOT EXISTS users_banned_idx 
ON users (is_banned) 
WHERE is_banned = true;

-- Email lookup (for auth)
CREATE INDEX IF NOT EXISTS users_email_idx 
ON users (email);

-- Username search
CREATE INDEX IF NOT EXISTS users_username_idx 
ON users (username);

-- ============================================
-- PANIC ALERTS TABLE
-- ============================================

-- Active panic alerts (critical!)
CREATE INDEX IF NOT EXISTS panic_active_idx 
ON panic_alerts (is_active, created_at DESC) 
WHERE is_active = true;

-- Location-based panic alerts
CREATE INDEX IF NOT EXISTS panic_location_gist_idx 
ON panic_alerts USING GIST (location);

-- User's panic history
CREATE INDEX IF NOT EXISTS panic_user_idx 
ON panic_alerts (user_id, created_at DESC);

-- ============================================
-- AMBER ALERTS TABLE
-- ============================================

-- Active Amber alerts only
CREATE INDEX IF NOT EXISTS amber_active_idx 
ON amber_alerts (is_active, created_at DESC) 
WHERE is_active = true;

-- Location-based Amber searches
CREATE INDEX IF NOT EXISTS amber_location_gist_idx 
ON amber_alerts USING GIST (last_seen_location);

-- ============================================
-- COMMUNITY POSTS TABLE
-- ============================================

-- Recent posts
CREATE INDEX IF NOT EXISTS posts_created_at_idx 
ON community_posts (created_at DESC);

-- User's posts
CREATE INDEX IF NOT EXISTS posts_user_idx 
ON community_posts (user_id, created_at DESC);

-- Flagged posts (for moderation)
CREATE INDEX IF NOT EXISTS posts_flagged_idx 
ON community_posts (is_flagged) 
WHERE is_flagged = true;

-- Hidden posts (exclude from feed)
CREATE INDEX IF NOT EXISTS posts_hidden_idx 
ON community_posts (is_hidden) 
WHERE is_hidden = false;

-- ============================================
-- NOTIFICATIONS TABLE
-- ============================================

-- Unread notifications
CREATE INDEX IF NOT EXISTS notifications_unread_idx 
ON notifications (user_id, is_read, created_at DESC) 
WHERE is_read = false;

-- Notification type filtering
CREATE INDEX IF NOT EXISTS notifications_type_idx 
ON notifications (user_id, notification_type, created_at DESC);

-- ============================================
-- WATCHERS TABLE
-- ============================================

-- Find user's watchers
CREATE INDEX IF NOT EXISTS watchers_user_idx 
ON watchers (user_id, status);

-- Find who is watching user
CREATE INDEX IF NOT EXISTS watchers_watcher_idx 
ON watchers (watcher_id, status);

-- ============================================
-- MODERATION QUEUE TABLE
-- ============================================

-- Pending items
CREATE INDEX IF NOT EXISTS modqueue_pending_idx 
ON moderation_queue (status, created_at DESC) 
WHERE status = 'pending';

-- Item lookup
CREATE INDEX IF NOT EXISTS modqueue_item_idx 
ON moderation_queue (item_type, item_id);
```

---

## Optimized Queries

### Get Nearby Incidents

Instead of loading all incidents and filtering in JS:

```sql
-- Create a spatial function
CREATE OR REPLACE FUNCTION get_nearby_incidents(
  lat DOUBLE PRECISION,
  lng DOUBLE PRECISION,
  radius_km DOUBLE PRECISION DEFAULT 10,
  max_results INTEGER DEFAULT 100
)
RETURNS TABLE (
  id UUID,
  incident_type TEXT,
  description TEXT,
  location GEOMETRY,
  distance_km DOUBLE PRECISION,
  created_at TIMESTAMP,
  user_id UUID,
  verification_status TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    i.id,
    i.incident_type,
    i.description,
    i.location,
    ST_Distance(
      i.location::geography,
      ST_SetSRID(ST_MakePoint(lng, lat), 4326)::geography
    ) / 1000 AS distance_km,
    i.created_at,
    i.user_id,
    i.verification_status
  FROM incidents i
  WHERE 
    i.status = 'active'
    AND ST_DWithin(
      i.location::geography,
      ST_SetSRID(ST_MakePoint(lng, lat), 4326)::geography,
      radius_km * 1000
    )
  ORDER BY distance_km ASC
  LIMIT max_results;
END;
$$ LANGUAGE plpgsql STABLE;
```

Usage in TypeScript:

```typescript
// Instead of this:
const { data: allIncidents } = await supabase.from('incidents').select('*');
const nearby = allIncidents.filter(i => calculateDistance(userLocation, i.location) < 10);

// Do this:
const { data: nearby } = await supabase.rpc('get_nearby_incidents', {
  lat: userLocation.lat,
  lng: userLocation.lng,
  radius_km: 10,
  max_results: 50
});
```

### Get Incidents in Map Viewport

```sql
CREATE OR REPLACE FUNCTION get_incidents_in_bounds(
  min_lat DOUBLE PRECISION,
  min_lng DOUBLE PRECISION,
  max_lat DOUBLE PRECISION,
  max_lng DOUBLE PRECISION
)
RETURNS TABLE (
  id UUID,
  incident_type TEXT,
  location GEOMETRY,
  created_at TIMESTAMP,
  verification_status TEXT,
  confirmation_count INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    i.id,
    i.incident_type,
    i.location,
    i.created_at,
    i.verification_status,
    i.confirmation_count
  FROM incidents i
  WHERE 
    i.status = 'active'
    AND ST_Intersects(
      i.location,
      ST_MakeEnvelope(min_lng, min_lat, max_lng, max_lat, 4326)
    )
    AND i.created_at >= NOW() - INTERVAL '24 hours'
  ORDER BY i.created_at DESC
  LIMIT 200;
END;
$$ LANGUAGE plpgsql STABLE;
```

### Get User's Feed (Optimized)

```sql
-- Combined query: posts + incidents in one call
CREATE OR REPLACE FUNCTION get_user_feed(
  user_lat DOUBLE PRECISION,
  user_lng DOUBLE PRECISION,
  max_distance_km DOUBLE PRECISION DEFAULT 25
)
RETURNS TABLE (
  item_type TEXT,
  item_id UUID,
  title TEXT,
  content TEXT,
  created_at TIMESTAMP,
  distance_km DOUBLE PRECISION
) AS $$
BEGIN
  RETURN QUERY
  -- Community posts
  SELECT 
    'post'::TEXT as item_type,
    p.id as item_id,
    p.title,
    p.content,
    p.created_at,
    NULL::DOUBLE PRECISION as distance_km
  FROM community_posts p
  WHERE 
    p.is_hidden = false
    AND p.created_at >= NOW() - INTERVAL '7 days'
  
  UNION ALL
  
  -- Nearby incidents
  SELECT 
    'incident'::TEXT as item_type,
    i.id as item_id,
    i.incident_type as title,
    i.description as content,
    i.created_at,
    ST_Distance(
      i.location::geography,
      ST_SetSRID(ST_MakePoint(user_lng, user_lat), 4326)::geography
    ) / 1000 AS distance_km
  FROM incidents i
  WHERE 
    i.status = 'active'
    AND ST_DWithin(
      i.location::geography,
      ST_SetSRID(ST_MakePoint(user_lng, user_lat), 4326)::geography,
      max_distance_km * 1000
    )
  
  ORDER BY created_at DESC
  LIMIT 50;
END;
$$ LANGUAGE plpgsql STABLE;
```

---

## Query Performance Best Practices

### 1. Always Use Limits

```typescript
// Bad
const { data } = await supabase.from('incidents').select('*');

// Good
const { data } = await supabase
  .from('incidents')
  .select('*')
  .limit(50);
```

### 2. Filter Before Selecting

```typescript
// Bad - loads all data then filters
const { data } = await supabase
  .from('incidents')
  .select('*')
  .eq('status', 'active');

// Good - uses index
const { data } = await supabase
  .from('incidents')
  .select('*')
  .eq('status', 'active')
  .order('created_at', { ascending: false })
  .limit(50);
```

### 3. Use Partial Selects

```typescript
// Bad - loads all columns
const { data } = await supabase
  .from('incidents')
  .select('*');

// Good - only needed columns
const { data } = await supabase
  .from('incidents')
  .select('id, incident_type, location, created_at');
```

### 4. Avoid N+1 Queries

```typescript
// Bad - separate query for each incident's user
const { data: incidents } = await supabase.from('incidents').select('*');
for (const incident of incidents) {
  const { data: user } = await supabase
    .from('users')
    .select('username')
    .eq('id', incident.user_id)
    .single();
  // ... use user data
}

// Good - join in one query
const { data: incidents } = await supabase
  .from('incidents')
  .select(`
    *,
    user:users (
      username,
      credibility_score
    )
  `);
```

---

## Database Cleanup Jobs

### Remove Old Data

```sql
-- Create cleanup function
CREATE OR REPLACE FUNCTION cleanup_old_data()
RETURNS void AS $$
BEGIN
  -- Delete resolved incidents older than 90 days
  DELETE FROM incidents
  WHERE status = 'resolved'
    AND created_at < NOW() - INTERVAL '90 days';
  
  -- Delete old notifications (read, older than 30 days)
  DELETE FROM notifications
  WHERE is_read = true
    AND created_at < NOW() - INTERVAL '30 days';
  
  -- Delete expired bans
  UPDATE users
  SET is_banned = false,
      ban_reason = NULL,
      ban_expires_at = NULL
  WHERE is_banned = true
    AND ban_expires_at < NOW();
  
  -- Delete old moderation logs (keep 6 months)
  DELETE FROM moderation_log
  WHERE created_at < NOW() - INTERVAL '6 months';
  
  -- Archive old user activity logs (keep 3 months)
  DELETE FROM user_activity_log
  WHERE created_at < NOW() - INTERVAL '3 months';
END;
$$ LANGUAGE plpgsql;
```

Schedule this to run daily using Supabase Edge Functions or pg_cron.

---

## Monitoring Query Performance

### Enable Query Statistics

```sql
-- Check slow queries
SELECT 
  query,
  calls,
  total_time,
  mean_time,
  max_time
FROM pg_stat_statements
WHERE mean_time > 100 -- queries taking more than 100ms
ORDER BY mean_time DESC
LIMIT 20;
```

### Analyze Table Usage

```sql
-- Check which tables are scanned most
SELECT 
  schemaname,
  tablename,
  seq_scan,
  seq_tup_read,
  idx_scan,
  idx_tup_fetch
FROM pg_stat_user_tables
ORDER BY seq_scan DESC;
```

If `seq_scan` is high, you need more indexes.

### Check Index Usage

```sql
-- Find unused indexes
SELECT
  schemaname,
  tablename,
  indexname,
  idx_scan,
  idx_tup_read,
  pg_size_pretty(pg_relation_size(indexrelid)) as index_size
FROM pg_stat_user_indexes
WHERE idx_scan = 0
  AND indexname NOT LIKE '%pkey';
```

---

## Real-time Subscription Optimization

### Subscribe Only to Nearby Events

Instead of subscribing to ALL incidents:

```typescript
// Bad - subscribes to every incident globally
const channel = supabase
  .channel('all-incidents')
  .on('postgres_changes', {
    event: '*',
    schema: 'public',
    table: 'incidents'
  }, handleIncident)
  .subscribe();

// Good - use filtered subscriptions
const channel = supabase
  .channel('nearby-incidents')
  .on('postgres_changes', {
    event: 'INSERT',
    schema: 'public',
    table: 'incidents',
    filter: `status=eq.active`
  }, (payload) => {
    // Filter client-side by distance
    const distance = calculateDistance(userLocation, payload.new.location);
    if (distance < 10) {
      handleIncident(payload);
    }
  })
  .subscribe();
```

Better approach - use Postgres filters with PostGIS in real-time triggers.

### Throttle Updates

```typescript
import { throttle } from 'lodash';

const throttledUpdate = throttle((payload) => {
  updateIncidentOnMap(payload);
}, 1000); // Max once per second

channel.on('postgres_changes', {
  event: '*',
  schema: 'public',
  table: 'incidents'
}, throttledUpdate);
```

---

## Connection Pooling

Configure Supabase connection pooling:

```typescript
// In your Supabase project settings:
// Database -> Connection Pooling
// Enable connection pooling
// Set pool size: 15-20 for small app, 50-100 for production
```

---

## Table Partitioning (Advanced - Future)

If you grow to millions of records, partition by date:

```sql
-- Partition incidents by month
CREATE TABLE incidents (
  id UUID,
  created_at TIMESTAMP,
  -- ... other columns
) PARTITION BY RANGE (created_at);

-- Create partitions
CREATE TABLE incidents_2026_02 PARTITION OF incidents
  FOR VALUES FROM ('2026-02-01') TO ('2026-03-01');

CREATE TABLE incidents_2026_03 PARTITION OF incidents
  FOR VALUES FROM ('2026-03-01') TO ('2026-04-01');

-- Etc...
```

---

## Caching Strategy

### Application-Level Caching

```typescript
// Use React Query with smart stale times
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Static data - cache for 24 hours
      staleTime: (query) => {
        if (query.queryKey[0] === 'authorities') return 24 * 60 * 60 * 1000;
        if (query.queryKey[0] === 'safety_zones') return 60 * 60 * 1000;
        
        // Dynamic data - cache for 5 minutes
        if (query.queryKey[0] === 'incidents') return 5 * 60 * 1000;
        if (query.queryKey[0] === 'community_posts') return 15 * 60 * 1000;
        
        // Real-time data - no cache
        if (query.queryKey[0] === 'panic_alerts') return 0;
        
        return 5 * 60 * 1000; // Default 5 min
      },
    },
  },
});
```

### Database-Level Caching

Use Supabase's built-in caching for expensive queries:

```sql
-- Create materialized view for slow aggregations
CREATE MATERIALIZED VIEW incident_stats AS
SELECT
  DATE(created_at) as date,
  incident_type,
  COUNT(*) as count,
  AVG(confirmation_count) as avg_confirmations
FROM incidents
WHERE created_at >= NOW() - INTERVAL '30 days'
GROUP BY DATE(created_at), incident_type;

-- Refresh hourly via cron or edge function
REFRESH MATERIALIZED VIEW incident_stats;
```

---

## Storage Optimization

### Image Storage

```typescript
// Compress before upload
async function uploadIncidentImage(file: File, incidentId: string) {
  // Compress image
  const compressed = await compressImage(file);
  
  // Generate hash to prevent duplicates
  const hash = await getImageHash(compressed);
  
  // Check if already exists
  const { data: existing } = await supabase
    .from('uploaded_images')
    .select('url')
    .eq('image_hash', hash)
    .single();
  
  if (existing) {
    return existing.url; // Reuse existing image
  }
  
  // Upload new image
  const filename = `incidents/${incidentId}/${Date.now()}.jpg`;
  const { data, error } = await supabase.storage
    .from('incident-images')
    .upload(filename, compressed);
  
  if (error) throw error;
  
  // Save hash for deduplication
  await supabase.from('uploaded_images').insert({
    image_hash: hash,
    url: data.path,
    incident_id: incidentId,
  });
  
  return data.path;
}
```

### Cleanup Unused Images

```sql
-- Find orphaned images (no incident reference)
SELECT i.url
FROM uploaded_images i
LEFT JOIN incidents inc ON i.incident_id = inc.id
WHERE inc.id IS NULL
  AND i.created_at < NOW() - INTERVAL '7 days';
```

Delete these via Edge Function.

---

## Performance Targets

Monitor these metrics:

| Metric | Target | Critical |
|--------|--------|----------|
| Page load time | <2s | >4s |
| API response time | <200ms | >1s |
| Map load time | <3s | >6s |
| Real-time latency | <500ms | >2s |
| Database query time | <50ms | >500ms |
| Image upload time | <3s | >10s |

Use Supabase Dashboard → Performance to monitor.

---

## Emergency Optimization

If your app slows down suddenly:

1. **Check active queries:**
```sql
SELECT pid, now() - query_start as duration, query
FROM pg_stat_activity
WHERE state = 'active'
ORDER BY duration DESC;
```

2. **Kill slow queries:**
```sql
SELECT pg_terminate_backend(pid)
FROM pg_stat_activity
WHERE state = 'active'
  AND now() - query_start > interval '30 seconds';
```

3. **Check connection count:**
```sql
SELECT count(*) FROM pg_stat_activity;
```

If near limit, increase connection pool.

4. **Rebuild indexes:**
```sql
REINDEX TABLE incidents;
REINDEX TABLE users;
```

5. **Vacuum database:**
```sql
VACUUM ANALYZE;
```
