
-- Quick Safety Status table for broadcasting status to trusted circle
CREATE TABLE public.user_safety_status (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT NOT NULL CHECK (status IN ('safe', 'need_help', 'on_my_way')),
  message TEXT,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '2 hours'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.user_safety_status ENABLE ROW LEVEL SECURITY;

-- User can insert their own status
CREATE POLICY "Users can create own status"
  ON public.user_safety_status FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- User can read their own status
CREATE POLICY "Users can read own status"
  ON public.user_safety_status FOR SELECT
  USING (auth.uid() = user_id);

-- Accepted watchers can see status of people they watch
CREATE POLICY "Watchers can see watched user status"
  ON public.user_safety_status FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM watchers
    WHERE watchers.watcher_id = auth.uid()
      AND watchers.user_id = user_safety_status.user_id
      AND watchers.status = 'accepted'
  ));

-- User can delete own status
CREATE POLICY "Users can delete own status"
  ON public.user_safety_status FOR DELETE
  USING (auth.uid() = user_id);

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.user_safety_status;

-- Add notification grouping preferences to notification_settings
ALTER TABLE public.notification_settings
  ADD COLUMN IF NOT EXISTS group_notifications BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS priority_filter TEXT DEFAULT 'all';
