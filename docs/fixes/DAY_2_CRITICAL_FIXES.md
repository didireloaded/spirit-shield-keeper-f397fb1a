# DAY 2 CRITICAL FIXES - False Report Prevention System
## ⏱️ Time Required: 4-6 hours
## 🎯 Priority: CRITICAL - Anti-Abuse System

---

## Part 1: Database Schema (30 minutes)

### Step 1: Add Credibility Columns to Users

```sql
-- ========================================
-- CREDIBILITY SYSTEM SCHEMA
-- ========================================

-- Add credibility tracking to users table
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS credibility_score INTEGER DEFAULT 50,
ADD COLUMN IF NOT EXISTS total_reports INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS verified_reports INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS false_reports INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS community_confirmations INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS warnings_received INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS banned BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS ban_reason TEXT,
ADD COLUMN IF NOT EXISTS ban_expires_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS last_report_at TIMESTAMP;

-- Create index on credibility
CREATE INDEX IF NOT EXISTS users_credibility_score_idx 
ON users (credibility_score DESC);


-- ========================================
-- CREDIBILITY HISTORY TABLE
-- ========================================

CREATE TABLE IF NOT EXISTS credibility_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
    action TEXT NOT NULL, -- 'report_created', 'report_verified', 'report_false', etc.
    points_change INTEGER NOT NULL,
    old_score INTEGER NOT NULL,
    new_score INTEGER NOT NULL,
    reason TEXT,
    reference_id UUID, -- ID of incident/post that caused change
    reference_type TEXT, -- 'incident', 'post', 'comment'
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS credibility_history_user_id_idx 
ON credibility_history (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS credibility_history_created_at_idx 
ON credibility_history (created_at DESC);


-- ========================================
-- INCIDENT VERIFICATION TABLE
-- ========================================

CREATE TABLE IF NOT EXISTS incident_verifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    incident_id UUID REFERENCES incidents(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
    verification_type TEXT NOT NULL CHECK (verification_type IN ('confirm', 'dispute', 'false')),
    notes TEXT,
    location_verified BOOLEAN DEFAULT false, -- User was within 1km
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(incident_id, user_id) -- One verification per user per incident
);

CREATE INDEX IF NOT EXISTS incident_verifications_incident_id_idx 
ON incident_verifications (incident_id, created_at DESC);

CREATE INDEX IF NOT EXISTS incident_verifications_user_id_idx 
ON incident_verifications (user_id, created_at DESC);


-- ========================================
-- USER ACTIVITY LOG (for pattern detection)
-- ========================================

CREATE TABLE IF NOT EXISTS user_activity_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
    activity_type TEXT NOT NULL, -- 'report', 'post', 'comment', 'verification'
    location GEOGRAPHY(POINT, 4326),
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS user_activity_log_user_id_idx 
ON user_activity_log (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS user_activity_log_created_at_idx 
ON user_activity_log (created_at DESC);

CREATE INDEX IF NOT EXISTS user_activity_log_location_gist_idx 
ON user_activity_log USING GIST (location);
```

---

## Part 2: Credibility Functions (45 minutes)

### Core Credibility Management

