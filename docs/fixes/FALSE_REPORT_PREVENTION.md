# False Report Prevention System

## Overview
Multi-layered system to detect, prevent, and punish false incident reports while maintaining user trust.

---

## Layer 1: User Credibility Score

### Database Schema
```sql
-- Add to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS credibility_score INTEGER DEFAULT 50;
ALTER TABLE users ADD COLUMN IF NOT EXISTS total_reports INTEGER DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS verified_reports INTEGER DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS false_reports INTEGER DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_banned BOOLEAN DEFAULT false;
ALTER TABLE users ADD COLUMN IF NOT EXISTS ban_reason TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS ban_expires_at TIMESTAMP;

-- Create credibility history table
CREATE TABLE IF NOT EXISTS credibility_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  action TEXT NOT NULL, -- 'report_verified', 'report_false', 'community_flag', etc.
  points_change INTEGER NOT NULL,
  old_score INTEGER NOT NULL,
  new_score INTEGER NOT NULL,
  reason TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX credibility_history_user_idx ON credibility_history(user_id, created_at DESC);
```

### Credibility Score Rules

```typescript
// src/lib/credibilitySystem.ts

export const CREDIBILITY_ACTIONS = {
  // Positive actions
  REPORT_VERIFIED: 5,           // Another user confirms your report
  REPORT_AUTHORITY_VERIFIED: 10, // Moderator/authority confirms
  HELPFUL_COMMUNITY_POST: 2,     // Post gets 10+ helpful votes
  LONG_TERM_USER: 10,            // Active for 6+ months
  AMBER_VERIFIED: 15,            // Amber alert confirmed real
  
  // Negative actions
  REPORT_FALSE: -15,             // Report marked as false
  COMMUNITY_FLAGGED: -5,         // Community flags your content
  SPAM_DETECTED: -10,            // Automated spam detection
  INAPPROPRIATE_CONTENT: -20,    // Severe violation
  AMBER_FALSE: -50,              // False Amber alert (very serious)
};

export const CREDIBILITY_THRESHOLDS = {
  TRUSTED: 80,        // Verified badge, reports auto-approved
  NORMAL: 50,         // Default starting point
  REVIEW_QUEUE: 30,   // Reports go to moderation first
  WARNING: 20,        // User warned, limited posting
  AUTO_BAN: 10,       // Automatic temp ban
};

export async function updateCredibility(
  userId: string,
  action: keyof typeof CREDIBILITY_ACTIONS,
  reason?: string
) {
  const { data: user } = await supabase
    .from('users')
    .select('credibility_score')
    .eq('id', userId)
    .single();

  const pointsChange = CREDIBILITY_ACTIONS[action];
  const newScore = Math.max(0, Math.min(100, (user?.credibility_score || 50) + pointsChange));

  // Update user score
  await supabase
    .from('users')
    .update({ credibility_score: newScore })
    .eq('id', userId);

  // Log the change
  await supabase.from('credibility_history').insert({
    user_id: userId,
    action,
    points_change: pointsChange,
    old_score: user?.credibility_score || 50,
    new_score: newScore,
    reason,
  });

  // Check if action needed
  if (newScore <= CREDIBILITY_THRESHOLDS.AUTO_BAN) {
    await banUser(userId, 'Low credibility score', 7); // 7 day ban
  } else if (newScore <= CREDIBILITY_THRESHOLDS.WARNING) {
    await sendWarning(userId, 'Your credibility is low. Further violations may result in a ban.');
  }

  return newScore;
}

async function banUser(userId: string, reason: string, days: number) {
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + days);

  await supabase
    .from('users')
    .update({
      is_banned: true,
      ban_reason: reason,
      ban_expires_at: expiresAt.toISOString(),
    })
    .eq('id', userId);

  // Send notification
  await supabase.from('notifications').insert({
    user_id: userId,
    type: 'account_banned',
    title: 'Account Temporarily Suspended',
    message: `Your account has been suspended for ${days} days. Reason: ${reason}`,
  });
}
```

### Display Credibility Badge

