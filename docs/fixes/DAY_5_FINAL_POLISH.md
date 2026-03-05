# DAY 5 FINAL POLISH - Performance & Monitoring
## ⏱️ Time Required: 3-4 hours
## 🎯 Priority: HIGH - Production Quality

---

## Part 1: Error Tracking & Monitoring (1 hour)

### Setup Sentry (Free Tier)

```bash
npm install @sentry/react
```

### File: `src/lib/monitoring.ts`

```typescript
import * as Sentry from "@sentry/react";

export function initMonitoring() {
  if (import.meta.env.PROD) {
    Sentry.init({
      dsn: import.meta.env.VITE_SENTRY_DSN, // Add to .env
      integrations: [
        new Sentry.BrowserTracing(),
        new Sentry.Replay({
          maskAllText: false,
          blockAllMedia: false,
        }),
      ],
      tracesSampleRate: 0.1, // 10% of transactions
      replaysSessionSampleRate: 0.1,
      replaysOnErrorSampleRate: 1.0,
      environment: import.meta.env.MODE,
    });
  }
}

export function logError(
  error: Error,
  context?: Record<string, any>
) {
  console.error('Error:', error, context);
  
  if (import.meta.env.PROD) {
    Sentry.captureException(error, {
      extra: context,
    });
  }
}

export function logPerformance(
  name: string,
  duration: number,
  metadata?: Record<string, any>
) {
  console.log(`Performance: ${name} took ${duration}ms`, metadata);
  
  if (import.meta.env.PROD && duration > 1000) {
    // Log slow operations
    Sentry.captureMessage(`Slow operation: ${name}`, {
      level: 'warning',
      extra: { duration, ...metadata },
    });
  }
}

// Performance tracker
export function trackPerformance<T>(
  name: string,
  fn: () => Promise<T>
): Promise<T> {
  const start = performance.now();
  
  return fn()
    .then(result => {
      const duration = performance.now() - start;
      logPerformance(name, duration);
      return result;
    })
    .catch(error => {
      const duration = performance.now() - start;
      logError(error, { operation: name, duration });
      throw error;
    });
}
```

### Update main.tsx

```typescript
import { initMonitoring } from "@/lib/monitoring";

// Initialize monitoring before React
initMonitoring();

// Wrap your app
const root = ReactDOM.createRoot(document.getElementById("root")!);
root.render(
  <React.StrictMode>
    <ErrorBoundary fallback={<ErrorFallback />}>
      <App />
    </ErrorBoundary>
  </React.StrictMode>
);
```

---

## Part 2: Image Compression (45 minutes)

### File: `src/lib/imageUtils.ts`

```typescript
/**
 * Compress and resize image before upload
 */
export async function compressImage(
  file: File,
  maxWidth: number = 800,
  maxHeight: number = 800,
  quality: number = 0.7
): Promise<File> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      const img = new Image();
      
      img.onload = () => {
        // Calculate new dimensions
        let width = img.width;
        let height = img.height;
        
        if (width > maxWidth || height > maxHeight) {
          const ratio = Math.min(maxWidth / width, maxHeight / height);
          width = Math.floor(width * ratio);
          height = Math.floor(height * ratio);
        }
        
        // Create canvas
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Could not get canvas context'));
          return;
        }
        
        // Draw and compress
        ctx.drawImage(img, 0, 0, width, height);
        
        canvas.toBlob(
          (blob) => {
            if (!blob) {
              reject(new Error('Could not compress image'));
              return;
            }
            
            // Create new file
            const compressedFile = new File(
              [blob],
              file.name,
              {
                type: 'image/jpeg',
                lastModified: Date.now(),
              }
            );
            
            resolve(compressedFile);
          },
          'image/jpeg',
          quality
        );
      };
      
      img.onerror = () => reject(new Error('Failed to load image'));
      img.src = e.target?.result as string;
    };
    
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsDataURL(file);
  });
}

/**
 * Get image dimensions
 */
export function getImageDimensions(file: File): Promise<{width: number; height: number}> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => resolve({ width: img.width, height: img.height });
      img.onerror = () => reject(new Error('Failed to load image'));
      img.src = e.target?.result as string;
    };
    
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsDataURL(file);
  });
}

/**
 * Validate image file
 */
export async function validateImage(file: File): Promise<{
  valid: boolean;
  error?: string;
}> {
  // Check file type
  if (!file.type.startsWith('image/')) {
    return { valid: false, error: 'File must be an image' };
  }
  
  // Check file size (10MB max)
  if (file.size > 10 * 1024 * 1024) {
    return { valid: false, error: 'Image must be less than 10MB' };
  }
  
  // Check dimensions
  try {
    const dimensions = await getImageDimensions(file);
    if (dimensions.width > 4000 || dimensions.height > 4000) {
      return { valid: false, error: 'Image dimensions too large (max 4000x4000)' };
    }
  } catch {
    return { valid: false, error: 'Could not read image' };
  }
  
  return { valid: true };
}
```