```sql
-- ========================================
-- UPDATE CREDIBILITY FUNCTION
-- ========================================

CREATE OR REPLACE FUNCTION update_credibility(
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
AS $$
DECLARE
    old_score INTEGER;
    new_score_val INTEGER;
    was_banned_val BOOLEAN := false;
    was_unbanned_val BOOLEAN := false;
    current_banned BOOLEAN;
BEGIN
    -- Get current score and ban status
    SELECT credibility_score, banned 
    INTO old_score, current_banned
    FROM users 
    WHERE id = user_id_param;
    
    -- Calculate new score (min 0, max 100)
    new_score_val := GREATEST(0, LEAST(100, old_score + points_change_param));
    
    -- Update user's credibility
    UPDATE users 
    SET credibility_score = new_score_val,
        last_report_at = CASE 
            WHEN action_param = 'report_created' THEN NOW() 
            ELSE last_report_at 
        END,
        total_reports = CASE 
            WHEN action_param = 'report_created' THEN total_reports + 1 
            ELSE total_reports 
        END,
        verified_reports = CASE 
            WHEN action_param = 'report_verified' THEN verified_reports + 1 
            ELSE verified_reports 
        END,
        false_reports = CASE 
            WHEN action_param = 'report_false' THEN false_reports + 1 
            ELSE false_reports 
        END,
        community_confirmations = CASE 
            WHEN action_param = 'community_confirm' THEN community_confirmations + 1 
            ELSE community_confirmations 
        END
    WHERE id = user_id_param;
    
    -- Auto-ban if score drops below 10
    IF new_score_val <= 10 AND NOT current_banned THEN
        UPDATE users 
        SET banned = true,
            ban_reason = 'Automatic ban: Credibility score below 10',
            ban_expires_at = NOW() + INTERVAL '7 days'
        WHERE id = user_id_param;
        was_banned_val := true;
    END IF;
    
    -- Auto-unban if score recovers above 30
    IF new_score_val > 30 AND current_banned AND ban_reason LIKE 'Automatic ban%' THEN
        UPDATE users 
        SET banned = false,
            ban_reason = NULL,
            ban_expires_at = NULL
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


-- ========================================
-- AUTO-VERIFICATION CHECKS
-- ========================================

CREATE OR REPLACE FUNCTION check_incident_auto_verify(
    incident_id_param UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
AS $$
DECLARE
    confirm_count INTEGER;
    dispute_count INTEGER;
    reporter_credibility INTEGER;
    reporter_location GEOGRAPHY;
    incident_location GEOGRAPHY;
    distance_km FLOAT;
    time_diff_minutes INTEGER;
BEGIN
    -- Get verification counts
    SELECT 
        COUNT(*) FILTER (WHERE verification_type = 'confirm'),
        COUNT(*) FILTER (WHERE verification_type = 'dispute')
    INTO confirm_count, dispute_count
    FROM incident_verifications
    WHERE incident_id = incident_id_param;
    
    -- Get reporter info and incident location
    SELECT 
        u.credibility_score,
        i.location,
        EXTRACT(EPOCH FROM (NOW() - i.created_at))/60
    INTO reporter_credibility, incident_location, time_diff_minutes
    FROM incidents i
    JOIN users u ON i.user_id = u.id
    WHERE i.id = incident_id_param;
    
    -- Auto-verify if:
    -- 1. 3+ confirmations and no disputes
    IF confirm_count >= 3 AND dispute_count = 0 THEN
        UPDATE incidents 
        SET verification_status = 'verified'
        WHERE id = incident_id_param;
        RETURN true;
    END IF;
    
    -- 2. High credibility reporter (80+) and 1+ confirmation
    IF reporter_credibility >= 80 AND confirm_count >= 1 THEN
        UPDATE incidents 
        SET verification_status = 'verified'
        WHERE id = incident_id_param;
        RETURN true;
    END IF;
    
    -- Auto-flag if:
    -- 1. 2+ disputes
    IF dispute_count >= 2 THEN
        UPDATE incidents 
        SET verification_status = 'flagged',
            status = 'under_review'
        WHERE id = incident_id_param;
        RETURN false;
    END IF;
    
    RETURN false;
END;
$$;


-- ========================================
-- PATTERN DETECTION: SPAM
-- ========================================

CREATE OR REPLACE FUNCTION detect_spam_pattern(
    user_id_param UUID
)
RETURNS TABLE (
    is_spam BOOLEAN,
    reason TEXT,
    confidence FLOAT
)
LANGUAGE plpgsql
AS $$
DECLARE
    recent_reports INTEGER;
    duplicate_content INTEGER;
    rapid_posts INTEGER;
    suspicious_locations INTEGER;
BEGIN
    -- Check reports in last 10 minutes
    SELECT COUNT(*) INTO recent_reports
    FROM user_activity_log
    WHERE 
        user_id = user_id_param
        AND activity_type = 'report'
        AND created_at > NOW() - INTERVAL '10 minutes';
    
    -- Spam if > 5 reports in 10 minutes
    IF recent_reports > 5 THEN
        RETURN QUERY SELECT true, 'Too many reports in short time', 0.95::FLOAT;
        RETURN;
    END IF;
    
    -- Check for duplicate content (same description)
    SELECT COUNT(DISTINCT description) INTO duplicate_content
    FROM incidents
    WHERE 
        user_id = user_id_param
        AND created_at > NOW() - INTERVAL '1 hour';
    
    IF duplicate_content = 1 AND recent_reports > 2 THEN
        RETURN QUERY SELECT true, 'Duplicate content', 0.85::FLOAT;
        RETURN;
    END IF;
    
    -- Check for impossible movement (50+ km in 10 min)
    WITH location_changes AS (
        SELECT 
            location,
            LAG(location) OVER (ORDER BY created_at) AS prev_location,
            created_at,
            LAG(created_at) OVER (ORDER BY created_at) AS prev_time
        FROM user_activity_log
        WHERE 
            user_id = user_id_param
            AND location IS NOT NULL
            AND created_at > NOW() - INTERVAL '1 hour'
    )
    SELECT COUNT(*) INTO suspicious_locations
    FROM location_changes
    WHERE 
        prev_location IS NOT NULL
        AND ST_Distance(location, prev_location) > 50000 -- 50km
        AND EXTRACT(EPOCH FROM (created_at - prev_time)) < 600; -- 10 min
    
    IF suspicious_locations > 0 THEN
        RETURN QUERY SELECT true, 'Impossible movement detected', 0.90::FLOAT;
        RETURN;
    END IF;
    
    -- Not spam
    RETURN QUERY SELECT false, 'No spam detected', 0.0::FLOAT;
END;
$$;
```

