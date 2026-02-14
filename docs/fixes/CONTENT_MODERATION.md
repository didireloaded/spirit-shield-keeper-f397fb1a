# Content Moderation System

## Overview
Automated and manual content moderation for community posts, comments, and user-generated content.

---

## Layer 1: Automated Filtering

### Profanity & Inappropriate Content Filter

```typescript
// src/lib/contentModeration.ts

// Namibian context + common inappropriate terms
const BANNED_WORDS = [
  // Add Namibian-specific inappropriate terms
  // Add racial slurs
  // Add profanity
  // Keep this list in a separate secure config file
];

const FLAGGED_WORDS = [
  'kill', 'murder', 'rape', 'assault', 'bomb', 'gun', 'weapon',
  'drugs', 'cocaine', 'heroin', 'meth',
  // Political inflammatory terms
  // Scam-related terms
];

export interface ModerationResult {
  approved: boolean;
  action: 'allow' | 'flag' | 'block';
  reason?: string;
  flaggedWords?: string[];
  confidence: number;
}

export function moderateText(content: string): ModerationResult {
  const lowerContent = content.toLowerCase();
  
  // Check for banned words - instant reject
  for (const word of BANNED_WORDS) {
    if (lowerContent.includes(word.toLowerCase())) {
      return {
        approved: false,
        action: 'block',
        reason: 'Contains prohibited content',
        confidence: 1.0,
      };
    }
  }
  
  // Check for flagged words - send to review
  const foundFlaggedWords: string[] = [];
  for (const word of FLAGGED_WORDS) {
    if (lowerContent.includes(word.toLowerCase())) {
      foundFlaggedWords.push(word);
    }
  }
  
  if (foundFlaggedWords.length > 0) {
    return {
      approved: false,
      action: 'flag',
      reason: 'Contains potentially concerning content',
      flaggedWords: foundFlaggedWords,
      confidence: 0.7,
    };
  }
  
  // Check for masked profanity (f**k, sh1t, etc.)
  if (detectMaskedProfanity(content)) {
    return {
      approved: false,
      action: 'block',
      reason: 'Attempted to bypass content filter',
      confidence: 0.8,
    };
  }
  
  return {
    approved: true,
    action: 'allow',
    confidence: 1.0,
  };
}

function detectMaskedProfanity(content: string): boolean {
  const patterns = [
    /f[\*u@#]{1,2}k/i,
    /sh[\*i1!]{1,2}t/i,
    /b[\*i1!]{1,2}tch/i,
    /d[\*a@]{1,2}mn/i,
    /h[\*e3]{1,2}ll/i,
  ];
  
  return patterns.some(pattern => pattern.test(content));
}
```

### Personal Information Detection

```typescript
// Prevent doxxing and privacy violations
export function detectPersonalInfo(content: string): {
  hasPII: boolean;
  types: string[];
  redacted: string;
} {
  const types: string[] = [];
  let redacted = content;
  
  // Phone numbers (Namibian format: +264 or 0)
  const phoneRegex = /(\+264|0)\s?\d{2}\s?\d{3}\s?\d{4}/g;
  if (phoneRegex.test(content)) {
    types.push('phone_number');
    redacted = redacted.replace(phoneRegex, '[PHONE NUMBER REMOVED]');
  }
  
  // Email addresses
  const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
  if (emailRegex.test(content)) {
    types.push('email');
    redacted = redacted.replace(emailRegex, '[EMAIL REMOVED]');
  }
  
  // ID numbers (Namibian ID format: 11 digits)
  const idRegex = /\b\d{11}\b/g;
  if (idRegex.test(content)) {
    types.push('id_number');
    redacted = redacted.replace(idRegex, '[ID NUMBER REMOVED]');
  }
  
  // Physical addresses (basic detection)
  const addressKeywords = ['street', 'str', 'avenue', 'ave', 'road', 'rd', 'plot', 'erf'];
  const hasAddress = addressKeywords.some(keyword => 
    content.toLowerCase().includes(keyword) && /\d+/.test(content)
  );
  
  if (hasAddress) {
    types.push('possible_address');
  }
  
  // URLs (except whitelisted domains)
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  if (urlRegex.test(content)) {
    types.push('external_link');
    redacted = redacted.replace(urlRegex, '[LINK REMOVED]');
  }
  
  return {
    hasPII: types.length > 0,
    types,
    redacted,
  };
}
```

