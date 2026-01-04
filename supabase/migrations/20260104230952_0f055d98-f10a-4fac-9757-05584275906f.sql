-- =============================================
-- GUARDIAN: Complete Database Schema
-- =============================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============================================
-- 1. PROFILES TABLE (extends auth.users)
-- =============================================
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT UNIQUE,
  full_name TEXT,
  avatar_url TEXT,
  phone TEXT,
  region TEXT DEFAULT 'Windhoek',
  ghost_mode BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public profiles are viewable by everyone"
  ON public.profiles FOR SELECT USING (true);

CREATE POLICY "Users can insert their own profile"
  ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, avatar_url)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'avatar_url', '')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- =============================================
-- 2. USER LOCATIONS (Real-time tracking)
-- =============================================
CREATE TABLE public.user_locations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  latitude DOUBLE PRECISION NOT NULL,
  longitude DOUBLE PRECISION NOT NULL,
  accuracy DOUBLE PRECISION,
  heading DOUBLE PRECISION,
  speed DOUBLE PRECISION,
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id)
);

ALTER TABLE public.user_locations ENABLE ROW LEVEL SECURITY;

-- Users can see locations of non-ghost users
CREATE POLICY "Users can view non-ghost locations"
  ON public.user_locations FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE profiles.id = user_locations.user_id 
      AND profiles.ghost_mode = false
    )
    OR user_id = auth.uid()
  );

CREATE POLICY "Users can update their own location"
  ON public.user_locations FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can upsert their own location"
  ON public.user_locations FOR UPDATE USING (auth.uid() = user_id);

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.user_locations;

-- =============================================
-- 3. ALERTS (Panic & Amber)
-- =============================================
CREATE TYPE alert_type AS ENUM ('panic', 'amber', 'robbery', 'assault', 'suspicious', 'accident', 'other');
CREATE TYPE alert_status AS ENUM ('active', 'resolved', 'cancelled', 'escalated');

CREATE TABLE public.alerts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  type alert_type NOT NULL,
  status alert_status DEFAULT 'active',
  latitude DOUBLE PRECISION NOT NULL,
  longitude DOUBLE PRECISION NOT NULL,
  description TEXT,
  audio_url TEXT,
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.alerts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active alerts"
  ON public.alerts FOR SELECT USING (true);

CREATE POLICY "Users can create alerts"
  ON public.alerts FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own alerts"
  ON public.alerts FOR UPDATE USING (auth.uid() = user_id);

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.alerts;

-- =============================================
-- 4. MARKERS (Community pins on map)
-- =============================================
CREATE TYPE marker_type AS ENUM ('robbery', 'accident', 'suspicious', 'assault', 'kidnapping', 'other');

CREATE TABLE public.markers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  type marker_type NOT NULL,
  latitude DOUBLE PRECISION NOT NULL,
  longitude DOUBLE PRECISION NOT NULL,
  description TEXT,
  expires_at TIMESTAMPTZ DEFAULT (now() + interval '24 hours'),
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.markers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view markers"
  ON public.markers FOR SELECT USING (true);

CREATE POLICY "Users can create markers"
  ON public.markers FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own markers"
  ON public.markers FOR DELETE USING (auth.uid() = user_id);

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.markers;

-- =============================================
-- 5. WATCHERS (Trusted contacts)
-- =============================================
CREATE TYPE watcher_status AS ENUM ('pending', 'accepted', 'rejected');

CREATE TABLE public.watchers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  watcher_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  status watcher_status DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, watcher_id)
);

ALTER TABLE public.watchers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their watcher relationships"
  ON public.watchers FOR SELECT
  USING (auth.uid() = user_id OR auth.uid() = watcher_id);

CREATE POLICY "Users can add watchers"
  ON public.watchers FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Watchers can accept/reject requests"
  ON public.watchers FOR UPDATE
  USING (auth.uid() = watcher_id);