### Update usePhotoUpload Hook

```typescript
import { compressImage, validateImage } from "@/lib/imageUtils";
import { trackPerformance } from "@/lib/monitoring";

export function usePhotoUpload() {
  const selectAndUpload = async () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      
      // 1. Validate
      const validation = await validateImage(file);
      if (!validation.valid) {
        toast.error(validation.error);
        return;
      }
      
      // 2. Compress
      setUploading(true);
      try {
        const compressed = await trackPerformance(
          'image-compression',
          () => compressImage(file)
        );
        
        console.log(
          `Compressed: ${(file.size / 1024).toFixed(0)}KB → ${(compressed.size / 1024).toFixed(0)}KB`
        );
        
        // 3. Upload compressed image
        const { data, error } = await supabase.storage
          .from(bucket)
          .upload(`${Date.now()}-${compressed.name}`, compressed);
          
        if (error) throw error;
        
        // 4. Get public URL
        const { data: { publicUrl } } = supabase.storage
          .from(bucket)
          .getPublicUrl(data.path);
          
        setPhotoUrl(publicUrl);
        setPreviewUrl(URL.createObjectURL(compressed));
        onSuccess?.();
      } catch (error) {
        logError(error as Error, { operation: 'photo-upload' });
        onError?.();
      } finally {
        setUploading(false);
      }
    };
    
    input.click();
  };
  
  return { selectAndUpload, uploading, photoUrl, previewUrl };
}
```

---

## Part 3: Offline Support (1 hour)

### File: `src/lib/offlineQueue.ts`

```typescript
interface QueuedAction {
  id: string;
  type: 'create_incident' | 'create_post' | 'verify_incident';
  payload: any;
  timestamp: number;
}

const QUEUE_KEY = 'offline_queue';

/**
 * Add action to offline queue
 */
export function queueOfflineAction(
  type: QueuedAction['type'],
  payload: any
): void {
  const queue = getOfflineQueue();
  
  const action: QueuedAction = {
    id: crypto.randomUUID(),
    type,
    payload,
    timestamp: Date.now(),
  };
  
  queue.push(action);
  localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
  
  console.log('Action queued for offline sync:', action);
}

/**
 * Get offline queue
 */
export function getOfflineQueue(): QueuedAction[] {
  const stored = localStorage.getItem(QUEUE_KEY);
  return stored ? JSON.parse(stored) : [];
}

/**
 * Process offline queue when online
 */
export async function processOfflineQueue(): Promise<void> {
  const queue = getOfflineQueue();
  if (queue.length === 0) return;
  
  console.log(`Processing ${queue.length} offline actions...`);
  
  const processed: string[] = [];
  
  for (const action of queue) {
    try {
      await processQueuedAction(action);
      processed.push(action.id);
      console.log('Processed:', action.type);
    } catch (error) {
      console.error('Failed to process action:', action, error);
      // Keep failed actions in queue
    }
  }
  
  // Remove processed actions
  const remaining = queue.filter(a => !processed.includes(a.id));
  localStorage.setItem(QUEUE_KEY, JSON.stringify(remaining));
  
  if (processed.length > 0) {
    toast.success(`Synced ${processed.length} offline actions`);
  }
}

/**
 * Process individual queued action
 */
async function processQueuedAction(action: QueuedAction): Promise<void> {
  switch (action.type) {
    case 'create_incident':
      await supabase.from('incidents').insert(action.payload);
      break;
    case 'create_post':
      await supabase.from('community_posts').insert(action.payload);
      break;
    case 'verify_incident':
      await supabase.from('incident_verifications').insert(action.payload);
      break;
  }
}
```

### Add Offline Detection

```typescript
// src/hooks/useOnlineStatus.ts

import { useState, useEffect } from 'react';
import { processOfflineQueue } from '@/lib/offlineQueue';

export function useOnlineStatus() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const handleOnline = async () => {
      setIsOnline(true);
      console.log('Back online - processing queue...');
      await processOfflineQueue();
    };

    const handleOffline = () => {
      setIsOnline(false);
      console.log('Gone offline - will queue actions');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return isOnline;
}
```

### Update Incident Creation

```typescript
import { queueOfflineAction } from '@/lib/offlineQueue';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';

export function useCreateIncident() {
  const isOnline = useOnlineStatus();
  
  const createIncident = async (data: any) => {
    if (!isOnline) {
      // Queue for later
      queueOfflineAction('create_incident', data);
      toast.info('Saved offline. Will sync when online.');
      return { success: true, queued: true };
    }
    
    // Normal online creation
    const { data: incident, error } = await supabase
      .from('incidents')
      .insert(data);
      
    return { success: !error, data: incident };
  };
  
  return { createIncident };
}
```