### Spam Detection

```typescript
export function detectSpamPatterns(content: string, userId: string): {
  isSpam: boolean;
  patterns: string[];
  confidence: number;
} {
  const patterns: string[] = [];
  
  // All caps (>70% of message)
  const capsRatio = (content.match(/[A-Z]/g) || []).length / content.length;
  if (capsRatio > 0.7 && content.length > 10) {
    patterns.push('excessive_caps');
  }
  
  // Excessive punctuation
  const punctuationRatio = (content.match(/[!?]{2,}/g) || []).length;
  if (punctuationRatio > 3) {
    patterns.push('excessive_punctuation');
  }
  
  // Repeated characters (aaaaaaa, !!!!!!)
  if (/(.)\1{4,}/.test(content)) {
    patterns.push('repeated_characters');
  }
  
  // Too many emojis
  const emojiCount = (content.match(/[\u{1F600}-\u{1F64F}]/gu) || []).length;
  if (emojiCount > 10) {
    patterns.push('excessive_emojis');
  }
  
  // Copy-paste spam (very short repeated messages)
  if (content.length < 20 && content.split(' ').length < 4) {
    patterns.push('short_repetitive');
  }
  
  // Marketing keywords
  const marketingKeywords = [
    'click here', 'buy now', 'limited time', 'act fast', 'don\'t miss',
    'free money', 'easy cash', 'make money fast', 'work from home',
    'winner', 'congratulations', 'you won', 'claim now',
  ];
  
  const hasMarketing = marketingKeywords.some(keyword => 
    content.toLowerCase().includes(keyword)
  );
  
  if (hasMarketing) {
    patterns.push('marketing_language');
  }
  
  const isSpam = patterns.length >= 2; // 2+ spam indicators = spam
  const confidence = Math.min(patterns.length * 0.3, 1.0);
  
  return { isSpam, patterns, confidence };
}
```

### Combined Content Check

```typescript
export async function checkContent(
  content: string,
  userId: string,
  contentType: 'post' | 'comment' | 'incident'
): Promise<{
  approved: boolean;
  action: 'allow' | 'flag' | 'block';
  reason?: string;
  modifications?: string; // Redacted version
}> {
  // 1. Check profanity
  const profanityCheck = moderateText(content);
  if (profanityCheck.action === 'block') {
    await logModerationAction(userId, 'content_blocked', profanityCheck.reason);
    await updateCredibility(userId, 'INAPPROPRIATE_CONTENT');
    return {
      approved: false,
      action: 'block',
      reason: 'Your message contains inappropriate content.',
    };
  }
  
  // 2. Check for personal info
  const piiCheck = detectPersonalInfo(content);
  if (piiCheck.hasPII) {
    // Auto-redact and flag for review
    await supabase.from('moderation_queue').insert({
      item_type: contentType,
      user_id: userId,
      content: content,
      reason: `Contains personal information: ${piiCheck.types.join(', ')}`,
    });
    
    return {
      approved: false,
      action: 'flag',
      reason: 'Your message contains personal information that has been removed for privacy.',
      modifications: piiCheck.redacted,
    };
  }
  
  // 3. Check for spam
  const spamCheck = detectSpamPatterns(content, userId);
  if (spamCheck.isSpam) {
    await logModerationAction(userId, 'spam_detected', spamCheck.patterns.join(', '));
    await updateCredibility(userId, 'SPAM_DETECTED');
    return {
      approved: false,
      action: 'block',
      reason: 'Your message appears to be spam.',
    };
  }
  
  // 4. Check if user has low credibility
  const { data: user } = await supabase
    .from('users')
    .select('credibility_score, is_banned')
    .eq('id', userId)
    .single();
  
  if (user?.is_banned) {
    return {
      approved: false,
      action: 'block',
      reason: 'Your account is suspended.',
    };
  }
  
  // Low credibility users go to moderation queue
  if (user && user.credibility_score < 30) {
    await supabase.from('moderation_queue').insert({
      item_type: contentType,
      user_id: userId,
      content: content,
      reason: 'User has low credibility score',
    });
    
    return {
      approved: false,
      action: 'flag',
      reason: 'Your post is being reviewed by moderators.',
    };
  }
  
  // If flagged words but not blocked
  if (profanityCheck.action === 'flag') {
    await supabase.from('moderation_queue').insert({
      item_type: contentType,
      user_id: userId,
      content: content,
      reason: `Flagged words: ${profanityCheck.flaggedWords?.join(', ')}`,
    });
    
    return {
      approved: false,
      action: 'flag',
      reason: 'Your post is being reviewed by moderators.',
    };
  }
  
  return {
    approved: true,
    action: 'allow',
  };
}

async function logModerationAction(userId: string, action: string, details: string) {
  await supabase.from('moderation_log').insert({
    user_id: userId,
    action,
    details,
  });
}
```

