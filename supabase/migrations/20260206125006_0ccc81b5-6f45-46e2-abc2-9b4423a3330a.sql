
-- Add missing columns to user_locations for realtime tracking
ALTER TABLE public.user_locations
  ADD COLUMN IF NOT EXISTS location_name TEXT,
  ADD COLUMN IF NOT EXISTS is_moving BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS ghost_mode BOOLEAN DEFAULT false;

-- Add unique constraint on user_id if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'unique_user_location'
  ) THEN
    ALTER TABLE public.user_locations ADD CONSTRAINT unique_user_location UNIQUE(user_id);
  END IF;
EXCEPTION WHEN others THEN
  NULL;
END $$;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_locations_ghost ON public.user_locations(ghost_mode) WHERE ghost_mode = false;
CREATE INDEX IF NOT EXISTS idx_user_locations_updated ON public.user_locations(updated_at DESC);

-- Update RLS policies for ghost mode filtering
DROP POLICY IF EXISTS "Users can view non-ghost locations" ON public.user_locations;
CREATE POLICY "Users can view non-ghost locations"
  ON public.user_locations FOR SELECT
  USING (ghost_mode = false OR auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own location" ON public.user_locations;
CREATE POLICY "Users can insert own location"
  ON public.user_locations FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own location" ON public.user_locations;
CREATE POLICY "Users can update own location"
  ON public.user_locations FOR UPDATE
  USING (auth.uid() = user_id);

-- Function to auto-update timestamp
CREATE OR REPLACE FUNCTION public.update_user_location_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS user_location_updated ON public.user_locations;
CREATE TRIGGER user_location_updated
  BEFORE UPDATE ON public.user_locations
  FOR EACH ROW
  EXECUTE FUNCTION public.update_user_location_timestamp();
