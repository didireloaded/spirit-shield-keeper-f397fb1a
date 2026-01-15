-- Add missing columns to notifications table
ALTER TABLE public.notifications 
ADD COLUMN IF NOT EXISTS actor_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS entity_id uuid,
ADD COLUMN IF NOT EXISTS entity_type text;

-- RLS policies for notifications (drop existing if any)
DROP POLICY IF EXISTS "Users see their own notifications" ON public.notifications;
DROP POLICY IF EXISTS "System can insert notifications" ON public.notifications;
DROP POLICY IF EXISTS "User can mark notification read" ON public.notifications;
DROP POLICY IF EXISTS "User can delete their notifications" ON public.notifications;

-- Create proper RLS policies
CREATE POLICY "Users see their own notifications"
ON public.notifications
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "System can insert notifications"
ON public.notifications
FOR INSERT
WITH CHECK (true);

CREATE POLICY "User can mark notification read"
ON public.notifications
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "User can delete their notifications"
ON public.notifications
FOR DELETE
USING (auth.uid() = user_id);

-- Trigger function: Notify on community comment
CREATE OR REPLACE FUNCTION public.notify_on_community_comment()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  post_owner_id uuid;
  commenter_name text;
BEGIN
  -- Get post owner
  SELECT user_id INTO post_owner_id FROM community_posts WHERE id = NEW.post_id;
  
  -- Get commenter name
  SELECT COALESCE(full_name, 'Someone') INTO commenter_name FROM profiles WHERE id = NEW.user_id;
  
  -- Don't notify if commenting on own post
  IF post_owner_id IS NOT NULL AND post_owner_id != NEW.user_id THEN
    INSERT INTO notifications (user_id, actor_id, type, entity_id, entity_type, title, body)
    VALUES (
      post_owner_id,
      NEW.user_id,
      'comment',
      NEW.post_id,
      'community_post',
      'New Comment',
      commenter_name || ' commented on your post'
    );
  END IF;
  
  RETURN NEW;
END;
$$;

-- Trigger function: Notify on community reaction
CREATE OR REPLACE FUNCTION public.notify_on_community_reaction()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  post_owner_id uuid;
  reactor_name text;
BEGIN
  -- Get post owner
  SELECT user_id INTO post_owner_id FROM community_posts WHERE id = NEW.post_id;
  
  -- Get reactor name
  SELECT COALESCE(full_name, 'Someone') INTO reactor_name FROM profiles WHERE id = NEW.user_id;
  
  -- Don't notify if reacting to own post
  IF post_owner_id IS NOT NULL AND post_owner_id != NEW.user_id THEN
    INSERT INTO notifications (user_id, actor_id, type, entity_id, entity_type, title, body)
    VALUES (
      post_owner_id,
      NEW.user_id,
      'reaction',
      NEW.post_id,
      'community_post',
      'New Reaction',
      reactor_name || ' found your post helpful'
    );
  END IF;
  
  RETURN NEW;
END;
$$;

-- Trigger function: Notify watchers on panic session
CREATE OR REPLACE FUNCTION public.notify_watchers_on_panic()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
      INSERT INTO notifications (user_id, actor_id, type, entity_id, entity_type, title, body, data)
      VALUES (
        watcher_record.watcher_id,
        NEW.user_id,
        'panic_alert',
        NEW.id,
        'panic_session',
        '🚨 EMERGENCY ALERT',
        user_name || ' has triggered a panic alert!',
        jsonb_build_object('lat', NEW.initial_lat, 'lng', NEW.initial_lng)
      );
    END LOOP;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Trigger function: Notify on alert status change
CREATE OR REPLACE FUNCTION public.notify_on_alert_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Notify alert owner on status change
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO notifications (user_id, type, entity_id, entity_type, title, body)
    VALUES (
      NEW.user_id,
      'alert_update',
      NEW.id,
      'alert',
      'Alert Status Updated',
      'Your ' || NEW.type || ' alert is now ' || NEW.status
    );
  END IF;
  
  RETURN NEW;
END;
$$;

-- Trigger function: Notify on watcher request
CREATE OR REPLACE FUNCTION public.notify_on_watcher_request()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  requester_name text;
BEGIN
  -- Get requester name
  SELECT COALESCE(full_name, 'Someone') INTO requester_name FROM profiles WHERE id = NEW.user_id;
  
  IF TG_OP = 'INSERT' THEN
    -- Notify the person being asked to be a watcher
    INSERT INTO notifications (user_id, actor_id, type, entity_id, entity_type, title, body)
    VALUES (
      NEW.watcher_id,
      NEW.user_id,
      'watcher_request',
      NEW.id,
      'watcher',
      'Watcher Request',
      requester_name || ' wants you to be their safety watcher'
    );
  ELSIF TG_OP = 'UPDATE' AND OLD.status = 'pending' AND NEW.status IN ('accepted', 'rejected') THEN
    -- Notify the requester about the response
    SELECT COALESCE(full_name, 'Someone') INTO requester_name FROM profiles WHERE id = NEW.watcher_id;
    INSERT INTO notifications (user_id, actor_id, type, entity_id, entity_type, title, body)
    VALUES (
      NEW.user_id,
      NEW.watcher_id,
      'watcher_response',
      NEW.id,
      'watcher',
      'Watcher Response',
      requester_name || ' has ' || NEW.status || ' your watcher request'
    );
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create triggers
DROP TRIGGER IF EXISTS on_community_comment_created ON public.community_comments;
CREATE TRIGGER on_community_comment_created
AFTER INSERT ON public.community_comments
FOR EACH ROW
EXECUTE FUNCTION public.notify_on_community_comment();

DROP TRIGGER IF EXISTS on_community_reaction_created ON public.community_reactions;
CREATE TRIGGER on_community_reaction_created
AFTER INSERT ON public.community_reactions
FOR EACH ROW
EXECUTE FUNCTION public.notify_on_community_reaction();

DROP TRIGGER IF EXISTS on_panic_session_created ON public.panic_sessions;
CREATE TRIGGER on_panic_session_created
AFTER INSERT ON public.panic_sessions
FOR EACH ROW
EXECUTE FUNCTION public.notify_watchers_on_panic();

DROP TRIGGER IF EXISTS on_alert_updated ON public.alerts;
CREATE TRIGGER on_alert_updated
AFTER UPDATE ON public.alerts
FOR EACH ROW
EXECUTE FUNCTION public.notify_on_alert_update();

DROP TRIGGER IF EXISTS on_watcher_created ON public.watchers;
CREATE TRIGGER on_watcher_created
AFTER INSERT ON public.watchers
FOR EACH ROW
EXECUTE FUNCTION public.notify_on_watcher_request();

DROP TRIGGER IF EXISTS on_watcher_updated ON public.watchers;
CREATE TRIGGER on_watcher_updated
AFTER UPDATE ON public.watchers
FOR EACH ROW
EXECUTE FUNCTION public.notify_on_watcher_request();