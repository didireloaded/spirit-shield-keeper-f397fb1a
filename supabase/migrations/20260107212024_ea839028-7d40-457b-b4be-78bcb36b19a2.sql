-- Drop the overly permissive policy
DROP POLICY IF EXISTS "Service can insert notifications" ON public.notifications;

-- The service role bypasses RLS anyway, so we don't need a special INSERT policy
-- Notifications are only inserted by the edge function using service role