---

## Part 4: Performance Optimization (45 minutes)

### React Query Configuration

```typescript
// src/lib/queryClient.ts

import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      cacheTime: 10 * 60 * 1000, // 10 minutes
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

// Specific cache times for different data types
export const CACHE_CONFIG = {
  // Real-time data (short cache)
  incidents: {
    staleTime: 30 * 1000, // 30 seconds
    cacheTime: 5 * 60 * 1000,
  },
  panic_alerts: {
    staleTime: 0, // Always fresh
    cacheTime: 1 * 60 * 1000,
  },
  
  // User data (medium cache)
  user_profile: {
    staleTime: 5 * 60 * 1000, // 5 minutes
    cacheTime: 30 * 60 * 1000,
  },
  
  // Static data (long cache)
  authorities: {
    staleTime: 24 * 60 * 60 * 1000, // 24 hours
    cacheTime: 7 * 24 * 60 * 60 * 1000,
  },
};
```

### Lazy Loading Components

```typescript
// Lazy load heavy components
import { lazy, Suspense } from 'react';
import { Skeleton } from '@/components/ui/skeleton';

const MapPage = lazy(() => import('@/pages/Map'));
const CommunityPage = lazy(() => import('@/pages/Community'));

// Use with Suspense
<Suspense fallback={<PageSkeleton />}>
  <MapPage />
</Suspense>
```

### Memoization

```typescript
import { memo, useMemo } from 'react';

// Memoize expensive components
export const IncidentCard = memo(({ incident }: { incident: Incident }) => {
  const distance = useMemo(() => 
    calculateDistance(userLocation, incident.location),
    [userLocation, incident.location]
  );
  
  return (
    <Card>
      {/* ... */}
      <span>{distance.toFixed(1)} km away</span>
    </Card>
  );
});
```

---

## Part 5: Better Error Messages (30 minutes)

### File: `src/lib/userFriendlyErrors.ts`

```typescript
export function getUserFriendlyError(error: any): string {
  // Network errors
  if (!navigator.onLine) {
    return 'No internet connection. Please check your network.';
  }
  
  // Supabase errors
  if (error?.code === 'PGRST116') {
    return 'Could not find that item. It may have been deleted.';
  }
  
  if (error?.code === '23505') {
    return 'This action has already been done.';
  }
  
  if (error?.code === '42501') {
    return 'You do not have permission to do that.';
  }
  
  // Auth errors
  if (error?.message?.includes('Invalid login')) {
    return 'Incorrect email or password. Please try again.';
  }
  
  if (error?.message?.includes('Email not confirmed')) {
    return 'Please check your email and confirm your account.';
  }
  
  // Rate limit errors
  if (error?.message?.includes('rate limit')) {
    return 'Too many attempts. Please wait a moment and try again.';
  }
  
  // Location errors
  if (error?.message?.includes('location')) {
    return 'Could not get your location. Please enable GPS in your device settings.';
  }
  
  // Generic errors
  if (error?.message) {
    // Check for specific keywords
    if (error.message.includes('timeout')) {
      return 'Request timed out. Please try again.';
    }
    if (error.message.includes('fetch')) {
      return 'Network error. Please check your connection.';
    }
  }
  
  // Fallback
  return 'Something went wrong. Please try again.';
}
```

### Use in Components

```typescript
import { getUserFriendlyError } from '@/lib/userFriendlyErrors';
import { logError } from '@/lib/monitoring';

try {
  await createIncident(data);
} catch (error) {
  const friendlyMessage = getUserFriendlyError(error);
  toast.error(friendlyMessage);
  logError(error as Error, { action: 'create_incident' });
}
```

---

## Part 6: Loading Indicators (30 minutes)

### Global Loading States

```typescript
// src/components/LoadingStates.tsx

export function PageSkeleton() {
  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="max-w-lg mx-auto px-4 py-6 space-y-4">
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-48 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
    </div>
  );
}

export function CardSkeleton() {
  return (
    <div className="bg-card rounded-xl p-4 space-y-3">
      <div className="flex gap-3">
        <Skeleton className="w-12 h-12 rounded-full" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-3 w-full" />
        </div>
      </div>
    </div>
  );
}

export function MapSkeleton() {
  return (
    <div className="w-full h-full bg-muted animate-pulse flex items-center justify-center">
      <div className="text-center">
        <MapPin className="w-12 h-12 mx-auto mb-2 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">Loading map...</p>
      </div>
    </div>
  );
}
```

---

## Part 7: Analytics (30 minutes)

### File: `src/lib/analytics.ts`

