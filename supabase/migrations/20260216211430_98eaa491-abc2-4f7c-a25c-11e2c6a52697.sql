
-- ========================================
-- CONTENT FLAGS TABLE
-- ========================================
CREATE TABLE IF NOT EXISTS public.content_flags (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    content_id UUID NOT NULL,
    content_type TEXT NOT NULL CHECK (content_type IN ('incident', 'post', 'comment', 'marker')),
    flagger_user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    flag_reason TEXT NOT NULL CHECK (flag_reason IN (
        'spam', 'harassment', 'hate_speech', 'violence', 
        'sexual_content', 'misinformation', 'personal_info', 'other'
    )),
    flag_details TEXT,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'reviewed', 'actioned', 'dismissed')),
    moderator_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    moderator_action TEXT,
    moderator_notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    reviewed_at TIMESTAMPTZ,
    UNIQUE(content_id, flagger_user_id)
);

CREATE INDEX IF NOT EXISTS content_flags_content_idx ON public.content_flags (content_id, content_type);
CREATE INDEX IF NOT EXISTS content_flags_pending_idx ON public.content_flags (status, created_at DESC) WHERE status = 'pending';

ALTER TABLE public.content_flags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can create flags" ON public.content_flags
    FOR INSERT WITH CHECK (auth.uid() = flagger_user_id);

CREATE POLICY "Users can view their own flags" ON public.content_flags
    FOR SELECT USING (auth.uid() = flagger_user_id);

-- ========================================
-- MODERATION QUEUE TABLE
-- ========================================
CREATE TABLE IF NOT EXISTS public.moderation_queue (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    content_id UUID NOT NULL,
    content_type TEXT NOT NULL,
    reason TEXT NOT NULL,
    auto_detected_issues TEXT[],
    priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'critical')),
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'in_review', 'resolved')),
    assigned_to UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    resolved_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS moderation_queue_pending_idx ON public.moderation_queue (status, priority DESC, created_at ASC) WHERE status = 'pending';

ALTER TABLE public.moderation_queue ENABLE ROW LEVEL SECURITY;

-- Only server-side (service role) can manage moderation queue
CREATE POLICY "No direct access to moderation queue" ON public.moderation_queue
    FOR ALL USING (false);