---

## Layer 2: Image Moderation

### Basic Image Checks

```typescript
export function validateImage(file: File): {
  valid: boolean;
  reason?: string;
} {
  const MAX_SIZE = 10 * 1024 * 1024; // 10MB
  const ALLOWED_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
  
  if (file.size > MAX_SIZE) {
    return {
      valid: false,
      reason: 'Image is too large. Maximum size is 10MB.',
    };
  }
  
  if (!ALLOWED_TYPES.includes(file.type)) {
    return {
      valid: false,
      reason: 'Invalid image type. Please use JPG, PNG, or WebP.',
    };
  }
  
  return { valid: true };
}

// Hash images to detect duplicates (prevent spam)
export async function getImageHash(file: File): Promise<string> {
  const arrayBuffer = await file.arrayBuffer();
  const hashBuffer = await crypto.subtle.digest('SHA-256', arrayBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  return hashHex;
}

export async function checkDuplicateImage(hash: string, userId: string): Promise<boolean> {
  const { data } = await supabase
    .from('uploaded_images')
    .select('id')
    .eq('image_hash', hash)
    .eq('user_id', userId)
    .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());
  
  return (data?.length || 0) > 0;
}
```

### Advanced: AI Image Moderation (Future Enhancement)

```typescript
// If you want to add AI-based image moderation later
// You can use services like AWS Rekognition, Google Vision, or Cloudflare Images

export async function moderateImageAI(imageUrl: string): Promise<{
  safe: boolean;
  categories: string[];
  confidence: number;
}> {
  // Example using a hypothetical AI service
  // const response = await fetch('https://api.moderationservice.com/analyze', {
  //   method: 'POST',
  //   body: JSON.stringify({ image_url: imageUrl }),
  //   headers: { 'Authorization': `Bearer ${API_KEY}` },
  // });
  // 
  // const result = await response.json();
  // 
  // return {
  //   safe: !result.categories.includes('violence', 'nudity', 'weapons'),
  //   categories: result.categories,
  //   confidence: result.confidence,
  // };
  
  // For now, return safe (manual moderation only)
  return { safe: true, categories: [], confidence: 1.0 };
}
```

---

## Layer 3: Community Reporting

### Flag System

```sql
CREATE TABLE IF NOT EXISTS content_flags (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  content_type TEXT NOT NULL, -- 'post', 'comment', 'incident', 'user'
  content_id UUID NOT NULL,
  flagged_by UUID REFERENCES users(id) ON DELETE CASCADE,
  reason TEXT NOT NULL,
  additional_info TEXT,
  status TEXT DEFAULT 'pending', -- 'pending', 'reviewed', 'dismissed'
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(content_type, content_id, flagged_by) -- Can't flag same content twice
);

CREATE INDEX content_flags_status_idx ON content_flags(status, created_at DESC);
CREATE INDEX content_flags_content_idx ON content_flags(content_type, content_id);
```