CREATE POLICY "Users can remove watchers"
  ON public.watchers FOR DELETE
  USING (auth.uid() = user_id OR auth.uid() = watcher_id);

-- =============================================
-- 6. LOOK AFTER ME SESSIONS
-- =============================================
CREATE TYPE session_status AS ENUM ('active', 'arrived', 'late', 'escalated', 'cancelled');

CREATE TABLE public.safety_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  destination TEXT NOT NULL,
  destination_lat DOUBLE PRECISION,
  destination_lng DOUBLE PRECISION,
  departure_time TIMESTAMPTZ NOT NULL,
  expected_arrival TIMESTAMPTZ NOT NULL,
  outfit_description TEXT,
  outfit_photo_url TEXT,
  vehicle_name TEXT,
  license_plate TEXT,
  companion_phone TEXT,
  status session_status DEFAULT 'active',
  arrived_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.safety_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own sessions"
  ON public.safety_sessions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Watchers can view sessions they watch"
  ON public.safety_sessions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.watchers
      WHERE watchers.user_id = safety_sessions.user_id
      AND watchers.watcher_id = auth.uid()
      AND watchers.status = 'accepted'
    )
  );

CREATE POLICY "Users can create sessions"
  ON public.safety_sessions FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own sessions"
  ON public.safety_sessions FOR UPDATE USING (auth.uid() = user_id);

-- =============================================
-- 7. COMMUNITY POSTS
-- =============================================
CREATE TABLE public.posts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  content TEXT NOT NULL,
  image_url TEXT,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  location_name TEXT,
  likes_count INTEGER DEFAULT 0,
  comments_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view posts"
  ON public.posts FOR SELECT USING (true);

CREATE POLICY "Users can create posts"
  ON public.posts FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own posts"
  ON public.posts FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own posts"
  ON public.posts FOR DELETE USING (auth.uid() = user_id);

-- =============================================
-- 8. POST LIKES
-- =============================================
CREATE TABLE public.post_likes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  post_id UUID REFERENCES public.posts(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(post_id, user_id)
);

ALTER TABLE public.post_likes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view likes"
  ON public.post_likes FOR SELECT USING (true);

CREATE POLICY "Users can like posts"
  ON public.post_likes FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can unlike posts"
  ON public.post_likes FOR DELETE USING (auth.uid() = user_id);

-- Trigger to update likes count
CREATE OR REPLACE FUNCTION public.update_post_likes_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.posts SET likes_count = likes_count + 1 WHERE id = NEW.post_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.posts SET likes_count = likes_count - 1 WHERE id = OLD.post_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_like_change
  AFTER INSERT OR DELETE ON public.post_likes
  FOR EACH ROW EXECUTE FUNCTION public.update_post_likes_count();

