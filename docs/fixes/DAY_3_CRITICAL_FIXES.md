# DAY 3 CRITICAL FIXES - Content Moderation System
## ⏱️ Time Required: 3-4 hours
## 🎯 Priority: CRITICAL - Content Safety

---

## Part 1: Content Moderation Database (20 minutes)

```sql
-- ========================================
-- CONTENT FLAGS TABLE
-- ========================================

CREATE TABLE IF NOT EXISTS content_flags (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    content_id UUID NOT NULL,
    content_type TEXT NOT NULL CHECK (content_type IN ('incident', 'post', 'comment')),
    flagger_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    flag_reason TEXT NOT NULL CHECK (flag_reason IN (
        'spam', 'harassment', 'hate_speech', 'violence', 
        'sexual_content', 'misinformation', 'personal_info', 'other'
    )),
    flag_details TEXT,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'reviewed', 'actioned', 'dismissed')),
    moderator_id UUID REFERENCES users(id) ON DELETE SET NULL,
    moderator_action TEXT, -- 'remove', 'warn', 'ban_user', 'dismiss'
    moderator_notes TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    reviewed_at TIMESTAMP,
    UNIQUE(content_id, flagger_user_id) -- Can't flag same content twice
);

CREATE INDEX IF NOT EXISTS content_flags_content_idx 
ON content_flags (content_id, content_type);

CREATE INDEX IF NOT EXISTS content_flags_pending_idx 
ON content_flags (status, created_at DESC) 
WHERE status = 'pending';


-- ========================================
-- MODERATION QUEUE TABLE
-- ========================================

CREATE TABLE IF NOT EXISTS moderation_queue (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    content_id UUID NOT NULL,
    content_type TEXT NOT NULL,
    reason TEXT NOT NULL, -- 'flagged', 'auto_detected', 'low_credibility'
    auto_detected_issues TEXT[], -- Array of detected issues
    priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'critical')),
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'in_review', 'resolved')),
    assigned_to UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    resolved_at TIMESTAMP
);

CREATE INDEX IF NOT EXISTS moderation_queue_pending_idx 
ON moderation_queue (status, priority DESC, created_at ASC) 
WHERE status = 'pending';


-- ========================================
-- BANNED WORDS TABLE
-- ========================================

CREATE TABLE IF NOT EXISTS banned_words (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    word TEXT NOT NULL UNIQUE,
    category TEXT NOT NULL CHECK (category IN ('profanity', 'hate_speech', 'violence', 'sexual')),
    severity TEXT NOT NULL CHECK (severity IN ('low', 'medium', 'high')),
    action TEXT NOT NULL CHECK (action IN ('flag', 'block', 'warn')),
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS banned_words_word_idx ON banned_words (LOWER(word));


-- Insert default banned words (Namibian/South African context)
INSERT INTO banned_words (word, category, severity, action) VALUES
-- High severity profanity (block)
('fuck', 'profanity', 'high', 'block'),
('shit', 'profanity', 'high', 'block'),
('cunt', 'profanity', 'high', 'block'),
('poes', 'profanity', 'high', 'block'),  -- Afrikaans
('doos', 'profanity', 'high', 'block'),  -- Afrikaans

-- Hate speech (block)
('kaffir', 'hate_speech', 'high', 'block'),
('hotnot', 'hate_speech', 'high', 'block'),
('coolie', 'hate_speech', 'high', 'block'),

-- Violence threats (block)
('kill', 'violence', 'high', 'flag'),
('rape', 'violence', 'high', 'block'),
('murder', 'violence', 'high', 'flag'),
('assault', 'violence', 'medium', 'flag'),

-- Medium severity (flag for review)
('idiot', 'profanity', 'low', 'flag'),
('stupid', 'profanity', 'low', 'flag'),
('dumb', 'profanity', 'low', 'flag')
ON CONFLICT (word) DO NOTHING;


-- ========================================
-- USER WARNINGS TABLE
-- ========================================

CREATE TABLE IF NOT EXISTS user_warnings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
    warning_type TEXT NOT NULL,
    reason TEXT NOT NULL,
    content_id UUID,
    content_type TEXT,
    issued_by UUID REFERENCES users(id) ON DELETE SET NULL,
    acknowledged BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS user_warnings_user_id_idx 
ON user_warnings (user_id, created_at DESC);
```

