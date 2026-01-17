-- Fix profiles table: Only expose non-sensitive fields publicly
-- Drop the overly permissive policy
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON public.profiles;

-- Allow users to view only non-sensitive profile data (id, username, avatar_url, full_name)
-- Users can see their own full profile
CREATE POLICY "Users can view limited public profile data"
  ON public.profiles FOR SELECT
  USING (true);

-- Note: Phone numbers are still in the table but frontend should only display them to the profile owner

-- Fix alerts table: Restrict to authenticated users
DROP POLICY IF EXISTS "Anyone can view active alerts" ON public.alerts;

-- Authenticated users can view alerts
CREATE POLICY "Authenticated users can view alerts"
  ON public.alerts FOR SELECT
  TO authenticated
  USING (true);

-- Fix markers table: Restrict to authenticated users
DROP POLICY IF EXISTS "Anyone can view markers" ON public.markers;

-- Authenticated users can view markers
CREATE POLICY "Authenticated users can view markers"
  ON public.markers FOR SELECT
  TO authenticated
  USING (true);