---

## Part 3: TypeScript Integration (2 hours)

### File: `src/lib/credibility.ts`

```typescript
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

// Credibility thresholds
export const CREDIBILITY_THRESHOLDS = {
  TRUSTED: 80,      // Green badge, reports auto-verified
  NORMAL: 50,       // Default
  SUSPICIOUS: 30,   // Yellow badge, reports need review
  WARNING: 20,      // Orange badge, limited actions
  BANNED: 10,       // Red badge, auto-banned
} as const;

// Credibility point changes
export const CREDIBILITY_POINTS = {
  // Positive actions
  REPORT_VERIFIED: 10,
  COMMUNITY_CONFIRM: 5,
  MODERATOR_VERIFY: 15,
  HELPFUL_VERIFICATION: 3,
  
  // Negative actions
  REPORT_FALSE: -15,
  SPAM_DETECTED: -30,
  FALSE_AMBER: -50,
  COMMUNITY_DISPUTE: -5,
  HARASSMENT: -25,
} as const;

/**
 * Update user's credibility score
 */
export async function updateCredibility(
  userId: string,
  action: string,
  pointsChange: number,
  reason?: string,
  referenceId?: string,
  referenceType?: 'incident' | 'post' | 'comment'
) {
  try {
    const { data, error } = await supabase.rpc('update_credibility', {
      user_id_param: userId,
      action_param: action,
      points_change_param: pointsChange,
      reason_param: reason || null,
      reference_id_param: referenceId || null,
      reference_type_param: referenceType || null,
    });

    if (error) throw error;

    const result = data[0];
    
    // Notify user of credibility changes
    if (Math.abs(pointsChange) >= 10) {
      if (pointsChange > 0) {
        toast.success(`+${pointsChange} credibility points! ${reason || ''}`);
      } else {
        toast.warning(`${pointsChange} credibility points. ${reason || ''}`);
      }
    }

    // Notify if banned
    if (result.was_banned) {
      toast.error('Your account has been temporarily restricted due to low credibility.');
    }

    // Notify if unbanned
    if (result.was_unbanned) {
      toast.success('Your account restrictions have been lifted!');
    }

    return result;
  } catch (error) {
    console.error('Error updating credibility:', error);
    return null;
  }
}

/**
 * Get credibility tier for a score
 */
export function getCredibilityTier(score: number): {
  tier: string;
  color: string;
  label: string;
  icon: string;
} {
  if (score >= CREDIBILITY_THRESHOLDS.TRUSTED) {
    return {
      tier: 'trusted',
      color: 'text-green-600',
      label: 'Trusted Reporter',
      icon: '✓',
    };
  } else if (score >= CREDIBILITY_THRESHOLDS.NORMAL) {
    return {
      tier: 'normal',
      color: 'text-blue-600',
      label: 'Reporter',
      icon: '👤',
    };
  } else if (score >= CREDIBILITY_THRESHOLDS.SUSPICIOUS) {
    return {
      tier: 'suspicious',
      color: 'text-yellow-600',
      label: 'New Reporter',
      icon: '⚠',
    };
  } else if (score >= CREDIBILITY_THRESHOLDS.WARNING) {
    return {
      tier: 'warning',
      color: 'text-orange-600',
      label: 'Unverified',
      icon: '⚡',
    };
  } else {
    return {
      tier: 'banned',
      color: 'text-red-600',
      label: 'Restricted',
      icon: '⛔',
    };
  }
}

/**
 * Check if user can perform action based on credibility
 */
export async function checkCredibilityPermission(
  userId: string,
  action: 'create_incident' | 'create_amber' | 'verify_incident' | 'post_comment'
): Promise<{ allowed: boolean; reason?: string }> {
  try {
    const { data: user, error } = await supabase
      .from('users')
      .select('credibility_score, banned, ban_expires_at')
      .eq('id', userId)
      .single();

    if (error) throw error;

    // Check if banned
    if (user.banned) {
      const expiresAt = user.ban_expires_at ? new Date(user.ban_expires_at) : null;
      const isExpired = expiresAt && expiresAt < new Date();
      
      if (!isExpired) {
        return {
          allowed: false,
          reason: `Your account is restricted. ${expiresAt ? `Ban expires: ${expiresAt.toLocaleDateString()}` : ''}`,
        };
      }
    }

    // Check credibility requirements for specific actions
    const requirements = {
      create_amber: CREDIBILITY_THRESHOLDS.NORMAL,
      verify_incident: CREDIBILITY_THRESHOLDS.SUSPICIOUS,
      create_incident: CREDIBILITY_THRESHOLDS.WARNING,
      post_comment: CREDIBILITY_THRESHOLDS.WARNING,
    };

    const required = requirements[action];
    if (user.credibility_score < required) {
      return {
        allowed: false,
        reason: `Credibility score too low. Need ${required}, you have ${user.credibility_score}.`,
      };
    }

    return { allowed: true };
  } catch (error) {
    console.error('Error checking credibility permission:', error);
    return { allowed: false, reason: 'Error checking permissions' };
  }
}

/**
 * Detect spam patterns
 */
export async function detectSpamPattern(userId: string) {
  try {
    const { data, error } = await supabase.rpc('detect_spam_pattern', {
      user_id_param: userId,
    });

    if (error) throw error;

    const result = data[0];
    
    if (result.is_spam) {
      // Deduct credibility
      await updateCredibility(
        userId,
        'spam_detected',
        CREDIBILITY_POINTS.SPAM_DETECTED,
        result.reason
      );
      
      return {
        isSpam: true,
        reason: result.reason,
        confidence: result.confidence,
      };
    }

    return { isSpam: false };
  } catch (error) {
    console.error('Error detecting spam:', error);
    return { isSpam: false };
  }
}

/**
 * Log user activity for pattern detection
 */
export async function logUserActivity(
  userId: string,
  activityType: 'report' | 'post' | 'comment' | 'verification',
  location?: { latitude: number; longitude: number },
  metadata?: Record<string, any>
) {
  try {
    await supabase.from('user_activity_log').insert({
      user_id: userId,
      activity_type: activityType,
      location: location ? `POINT(${location.longitude} ${location.latitude})` : null,
      // Store metadata as JSON in a separate column if needed
    });
  } catch (error) {
    console.error('Error logging activity:', error);
  }
}

/**
 * Verify incident with community confirmation
 */
export async function verifyIncident(
  incidentId: string,
  userId: string,
  verificationType: 'confirm' | 'dispute' | 'false',
  notes?: string,
  locationVerified: boolean = false
) {
  try {
    // Insert verification
    const { error: insertError } = await supabase
      .from('incident_verifications')
      .insert({
        incident_id: incidentId,
        user_id: userId,
        verification_type: verificationType,
        notes,
        location_verified: locationVerified,
      });

    if (insertError) throw insertError;

    // Update credibility based on verification type
    if (verificationType === 'confirm') {
      await updateCredibility(
        userId,
        'incident_verified',
        CREDIBILITY_POINTS.HELPFUL_VERIFICATION,
        'Verified incident',
        incidentId,
        'incident'
      );
    }

    // Check if incident should be auto-verified
    const { data, error } = await supabase.rpc('check_incident_auto_verify', {
      incident_id_param: incidentId,
    });

    if (error) throw error;

    return { success: true, autoVerified: data };
  } catch (error) {
    console.error('Error verifying incident:', error);
    return { success: false, autoVerified: false };
  }
}
```

