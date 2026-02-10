
-- Fix 1: Add RLS policies for look_after_me_sessions
CREATE POLICY "Users can view their own sessions"
  ON public.look_after_me_sessions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own sessions"
  ON public.look_after_me_sessions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own sessions"
  ON public.look_after_me_sessions FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Watchers can view sessions they watch"
  ON public.look_after_me_sessions FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM watchers
    WHERE watchers.watcher_id = auth.uid()
      AND watchers.user_id = look_after_me_sessions.user_id
      AND watchers.status = 'accepted'
  ));

-- Fix 2: Add RLS policies for notification_events (read-only for authenticated users)
CREATE POLICY "Authenticated users can view notification events"
  ON public.notification_events FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- Fix 3: Fix mutable search_path on update_user_location_timestamp
CREATE OR REPLACE FUNCTION public.update_user_location_timestamp()
  RETURNS trigger
  LANGUAGE plpgsql
  SET search_path = public
AS $function$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$function$;