```typescript
// src/components/safety/CredibilityBadge.tsx (enhance existing)

export function CredibilityBadge({ score, showDetails = false }: { score: number; showDetails?: boolean }) {
  const getBadgeConfig = (score: number) => {
    if (score >= 80) return { 
      label: 'Trusted', 
      color: 'text-green-600 bg-green-50', 
      icon: ShieldCheck 
    };
    if (score >= 50) return { 
      label: 'Member', 
      color: 'text-blue-600 bg-blue-50', 
      icon: Shield 
    };
    if (score >= 30) return { 
      label: 'New', 
      color: 'text-yellow-600 bg-yellow-50', 
      icon: ShieldAlert 
    };
    return { 
      label: 'Low Trust', 
      color: 'text-red-600 bg-red-50', 
      icon: ShieldX 
    };
  };

  const config = getBadgeConfig(score);
  const Icon = config.icon;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger>
          <Badge className={config.color}>
            <Icon className="w-3 h-3 mr-1" />
            {config.label}
            {showDetails && ` (${score})`}
          </Badge>
        </TooltipTrigger>
        <TooltipContent>
          <p>Credibility Score: {score}/100</p>
          <p className="text-xs text-muted-foreground mt-1">
            Based on report accuracy and community trust
          </p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
```

---

## Layer 2: Automated Verification

### Location Verification

```typescript
// src/lib/reportVerification.ts

export async function verifyReportLocation(
  reportLocation: { lat: number; lng: number },
  userLocation: { lat: number; lng: number }
): Promise<{ valid: boolean; reason?: string }> {
  const MAX_DISTANCE_KM = 1; // User must be within 1km of incident
  
  const distance = calculateDistance(reportLocation, userLocation);
  
  if (distance > MAX_DISTANCE_KM) {
    return {
      valid: false,
      reason: `You are ${distance.toFixed(1)}km from the reported location. You must be nearby to report incidents.`
    };
  }
  
  return { valid: true };
}

export function calculateDistance(
  point1: { lat: number; lng: number },
  point2: { lat: number; lng: number }
): number {
  const R = 6371; // Earth's radius in km
  const dLat = toRad(point2.lat - point1.lat);
  const dLon = toRad(point2.lng - point1.lng);
  
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(point1.lat)) *
    Math.cos(toRad(point2.lat)) *
    Math.sin(dLon / 2) *
    Math.sin(dLon / 2);
    
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function toRad(degrees: number): number {
  return degrees * (Math.PI / 180);
}
```

### Time Window Validation

```typescript
export function validateReportTime(
  reportedTime: Date,
  currentTime: Date = new Date()
): { valid: boolean; reason?: string } {
  const MAX_AGE_HOURS = 2; // Can only report incidents from last 2 hours
  const hoursDiff = (currentTime.getTime() - reportedTime.getTime()) / (1000 * 60 * 60);
  
  if (hoursDiff > MAX_AGE_HOURS) {
    return {
      valid: false,
      reason: `Incident is too old (${hoursDiff.toFixed(1)} hours ago). Reports must be recent.`
    };
  }
  
  if (reportedTime > currentTime) {
    return {
      valid: false,
      reason: 'Cannot report incidents in the future.'
    };
  }
  
  return { valid: true };
}
```

### Duplicate Detection

```typescript
// Detect if same incident already reported
export async function checkDuplicateReport(
  location: { lat: number; lng: number },
  incidentType: string,
  description: string
): Promise<{ isDuplicate: boolean; existingReportId?: string }> {
  const DUPLICATE_RADIUS_KM = 0.5; // 500 meters
  const DUPLICATE_TIME_WINDOW_MINS = 30;
  
  const recentTime = new Date();
  recentTime.setMinutes(recentTime.getMinutes() - DUPLICATE_TIME_WINDOW_MINS);
  
  const { data: nearbyReports } = await supabase.rpc('get_nearby_incidents', {
    lat: location.lat,
    lng: location.lng,
    radius_km: DUPLICATE_RADIUS_KM,
  });
  
  if (!nearbyReports) return { isDuplicate: false };
  
  // Check for similar incidents
  const duplicate = nearbyReports.find((report: any) => {
    const isSameType = report.incident_type === incidentType;
    const isRecent = new Date(report.created_at) >= recentTime;
    const isSimilarDescription = calculateSimilarity(description, report.description) > 0.7;
    
    return isSameType && isRecent && isSimilarDescription;
  });
  
  if (duplicate) {
    return { isDuplicate: true, existingReportId: duplicate.id };
  }
  
  return { isDuplicate: false };
}

// Simple text similarity check
function calculateSimilarity(text1: string, text2: string): number {
  const words1 = text1.toLowerCase().split(/\s+/);
  const words2 = text2.toLowerCase().split(/\s+/);
  
  const commonWords = words1.filter(word => words2.includes(word));
  const totalWords = new Set([...words1, ...words2]).size;
  
  return commonWords.length / totalWords;
}
```

---

## Layer 3: Community Verification

### Corroboration System

