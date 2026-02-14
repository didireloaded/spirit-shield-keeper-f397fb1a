# Production Readiness Checklist

## Overview
This document outlines the steps needed to make Spirit Shield Keeper production-ready for launch in Namibia.

---

## 1. Performance Optimization

### ✅ Database Indexes
Add these indexes to improve query performance:

```sql
-- Incidents table
CREATE INDEX IF NOT EXISTS incidents_location_idx ON incidents USING GIST (location);
CREATE INDEX IF NOT EXISTS incidents_created_at_idx ON incidents (created_at DESC);
CREATE INDEX IF NOT EXISTS incidents_status_idx ON incidents (status) WHERE status = 'active';
CREATE INDEX IF NOT EXISTS incidents_type_idx ON incidents (incident_type);

-- Users table
CREATE INDEX IF NOT EXISTS users_credibility_idx ON users (credibility_score);
CREATE INDEX IF NOT EXISTS users_is_banned_idx ON users (is_banned) WHERE is_banned = true;

-- Alerts table
CREATE INDEX IF NOT EXISTS alerts_active_idx ON alerts (is_active, created_at) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS alerts_type_idx ON alerts (alert_type);

-- Community posts
CREATE INDEX IF NOT EXISTS posts_created_at_idx ON community_posts (created_at DESC);
CREATE INDEX IF NOT EXISTS posts_flagged_idx ON community_posts (is_flagged) WHERE is_flagged = true;

-- Panic alerts
CREATE INDEX IF NOT EXISTS panic_active_idx ON panic_alerts (is_active, created_at) WHERE is_active = true;
```

### ✅ Query Optimization
Replace full table scans with bounded queries:

```typescript
// Bad: Load all incidents
const { data } = await supabase.from('incidents').select('*');

// Good: Load only recent, nearby incidents
const { data } = await supabase
  .from('incidents')
  .select('*')
  .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
  .eq('status', 'active')
  .order('created_at', { ascending: false })
  .limit(100);
```

### ✅ Caching Strategy
Implement React Query caching:

```typescript
// In queryClient configuration
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: {
        incidents: 5 * 60 * 1000,        // 5 minutes
        communityPosts: 15 * 60 * 1000,  // 15 minutes
        authorities: 24 * 60 * 60 * 1000, // 24 hours
        userProfile: 30 * 60 * 1000,     // 30 minutes
      },
      gcTime: 30 * 60 * 1000,
    },
  },
});
```

### ✅ Image Optimization
Add image compression before upload:

```typescript
// Create new file: src/lib/imageCompression.ts
export async function compressImage(file: File): Promise<File> {
  const maxWidth = 800;
  const quality = 0.7;

  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    
    reader.onload = (e) => {
      const img = new Image();
      img.src = e.target?.result as string;
      
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;
        
        if (width > maxWidth) {
          height *= maxWidth / width;
          width = maxWidth;
        }
        
        canvas.width = width;
        canvas.height = height;
        
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, width, height);
        
        canvas.toBlob((blob) => {
          const compressedFile = new File([blob!], file.name, {
            type: 'image/jpeg',
            lastModified: Date.now(),
          });
          resolve(compressedFile);
        }, 'image/jpeg', quality);
      };
    };
  });
}
```

---

## 2. Data Usage Optimization

### ✅ Low Data Mode
Add to settings:

```typescript
// src/hooks/useDataSaverMode.ts
export function useDataSaverMode() {
  const [isLowDataMode, setIsLowDataMode] = useState(() => {
    return localStorage.getItem('lowDataMode') === 'true';
  });

  const toggleLowDataMode = () => {
    const newValue = !isLowDataMode;
    setIsLowDataMode(newValue);
    localStorage.setItem('lowDataMode', String(newValue));
  };

  return { isLowDataMode, toggleLowDataMode };
}
```

### ✅ Conditional Image Loading
```typescript
// In incident cards
{!isLowDataMode && incident.image_url && (
  <img src={incident.image_url} alt="Incident" loading="lazy" />
)}

{isLowDataMode && (
  <Button onClick={() => loadImage(incident.id)}>
    Tap to view image (uses data)
  </Button>
)}
```