```typescript
interface AnalyticsEvent {
  name: string;
  properties?: Record<string, any>;
}

/**
 * Track analytics event
 */
export function trackEvent(event: AnalyticsEvent) {
  console.log('Analytics:', event);
  
  // In production, send to analytics service
  if (import.meta.env.PROD) {
    // Could use Google Analytics, Mixpanel, etc.
    // For now, just log
  }
}

/**
 * Pre-defined events
 */
export const Analytics = {
  // User actions
  signUp: () => trackEvent({ name: 'user_signup' }),
  signIn: () => trackEvent({ name: 'user_signin' }),
  
  // Incident actions
  createIncident: (type: string) => 
    trackEvent({ name: 'incident_created', properties: { type } }),
  verifyIncident: () => 
    trackEvent({ name: 'incident_verified' }),
  
  // Emergency actions
  panicButton: () => 
    trackEvent({ name: 'panic_button_pressed' }),
  amberAlert: () => 
    trackEvent({ name: 'amber_alert_created' }),
  
  // Social actions
  createPost: () => 
    trackEvent({ name: 'community_post_created' }),
  addWatcher: () => 
    trackEvent({ name: 'watcher_added' }),
  
  // Page views
  viewPage: (page: string) => 
    trackEvent({ name: 'page_view', properties: { page } }),
};
```

---

## ✅ Final Verification Checklist

### Monitoring
- [ ] Sentry initialized
- [ ] Error tracking working
- [ ] Performance monitoring enabled
- [ ] Error boundaries in place

### Performance
- [ ] Images compressed before upload
- [ ] React Query configured
- [ ] Lazy loading for heavy components
- [ ] Memoization for expensive calculations

### User Experience
- [ ] Offline queue working
- [ ] Online/offline detection
- [ ] User-friendly error messages
- [ ] Loading skeletons everywhere
- [ ] Analytics tracking key events

### Testing
- [ ] Upload large image → compressed
- [ ] Go offline → actions queued
- [ ] Come online → queue processed
- [ ] Trigger error → friendly message
- [ ] All pages load with skeletons

---

## 🧪 Testing Checklist

```bash
# 1. Test image compression
# - Upload 5MB image
# - Should compress to ~100KB
# - Should be under 800x800px

# 2. Test offline mode
# - Turn off network
# - Create incident
# - Should queue offline
# - Turn on network
# - Should sync automatically

# 3. Test error messages
# - Try to create duplicate
# - Try without permission
# - Should show friendly message

# 4. Test performance
# - Open DevTools Network tab
# - Set to "Slow 3G"
# - App should still load in <5s
# - Images should be compressed
```

---

## 📊 Performance Targets

| Metric | Target | Current | Status |
|--------|--------|---------|--------|
| Initial Load | <3s | ? | ⏳ Test |
| Time to Interactive | <5s | ? | ⏳ Test |
| First Contentful Paint | <1.5s | ? | ⏳ Test |
| Largest Contentful Paint | <2.5s | ? | ⏳ Test |
| Image Size | <100KB | ? | ⏳ Test |
| Bundle Size | <500KB | ? | ⏳ Test |

---

## 🎯 Success Criteria

After implementing all improvements:

✅ **Database Performance**
- All queries <100ms
- 30+ indexes created
- Cleanup jobs running

✅ **Anti-Abuse System**
- Credibility scoring working
- Spam detection active
- Auto-verification functional

✅ **Content Safety**
- Profanity filtering
- PII auto-redaction
- Flag/report system

✅ **Legal Compliance**
- Privacy Policy published
- Terms of Service published
- User consent flow

✅ **Production Quality**
- Error tracking enabled
- Images compressed
- Offline support
- User-friendly errors
- Loading states everywhere

---

## 🚀 You're Ready to Launch!

Your app is now:
- ⚡ **Fast** - Optimized queries and caching
- 🛡️ **Safe** - Anti-abuse and content moderation
- 📱 **Reliable** - Offline support and error handling
- ⚖️ **Legal** - Privacy Policy and Terms of Service
- 📊 **Monitored** - Error tracking and analytics
- 💎 **Polished** - Loading states and friendly errors

---

## ⏭️ Post-Launch Checklist

After going live:

**Week 1:**
- [ ] Monitor Sentry for errors
- [ ] Check query performance
- [ ] Watch for spam/abuse
- [ ] Gather user feedback
- [ ] Fix critical bugs

**Week 2:**
- [ ] Add missing features from feedback
- [ ] Optimize slow queries
- [ ] Improve UX based on analytics
- [ ] Update documentation

**Ongoing:**
- [ ] Weekly backups
- [ ] Monthly security audit
- [ ] Quarterly feature releases
- [ ] Listen to community

---

**Total implementation time: 15-20 hours over 5 days**  
**Result: Production-ready, professional safety app** ✅

**YOU'VE GOT THIS!** 🚀🇳🇦🛡️