```sql
-- Create corroboration table
CREATE TABLE IF NOT EXISTS incident_corroborations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  incident_id UUID REFERENCES incidents(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  is_confirmed BOOLEAN NOT NULL, -- true = "I saw this too", false = "This is false"
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(incident_id, user_id) -- User can only corroborate once
);

CREATE INDEX corroborations_incident_idx ON incident_corroborations(incident_id);

-- Add verification status to incidents
ALTER TABLE incidents ADD COLUMN IF NOT EXISTS verification_status TEXT DEFAULT 'pending';
-- 'pending', 'community_verified', 'moderator_verified', 'disputed', 'false'

ALTER TABLE incidents ADD COLUMN IF NOT EXISTS confirmation_count INTEGER DEFAULT 0;
ALTER TABLE incidents ADD COLUMN IF NOT EXISTS dispute_count INTEGER DEFAULT 0;
```

```typescript
// src/hooks/useIncidentCorroboration.ts

export function useIncidentCorroboration(incidentId: string) {
  const { user } = useAuth();

  const corroborate = async (isConfirmed: boolean, notes?: string) => {
    // Check user is nearby
    const userLocation = await getCurrentLocation();
    const { data: incident } = await supabase
      .from('incidents')
      .select('location')
      .eq('id', incidentId)
      .single();

    const distance = calculateDistance(userLocation, incident.location);
    
    if (distance > 1) {
      toast.error('You must be near the incident to confirm or dispute it.');
      return;
    }

    // Record corroboration
    const { error } = await supabase
      .from('incident_corroborations')
      .insert({
        incident_id: incidentId,
        user_id: user.id,
        is_confirmed: isConfirmed,
        notes,
      });

    if (error) {
      toast.error('Failed to record your response.');
      return;
    }

    // Check if auto-verification threshold reached
    await checkAutoVerification(incidentId);

    toast.success(isConfirmed ? 'Thanks for confirming!' : 'Thanks for your feedback.');
  };

  return { corroborate };
}

async function checkAutoVerification(incidentId: string) {
  const { data: corroborations } = await supabase
    .from('incident_corroborations')
    .select('is_confirmed, user_id')
    .eq('incident_id', incidentId);

  if (!corroborations) return;

  const confirmations = corroborations.filter(c => c.is_confirmed).length;
  const disputes = corroborations.filter(c => !c.is_confirmed).length;

  let newStatus = 'pending';
  
  // Auto-verify if 3+ people confirm
  if (confirmations >= 3 && disputes === 0) {
    newStatus = 'community_verified';
    
    // Reward original reporter
    const { data: incident } = await supabase
      .from('incidents')
      .select('user_id')
      .eq('id', incidentId)
      .single();
    
    if (incident) {
      await updateCredibility(incident.user_id, 'REPORT_VERIFIED');
    }
  }
  
  // Mark as disputed if 2+ people dispute
  if (disputes >= 2) {
    newStatus = 'disputed';
    
    // Flag for moderator review
    await supabase.from('moderation_queue').insert({
      item_type: 'incident',
      item_id: incidentId,
      reason: 'Disputed by community',
    });
  }

  // Update incident status
  await supabase
    .from('incidents')
    .update({
      verification_status: newStatus,
      confirmation_count: confirmations,
      dispute_count: disputes,
    })
    .eq('id', incidentId);
}
```

### UI for Corroboration

```typescript
// Add to IncidentDetailsModal.tsx

<div className="border-t pt-4 mt-4">
  <h3 className="font-semibold mb-2">Can you confirm this incident?</h3>
  <p className="text-sm text-muted-foreground mb-3">
    Help verify reports by confirming what you see in your area.
  </p>
  
  <div className="flex gap-2">
    <Button
      variant="outline"
      onClick={() => corroborate(true)}
      className="flex-1"
    >
      <Check className="w-4 h-4 mr-2" />
      I see this too
    </Button>
    
    <Button
      variant="outline"
      onClick={() => corroborate(false)}
      className="flex-1"
    >
      <X className="w-4 h-4 mr-2" />
      This seems false
    </Button>
  </div>
  
  {incident.confirmation_count > 0 && (
    <p className="text-xs text-muted-foreground mt-2">
      {incident.confirmation_count} {incident.confirmation_count === 1 ? 'person has' : 'people have'} confirmed this
    </p>
  )}
</div>
```

---

## Layer 4: Pattern Detection

### Spam Detection