```typescript
// src/hooks/useContentFlag.ts

export function useContentFlag() {
  const { user } = useAuth();

  const flagContent = async (
    contentType: 'post' | 'comment' | 'incident' | 'user',
    contentId: string,
    reason: string,
    additionalInfo?: string
  ) => {
    // Insert flag
    const { error: flagError } = await supabase
      .from('content_flags')
      .insert({
        content_type: contentType,
        content_id: contentId,
        flagged_by: user.id,
        reason,
        additional_info: additionalInfo,
      });
    
    if (flagError) {
      if (flagError.code === '23505') { // Unique constraint violation
        toast.info('You have already flagged this content.');
      } else {
        toast.error('Failed to flag content.');
      }
      return;
    }
    
    // Check if auto-hide threshold reached
    const { data: flags } = await supabase
      .from('content_flags')
      .select('id')
      .eq('content_type', contentType)
      .eq('content_id', contentId)
      .eq('status', 'pending');
    
    // If 3+ flags, auto-hide and add to moderation queue
    if (flags && flags.length >= 3) {
      await autoHideContent(contentType, contentId);
      await addToModerationQueue(contentType, contentId, 'Multiple user flags');
      
      // Penalize content creator
      const { data: content } = await supabase
        .from(getTableName(contentType))
        .select('user_id')
        .eq('id', contentId)
        .single();
      
      if (content) {
        await updateCredibility(content.user_id, 'COMMUNITY_FLAGGED');
      }
    }
    
    toast.success('Thank you for reporting. Our team will review this.');
  };

  return { flagContent };
}

function getTableName(contentType: string): string {
  const mapping: Record<string, string> = {
    post: 'community_posts',
    comment: 'comments',
    incident: 'incidents',
    user: 'users',
  };
  return mapping[contentType];
}

async function autoHideContent(contentType: string, contentId: string) {
  await supabase
    .from(getTableName(contentType))
    .update({ is_hidden: true, hidden_reason: 'Multiple user flags' })
    .eq('id', contentId);
}

async function addToModerationQueue(
  contentType: string,
  contentId: string,
  reason: string
) {
  await supabase.from('moderation_queue').insert({
    item_type: contentType,
    item_id: contentId,
    reason,
  });
}
```

### Flag Dialog UI

```typescript
// src/components/FlagContentDialog.tsx

export function FlagContentDialog({ 
  contentType, 
  contentId, 
  isOpen, 
  onClose 
}: {
  contentType: 'post' | 'comment' | 'incident';
  contentId: string;
  isOpen: boolean;
  onClose: () => void;
}) {
  const [reason, setReason] = useState('');
  const [details, setDetails] = useState('');
  const { flagContent } = useContentFlag();

  const flagReasons = [
    'Spam or misleading',
    'Harassment or hate speech',
    'Violence or dangerous content',
    'False information',
    'Privacy violation',
    'Inappropriate content',
    'Other',
  ];

  const handleSubmit = async () => {
    if (!reason) {
      toast.error('Please select a reason');
      return;
    }
    
    await flagContent(contentType, contentId, reason, details);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Report Content</DialogTitle>
          <DialogDescription>
            Help us keep the community safe. Your report is anonymous.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          <div>
            <Label>What's wrong with this content?</Label>
            <RadioGroup value={reason} onValueChange={setReason}>
              {flagReasons.map((r) => (
                <div key={r} className="flex items-center space-x-2">
                  <RadioGroupItem value={r} id={r} />
                  <Label htmlFor={r}>{r}</Label>
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
              placeholder="Provide more context to help moderators..."
              rows={3}
            />
          </div>
        </div>
        
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSubmit}>
            Submit Report
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
```

---

## Layer 4: Moderator Dashboard

### Moderation Queue View