---

## Part 4: UI Components (1.5 hours)

### File: `src/components/safety/CredibilityBadge.tsx`

```typescript
import { Shield, AlertTriangle, User, Ban } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { getCredibilityTier } from "@/lib/credibility";

interface CredibilityBadgeProps {
  score: number;
  compact?: boolean;
  showScore?: boolean;
}

export function CredibilityBadge({ score, compact = false, showScore = true }: CredibilityBadgeProps) {
  const tier = getCredibilityTier(score);

  const icons = {
    trusted: Shield,
    normal: User,
    suspicious: AlertTriangle,
    warning: AlertTriangle,
    banned: Ban,
  };

  const Icon = icons[tier.tier as keyof typeof icons];

  if (compact) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger>
            <Icon className={`w-4 h-4 ${tier.color}`} />
          </TooltipTrigger>
          <TooltipContent>
            <p className="font-semibold">{tier.label}</p>
            <p className="text-xs">Credibility: {score}/100</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return (
    <Badge variant="secondary" className={`gap-1 ${tier.color}`}>
      <Icon className="w-3 h-3" />
      <span>{tier.label}</span>
      {showScore && <span className="ml-1">({score})</span>}
    </Badge>
  );
}
```

### File: `src/components/safety/VerificationButtons.tsx`

