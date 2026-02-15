
-- ========================================
-- DAY 2: CREDIBILITY SYSTEM SCHEMA
-- Adapted to actual schema (profiles, incident_reports, markers)
-- ========================================

-- Add credibility tracking to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS credibility_score INTEGER NOT NULL DEFAULT 50,
ADD COLUMN IF NOT EXISTS total_reports INTEGER NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS verified_reports INTEGER NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS false_reports INTEGER NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS community_confirmations INTEGER NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS warnings_received INTEGER NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS is_restricted BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS restriction_reason TEXT,
ADD COLUMN IF NOT EXISTS restriction_expires_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS last_report_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_profiles_credibility ON public.profiles (credibility_score DESC);
CREATE INDEX IF NOT EXISTS idx_profiles_restricted ON public.profiles (is_restricted) WHERE is_restricted = true;

-- ========================================
-- CREDIBILITY HISTORY TABLE
-- ========================================
CREATE TABLE IF NOT EXISTS public.credibility_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    action TEXT NOT NULL,
    points_change INTEGER NOT NULL,
    old_score INTEGER NOT NULL,
    new_score INTEGER NOT NULL,
    reason TEXT,
    reference_id UUID,
    reference_type TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.credibility_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own credibility history"
ON public.credibility_history FOR SELECT
USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_cred_history_user ON public.credibility_history (user_id, created_at DESC);

-- ========================================
-- USER ACTIVITY LOG (for pattern detection)
-- ========================================
CREATE TABLE IF NOT EXISTS public.user_activity_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    activity_type TEXT NOT NULL,
    lat DOUBLE PRECISION,
    lng DOUBLE PRECISION,
    metadata JSONB DEFAULT '{}'::JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.user_activity_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can insert their own activity"