```typescript
// src/pages/ModeratorDashboard.tsx

export default function ModeratorDashboard() {
  const { user } = useAuth();
  const [queueItems, setQueueItems] = useState<any[]>([]);
  const [filter, setFilter] = useState<'all' | 'posts' | 'incidents' | 'users'>('all');

  useEffect(() => {
    loadQueue();
  }, [filter]);

  const loadQueue = async () => {
    let query = supabase
      .from('moderation_queue')
      .select(`
        *,
        flagged_user:users!moderation_queue_item_id_fkey(username, email),
        flagged_by_user:users!moderation_queue_flagged_by_fkey(username)
      `)
      .eq('status', 'pending')
      .order('created_at', { ascending: false });
    
    if (filter !== 'all') {
      query = query.eq('item_type', filter.slice(0, -1)); // 'posts' -> 'post'
    }
    
    const { data } = await query;
    setQueueItems(data || []);
  };

  return (
    <div className="container mx-auto py-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Moderation Queue</h1>
        <div className="flex gap-2">
          <Badge variant={queueItems.length > 10 ? 'destructive' : 'secondary'}>
            {queueItems.length} pending
          </Badge>
        </div>
      </div>
      
      <Tabs value={filter} onValueChange={(v) => setFilter(v as any)}>
        <TabsList>
          <TabsTrigger value="all">All</TabsTrigger>
          <TabsTrigger value="posts">Posts</TabsTrigger>
          <TabsTrigger value="incidents">Incidents</TabsTrigger>
          <TabsTrigger value="users">Users</TabsTrigger>
        </TabsList>
        
        <TabsContent value={filter} className="mt-6">
          <div className="space-y-4">
            {queueItems.map((item) => (
              <ModerationQueueItem 
                key={item.id} 
                item={item} 
                onResolved={loadQueue}
              />
            ))}
            
            {queueItems.length === 0 && (
              <Card className="p-8 text-center">
                <p className="text-muted-foreground">No items in queue</p>
              </Card>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
```

### Moderation Queue Item Component

```typescript
function ModerationQueueItem({ item, onResolved }: any) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [notes, setNotes] = useState('');
  const { approveContent, removeContent, banUser } = useModerationActions();

  const handleApprove = async () => {
    await approveContent(item.item_type, item.item_id, notes);
    toast.success('Content approved');
    onResolved();
  };

  const handleRemove = async () => {
    await removeContent(item.item_type, item.item_id, notes);
    toast.success('Content removed');
    onResolved();
  };

  const handleBan = async () => {
    if (confirm('Are you sure you want to ban this user for 7 days?')) {
      await banUser(item.flagged_user.id, notes || 'Multiple violations', 7);
      toast.success('User banned for 7 days');
      onResolved();
    }
  };

  return (
    <Card>
      <CardHeader className="cursor-pointer" onClick={() => setIsExpanded(!isExpanded)}>
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <Badge>{item.item_type}</Badge>
              <span className="text-sm text-muted-foreground">
                {formatDistanceToNow(new Date(item.created_at), { addSuffix: true })}
              </span>
            </div>
            <CardTitle className="text-base">{item.reason}</CardTitle>
            <CardDescription>
              By: {item.flagged_user?.username || 'Unknown'}
              {item.flagged_by_user && ` • Reported by: ${item.flagged_by_user.username}`}
            </CardDescription>
          </div>
          <ChevronDown 
            className={`w-5 h-5 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
          />
        </div>
      </CardHeader>
      
      {isExpanded && (
        <CardContent>
          {/* Load and display the actual content */}
          <ContentPreview type={item.item_type} id={item.item_id} />
          
          <div className="mt-4 space-y-4">
            <div>
              <Label htmlFor="notes">Moderator Notes</Label>
              <Textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Add notes about your decision..."
                rows={2}
              />
            </div>
            
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                className="text-green-600"
                onClick={handleApprove}
              >
                <Check className="w-4 h-4 mr-2" />
                Approve
              </Button>
              
              <Button 
                variant="outline" 
                className="text-red-600"
                onClick={handleRemove}
              >
                <X className="w-4 h-4 mr-2" />
                Remove
              </Button>
              
              <Button 
                variant="destructive"
                onClick={handleBan}
              >
                <Ban className="w-4 h-4 mr-2" />
                Ban User (7d)
              </Button>
            </div>
          </div>
        </CardContent>
      )}
    </Card>
  );
}
```

---

## Layer 5: Automated Rules

### Auto-Actions Based on Triggers

```sql
-- Create triggers table
CREATE TABLE IF NOT EXISTS moderation_triggers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  trigger_type TEXT NOT NULL, -- 'credibility_drop', 'multiple_flags', 'rapid_posting'
  action TEXT NOT NULL, -- 'warn', 'restrict', 'ban', 'flag'
  threshold INTEGER, -- Numeric threshold if applicable
  duration_days INTEGER, -- For bans
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Insert default triggers
INSERT INTO moderation_triggers (trigger_type, action, threshold, duration_days) VALUES
('credibility_below', 'warn', 20, NULL),
('credibility_below', 'ban', 10, 7),
('flags_received', 'restrict', 3, NULL),
('rapid_posts', 'restrict', 5, NULL);
```

### Trigger Functions

```typescript
// supabase/functions/check-moderation-triggers/index.ts