---

## Part 2: Content Moderation Functions (45 minutes)

```sql
-- ========================================
-- MODERATE TEXT FUNCTION
-- ========================================

CREATE OR REPLACE FUNCTION moderate_text(
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
AS $$
DECLARE
    text_lower TEXT := LOWER(text_param);
    blocked TEXT[];
    flagged TEXT[];
    all_issues TEXT[] := '{}';
    has_pii BOOLEAN := false;
    user_credibility INT;
BEGIN
    -- Get user credibility
    SELECT credibility_score INTO user_credibility
    FROM users WHERE id = user_id_param;
    
    -- Check banned words (block action)
    SELECT ARRAY_AGG(word) INTO blocked
    FROM banned_words
    WHERE action = 'block' AND text_lower LIKE '%' || LOWER(word) || '%';
    
    -- Check flagged words
    SELECT ARRAY_AGG(word) INTO flagged
    FROM banned_words
    WHERE action = 'flag' AND text_lower LIKE '%' || LOWER(word) || '%';
    
    -- Check for PII (personal information)
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
    
    -- URLs/Links (potential phishing)
    IF text_param ~* 'https?://|www\.' THEN
        all_issues := array_append(all_issues, 'external_link');
    END IF;
    
    -- Excessive caps (spam indicator)
    IF LENGTH(text_param) > 20 AND 
       LENGTH(REGEXP_REPLACE(text_param, '[^A-Z]', '', 'g')) > LENGTH(text_param) * 0.7 THEN
        all_issues := array_append(all_issues, 'excessive_caps');
    END IF;
    
    -- Repeated characters (spam indicator)
    IF text_param ~ '(.)\1{4,}' THEN
        all_issues := array_append(all_issues, 'repeated_chars');
    END IF;
    
    -- Determine if content passes
    RETURN QUERY SELECT
        (blocked IS NULL OR CARDINALITY(blocked) = 0),
        COALESCE(blocked, '{}'),
        COALESCE(flagged, '{}'),
        has_pii,
        all_issues;
END;
$$;


-- ========================================
-- AUTO-FLAG CONTENT FUNCTION
-- ========================================

CREATE OR REPLACE FUNCTION auto_flag_content(
    content_id_param UUID,
    content_type_param TEXT,
    user_id_param UUID
)
RETURNS TABLE (
    should_flag BOOLEAN,
    priority TEXT,
    reasons TEXT[]
)
LANGUAGE plpgsql
AS $$
DECLARE
    flag_count INT;
    user_credibility INT;
    user_false_reports INT;
    content_text TEXT;
    moderation_result RECORD;
    flag_reasons TEXT[] := '{}';
    flag_priority TEXT := 'low';
BEGIN
    -- Get content text based on type
    IF content_type_param = 'incident' THEN
        SELECT description INTO content_text
        FROM incidents WHERE id = content_id_param;
    ELSIF content_type_param = 'post' THEN
        SELECT content INTO content_text
        FROM community_posts WHERE id = content_id_param;
    ELSIF content_type_param = 'comment' THEN
        SELECT content INTO content_text
        FROM comments WHERE id = content_id_param;
    END IF;
    
    -- Get user credibility
    SELECT credibility_score, false_reports 
    INTO user_credibility, user_false_reports
    FROM users WHERE id = user_id_param;
    
    -- Check content moderation
    SELECT * INTO moderation_result
    FROM moderate_text(content_text, user_id_param);
    
    -- Flag if blocked words found
    IF NOT moderation_result.passed THEN
        flag_reasons := array_append(flag_reasons, 'blocked_words');
        flag_priority := 'high';
    END IF;
    
    -- Flag if PII detected
    IF moderation_result.contains_pii THEN
        flag_reasons := array_append(flag_reasons, 'personal_info');
        flag_priority := 'medium';
    END IF;
    
    -- Flag if low credibility user
    IF user_credibility < 30 THEN
        flag_reasons := array_append(flag_reasons, 'low_credibility');
    END IF;
    
    -- Flag if user has many false reports
    IF user_false_reports > 5 THEN
        flag_reasons := array_append(flag_reasons, 'history_of_false_reports');
        flag_priority := 'high';
    END IF;
    
    -- Check how many times this content has been flagged
    SELECT COUNT(*) INTO flag_count
    FROM content_flags
    WHERE content_id = content_id_param AND status = 'pending';
    
    -- Auto-hide if 3+ flags
    IF flag_count >= 3 THEN
        IF content_type_param = 'post' THEN
            UPDATE community_posts SET hidden = true WHERE id = content_id_param;
        ELSIF content_type_param = 'incident' THEN
            UPDATE incidents SET status = 'under_review' WHERE id = content_id_param;
        END IF;
        flag_priority := 'critical';
    END IF;
    
    RETURN QUERY SELECT 
        (CARDINALITY(flag_reasons) > 0),
        flag_priority,
        flag_reasons;
END;
$$;


-- ========================================
-- ISSUE WARNING TO USER
-- ========================================

CREATE OR REPLACE FUNCTION issue_warning(
    user_id_param UUID,
    warning_type_param TEXT,
    reason_param TEXT,
    content_id_param UUID DEFAULT NULL,
    content_type_param TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
AS $$
DECLARE
    warning_id UUID;
    warning_count INT;
BEGIN
    -- Insert warning
    INSERT INTO user_warnings (user_id, warning_type, reason, content_id, content_type)
    VALUES (user_id_param, warning_type_param, reason_param, content_id_param, content_type_param)
    RETURNING id INTO warning_id;
    
    -- Count total warnings
    SELECT COUNT(*) INTO warning_count
    FROM user_warnings
    WHERE user_id = user_id_param;
    
    -- Update user's warning count
    UPDATE users
    SET warnings_received = warning_count
    WHERE id = user_id_param;
    
    -- Auto-ban if 3+ warnings in 30 days
    IF (
        SELECT COUNT(*) 
        FROM user_warnings 
        WHERE user_id = user_id_param 
        AND created_at > NOW() - INTERVAL '30 days'
    ) >= 3 THEN
        UPDATE users
        SET banned = true,
            ban_reason = 'Automatic ban: 3+ warnings in 30 days',
            ban_expires_at = NOW() + INTERVAL '14 days'
        WHERE id = user_id_param;
    END IF;
    
    RETURN warning_id;
END;
$$;
```

