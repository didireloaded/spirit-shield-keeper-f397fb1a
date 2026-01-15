-- Fix the rate limits RLS policy to be more restrictive
-- Drop the overly permissive policy
DROP POLICY IF EXISTS "Service role can manage rate limits" ON public.user_rate_limits;

-- Users can only view their own rate limits (for transparency)
CREATE POLICY "Users can view their own rate limits"
ON public.user_rate_limits FOR SELECT
USING (auth.uid() = user_id);

-- Only service role can insert (handled by the check_rate_limit function which is SECURITY DEFINER)
-- No direct insert policy for regular users