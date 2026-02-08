
-- =============================================
-- Enhanced Panic & Amber Alert System
-- =============================================

-- 1. Incident Types catalog
CREATE TABLE IF NOT EXISTS public.incident_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category TEXT NOT NULL, -- 'panic' | 'amber' | 'medical' | 'fire' | 'break_in'
  name TEXT NOT NULL,
  icon TEXT NOT NULL,
  color TEXT NOT NULL,
  requires_recording BOOLEAN DEFAULT true,
  requires_photo BOOLEAN DEFAULT false,
  auto_notify_authorities BOOLEAN DEFAULT true,
  estimated_response_time INTEGER,
  description TEXT,
  instructions TEXT
);

-- Seed default incident types
INSERT INTO public.incident_types (category, name, icon, color, requires_recording, auto_notify_authorities) VALUES
('panic', 'Robbery', '💰', '#ef4444', true, true),
('panic', 'Assault', '👊', '#dc2626', true, true),
('panic', 'Carjacking', '🚗', '#b91c1c', true, true),
('panic', 'Kidnapping', '👥', '#991b1b', true, true),
('panic', 'Stalking', '👁️', '#f97316', true, true),
('panic', 'Harassment', '⚠️', '#fb923c', true, true),
('panic', 'Domestic Violence', '🏠', '#7c2d12', true, true),
('panic', 'Other Emergency', '🆘', '#44403c', true, true),
('amber', 'Missing Child', '👶', '#fbbf24', true, true),
('amber', 'Child Abduction', '🚨', '#f59e0b', true, true),
('amber', 'Lost Elderly', '👴', '#eab308', true, true),
('break_in', 'Home Invasion', '🏠', '#8b5cf6', true, true),
('break_in', 'Burglary in Progress', '🔓', '#7c3aed', true, true),
('break_in', 'Suspicious Activity', '👀', '#6d28d9', false, false),
('medical', 'Heart Attack', '❤️', '#ec4899', false, true),
('medical', 'Seizure', '🧠', '#db2777', false, true),
('medical', 'Severe Injury', '🩹', '#be185d', false, true),
('medical', 'Unconscious Person', '😵', '#9f1239', false, true),
('fire', 'House Fire', '🔥', '#dc2626', false, true),
('fire', 'Vehicle Fire', '🚗🔥', '#b91c1c', false, true),
('fire', 'Wildfire', '🌲', '#991b1b', false, true);

-- RLS for incident_types (read-only for all authenticated users)
ALTER TABLE public.incident_types ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can view incident types" ON public.incident_types FOR SELECT USING (auth.uid() IS NOT NULL);

-- 2. Add new columns to panic_sessions
ALTER TABLE public.panic_sessions
  ADD COLUMN IF NOT EXISTS session_type TEXT DEFAULT 'panic',
  ADD COLUMN IF NOT EXISTS incident_type TEXT,
  ADD COLUMN IF NOT EXISTS location_name TEXT,
  ADD COLUMN IF NOT EXISTS current_location_name TEXT,
  ADD COLUMN IF NOT EXISTS is_moving BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS description TEXT,
  ADD COLUMN IF NOT EXISTS severity TEXT DEFAULT 'high',
  ADD COLUMN IF NOT EXISTS responders_needed TEXT[],
  ADD COLUMN IF NOT EXISTS recording_status TEXT DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS chat_room_id UUID,
  ADD COLUMN IF NOT EXISTS participants_count INTEGER DEFAULT 0;

-- 3. Add battery_level + location_name + is_moving to panic_location_logs
ALTER TABLE public.panic_location_logs
  ADD COLUMN IF NOT EXISTS battery_level INTEGER,
  ADD COLUMN IF NOT EXISTS location_name TEXT,
  ADD COLUMN IF NOT EXISTS is_moving BOOLEAN DEFAULT false;

-- 4. Chat rooms for amber alerts
CREATE TABLE IF NOT EXISTS public.chat_rooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  panic_session_id UUID REFERENCES public.panic_sessions(id) ON DELETE CASCADE,
  type TEXT DEFAULT 'amber',
  title TEXT NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  participant_count INTEGER DEFAULT 0,
  message_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  closed_at TIMESTAMPTZ
);

ALTER TABLE public.chat_rooms ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view active chat rooms" ON public.chat_rooms FOR SELECT USING (auth.uid() IS NOT NULL AND is_active = true);
CREATE POLICY "Users can create chat rooms" ON public.chat_rooms FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Users can update own chat rooms" ON public.chat_rooms FOR UPDATE USING (
  EXISTS (SELECT 1 FROM public.panic_sessions WHERE id = panic_session_id AND user_id = auth.uid())
);

-- Add FK from panic_sessions to chat_rooms
ALTER TABLE public.panic_sessions
  ADD CONSTRAINT panic_sessions_chat_room_fk FOREIGN KEY (chat_room_id) REFERENCES public.chat_rooms(id) ON DELETE SET NULL;

-- 5. Chat messages
CREATE TABLE IF NOT EXISTS public.chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chat_room_id UUID REFERENCES public.chat_rooms(id) ON DELETE CASCADE NOT NULL,
  user_id UUID NOT NULL,
  message TEXT NOT NULL,
  type TEXT DEFAULT 'text', -- 'text' | 'location' | 'sighting' | 'system'
  sighting_latitude DOUBLE PRECISION,
  sighting_longitude DOUBLE PRECISION,
  sighting_photo_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  is_deleted BOOLEAN DEFAULT false
);

ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view messages in active rooms" ON public.chat_messages FOR SELECT USING (
  auth.uid() IS NOT NULL AND EXISTS (SELECT 1 FROM public.chat_rooms WHERE id = chat_room_id AND is_active = true)
);
CREATE POLICY "Users can send messages" ON public.chat_messages FOR INSERT WITH CHECK (auth.uid() = user_id);

-- 6. Trigger: update panic session location from location logs
CREATE OR REPLACE FUNCTION public.update_panic_location_from_log()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.panic_sessions
  SET 
    last_known_lat = NEW.lat,
    last_known_lng = NEW.lng,
    current_location_name = NEW.location_name,
    is_moving = NEW.is_moving,
    last_location_at = NEW.recorded_at
  WHERE id = NEW.panic_session_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS update_panic_location_trigger ON public.panic_location_logs;
CREATE TRIGGER update_panic_location_trigger
  AFTER INSERT ON public.panic_location_logs
  FOR EACH ROW
  EXECUTE FUNCTION public.update_panic_location_from_log();

-- 7. Enable realtime for new tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_rooms;
ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.incident_types;