Deno.serve(async (req) => {
  const { userId, event } = await req.json();
  
  const { data: user } = await supabase
    .from('users')
    .select('credibility_score, is_restricted, is_banned')
    .eq('id', userId)
    .single();
  
  const { data: triggers } = await supabase
    .from('moderation_triggers')
    .select('*')
    .eq('is_active', true);
  
  for (const trigger of triggers || []) {
    switch (trigger.trigger_type) {
      case 'credibility_below':
        if (user.credibility_score <= trigger.threshold) {
          await executeTriggerAction(userId, trigger);
        }
        break;
        
      case 'flags_received':
        const { count } = await supabase
          .from('content_flags')
          .select('*', { count: 'exact', head: true })
          .eq('flagged_by', userId)
          .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());
        
        if (count && count >= trigger.threshold) {
          await executeTriggerAction(userId, trigger);
        }
        break;
    }
  }
  
  return new Response(JSON.stringify({ success: true }));
});

async function executeTriggerAction(userId: string, trigger: any) {
  switch (trigger.action) {
    case 'warn':
      await supabase.from('notifications').insert({
        user_id: userId,
        type: 'warning',
        title: 'Warning',
        message: 'Your account activity has triggered our moderation system. Please review our community guidelines.',
      });
      break;
      
    case 'restrict':
      await supabase
        .from('users')
        .update({ is_restricted: true })
        .eq('id', userId);
      break;
      
    case 'ban':
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + trigger.duration_days);
      
      await supabase
        .from('users')
        .update({
          is_banned: true,
          ban_reason: 'Automatic moderation',
          ban_expires_at: expiresAt.toISOString(),
        })
        .eq('id', userId);
      break;
  }
}
```

---

## Best Practices

### For Users
1. **Report, don't engage** - If you see inappropriate content, flag it. Don't argue.
2. **Be specific** - When flagging, provide details to help moderators.
3. **Respect privacy** - Don't share personal info (yours or others').
4. **Stay on topic** - Community posts should be safety-related.

### For Moderators
1. **Be consistent** - Apply rules uniformly.
2. **Document decisions** - Always add notes explaining your action.
3. **Escalate when unsure** - If uncertain, ask senior moderators.
4. **Response time** - Aim to review flagged content within 2 hours.
5. **Second chances** - Warning before banning (unless severe).

### Moderation Guidelines

Create a separate document for moderators: `MODERATION_GUIDELINES.md`

**Remove immediately:**
- Hate speech, threats, harassment
- Graphic violence or gore
- Sexual content
- Scams or fraud attempts
- Doxxing (sharing personal info)

**Flag for review:**
- Political content (case by case)
- Disputed facts (verify first)
- Borderline inappropriate language
- User with low credibility but not obviously wrong

**Warnings (don't remove):**
- Minor profanity
- Off-topic but harmless
- Duplicate posts (accidental)

---

## Monitoring & Metrics

Track these metrics:

```sql
-- Daily moderation stats
SELECT
  DATE(created_at) as date,
  COUNT(*) as total_flags,
  SUM(CASE WHEN status = 'approved' THEN 1 ELSE 0 END) as approved,
  SUM(CASE WHEN status = 'removed' THEN 1 ELSE 0 END) as removed,
  AVG(EXTRACT(EPOCH FROM (reviewed_at - created_at))/3600) as avg_response_hours
FROM moderation_queue
WHERE created_at >= NOW() - INTERVAL '30 days'
GROUP BY DATE(created_at)
ORDER BY date DESC;
```

Display in admin dashboard:
- Moderation queue length
- Average response time
- False positive rate (approved after flagging)
- Top flaggers (users who report most)
- Top offenders (users who get flagged most)
- Content removal reasons (breakdown)