---

## Part 3: TypeScript Content Moderation (1.5 hours)

### File: `src/lib/contentModeration.ts`

```typescript
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

// Banned words that should block content immediately
const BANNED_WORDS = [
  'fuck', 'shit', 'cunt', 'bitch', 'asshole',
  'poes', 'doos', 'naai',  // Afrikaans profanity
  'kaffir', 'hotnot', 'coolie',  // Hate speech
];

// Flagged words that should trigger review
const FLAGGED_WORDS = [
  'kill', 'murder', 'rape', 'assault', 'attack',
  'die', 'dead', 'blood', 'weapon', 'gun', 'knife',
];

// Spam indicators
const SPAM_KEYWORDS = [
  'click here', 'buy now', 'limited time', 'act now',
  'free money', 'get rich', 'work from home',
  'enlarge', 'weight loss', 'miracle',
];

/**
 * Moderate text content
 */
export async function moderateText(
  text: string,
  userId: string
): Promise<{
  passed: boolean;
  blockedWords: string[];
  flaggedWords: string[];
  containsPII: boolean;
  issues: string[];
}> {
  const { data, error } = await supabase.rpc('moderate_text', {
    text_param: text,
    user_id_param: userId,
  });

  if (error) {
    console.error('Moderation error:', error);
    // Fail closed - block content if moderation fails
    return {
      passed: false,
      blockedWords: [],
      flaggedWords: [],
      containsPII: false,
      issues: ['moderation_error'],
    };
  }

  return data[0];
}

/**
 * Detect masked profanity (f**k, sh1t, etc.)
 */
function detectMaskedProfanity(text: string): boolean {
  const patterns = [
    /f[\*\s][\*\s]k/i,
    /sh[\*\s][\*\s]t/i,
    /b[\*\s]tch/i,
    /f\s*u\s*c\s*k/i,
    /s\s*h\s*i\s*t/i,
    /[a@]ssh[o0]le/i,
    /b[i1]tch/i,
    /d[a@]mn/i,
  ];

  return patterns.some(pattern => pattern.test(text));
}

/**
 * Detect personal information
 */
function detectPersonalInfo(text: string): {
  found: boolean;
  types: string[];
} {
  const types: string[] = [];

  // Namibian phone numbers (+264 or 061/081/085)
  if (/(\+264|0)(61|81|85)\d{7}/.test(text)) {
    types.push('phone_number');
  }

  // Email addresses
  if (/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/.test(text)) {
    types.push('email');
  }

  // ID numbers (11 digits)
  if (/\b\d{11}\b/.test(text)) {
    types.push('id_number');
  }

  // Physical addresses
  if (/\d+\s+(street|str|avenue|ave|road|rd|drive|dr)/i.test(text)) {
    types.push('address');
  }

  // URLs
  if (/(https?:\/\/|www\.)[^\s]+/i.test(text)) {
    types.push('url');
  }

  return {
    found: types.length > 0,
    types,
  };
}

/**
 * Detect spam patterns
 */
function detectSpamPatterns(text: string): {
  isSpam: boolean;
  reasons: string[];
} {
  const reasons: string[] = [];

  // Excessive caps (>70% uppercase)
  if (text.length > 20) {
    const capsRatio = (text.match(/[A-Z]/g) || []).length / text.length;
    if (capsRatio > 0.7) {
      reasons.push('excessive_caps');
    }
  }

  // Excessive punctuation
  const punctRatio = (text.match(/[!?]{2,}/g) || []).length;
  if (punctRatio > 3) {
    reasons.push('excessive_punctuation');
  }

  // Repeated characters (aaaa, !!!!!)
  if (/(.)\1{4,}/.test(text)) {
    reasons.push('repeated_characters');
  }

  // Spam keywords
  const lowerText = text.toLowerCase();
  const foundSpamKeywords = SPAM_KEYWORDS.filter(keyword =>
    lowerText.includes(keyword)
  );
  if (foundSpamKeywords.length > 0) {
    reasons.push('spam_keywords');
  }

  // Excessive emojis
  const emojiCount = (text.match(/[\u{1F600}-\u{1F64F}]/gu) || []).length;
  if (emojiCount > 10) {
    reasons.push('excessive_emojis');
  }

  // Multiple links
  const linkCount = (text.match(/(https?:\/\/|www\.)[^\s]+/gi) || []).length;
  if (linkCount > 2) {
    reasons.push('multiple_links');
  }

  return {
    isSpam: reasons.length >= 2,
    reasons,
  };
}

/**
 * Comprehensive content check
 */
export async function checkContent(
  text: string,
  userId: string,
  contentType: 'incident' | 'post' | 'comment'
): Promise<{
  approved: boolean;
  reason?: string;
  sanitizedText?: string;
  requiresReview: boolean;
}> {
  // 1. Basic validation
  if (!text || text.trim().length === 0) {
    return {
      approved: false,
      reason: 'Content cannot be empty',
      requiresReview: false,
    };
  }

  if (text.length > 5000) {
    return {
      approved: false,
      reason: 'Content too long (max 5000 characters)',
      requiresReview: false,
    };
  }

  // 2. Check user credibility
  const { data: user } = await supabase
    .from('users')
    .select('credibility_score, banned')
    .eq('id', userId)
    .single();

  if (user?.banned) {
    return {
      approved: false,
      reason: 'Your account is restricted',
      requiresReview: false,
    };
  }

  // 3. Detect masked profanity
  if (detectMaskedProfanity(text)) {
    return {
      approved: false,
      reason: 'Content contains inappropriate language',
      requiresReview: false,
    };
  }

  // 4. Check for PII
  const piiCheck = detectPersonalInfo(text);
  if (piiCheck.found) {
    // Auto-redact phone numbers and emails
    let sanitized = text;
    sanitized = sanitized.replace(
      /(\+264|0)(61|81|85)\d{7}/g,
      '[PHONE REDACTED]'
    );
    sanitized = sanitized.replace(
      /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g,
      '[EMAIL REDACTED]'
    );
    sanitized = sanitized.replace(/\b\d{11}\b/g, '[ID REDACTED]');

    if (piiCheck.types.includes('url')) {
      return {
        approved: false,
        reason: 'External links are not allowed. Please remove URLs.',
        requiresReview: true,
      };
    }

    return {
      approved: true,
      sanitizedText: sanitized,
      requiresReview: piiCheck.types.length > 2,
    };
  }

  // 5. Detect spam
  const spamCheck = detectSpamPatterns(text);
  if (spamCheck.isSpam) {
    return {
      approved: false,
      reason: `Content appears to be spam: ${spamCheck.reasons.join(', ')}`,
      requiresReview: true,
    };
  }

  // 6. Server-side moderation
  const moderation = await moderateText(text, userId);

  if (!moderation.passed) {
    return {
      approved: false,
      reason: `Content blocked: ${moderation.blockedWords.join(', ')}`,
      requiresReview: false,
    };
  }

  // 7. Flag for review if needed
  const requiresReview =
    moderation.flaggedWords.length > 0 ||
    (user?.credibility_score || 50) < 30 ||
    moderation.issues.length > 0;

  return {
    approved: true,
    sanitizedText: text,
    requiresReview,
  };
}

/**
 * Flag content for review
 */
export async function flagContent(
  contentId: string,
  contentType: 'incident' | 'post' | 'comment',
  reason: string,
  details?: string
) {
  const { data: user } = await supabase.auth.getUser();
  if (!user.user) return { success: false };

  try {
    const { error } = await supabase.from('content_flags').insert({
      content_id: contentId,
      content_type: contentType,
      flagger_user_id: user.user.id,
      flag_reason: reason,
      flag_details: details,
    });

    if (error) throw error;

    toast.success('Content flagged for review. Thank you!');
    return { success: true };
  } catch (error: any) {
    if (error.code === '23505') {
      toast.info('You have already flagged this content');
    } else {
      toast.error('Failed to flag content');
    }
    return { success: false };
  }
}
```