```typescript
// src/lib/spamDetection.ts

export async function detectSpam(userId: string, content: string): Promise<{
  isSpam: boolean;
  reason?: string;
}> {
  // Check 1: Rapid posting
  const recentPosts = await getRecentUserActivity(userId, 10); // Last 10 minutes
  
  if (recentPosts.length >= 5) {
    return { isSpam: true, reason: 'Too many posts in short time' };
  }
  
  // Check 2: Duplicate content
  const isDuplicate = recentPosts.some(post => 
    post.content.toLowerCase() === content.toLowerCase()
  );
  
  if (isDuplicate) {
    return { isSpam: true, reason: 'Duplicate content' };
  }
  
  // Check 3: Spam keywords
  const spamKeywords = [
    'click here', 'buy now', 'limited time', 'act fast',
    'winner', 'congratulations', 'free money', 'easy cash'
  ];
  
  const lowerContent = content.toLowerCase();
  const hasSpamKeywords = spamKeywords.some(keyword => lowerContent.includes(keyword));
  
  if (hasSpamKeywords) {
    return { isSpam: true, reason: 'Contains spam keywords' };
  }
  
  // Check 4: Excessive links
  const urlCount = (content.match(/https?:\/\//g) || []).length;
  if (urlCount > 2) {
    return { isSpam: true, reason: 'Too many links' };
  }
  
  return { isSpam: false };
}

async function getRecentUserActivity(userId: string, minutes: number) {
  const since = new Date();
  since.setMinutes(since.getMinutes() - minutes);
  
  const { data } = await supabase
    .from('community_posts')
    .select('content, created_at')
    .eq('user_id', userId)
    .gte('created_at', since.toISOString())
    .order('created_at', { ascending: false });
  
  return data || [];
}
```

### Impossible Activity Detection

```typescript
// Detect if user reports from impossible locations
export async function detectImpossibleActivity(
  userId: string,
  newLocation: { lat: number; lng: number }
): Promise<{ suspicious: boolean; reason?: string }> {
  const { data: lastActivity } = await supabase
    .from('user_activity_log')
    .select('location, created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(1)
    .single();
  
  if (!lastActivity) return { suspicious: false };
  
  const timeDiffMinutes = (Date.now() - new Date(lastActivity.created_at).getTime()) / (1000 * 60);
  const distance = calculateDistance(lastActivity.location, newLocation);
  
  // If user traveled more than 50km in less than 10 minutes, suspicious
  if (distance > 50 && timeDiffMinutes < 10) {
    return {
      suspicious: true,
      reason: `Impossible travel: ${distance.toFixed(0)}km in ${timeDiffMinutes.toFixed(0)} minutes`
    };
  }
  
  return { suspicious: false };
}

// Log all user activities for pattern analysis
export async function logUserActivity(userId: string, action: string, location: any, metadata?: any) {
  await supabase.from('user_activity_log').insert({
    user_id: userId,
    action,
    location,
    metadata,
  });
}
```

---

## Layer 5: Moderator Tools

### Moderation Queue

```sql
CREATE TABLE IF NOT EXISTS moderation_queue (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  item_type TEXT NOT NULL, -- 'incident', 'post', 'comment', 'user'
  item_id UUID NOT NULL,
  reason TEXT NOT NULL,
  flagged_by UUID REFERENCES users(id),
  status TEXT DEFAULT 'pending', -- 'pending', 'approved', 'removed', 'banned'
  reviewed_by UUID REFERENCES users(id),
  reviewed_at TIMESTAMP,
  moderator_notes TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX moderation_queue_status_idx ON moderation_queue(status, created_at DESC);
```

### Quick Actions

```typescript
// src/hooks/useModerationActions.ts

export function useModerationActions() {
  const approveReport = async (incidentId: string, moderatorNotes?: string) => {
    await supabase
      .from('incidents')
      .update({ verification_status: 'moderator_verified' })
      .eq('id', incidentId);
    
    const { data: incident } = await supabase
      .from('incidents')
      .select('user_id')
      .eq('id', incidentId)
      .single();
    
    if (incident) {
      await updateCredibility(incident.user_id, 'REPORT_AUTHORITY_VERIFIED');
    }
    
    await markQueueItemResolved(incidentId, 'approved', moderatorNotes);
  };

  const markAsFalse = async (incidentId: string, moderatorNotes?: string) => {
    await supabase
      .from('incidents')
      .update({ 
        verification_status: 'false',
        status: 'resolved'
      })
      .eq('id', incidentId);
    
    const { data: incident } = await supabase
      .from('incidents')
      .select('user_id')
      .eq('id', incidentId)
      .single();
    
    if (incident) {
      await updateCredibility(incident.user_id, 'REPORT_FALSE');
      
      // Send warning to user
      await supabase.from('notifications').insert({
        user_id: incident.user_id,
        type: 'warning',
        title: 'False Report Detected',
        message: 'Your report was marked as false. Repeated false reports may result in account suspension.',
      });
    }
    
    await markQueueItemResolved(incidentId, 'removed', moderatorNotes);
  };

  const banUser = async (userId: string, reason: string, days: number) => {
    // Implementation from credibilitySystem.ts
  };

  return { approveReport, markAsFalse, banUser };
}
```

