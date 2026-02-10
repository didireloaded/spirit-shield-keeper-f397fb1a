
-- =============================================
-- FEATURE 1: Smart Safety Zones
-- =============================================
CREATE TYPE public.zone_type AS ENUM ('home', 'work', 'school', 'route', 'custom');

CREATE TABLE public.safety_zones (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  label TEXT NOT NULL,
  zone_type public.zone_type NOT NULL DEFAULT 'custom',
  latitude DOUBLE PRECISION NOT NULL,
  longitude DOUBLE PRECISION NOT NULL,
  radius_meters INTEGER NOT NULL DEFAULT 200,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.safety_zones ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own safety zones" ON public.safety_zones FOR ALL
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- =============================================
-- FEATURE 2: Silent Check-In System
-- =============================================
CREATE TABLE public.check_in_timers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  interval_minutes INTEGER NOT NULL DEFAULT 30,
  next_check_in TIMESTAMPTZ NOT NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'paused', 'expired', 'cancelled')),
  missed_count INTEGER NOT NULL DEFAULT 0,
  auto_panic BOOLEAN NOT NULL DEFAULT true,
  last_checked_in TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.check_in_timers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own check-in timers" ON public.check_in_timers FOR ALL
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- =============================================
-- FEATURE 3: Trusted Circle Roles
-- =============================================
CREATE TYPE public.watcher_role AS ENUM ('viewer', 'responder', 'emergency_contact');

ALTER TABLE public.watchers ADD COLUMN role public.watcher_role NOT NULL DEFAULT 'viewer';

-- =============================================
-- FEATURE 4: Incident Credibility Layer
-- =============================================
CREATE TABLE public.incident_verifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  incident_id UUID NOT NULL,
  incident_type TEXT NOT NULL CHECK (incident_type IN ('marker', 'incident_report')),
  user_id UUID NOT NULL,
  action TEXT NOT NULL CHECK (action IN ('confirm', 'deny', 'add_info')),
  comment TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(incident_id, user_id)
);

ALTER TABLE public.incident_verifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view verifications" ON public.incident_verifications FOR SELECT
  USING (true);
CREATE POLICY "Users can create verifications" ON public.incident_verifications FOR INSERT
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their verifications" ON public.incident_verifications FOR UPDATE
  USING (auth.uid() = user_id);

-- Add credibility columns to markers and incident_reports
ALTER TABLE public.markers ADD COLUMN credibility_score DOUBLE PRECISION DEFAULT 0;
ALTER TABLE public.markers ADD COLUMN credibility_status TEXT DEFAULT 'unconfirmed' CHECK (credibility_status IN ('verified', 'unconfirmed', 'disputed', 'resolved'));
ALTER TABLE public.incident_reports ADD COLUMN credibility_score DOUBLE PRECISION DEFAULT 0;
ALTER TABLE public.incident_reports ADD COLUMN credibility_status TEXT DEFAULT 'unconfirmed' CHECK (credibility_status IN ('verified', 'unconfirmed', 'disputed', 'resolved'));

-- Function to update credibility score
CREATE OR REPLACE FUNCTION public.update_credibility_score()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  confirm_count INTEGER;
  deny_count INTEGER;
  score DOUBLE PRECISION;
  new_status TEXT;
BEGIN
  SELECT 
    COUNT(*) FILTER (WHERE action = 'confirm'),
    COUNT(*) FILTER (WHERE action = 'deny')
  INTO confirm_count, deny_count
  FROM incident_verifications
  WHERE incident_id = COALESCE(NEW.incident_id, OLD.incident_id)
    AND incident_type = COALESCE(NEW.incident_type, OLD.incident_type);

  score := CASE WHEN (confirm_count + deny_count) = 0 THEN 0
    ELSE (confirm_count::DOUBLE PRECISION / (confirm_count + deny_count)) * 100 END;
  
  new_status := CASE
    WHEN confirm_count >= 3 AND score >= 70 THEN 'verified'
    WHEN deny_count >= 3 AND score <= 30 THEN 'disputed'
    ELSE 'unconfirmed' END;

  IF COALESCE(NEW.incident_type, OLD.incident_type) = 'marker' THEN
    UPDATE markers SET credibility_score = score, credibility_status = new_status
    WHERE id = COALESCE(NEW.incident_id, OLD.incident_id);
  ELSE
    UPDATE incident_reports SET credibility_score = score, credibility_status = new_status
    WHERE incident_id = COALESCE(NEW.incident_id, OLD.incident_id);
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER update_credibility_on_verification
  AFTER INSERT OR UPDATE OR DELETE ON public.incident_verifications
  FOR EACH ROW EXECUTE FUNCTION public.update_credibility_score();