---

## Part 4: UI Components (1 hour)

### File: `src/components/moderation/FlagContentDialog.tsx`

```typescript
import { useState } from "react";
import { Flag } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { flagContent } from "@/lib/contentModeration";

interface FlagContentDialogProps {
  contentId: string;
  contentType: 'incident' | 'post' | 'comment';
}

export function FlagContentDialog({ contentId, contentType }: FlagContentDialogProps) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState('');
  const [details, setDetails] = useState('');
  const [loading, setLoading] = useState(false);

  const reasons = [
    { value: 'spam', label: 'Spam or misleading' },
    { value: 'harassment', label: 'Harassment or bullying' },
    { value: 'hate_speech', label: 'Hate speech' },
    { value: 'violence', label: 'Violence or threats' },
    { value: 'sexual_content', label: 'Sexual content' },
    { value: 'misinformation', label: 'False information' },
    { value: 'personal_info', label: 'Shares personal information' },
    { value: 'other', label: 'Other' },
  ];

  const handleSubmit = async () => {
    if (!reason) return;

    setLoading(true);
    const result = await flagContent(contentId, contentType, reason, details);
    setLoading(false);

    if (result.success) {
      setOpen(false);
      setReason('');
      setDetails('');
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm">
          <Flag className="w-4 h-4 mr-1" />
          Report
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Report Content</DialogTitle>
          <DialogDescription>
            Help us keep the community safe. This report will be reviewed by moderators.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label>Why are you reporting this?</Label>
            <RadioGroup value={reason} onValueChange={setReason} className="mt-2 space-y-2">
              {reasons.map(r => (
                <div key={r.value} className="flex items-center space-x-2">
                  <RadioGroupItem value={r.value} id={r.value} />
                  <Label htmlFor={r.value} className="font-normal cursor-pointer">
                    {r.label}
                  </Label>
                </div>
              ))}
            </RadioGroup>
          </div>

          <div>
            <Label htmlFor="details">Additional details (optional)</Label>
            <Textarea
              id="details"
              value={details}
              onChange={(e) => setDetails(e.target.value)}
              placeholder="Provide more context..."
              className="mt-2"
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button 
            onClick={handleSubmit} 
            disabled={!reason || loading}
          >
            Submit Report
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
```

