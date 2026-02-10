
-- ============================================================
-- SECTION 1: FIX panic_alerts_broadcast RLS
-- Gap: Only owners can SELECT, but nearby users need to see active panics on map
-- ============================================================

-- Drop the overly restrictive owner-only SELECT policy
DROP POLICY IF EXISTS "Users can view their own panic alerts" ON public.panic_alerts_broadcast;

-- Allow all authenticated users to see active panic broadcasts (safety-critical)
CREATE POLICY "Authenticated users can view active panic alerts"
ON public.panic_alerts_broadcast
FOR SELECT
USING (auth.uid() IS NOT NULL AND status = 'active');

-- Owners can always see their own (any status)
CREATE POLICY "Owners can view all their panic alerts"
ON public.panic_alerts_broadcast
FOR SELECT
USING (auth.uid() = user_id);

-- ============================================================
-- SECTION 2: FIX markers missing UPDATE policy
-- Gap: Owners cannot update marker status
-- ============================================================

CREATE POLICY "Users can update their own markers"
ON public.markers
FOR UPDATE
USING (auth.uid() = user_id);

-- ============================================================
-- SECTION 3: CLEANUP duplicate RLS policies on user_locations
-- ============================================================

DROP POLICY IF EXISTS "Users can update their own location" ON public.user_locations;
DROP POLICY IF EXISTS "Users can upsert their own location" ON public.user_locations;

-- ============================================================
-- SECTION 4: CLEANUP duplicate RLS policies on notifications
-- ============================================================

DROP POLICY IF EXISTS "Users see their own notifications" ON public.notifications;
DROP POLICY IF EXISTS "Users can delete their own notifications" ON public.notifications;
DROP POLICY IF EXISTS "Users can update their own notifications" ON public.notifications;

-- ============================================================
-- SECTION 5: Add missing tables to realtime publication
-- For panic delivery tracking and watcher awareness
-- ============================================================

ALTER PUBLICATION supabase_realtime ADD TABLE public.panic_alerts;
ALTER PUBLICATION supabase_realtime ADD TABLE public.push_subscriptions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.watchers;
ALTER PUBLICATION supabase_realtime ADD TABLE public.profiles;

-- ============================================================
-- SECTION 6: Add missing indexes for geo/realtime queries
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_user_locations_user_id ON public.user_locations(user_id);
CREATE INDEX IF NOT EXISTS idx_user_locations_ghost_mode ON public.user_locations(ghost_mode);
CREATE INDEX IF NOT EXISTS idx_markers_status ON public.markers(status);
CREATE INDEX IF NOT EXISTS idx_markers_expires_at ON public.markers(expires_at);
CREATE INDEX IF NOT EXISTS idx_panic_sessions_status ON public.panic_sessions(status);
CREATE INDEX IF NOT EXISTS idx_panic_sessions_user_id ON public.panic_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_panic_alerts_broadcast_status ON public.panic_alerts_broadcast(status);
CREATE INDEX IF NOT EXISTS idx_panic_location_logs_session ON public.panic_location_logs(panic_session_id, recorded_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread ON public.notifications(user_id, read) WHERE read = false;
CREATE INDEX IF NOT EXISTS idx_safety_sessions_status ON public.safety_sessions(status);
CREATE INDEX IF NOT EXISTS idx_safety_sessions_user_id ON public.safety_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_room ON public.chat_messages(chat_room_id, created_at);
CREATE INDEX IF NOT EXISTS idx_community_posts_created ON public.community_posts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_watchers_user_status ON public.watchers(user_id, status);
CREATE INDEX IF NOT EXISTS idx_watchers_watcher_status ON public.watchers(watcher_id, status);

-- ============================================================
-- SECTION 7: Add audio-evidence storage policies
-- (bucket exists but may lack policies for panic session uploads)
-- ============================================================

-- Allow users to upload to their own folder in audio-evidence
CREATE POLICY "Users can upload panic audio"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'audio-evidence'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Allow users to read their own audio evidence
CREATE POLICY "Users can read own audio evidence"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'audio-evidence'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Watchers can read audio evidence of users they watch
CREATE POLICY "Watchers can read audio evidence"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'audio-evidence'
  AND EXISTS (
    SELECT 1 FROM watchers
    WHERE watchers.watcher_id = auth.uid()
    AND watchers.user_id::text = (storage.foldername(name))[1]
    AND watchers.status = 'accepted'
  )
);