-- ========================================
-- BANNED WORDS TABLE
-- ========================================
CREATE TABLE IF NOT EXISTS public.banned_words (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    word TEXT NOT NULL UNIQUE,
    category TEXT NOT NULL CHECK (category IN ('profanity', 'hate_speech', 'violence', 'sexual')),
    severity TEXT NOT NULL CHECK (severity IN ('low', 'medium', 'high')),
    action TEXT NOT NULL CHECK (action IN ('flag', 'block', 'warn')),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS banned_words_word_idx ON public.banned_words (LOWER(word));

ALTER TABLE public.banned_words ENABLE ROW LEVEL SECURITY;

-- Banned words readable by authenticated users for client-side pre-check
CREATE POLICY "Authenticated users can read banned words" ON public.banned_words
    FOR SELECT USING (auth.uid() IS NOT NULL);

-- Insert default banned words (Namibian/South African context)
INSERT INTO public.banned_words (word, category, severity, action) VALUES
('fuck', 'profanity', 'high', 'block'),
('shit', 'profanity', 'high', 'block'),
('cunt', 'profanity', 'high', 'block'),
('poes', 'profanity', 'high', 'block'),
('doos', 'profanity', 'high', 'block'),
('kaffir', 'hate_speech', 'high', 'block'),
('hotnot', 'hate_speech', 'high', 'block'),
('coolie', 'hate_speech', 'high', 'block'),
('kill', 'violence', 'high', 'flag'),
('rape', 'violence', 'high', 'block'),
('murder', 'violence', 'high', 'flag'),
('assault', 'violence', 'medium', 'flag'),
('idiot', 'profanity', 'low', 'flag'),
('stupid', 'profanity', 'low', 'flag'),
('dumb', 'profanity', 'low', 'flag')
ON CONFLICT (word) DO NOTHING;

-- ========================================
-- USER WARNINGS TABLE
-- ========================================
CREATE TABLE IF NOT EXISTS public.user_warnings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    warning_type TEXT NOT NULL,
    reason TEXT NOT NULL,
    content_id UUID,
    content_type TEXT,
    issued_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    acknowledged BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS user_warnings_user_id_idx ON public.user_warnings (user_id, created_at DESC);

ALTER TABLE public.user_warnings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own warnings" ON public.user_warnings
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can acknowledge their warnings" ON public.user_warnings
    FOR UPDATE USING (auth.uid() = user_id);

-- ========================================
-- MODERATE TEXT FUNCTION (adapted for profiles table)
-- ========================================
CREATE OR REPLACE FUNCTION public.moderate_text(
    text_param TEXT,
    user_id_param UUID
)
RETURNS TABLE (
    passed BOOLEAN,
    blocked_words TEXT[],
    flagged_words TEXT[],
    contains_pii BOOLEAN,
    issues TEXT[]
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
    text_lower TEXT := LOWER(text_param);
    blocked TEXT[];
    flagged TEXT[];
    all_issues TEXT[] := '{}';
    has_pii BOOLEAN := false;
BEGIN
    -- Check banned words (block action)
    SELECT ARRAY_AGG(bw.word) INTO blocked
    FROM banned_words bw
    WHERE bw.action = 'block' AND text_lower LIKE '%' || LOWER(bw.word) || '%';
    
    -- Check flagged words
    SELECT ARRAY_AGG(bw.word) INTO flagged
    FROM banned_words bw
    WHERE bw.action = 'flag' AND text_lower LIKE '%' || LOWER(bw.word) || '%';
    
    -- Phone numbers (Namibian format)
    IF text_param ~ '\+264\s?\d{8,9}' OR text_param ~ '0\d{8,9}' THEN
        has_pii := true;
        all_issues := array_append(all_issues, 'phone_number');
    END IF;
    
    -- Email addresses
    IF text_param ~ '[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}' THEN
        has_pii := true;
        all_issues := array_append(all_issues, 'email');
    END IF;
    
    -- ID numbers (11 digits)
    IF text_param ~ '\b\d{11}\b' THEN
        has_pii := true;
        all_issues := array_append(all_issues, 'id_number');
    END IF;
    
    -- Street addresses
    IF text_param ~* '\d+\s+(street|str|avenue|ave|road|rd|drive|dr)' THEN
        has_pii := true;
        all_issues := array_append(all_issues, 'address');
    END IF;
    
    -- URLs/Links
    IF text_param ~* 'https?://|www\.' THEN
        all_issues := array_append(all_issues, 'external_link');
    END IF;
    
    -- Excessive caps
    IF LENGTH(text_param) > 20 AND 
       LENGTH(REGEXP_REPLACE(text_param, '[^A-Z]', '', 'g')) > LENGTH(text_param) * 0.7 THEN
        all_issues := array_append(all_issues, 'excessive_caps');
    END IF;
    
    -- Repeated characters
    IF text_param ~ '(.)\1{4,}' THEN
        all_issues := array_append(all_issues, 'repeated_chars');
    END IF;
    
    RETURN QUERY SELECT
        (blocked IS NULL OR CARDINALITY(blocked) = 0),
        COALESCE(blocked, '{}'),
        COALESCE(flagged, '{}'),
        has_pii,
        all_issues;
END;
$$;

-- ========================================
-- ISSUE WARNING FUNCTION (adapted for profiles)
-- ========================================
CREATE OR REPLACE FUNCTION public.issue_warning(
    user_id_param UUID,
    warning_type_param TEXT,
    reason_param TEXT,
    content_id_param UUID DEFAULT NULL,
    content_type_param TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
    warning_id UUID;
    warning_count INT;
BEGIN
    INSERT INTO user_warnings (user_id, warning_type, reason, content_id, content_type)
    VALUES (user_id_param, warning_type_param, reason_param, content_id_param, content_type_param)
    RETURNING id INTO warning_id;
    
    -- Auto-restrict if 3+ warnings in 30 days
    SELECT COUNT(*) INTO warning_count
    FROM user_warnings 
    WHERE user_id = user_id_param 
    AND created_at > NOW() - INTERVAL '30 days';

    IF warning_count >= 3 THEN
        UPDATE profiles
        SET is_restricted = true,
            restriction_reason = 'Automatic restriction: 3+ warnings in 30 days',
            restriction_expires_at = NOW() + INTERVAL '14 days'
        WHERE id = user_id_param;
    END IF;
    
    RETURN warning_id;
END;
$$;
