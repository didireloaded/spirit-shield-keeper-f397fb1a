-- Add performance indexes for frequently queried fields
-- These indexes will significantly improve query performance

-- Alerts table indexes
CREATE INDEX IF NOT EXISTS idx_alerts_user_id ON public.alerts(user_id);
CREATE INDEX IF NOT EXISTS idx_alerts_status ON public.alerts(status);
CREATE INDEX IF NOT EXISTS idx_alerts_created_at ON public.alerts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_alerts_type ON public.alerts(type);

-- Markers table indexes
CREATE INDEX IF NOT EXISTS idx_markers_user_id ON public.markers(user_id);
CREATE INDEX IF NOT EXISTS idx_markers_status ON public.markers(status);
CREATE INDEX IF NOT EXISTS idx_markers_expires_at ON public.markers(expires_at);
CREATE INDEX IF NOT EXISTS idx_markers_created_at ON public.markers(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_markers_type ON public.markers(type);

-- User locations index
CREATE INDEX IF NOT EXISTS idx_user_locations_user_id ON public.user_locations(user_id);
CREATE INDEX IF NOT EXISTS idx_user_locations_updated_at ON public.user_locations(updated_at DESC);

-- Community posts indexes
CREATE INDEX IF NOT EXISTS idx_community_posts_user_id ON public.community_posts(user_id);
CREATE INDEX IF NOT EXISTS idx_community_posts_created_at ON public.community_posts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_community_posts_visibility ON public.community_posts(visibility);

-- Notifications indexes
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON public.notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON public.notifications(read);
CREATE INDEX IF NOT EXISTS idx_notifications_type ON public.notifications(type);

-- Panic sessions indexes
CREATE INDEX IF NOT EXISTS idx_panic_sessions_user_id ON public.panic_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_panic_sessions_status ON public.panic_sessions(status);
CREATE INDEX IF NOT EXISTS idx_panic_sessions_created_at ON public.panic_sessions(created_at DESC);

-- Safety sessions indexes
CREATE INDEX IF NOT EXISTS idx_safety_sessions_user_id ON public.safety_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_safety_sessions_status ON public.safety_sessions(status);

-- Watchers indexes
CREATE INDEX IF NOT EXISTS idx_watchers_user_id ON public.watchers(user_id);
CREATE INDEX IF NOT EXISTS idx_watchers_watcher_id ON public.watchers(watcher_id);
CREATE INDEX IF NOT EXISTS idx_watchers_status ON public.watchers(status);

-- Messages indexes
CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON public.messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_sender_id ON public.messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON public.messages(created_at DESC);