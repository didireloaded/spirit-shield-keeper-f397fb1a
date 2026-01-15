-- Add priority field to notifications if not exists
ALTER TABLE public.notifications 
ADD COLUMN IF NOT EXISTS priority text DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high'));

-- Create notification_settings table for user preferences
CREATE TABLE IF NOT EXISTS public.notification_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  sound_enabled boolean DEFAULT true,
  vibration_enabled boolean DEFAULT true,
  push_enabled boolean DEFAULT true,
  panic_override boolean DEFAULT true, -- Always notify for panic, even if muted
  quiet_hours_enabled boolean DEFAULT false,
  quiet_hours_start time DEFAULT '22:00',
  quiet_hours_end time DEFAULT '07:00',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.notification_settings ENABLE ROW LEVEL SECURITY;

-- RLS policies for notification_settings
CREATE POLICY "Users can view their own notification settings"
ON public.notification_settings FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own notification settings"
ON public.notification_settings FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own notification settings"
ON public.notification_settings FOR UPDATE
USING (auth.uid() = user_id);

-- Create function to auto-create notification settings for new users
CREATE OR REPLACE FUNCTION public.create_notification_settings_for_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.notification_settings (user_id)
  VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Trigger to create notification settings when a profile is created
DROP TRIGGER IF EXISTS on_profile_created_notification_settings ON public.profiles;
CREATE TRIGGER on_profile_created_notification_settings
AFTER INSERT ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.create_notification_settings_for_user();

-- Update existing database triggers to include priority

-- Update panic notification trigger to set high priority
CREATE OR REPLACE FUNCTION public.notify_watchers_on_panic()
RETURNS TRIGGER AS $$
DECLARE
  watcher_record RECORD;
  user_name text;
BEGIN
  -- Only notify on new active sessions
  IF NEW.status = 'active' THEN
    -- Get user name
    SELECT COALESCE(full_name, 'A user') INTO user_name FROM profiles WHERE id = NEW.user_id;
    
    -- Notify all accepted watchers
    FOR watcher_record IN 
      SELECT watcher_id FROM watchers 
      WHERE user_id = NEW.user_id AND status = 'accepted'
    LOOP
      INSERT INTO notifications (user_id, actor_id, type, entity_id, entity_type, title, body, data, priority)
      VALUES (
        watcher_record.watcher_id,
        NEW.user_id,
        'panic_alert',
        NEW.id,
        'panic_session',
        '🚨 EMERGENCY ALERT',
        user_name || ' has triggered a panic alert!',
        jsonb_build_object('lat', NEW.initial_lat, 'lng', NEW.initial_lng),
        'high'
      );
    END LOOP;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Update alert update trigger to set priority based on status
CREATE OR REPLACE FUNCTION public.notify_on_alert_update()
RETURNS TRIGGER AS $$
BEGIN
  -- Notify alert owner on status change
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO notifications (user_id, type, entity_id, entity_type, title, body, priority)
    VALUES (
      NEW.user_id,
      'alert_update',
      NEW.id,
      'alert',
      'Alert Status Updated',
      'Your ' || NEW.type || ' alert is now ' || NEW.status,
      CASE WHEN NEW.status = 'escalated' THEN 'high' ELSE 'normal' END
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Add rate limiting table for abuse prevention
CREATE TABLE IF NOT EXISTS public.user_rate_limits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  action_type text NOT NULL, -- 'alert', 'post', 'comment'
  count integer DEFAULT 1,
  window_start timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

-- Enable RLS on rate limits
ALTER TABLE public.user_rate_limits ENABLE ROW LEVEL SECURITY;

-- Only backend can manage rate limits
CREATE POLICY "Service role can manage rate limits"
ON public.user_rate_limits FOR ALL
USING (true)
WITH CHECK (true);

-- Create index for efficient rate limit lookups
CREATE INDEX IF NOT EXISTS idx_user_rate_limits_lookup 
ON public.user_rate_limits (user_id, action_type, window_start);

-- Function to check rate limit (returns true if allowed, false if exceeded)
CREATE OR REPLACE FUNCTION public.check_rate_limit(
  p_user_id uuid,
  p_action_type text,
  p_max_count integer DEFAULT 10,
  p_window_minutes integer DEFAULT 60
)
RETURNS boolean AS $$
DECLARE
  current_count integer;
  window_start_time timestamptz;
BEGIN
  window_start_time := now() - (p_window_minutes || ' minutes')::interval;
  
  -- Count actions in the current window
  SELECT COALESCE(SUM(count), 0) INTO current_count
  FROM user_rate_limits
  WHERE user_id = p_user_id
    AND action_type = p_action_type
    AND window_start >= window_start_time;
  
  -- Check if limit exceeded
  IF current_count >= p_max_count THEN
    RETURN false;
  END IF;
  
  -- Record the action
  INSERT INTO user_rate_limits (user_id, action_type, window_start)
  VALUES (p_user_id, p_action_type, now());
  
  RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Enable realtime for notification_settings
ALTER PUBLICATION supabase_realtime ADD TABLE public.notification_settings;