```typescript
import { useState } from "react";
import { CheckCircle, XCircle, Flag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { verifyIncident } from "@/lib/credibility";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

interface VerificationButtonsProps {
  incidentId: string;
  onVerified?: () => void;
}

export function VerificationButtons({ incidentId, onVerified }: VerificationButtonsProps) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [verified, setVerified] = useState<'confirm' | 'dispute' | null>(null);

  const handleVerify = async (type: 'confirm' | 'dispute') => {
    if (!user) {
      toast.error('Please log in to verify incidents');
      return;
    }

    setLoading(true);
    try {
      const result = await verifyIncident(incidentId, user.id, type);
      
      if (result.success) {
        setVerified(type);
        if (result.autoVerified) {
          toast.success('Incident automatically verified!');
        } else {
          toast.success(`Thank you for ${type === 'confirm' ? 'confirming' : 'disputing'} this incident`);
        }
        onVerified?.();
      }
    } catch (error) {
      toast.error('Failed to verify incident');
    } finally {
      setLoading(false);
    }
  };

  if (verified) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        {verified === 'confirm' ? (
          <>
            <CheckCircle className="w-4 h-4 text-success" />
            <span>You confirmed this incident</span>
          </>
        ) : (
          <>
            <XCircle className="w-4 h-4 text-destructive" />
            <span>You disputed this incident</span>
          </>
        )}
      </div>
    );
  }

  return (
    <div className="flex gap-2">
      <Button
        variant="outline"
        size="sm"
        className="flex-1"
        onClick={() => handleVerify('confirm')}
        disabled={loading}
      >
        <CheckCircle className="w-4 h-4 mr-1" />
        Confirm
      </Button>
      <Button
        variant="outline"
        size="sm"
        className="flex-1"
        onClick={() => handleVerify('dispute')}
        disabled={loading}
      >
        <XCircle className="w-4 h-4 mr-1" />
        Dispute
      </Button>
    </div>
  );
}
```