-- =============================================
-- FEATURE 6: "Are You Safe?" Passive Prompts
-- =============================================
CREATE TABLE public.safety_check_prompts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  trigger_reason TEXT NOT NULL,
  response TEXT CHECK (response IN ('safe', 'need_help', 'dismissed', NULL)),
  responded_at TIMESTAMPTZ,
  auto_escalated BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.safety_check_prompts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own safety prompts" ON public.safety_check_prompts FOR ALL
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- =============================================
-- FEATURE 7: Authority Escalation Workflow
-- =============================================
CREATE TABLE public.escalation_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  entity_id UUID NOT NULL,
  entity_type TEXT NOT NULL CHECK (entity_type IN ('panic_session', 'incident_report', 'marker')),
  escalation_target TEXT NOT NULL CHECK (escalation_target IN ('local_authority', 'private_security', 'community_leader')),
  authority_contact_id UUID REFERENCES public.authority_contacts(id),
  reason TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'in_progress', 'resolved', 'rejected')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.escalation_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can create escalation requests" ON public.escalation_requests FOR INSERT
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can view their escalations" ON public.escalation_requests FOR SELECT
  USING (auth.uid() = user_id);
CREATE POLICY "Authenticated users can view escalations for incidents" ON public.escalation_requests FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- =============================================
-- FEATURE 11: Subtle Gamification (Achievements)
-- =============================================
CREATE TABLE public.user_achievements (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  achievement_type TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  earned_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, achievement_type)
);

ALTER TABLE public.user_achievements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own achievements" ON public.user_achievements FOR SELECT
  USING (auth.uid() = user_id);

-- Achievement trigger: verified incident
CREATE OR REPLACE FUNCTION public.award_verification_achievement()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  verify_count INTEGER;
BEGIN
  IF NEW.action = 'confirm' THEN
    SELECT COUNT(*) INTO verify_count FROM incident_verifications WHERE user_id = NEW.user_id AND action = 'confirm';
    
    IF verify_count = 1 THEN
      INSERT INTO user_achievements (user_id, achievement_type, title, description)
      VALUES (NEW.user_id, 'first_verification', 'Community Verifier', 'You helped confirm an incident')
      ON CONFLICT (user_id, achievement_type) DO NOTHING;
    ELSIF verify_count = 10 THEN
      INSERT INTO user_achievements (user_id, achievement_type, title, description)
      VALUES (NEW.user_id, 'ten_verifications', 'Trusted Eye', 'You''ve confirmed 10 incidents')
      ON CONFLICT (user_id, achievement_type) DO NOTHING;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER award_achievement_on_verification
  AFTER INSERT ON public.incident_verifications
  FOR EACH ROW EXECUTE FUNCTION public.award_verification_achievement();

-- =============================================
-- FEATURE 12: Personal Safety Insights
-- =============================================
CREATE TABLE public.safety_insights (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  insight_type TEXT NOT NULL,
  data JSONB NOT NULL DEFAULT '{}'::jsonb,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.safety_insights ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own insights" ON public.safety_insights FOR ALL
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- =============================================
-- FEATURE 9: Safety Heatmap (Materialized View)
-- =============================================
CREATE MATERIALIZED VIEW public.incident_heatmap_data AS
SELECT 
  ROUND(CAST(lat AS NUMERIC), 3) AS lat_bucket,
  ROUND(CAST(lng AS NUMERIC), 3) AS lng_bucket,
  incident_type,
  COUNT(*) AS incident_count,
  MAX(created_at) AS latest_at,
  DATE_TRUNC('week', created_at) AS week_bucket
FROM public.incident_reports
WHERE status != 'resolved' OR created_at > now() - INTERVAL '30 days'
GROUP BY lat_bucket, lng_bucket, incident_type, week_bucket;

CREATE INDEX idx_heatmap_location ON public.incident_heatmap_data (lat_bucket, lng_bucket);

-- Enable realtime for new tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.check_in_timers;
ALTER PUBLICATION supabase_realtime ADD TABLE public.safety_check_prompts;
ALTER PUBLICATION supabase_realtime ADD TABLE public.incident_verifications;
ALTER PUBLICATION supabase_realtime ADD TABLE public.escalation_requests;