### ✅ Reduce Real-time Subscriptions
```typescript
// Only subscribe to incidents in viewport
const bounds = map.getBounds();
const subscription = supabase
  .channel('nearby-incidents')
  .on('postgres_changes', {
    event: '*',
    schema: 'public',
    table: 'incidents',
    filter: `location=within.${bounds.toBBoxString()}`,
  }, handleIncidentUpdate)
  .subscribe();
```

---

## 3. Security Hardening

### ✅ Environment Variables
Ensure these are NEVER committed:

```bash
# .env (add to .gitignore)
VITE_SUPABASE_URL=your_url
VITE_SUPABASE_ANON_KEY=your_key
VITE_MAPBOX_TOKEN=your_token
VITE_PUSH_PUBLIC_KEY=your_key
```

### ✅ Row Level Security (RLS)
Verify these policies are enabled:

```sql
-- Users can only update their own profile
CREATE POLICY "Users can update own profile"
ON users FOR UPDATE
USING (auth.uid() = id);

-- Users can only create their own incidents
CREATE POLICY "Users can create incidents"
ON incidents FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Banned users cannot post
CREATE POLICY "Banned users cannot post"
ON community_posts FOR INSERT
WITH CHECK (
  auth.uid() = user_id AND
  NOT EXISTS (
    SELECT 1 FROM users WHERE id = auth.uid() AND is_banned = true
  )
);

-- Only moderators can see flagged content
CREATE POLICY "Moderators see flagged content"
ON community_posts FOR SELECT
USING (
  NOT is_flagged OR
  EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND is_moderator = true)
);
```

### ✅ Rate Limiting on Edge Functions
```typescript
// supabase/functions/_shared/rateLimit.ts
export async function checkRateLimit(
  userId: string,
  action: string,
  maxAttempts: number,
  windowMs: number
): Promise<boolean> {
  const key = `ratelimit:${action}:${userId}`;
  const now = Date.now();
  
  // Implement using Supabase edge function KV or separate rate limit table
  // Return true if under limit, false if exceeded
}
```

---

## 4. Error Handling & Monitoring

### ✅ Global Error Logging
```typescript
// src/lib/errorTracking.ts
export async function logError(error: Error, context?: any) {
  console.error('Error occurred:', error, context);
  
  // Log to Supabase for tracking
  try {
    await supabase.from('error_logs').insert({
      error_message: error.message,
      error_stack: error.stack,
      context: JSON.stringify(context),
      user_agent: navigator.userAgent,
      timestamp: new Date().toISOString(),
    });
  } catch (loggingError) {
    console.error('Failed to log error:', loggingError);
  }
}

// Use in try-catch blocks
try {
  await createIncident(data);
} catch (error) {
  logError(error, { action: 'createIncident', data });
  toast.error('Failed to create incident. Please try again.');
}
```

### ✅ Graceful Degradation
```typescript
// In map component
const [mapError, setMapError] = useState(false);

if (mapError) {
  return (
    <div className="p-4">
      <Alert>
        <AlertTitle>Map unavailable</AlertTitle>
        <AlertDescription>
          Showing list view instead. Check your internet connection.
        </AlertDescription>
      </Alert>
      <IncidentList incidents={incidents} />
    </div>
  );
}
```

---

## 5. Legal & Compliance

### ✅ Privacy Policy
Create `/src/pages/PrivacyPolicy.tsx`:
- What data is collected
- How location is used
- Data retention period
- User rights (deletion, export)
- Contact information

### ✅ Terms of Service
Create `/src/pages/TermsOfService.tsx`:
- Acceptable use policy
- No false reports
- Liability disclaimer
- Age restrictions (13+)
- Account termination conditions

### ✅ User Consent
```typescript
// On first launch
const [hasAcceptedTerms, setHasAcceptedTerms] = useState(false);

if (!hasAcceptedTerms) {
  return (
    <Dialog open={true}>
      <DialogContent>
        <DialogTitle>Welcome to Spirit Shield Keeper</DialogTitle>
        <DialogDescription>
          Before you continue, please review our:
          <ul>
            <li><Link to="/terms">Terms of Service</Link></li>
            <li><Link to="/privacy">Privacy Policy</Link></li>
          </ul>
          
          We collect your location to show nearby incidents.
          You can disable this anytime in settings.
        </DialogDescription>
        <DialogFooter>
          <Button onClick={() => setHasAcceptedTerms(true)}>
            I Accept
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
```

