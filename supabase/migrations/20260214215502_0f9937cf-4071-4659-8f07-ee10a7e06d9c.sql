
-- ============================================
-- PERFORMANCE INDEXES FOR EXISTING TABLES
-- ============================================

-- MARKERS: Location-based queries
CREATE INDEX IF NOT EXISTS idx_markers_location ON markers (latitude, longitude);
CREATE INDEX IF NOT EXISTS idx_markers_active ON markers (status, created_at DESC) WHERE status = 'active';
CREATE INDEX IF NOT EXISTS idx_markers_user ON markers (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_markers_type ON markers (type);
CREATE INDEX IF NOT EXISTS idx_markers_expires ON markers (expires_at) WHERE expires_at IS NOT NULL;

-- ALERTS: Active alerts, user lookups
CREATE INDEX IF NOT EXISTS idx_alerts_active ON alerts (status, created_at DESC) WHERE status = 'active';
CREATE INDEX IF NOT EXISTS idx_alerts_user ON alerts (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_alerts_type ON alerts (type);
CREATE INDEX IF NOT EXISTS idx_alerts_location ON alerts (latitude, longitude);

-- COMMUNITY POSTS: Feed queries
CREATE INDEX IF NOT EXISTS idx_community_posts_feed ON community_posts (created_at DESC) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_community_posts_user ON community_posts (user_id, created_at DESC);

-- NOTIFICATIONS: Unread notifications
CREATE INDEX IF NOT EXISTS idx_notifications_unread ON notifications (user_id, read, created_at DESC) WHERE read = false;
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications (user_id, created_at DESC);

-- WATCHERS: Relationship lookups
CREATE INDEX IF NOT EXISTS idx_watchers_user ON watchers (user_id, status);
CREATE INDEX IF NOT EXISTS idx_watchers_watcher ON watchers (watcher_id, status);

-- PANIC SESSIONS: Active sessions
CREATE INDEX IF NOT EXISTS idx_panic_sessions_active ON panic_sessions (status, created_at DESC) WHERE status = 'active';
CREATE INDEX IF NOT EXISTS idx_panic_sessions_user ON panic_sessions (user_id, created_at DESC);

-- PANIC ALERTS BROADCAST: Active broadcast alerts
CREATE INDEX IF NOT EXISTS idx_panic_broadcast_active ON panic_alerts_broadcast (status, created_at DESC) WHERE status = 'active';
CREATE INDEX IF NOT EXISTS idx_panic_broadcast_location ON panic_alerts_broadcast (latitude, longitude);

-- INCIDENT REPORTS: Active incidents
CREATE INDEX IF NOT EXISTS idx_incident_reports_active ON incident_reports (status, created_at DESC) WHERE status = 'active';
CREATE INDEX IF NOT EXISTS idx_incident_reports_location ON incident_reports (lat, lng);

-- INCIDENT VERIFICATIONS: Lookup by incident
CREATE INDEX IF NOT EXISTS idx_verifications_incident ON incident_verifications (incident_id, incident_type);
CREATE INDEX IF NOT EXISTS idx_verifications_user ON incident_verifications (user_id, created_at DESC);

-- MARKER COMMENTS: By marker
CREATE INDEX IF NOT EXISTS idx_marker_comments_marker ON marker_comments (marker_id, created_at DESC);

-- MARKER REACTIONS: By marker
CREATE INDEX IF NOT EXISTS idx_marker_reactions_marker ON marker_reactions (marker_id);

-- COMMUNITY COMMENTS: By post
CREATE INDEX IF NOT EXISTS idx_community_comments_post ON community_comments (post_id, created_at DESC) WHERE deleted_at IS NULL;

-- PANIC LOCATION LOGS: By session
CREATE INDEX IF NOT EXISTS idx_panic_location_session ON panic_location_logs (panic_session_id, recorded_at DESC);

-- CHECK IN TIMERS: Active timers
CREATE INDEX IF NOT EXISTS idx_checkin_active ON check_in_timers (status, next_check_in) WHERE status = 'active';

-- LOOK AFTER ME: Active sessions
CREATE INDEX IF NOT EXISTS idx_lam_active ON look_after_me_sessions (is_active, user_id) WHERE is_active = true;