---

## Part 5: Integration (30 minutes)

### Update Incident Creation

```typescript
// In your incident creation hook/component
import { checkContent } from "@/lib/contentModeration";

const handleCreateIncident = async (description: string, ...) => {
  // Check content before creating
  const contentCheck = await checkContent(
    description,
    user.id,
    'incident'
  );

  if (!contentCheck.approved) {
    toast.error(contentCheck.reason);
    return;
  }

  // Use sanitized text if PII was redacted
  const finalDescription = contentCheck.sanitizedText || description;

  // Create incident with sanitized content
  const { data, error } = await supabase
    .from('incidents')
    .insert({
      description: finalDescription,
      // ... other fields
    });

  // If requires review, add to moderation queue
  if (contentCheck.requiresReview && data) {
    await supabase.from('moderation_queue').insert({
      content_id: data.id,
      content_type: 'incident',
      reason: 'auto_detected',
      priority: 'medium',
    });
  }
};
```

---

## ✅ Verification Checklist

- [ ] Moderation tables created
- [ ] Banned words inserted
- [ ] Moderation functions working
- [ ] Content filtering lib created
- [ ] Flag dialog component added
- [ ] Integrated with incident creation
- [ ] PII auto-redaction working
- [ ] Spam detection functional

---

## 🧪 Testing

```sql
-- Test 1: Check banned words
SELECT * FROM moderate_text(
  'This is a test with fuck and shit',
  'test-user-id'
);

-- Test 2: Check PII detection
SELECT * FROM moderate_text(
  'Call me at +264 81 234 5678 or email test@example.com',
  'test-user-id'
);

-- Test 3: Auto-flag content
SELECT * FROM auto_flag_content(
  'test-incident-id',
  'incident',
  'test-user-id'
);
```

---

## 📊 Expected Results

**Before:**
- No content filtering ❌
- PII shared publicly ❌
- Spam/harassment allowed ❌

**After:**
- Profanity blocked ✅
- PII auto-redacted ✅
- Spam detected ✅
- User flagging system ✅
- Moderation queue ✅

---

## ⏭️ Next Steps

Move to **DAY_4_CRITICAL_FIXES.md** - Legal Compliance

**Estimated time: 3-4 hours**  
**Impact: Prevents harmful content**  
**Status after completion: Content moderation production-ready ✅**