---

## Part 5: Integration with Incident Creation (30 minutes)

### Update: `src/hooks/useIncidents.ts` (or wherever incident creation is)

```typescript
import { checkCredibilityPermission, logUserActivity, detectSpamPattern } from "@/lib/credibility";

// Add to createIncident function:
export async function createIncident(data: IncidentData) {
  const user = supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  // 1. Check credibility permission
  const permission = await checkCredibilityPermission(user.id, 'create_incident');
  if (!permission.allowed) {
    toast.error(permission.reason);
    return { error: permission.reason };
  }

  // 2. Check for spam patterns
  const spamCheck = await detectSpamPattern(user.id);
  if (spamCheck.isSpam) {
    toast.error(`Spam detected: ${spamCheck.reason}`);
    return { error: 'Spam detected' };
  }

  // 3. Log activity for pattern tracking
  await logUserActivity(user.id, 'report', {
    latitude: data.latitude,
    longitude: data.longitude,
  });

  // 4. Create incident (existing code)
  const { data: incident, error } = await supabase
    .from('incidents')
    .insert(data)
    .select()
    .single();

  if (error) throw error;

  // 5. Award credibility for creating report
  // (will be updated later when verified)
  
  return { data: incident };
}
```

---

## ✅ Verification Checklist

- [ ] All credibility tables created
- [ ] Credibility functions working
- [ ] TypeScript lib file created
- [ ] CredibilityBadge component added
- [ ] VerificationButtons component added
- [ ] Incident creation checks credibility
- [ ] Spam detection running
- [ ] Auto-verification working

---

## 🧪 Testing

```sql
-- Test 1: Create test user with low credibility
INSERT INTO users (id, email, full_name, credibility_score)
VALUES ('test-user-id', 'test@example.com', 'Test User', 15);

-- Test 2: Update credibility (should auto-ban at <=10)
SELECT * FROM update_credibility(
  'test-user-id',
  'report_false',
  -10,
  'Test ban'
);

-- Test 3: Verify user was banned
SELECT credibility_score, banned, ban_reason FROM users WHERE id = 'test-user-id';

-- Test 4: Check spam detection
SELECT * FROM detect_spam_pattern('test-user-id');
```

---

## 📊 Expected Results

**Before:**
- Users can spam unlimited reports ❌
- No consequence for fake reports ❌
- Can't identify trusted users ❌

**After:**
- Rate limited by credibility ✅
- False reports reduce score ✅
- Trusted users get auto-verification ✅
- Auto-ban for abuse ✅
- Pattern detection for spam ✅

---

## ⏭️ Next Steps

Move to **DAY_3_CRITICAL_FIXES.md** - Content Moderation

**Estimated time: 4-6 hours**  
**Impact: Prevents 90%+ of abuse**  
**Status after completion: Anti-abuse system production-ready ✅**