---

## 6. Testing Checklist

### ✅ Manual Testing
- [ ] Create incident report → appears on map
- [ ] Press panic button → alerts sent to watchers
- [ ] Create Amber alert → appears to all users
- [ ] Report false incident → credibility score decreases
- [ ] Flag inappropriate content → goes to moderation queue
- [ ] Low data mode → images don't auto-load
- [ ] Offline mode → app still loads (PWA)
- [ ] Location permissions denied → graceful fallback
- [ ] Map fails to load → list view shows
- [ ] Create community post → appears in feed

### ✅ Load Testing
- [ ] 100 concurrent users on map
- [ ] 50 incidents created simultaneously
- [ ] Real-time updates with 200 subscribers
- [ ] Image uploads (10 at once)

### ✅ Security Testing
- [ ] Banned user cannot post
- [ ] Low credibility user goes to review queue
- [ ] RLS prevents viewing other users' private data
- [ ] Rate limits block spam
- [ ] SQL injection attempts fail

---

## 7. Launch Prerequisites

### ✅ Infrastructure
- [ ] Supabase project configured
- [ ] Database migrations applied
- [ ] Environment variables set
- [ ] CDN configured for images
- [ ] Push notification certificates

### ✅ Content
- [ ] Onboarding flow complete
- [ ] Help/FAQ page
- [ ] Community guidelines published
- [ ] Emergency contacts listed (Police, Ambulance, Fire)

### ✅ Moderation
- [ ] Admin dashboard accessible
- [ ] 3-5 volunteer moderators recruited
- [ ] Moderation guidelines documented
- [ ] Response time SLA defined (flag review within 2 hours)

### ✅ Marketing
- [ ] Landing page with screenshots
- [ ] App store listings (if mobile)
- [ ] Social media accounts
- [ ] Press kit for media outreach
- [ ] Beta tester testimonials

---

## 8. Post-Launch Monitoring

### ✅ Metrics to Track
```typescript
// Create analytics dashboard
- Daily Active Users (DAU)
- Incidents created per day
- False report rate
- Average response time to flags
- User retention (Day 1, Day 7, Day 30)
- Panic button activations
- Amber alerts created
- Top incident types
- Most active neighborhoods
```

### ✅ Performance Monitoring
- Page load times
- API response times
- Real-time subscription lag
- Database query times
- Error rates
- Crash reports

---

## Timeline Estimate

| Phase | Duration | Tasks |
|-------|----------|-------|
| **Week 1-2** | Setup | Database optimization, security hardening, error tracking |
| **Week 3-4** | Features | False report system, content moderation, low data mode |
| **Week 5** | Testing | Manual testing, load testing, bug fixes |
| **Week 6** | Legal | Terms, privacy policy, user consent flows |
| **Week 7** | Soft Launch | 50-100 invite-only beta users |
| **Week 8-10** | Iteration | Fix issues, gather feedback, improve UX |
| **Week 11** | Public Launch | City-wide release |

---

## Daily Operations Checklist

### Every Day
- [ ] Review flagged content (2x per day)
- [ ] Check error logs
- [ ] Monitor active panic alerts
- [ ] Respond to user reports

### Weekly
- [ ] Review user credibility scores
- [ ] Ban/warn repeat offenders
- [ ] Check server costs
- [ ] Analyze usage metrics
- [ ] Update community on incidents

### Monthly
- [ ] Database cleanup (old data)
- [ ] Moderator check-in meeting
- [ ] Feature prioritization
- [ ] User feedback review
- [ ] Cost optimization

---

## Success Criteria

### Launch (Month 1)
- 500+ registered users
- 50+ DAU
- 100+ incidents reported
- <5% false report rate
- Average response time to flags: <2 hours

### Growth (Month 3)
- 2,000+ users
- 200+ DAU
- 500+ incidents reported
- Partnership with 2+ community organizations
- Featured in local media

### Sustainability (Month 6)
- 5,000+ users
- 500+ DAU
- Expansion to 2nd city
- Self-sustaining moderation team
- <$200/month operating costs