---

## Automated Actions

### Daily Cleanup Job

```typescript
// supabase/functions/daily-cleanup/index.ts

Deno.serve(async (req) => {
  // 1. Unban users whose ban expired
  await supabase
    .from('users')
    .update({ is_banned: false, ban_reason: null, ban_expires_at: null })
    .eq('is_banned', true)
    .lt('ban_expires_at', new Date().toISOString());

  // 2. Auto-resolve old pending reports (7 days old)
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  
  await supabase
    .from('moderation_queue')
    .update({ status: 'auto_resolved' })
    .eq('status', 'pending')
    .lt('created_at', sevenDaysAgo.toISOString());

  // 3. Restore credibility for reformed users
  const { data: lowCredUsers } = await supabase
    .from('users')
    .select('id, credibility_score')
    .lt('credibility_score', 50)
    .eq('is_banned', false);
  
  for (const user of lowCredUsers || []) {
    // Check if user has been good for 30 days
    const { data: recentFlags } = await supabase
      .from('moderation_queue')
      .select('id')
      .eq('item_id', user.id)
      .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString());
    
    if (recentFlags?.length === 0) {
      // Restore 5 points for good behavior
      await updateCredibility(user.id, 'HELPFUL_COMMUNITY_POST', 'Good behavior for 30 days');
    }
  }

  return new Response(JSON.stringify({ success: true }), {
    headers: { 'Content-Type': 'application/json' },
  });
});
```

---

## User Education

### First Report Flow

```typescript
// Show this dialog on user's first incident report

<AlertDialog open={isFirstReport}>
  <AlertDialogContent>
    <AlertDialogHeader>
      <AlertDialogTitle>Report Responsibly</AlertDialogTitle>
      <AlertDialogDescription>
        <div className="space-y-3 text-left">
          <p>Your credibility score is <strong>50/100</strong>.</p>
          
          <div className="space-y-2">
            <h4 className="font-semibold text-sm">Your score goes UP when:</h4>
            <ul className="text-sm list-disc pl-5 space-y-1">
              <li>Others confirm your reports (+5 points)</li>
              <li>Moderators verify your reports (+10 points)</li>
              <li>You're an active, helpful member (+2 points)</li>
            </ul>
          </div>
          
          <div className="space-y-2">
            <h4 className="font-semibold text-sm text-destructive">Your score goes DOWN when:</h4>
            <ul className="text-sm list-disc pl-5 space-y-1">
              <li>You submit false reports (-15 points)</li>
              <li>Community flags your content (-5 points)</li>
              <li>You spam or post inappropriate content (-10 points)</li>
            </ul>
          </div>
          
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Important</AlertTitle>
            <AlertDescription className="text-xs">
              If your score drops below 10, you'll be temporarily banned.
              Always report accurately and honestly.
            </AlertDescription>
          </Alert>
        </div>
      </AlertDialogDescription>
    </AlertDialogHeader>
    <AlertDialogFooter>
      <AlertDialogAction onClick={() => setIsFirstReport(false)}>
        I Understand
      </AlertDialogAction>
    </AlertDialogFooter>
  </AlertDialogContent>
</AlertDialog>
```

---

## Metrics Dashboard

Track effectiveness of false report system:

```sql
-- Create analytics view
CREATE OR REPLACE VIEW false_report_analytics AS
SELECT
  DATE(created_at) as date,
  COUNT(*) as total_reports,
  SUM(CASE WHEN verification_status = 'false' THEN 1 ELSE 0 END) as false_reports,
  SUM(CASE WHEN verification_status IN ('community_verified', 'moderator_verified') THEN 1 ELSE 0 END) as verified_reports,
  ROUND(
    100.0 * SUM(CASE WHEN verification_status = 'false' THEN 1 ELSE 0 END) / COUNT(*),
    2
  ) as false_report_percentage
FROM incidents
GROUP BY DATE(created_at)
ORDER BY date DESC;
```

Display in admin dashboard:
- False report rate (target: <5%)
- Average credibility score
- Top reporters (most verified reports)
- Problem users (most false reports)
- Moderation queue length
- Response time to flags