ON public.user_activity_log FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own activity"
ON public.user_activity_log FOR SELECT
USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_activity_user ON public.user_activity_log (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_activity_type ON public.user_activity_log (activity_type, created_at DESC);

-- ========================================
-- CREDIBILITY FUNCTIONS
-- ========================================

-- Update credibility score
CREATE OR REPLACE FUNCTION public.update_user_credibility(
    user_id_param UUID,
    action_param TEXT,
    points_change_param INTEGER,
    reason_param TEXT DEFAULT NULL,
    reference_id_param UUID DEFAULT NULL,
    reference_type_param TEXT DEFAULT NULL
)
RETURNS TABLE (
    new_score INTEGER,
    was_banned BOOLEAN,
    was_unbanned BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    old_score INTEGER;
    new_score_val INTEGER;
    was_banned_val BOOLEAN := false;
    was_unbanned_val BOOLEAN := false;
    current_restricted BOOLEAN;
    current_reason TEXT;
BEGIN
    SELECT credibility_score, is_restricted, restriction_reason
    INTO old_score, current_restricted, current_reason
    FROM profiles 
    WHERE id = user_id_param;

    IF old_score IS NULL THEN
        old_score := 50;
    END IF;

    new_score_val := GREATEST(0, LEAST(100, old_score + points_change_param));

    UPDATE profiles 
    SET credibility_score = new_score_val,
        last_report_at = CASE WHEN action_param = 'report_created' THEN NOW() ELSE last_report_at END,
        total_reports = CASE WHEN action_param = 'report_created' THEN total_reports + 1 ELSE total_reports END,
        verified_reports = CASE WHEN action_param = 'report_verified' THEN verified_reports + 1 ELSE verified_reports END,
        false_reports = CASE WHEN action_param = 'report_false' THEN false_reports + 1 ELSE false_reports END,
        community_confirmations = CASE WHEN action_param = 'community_confirm' THEN community_confirmations + 1 ELSE community_confirmations END
    WHERE id = user_id_param;

    -- Auto-restrict if score drops below 10
    IF new_score_val <= 10 AND NOT current_restricted THEN
        UPDATE profiles 
        SET is_restricted = true,
            restriction_reason = 'Automatic restriction: Credibility score below 10',
            restriction_expires_at = NOW() + INTERVAL '7 days'
        WHERE id = user_id_param;
        was_banned_val := true;
    END IF;

    -- Auto-unrestrict if score recovers above 30
    IF new_score_val > 30 AND current_restricted AND current_reason LIKE 'Automatic%' THEN
        UPDATE profiles 
        SET is_restricted = false,
            restriction_reason = NULL,
            restriction_expires_at = NULL
        WHERE id = user_id_param;
        was_unbanned_val := true;
    END IF;

    -- Log credibility change
    INSERT INTO credibility_history (
        user_id, action, points_change, old_score, new_score, 
        reason, reference_id, reference_type
    ) VALUES (
        user_id_param, action_param, points_change_param, 
        old_score, new_score_val, 
        reason_param, reference_id_param, reference_type_param
    );

    RETURN QUERY SELECT new_score_val, was_banned_val, was_unbanned_val;
END;
$$;

-- Auto-verify incidents based on community confirmations
CREATE OR REPLACE FUNCTION public.check_incident_auto_verify(
    target_incident_id UUID,
    target_incident_type TEXT DEFAULT 'marker'
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    confirm_count INTEGER;
    deny_count INTEGER;
    reporter_credibility INTEGER;
BEGIN
    SELECT 
        COUNT(*) FILTER (WHERE action = 'confirm'),
        COUNT(*) FILTER (WHERE action = 'deny')
    INTO confirm_count, deny_count
    FROM incident_verifications
    WHERE incident_id = target_incident_id
      AND incident_type = target_incident_type;

    -- Get reporter credibility
    IF target_incident_type = 'marker' THEN
        SELECT COALESCE(p.credibility_score, 50) INTO reporter_credibility
        FROM markers m JOIN profiles p ON m.user_id = p.id
        WHERE m.id = target_incident_id;
    ELSE
        SELECT COALESCE(p.credibility_score, 50) INTO reporter_credibility
        FROM incident_reports ir JOIN profiles p ON ir.reported_by = p.id
        WHERE ir.incident_id = target_incident_id;
    END IF;

    -- Auto-verify: 3+ confirms, no denials
    IF confirm_count >= 3 AND deny_count = 0 THEN
        IF target_incident_type = 'marker' THEN
            UPDATE markers SET credibility_status = 'verified', credibility_score = 100 WHERE id = target_incident_id;
        ELSE
            UPDATE incident_reports SET credibility_status = 'verified', credibility_score = 100 WHERE incident_id = target_incident_id;
        END IF;
        RETURN true;
    END IF;

    -- High credibility reporter + 1 confirm
    IF reporter_credibility >= 80 AND confirm_count >= 1 THEN
        IF target_incident_type = 'marker' THEN
            UPDATE markers SET credibility_status = 'verified' WHERE id = target_incident_id;
        ELSE
            UPDATE incident_reports SET credibility_status = 'verified' WHERE incident_id = target_incident_id;
        END IF;
        RETURN true;
    END IF;

    -- Auto-flag: 2+ denials
    IF deny_count >= 2 THEN
        IF target_incident_type = 'marker' THEN
            UPDATE markers SET credibility_status = 'disputed' WHERE id = target_incident_id;
        ELSE
            UPDATE incident_reports SET credibility_status = 'disputed' WHERE incident_id = target_incident_id;
        END IF;
        RETURN false;
    END IF;

    RETURN false;
END;
$$;

-- Spam pattern detection
CREATE OR REPLACE FUNCTION public.detect_spam_pattern(
    user_id_param UUID
)
RETURNS TABLE (
    is_spam BOOLEAN,
    reason TEXT,
    confidence DOUBLE PRECISION
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    recent_reports INTEGER;
    recent_activity INTEGER;
BEGIN
    -- Check reports in last 10 minutes
    SELECT COUNT(*) INTO recent_reports
    FROM user_activity_log
    WHERE user_id = user_id_param
      AND activity_type = 'report'
      AND created_at > NOW() - INTERVAL '10 minutes';

    IF recent_reports > 5 THEN
        RETURN QUERY SELECT true, 'Too many reports in short time'::TEXT, 0.95::DOUBLE PRECISION;
        RETURN;
    END IF;

    -- Check rapid activity (any type) in last 5 minutes
    SELECT COUNT(*) INTO recent_activity
    FROM user_activity_log
    WHERE user_id = user_id_param
      AND created_at > NOW() - INTERVAL '5 minutes';

    IF recent_activity > 15 THEN
        RETURN QUERY SELECT true, 'Excessive activity detected'::TEXT, 0.85::DOUBLE PRECISION;
        RETURN;
    END IF;

    -- Not spam
    RETURN QUERY SELECT false, 'No spam detected'::TEXT, 0.0::DOUBLE PRECISION;
END;
$$;
