
-- Create panic alerts broadcast table
CREATE TABLE IF NOT EXISTS panic_alerts_broadcast (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  panic_session_id UUID REFERENCES panic_sessions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  latitude DOUBLE PRECISION NOT NULL,
  longitude DOUBLE PRECISION NOT NULL,
  location_name TEXT,
  alert_type TEXT NOT NULL DEFAULT 'panic',
  status TEXT DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create authority notifications table
CREATE TABLE IF NOT EXISTS authority_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  panic_alert_id UUID REFERENCES panic_alerts_broadcast(id) ON DELETE CASCADE,
  authority_contact_id UUID REFERENCES authority_contacts(id),
  notification_type TEXT NOT NULL DEFAULT 'app',
  status TEXT DEFAULT 'pending',
  sent_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create responders table
CREATE TABLE IF NOT EXISTS alert_responders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  panic_alert_id UUID REFERENCES panic_alerts_broadcast(id) ON DELETE CASCADE,
  responder_type TEXT NOT NULL DEFAULT 'police',
  unit_identifier TEXT,
  officer_name TEXT,
  badge_number TEXT,
  phone TEXT,
  status TEXT DEFAULT 'dispatched',
  eta_minutes INTEGER,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  last_updated TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create post-images storage bucket
INSERT INTO storage.buckets (id, name, public) VALUES ('post-images', 'post-images', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies (use IF NOT EXISTS pattern)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Post images are publicly accessible' AND tablename = 'objects') THEN
    CREATE POLICY "Post images are publicly accessible" ON storage.objects FOR SELECT USING (bucket_id = 'post-images');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can upload their post images' AND tablename = 'objects') THEN
    CREATE POLICY "Users can upload their post images" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'post-images' AND auth.uid() IS NOT NULL);
  END IF;
END $$;

-- Enable RLS
ALTER TABLE panic_alerts_broadcast ENABLE ROW LEVEL SECURITY;
ALTER TABLE authority_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE alert_responders ENABLE ROW LEVEL SECURITY;

-- Policies for panic_alerts_broadcast
CREATE POLICY "Users can view their own panic alerts" ON panic_alerts_broadcast FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own panic alerts" ON panic_alerts_broadcast FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own panic alerts" ON panic_alerts_broadcast FOR UPDATE USING (auth.uid() = user_id);

-- Policies for authority_notifications
CREATE POLICY "Users can view notifications for their alerts" ON authority_notifications FOR SELECT USING (
  EXISTS (SELECT 1 FROM panic_alerts_broadcast WHERE id = panic_alert_id AND user_id = auth.uid())
);

-- Policies for alert_responders
CREATE POLICY "Users can view responders for their alerts" ON alert_responders FOR SELECT USING (
  EXISTS (SELECT 1 FROM panic_alerts_broadcast WHERE id = panic_alert_id AND user_id = auth.uid())
);
CREATE POLICY "Authenticated users can insert responders" ON alert_responders FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated users can update responders" ON alert_responders FOR UPDATE USING (auth.uid() IS NOT NULL);

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE panic_alerts_broadcast;
ALTER PUBLICATION supabase_realtime ADD TABLE alert_responders;