-- =============================================
-- 9. COMMENTS
-- =============================================
CREATE TABLE public.comments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  post_id UUID REFERENCES public.posts(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view comments"
  ON public.comments FOR SELECT USING (true);

CREATE POLICY "Users can create comments"
  ON public.comments FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own comments"
  ON public.comments FOR DELETE USING (auth.uid() = user_id);

-- Trigger to update comments count
CREATE OR REPLACE FUNCTION public.update_post_comments_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.posts SET comments_count = comments_count + 1 WHERE id = NEW.post_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.posts SET comments_count = comments_count - 1 WHERE id = OLD.post_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_comment_change
  AFTER INSERT OR DELETE ON public.comments
  FOR EACH ROW EXECUTE FUNCTION public.update_post_comments_count();

-- =============================================
-- 10. DIRECT MESSAGES
-- =============================================
CREATE TABLE public.conversations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE public.conversation_participants (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  conversation_id UUID REFERENCES public.conversations(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(conversation_id, user_id)
);

CREATE TABLE public.messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  conversation_id UUID REFERENCES public.conversations(id) ON DELETE CASCADE NOT NULL,
  sender_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  content TEXT NOT NULL,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversation_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their conversations"
  ON public.conversations FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.conversation_participants
      WHERE conversation_participants.conversation_id = conversations.id
      AND conversation_participants.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can view their conversation participants"
  ON public.conversation_participants FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.conversation_participants cp
      WHERE cp.conversation_id = conversation_participants.conversation_id
      AND cp.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can view messages in their conversations"
  ON public.messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.conversation_participants
      WHERE conversation_participants.conversation_id = messages.conversation_id
      AND conversation_participants.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can send messages"
  ON public.messages FOR INSERT
  WITH CHECK (
    auth.uid() = sender_id
    AND EXISTS (
      SELECT 1 FROM public.conversation_participants
      WHERE conversation_participants.conversation_id = messages.conversation_id
      AND conversation_participants.user_id = auth.uid()
    )
  );

-- Enable realtime for messages
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;

-- =============================================
-- 11. AUTHORITY CONTACTS
-- =============================================
CREATE TYPE authority_type AS ENUM ('police', 'fire', 'medical', 'helpline', 'ngo', 'security');

CREATE TABLE public.authority_contacts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  type authority_type NOT NULL,
  phone TEXT,
  email TEXT,
  address TEXT,
  region TEXT NOT NULL,
  description TEXT,
  is_emergency BOOLEAN DEFAULT false,
  operating_hours TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.authority_contacts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view authority contacts"
  ON public.authority_contacts FOR SELECT USING (true);

-- Seed initial Namibian emergency contacts
INSERT INTO public.authority_contacts (name, type, phone, region, is_emergency, description) VALUES
  ('Namibian Police Emergency', 'police', '10111', 'Nationwide', true, 'National police emergency line'),
  ('City Police Windhoek', 'police', '061-290 2239', 'Windhoek', true, 'Windhoek City Police'),
  ('Ambulance Services', 'medical', '211111', 'Nationwide', true, 'National ambulance service'),
  ('Fire Brigade Windhoek', 'fire', '061-211111', 'Windhoek', true, 'Windhoek Fire Department'),
  ('MediRescue', 'medical', '061-230505', 'Windhoek', true, 'Private medical emergency'),
  ('Lifeline/Childline', 'helpline', '116', 'Nationwide', false, 'Crisis support hotline'),
  ('Gender-Based Violence Hotline', 'helpline', '10111', 'Nationwide', false, 'GBV support line'),
  ('Oshakati Police', 'police', '065-220006', 'Oshakati', true, 'Oshakati regional police'),
  ('Walvis Bay Police', 'police', '064-209111', 'Walvis Bay', true, 'Walvis Bay regional police'),
  ('Swakopmund Police', 'police', '064-410 4000', 'Swakopmund', true, 'Swakopmund regional police');

-- =============================================
-- 12. STORAGE BUCKETS
-- =============================================
INSERT INTO storage.buckets (id, name, public) VALUES
  ('audio-evidence', 'audio-evidence', false),
  ('post-images', 'post-images', true),
  ('profile-photos', 'profile-photos', true),
  ('outfit-photos', 'outfit-photos', false);

-- Storage policies
CREATE POLICY "Users can upload their own audio evidence"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'audio-evidence' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can view their own audio evidence"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'audio-evidence' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Anyone can view post images"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'post-images');

CREATE POLICY "Users can upload post images"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'post-images' AND auth.uid() IS NOT NULL);

CREATE POLICY "Anyone can view profile photos"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'profile-photos');

CREATE POLICY "Users can upload their own profile photo"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'profile-photos' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can upload their own outfit photos"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'outfit-photos' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users and watchers can view outfit photos"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'outfit-photos');

-- =============================================
-- 13. HELPER FUNCTIONS
-- =============================================

-- Function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Apply to relevant tables
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_alerts_updated_at
  BEFORE UPDATE ON public.alerts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_safety_sessions_updated_at
  BEFORE UPDATE ON public.safety_sessions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_posts_updated_at
  BEFORE UPDATE ON public.posts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();