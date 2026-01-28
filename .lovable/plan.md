

# Architecture and Production-Readiness Improvement Plan

This plan addresses all the improvements outlined in your requirements, organized into phases for systematic implementation.

---

## Phase 1: Project Structure and Domain Boundaries

### 1.1 Create Feature-Based Folder Structure

Reorganize code by domain/feature instead of file type:

```text
src/
├── features/
│   ├── auth/
│   │   ├── components/
│   │   ├── hooks/
│   │   ├── services/
│   │   └── types.ts
│   ├── alerts/
│   │   ├── components/
│   │   ├── hooks/
│   │   ├── services/
│   │   └── types.ts
│   ├── community/
│   │   ├── components/
│   │   ├── hooks/
│   │   ├── services/
│   │   └── types.ts
│   ├── map/
│   │   ├── components/
│   │   ├── hooks/
│   │   ├── services/
│   │   └── types.ts
│   ├── emergency/
│   │   ├── components/
│   │   ├── hooks/
│   │   ├── services/
│   │   └── types.ts
│   └── notifications/
│       ├── components/
│       ├── hooks/
│       ├── services/
│       └── types.ts
├── shared/
│   ├── components/
│   ├── hooks/
│   ├── utils/
│   └── types/
└── core/
    ├── api/
    ├── config/
    └── providers/
```

### 1.2 Create Data Access Layer

Create `src/core/api/` with centralized Supabase operations:

**Files to create:**
- `src/core/api/supabase-client.ts` - Single re-exported client
- `src/core/api/queries/` - All database queries
- `src/core/api/mutations/` - All database mutations
- `src/core/api/subscriptions/` - Real-time subscriptions

---

## Phase 2: Supabase and Backend Safety

### 2.1 Centralize Supabase Client Usage

Create a single entry point for the Supabase client with type-safe helpers:

```typescript
// src/core/api/supabase-client.ts
export { supabase } from "@/integrations/supabase/client";

// Type-safe query helpers
export async function fetchOne<T>(
  table: string,
  query: (qb: any) => any
): Promise<{ data: T | null; error: Error | null }> {
  // ...
}
```

### 2.2 Remove Direct Supabase Calls from Components

**Current issues found in:**
- `src/pages/Alerts.tsx` (lines 50-68) - Direct marker fetch in useEffect
- `src/pages/Map.tsx` (lines 198-240) - Multiple direct Supabase calls
- `src/pages/Community.tsx` - Uses hooks correctly

**Action:** Move all data fetching to dedicated hooks/services.

### 2.3 Add Database Constraints and Indexes

Create a migration to add:

```sql
-- Add NOT NULL where appropriate
ALTER TABLE alerts ALTER COLUMN status SET NOT NULL;
ALTER TABLE alerts ALTER COLUMN status SET DEFAULT 'active';

-- Add indexes for frequently queried fields
CREATE INDEX IF NOT EXISTS idx_alerts_user_id ON alerts(user_id);
CREATE INDEX IF NOT EXISTS idx_alerts_status ON alerts(status);
CREATE INDEX IF NOT EXISTS idx_alerts_created_at ON alerts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_markers_expires_at ON markers(expires_at);
CREATE INDEX IF NOT EXISTS idx_user_locations_user_id ON user_locations(user_id);
CREATE INDEX IF NOT EXISTS idx_community_posts_created_at ON community_posts(created_at DESC);
```

---

## Phase 3: TypeScript and Typing Discipline

### 3.1 Create Shared Domain Types

Create `src/shared/types/domain.ts`:

```typescript
// Domain types shared across features
export interface User {
  id: string;
  email: string;
}

export interface Alert {
  id: string;
  userId: string;
  type: AlertType;
  status: AlertStatus;
  latitude: number;
  longitude: number;
  description?: string;
  createdAt: string;
  resolvedAt?: string;
}

export type AlertType = "panic" | "amber" | "medical" | "crash";
export type AlertStatus = "active" | "resolved" | "cancelled";

export interface Incident {
  id: string;
  latitude: number;
  longitude: number;
  type: string;
  status?: string;
  verified?: boolean;
  confidenceScore?: number;
  createdAt?: string;
}
```

### 3.2 Strengthen TypeScript Configuration

Update `tsconfig.json`:

```json
{
  "compilerOptions": {
    "strict": true,
    "noImplicitAny": true,
    "strictNullChecks": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true
  }
}
```

### 3.3 Create Typed Supabase Response Helpers

```typescript
// src/core/api/helpers.ts
import type { PostgrestError } from "@supabase/supabase-js";

export type QueryResult<T> = {
  data: T | null;
  error: PostgrestError | null;
  loading: boolean;
};

export function handleQueryError(error: PostgrestError): string {
  // User-friendly error messages
  const errorMap: Record<string, string> = {
    "PGRST116": "No data found",
    "23505": "This record already exists",
    "42501": "Permission denied",
  };
  return errorMap[error.code] || "An unexpected error occurred";
}
```

---

## Phase 4: React and State Management

### 4.1 Normalize Loading/Error Handling

Create a unified hook pattern:

```typescript
// src/shared/hooks/useQuery.ts
export function useSupabaseQuery<T>(
  queryFn: () => Promise<{ data: T | null; error: any }>,
  deps: any[] = []
) {
  const [state, setState] = useState<{
    data: T | null;
    loading: boolean;
    error: string | null;
  }>({
    data: null,
    loading: true,
    error: null,
  });

  useEffect(() => {
    let cancelled = false;
    setState(prev => ({ ...prev, loading: true }));
    
    queryFn()
      .then(({ data, error }) => {
        if (cancelled) return;
        if (error) {
          setState({ data: null, loading: false, error: handleQueryError(error) });
        } else {
          setState({ data, loading: false, error: null });
        }
      })
      .catch(err => {
        if (!cancelled) {
          setState({ data: null, loading: false, error: err.message });
        }
      });

    return () => { cancelled = true; };
  }, deps);

  return state;
}
```

### 4.2 Add Global Error Boundary

Create `src/core/providers/ErrorBoundary.tsx`:

```typescript
export class ErrorBoundary extends React.Component<Props, State> {
  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("[ErrorBoundary]", error, errorInfo);
    // Log to monitoring service
  }

  render() {
    if (this.state.hasError) {
      return <ErrorFallback error={this.state.error} />;
    }
    return this.props.children;
  }
}
```

### 4.3 Standardize Auth State Handling

Update `AuthContext.tsx` to prevent race conditions:

```typescript
// Add loading gate to prevent rendering before auth check
const [initialized, setInitialized] = useState(false);

useEffect(() => {
  const { data: { subscription } } = supabase.auth.onAuthStateChange(
    async (event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
      setInitialized(true);
    }
  );

  // Check session after setting up listener
  supabase.auth.getSession().then(/* ... */);

  return () => subscription.unsubscribe();
}, []);

// Don't render children until auth is initialized
if (!initialized) {
  return <LoadingScreen />;
}
```

---

## Phase 5: UI and Component Quality

### 5.1 Break Up Large Components

Components to refactor:

| File | Lines | Action |
|------|-------|--------|
| `Alerts.tsx` | 538 | Split into AlertsPage, PanicButton, AmberForm, AlertsList |
| `Community.tsx` | 639 | Split into CommunityPage, PostCard, CreatePostSheet, PostDetailSheet |
| `Map.tsx` | 792 | Split into MapPage, MapControls, IncidentReportModal |

### 5.2 Create Reusable UI Patterns

Create design system components:

```text
src/shared/components/
├── feedback/
│   ├── LoadingSpinner.tsx
│   ├── SkeletonCard.tsx
│   └── ErrorMessage.tsx
├── layout/
│   ├── PageContainer.tsx
│   ├── BottomSheet.tsx
│   └── FloatingActionButton.tsx
└── data-display/
    ├── TimeAgo.tsx
    ├── DistanceBadge.tsx
    └── StatusBadge.tsx
```

### 5.3 Add Skeleton Loaders

Replace empty loading states with skeletons:

```typescript
// src/shared/components/feedback/SkeletonCard.tsx
export function SkeletonCard() {
  return (
    <div className="bg-card rounded-xl p-4 animate-pulse">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-muted" />
        <div className="flex-1 space-y-2">
          <div className="h-4 bg-muted rounded w-3/4" />
          <div className="h-3 bg-muted rounded w-1/2" />
        </div>
      </div>
    </div>
  );
}
```

---

## Phase 6: Performance and Scalability

### 6.1 Add Pagination to All List Queries

Update hooks to support pagination:

```typescript
export function useAlerts(options: { limit?: number; page?: number } = {}) {
  const { limit = 20, page = 0 } = options;
  
  // ...fetch with .range(page * limit, (page + 1) * limit - 1)
}
```

### 6.2 Add Query Limits by Default

Create a constants file:

```typescript
// src/core/config/constants.ts
export const QUERY_LIMITS = {
  DEFAULT: 50,
  MAX: 100,
  ALERTS: 50,
  COMMUNITY_POSTS: 30,
  NOTIFICATIONS: 50,
};
```

### 6.3 Implement Query Caching

Use React Query's caching:

```typescript
// Configure stale times
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30 * 1000, // 30 seconds
      cacheTime: 5 * 60 * 1000, // 5 minutes
      refetchOnWindowFocus: false,
    },
  },
});
```

---

## Phase 7: Error Handling and Resilience

### 7.1 Centralize Error Formatting

Create `src/core/utils/errors.ts`:

```typescript
export function formatUserError(error: unknown): string {
  if (error instanceof Error) {
    // Map technical errors to user-friendly messages
    const errorMessages: Record<string, string> = {
      "Failed to fetch": "Unable to connect. Please check your internet.",
      "NetworkError": "Network connection lost",
      "PGRST301": "You don't have permission to do this",
    };
    
    for (const [key, message] of Object.entries(errorMessages)) {
      if (error.message.includes(key)) return message;
    }
  }
  return "Something went wrong. Please try again.";
}

export function logError(error: unknown, context?: Record<string, any>) {
  console.error("[Error]", error, context);
  // Future: Send to monitoring service
}
```

### 7.2 Add Retry Logic

Create a retry utility:

```typescript
export async function withRetry<T>(
  fn: () => Promise<T>,
  options: { maxRetries?: number; delayMs?: number } = {}
): Promise<T> {
  const { maxRetries = 3, delayMs = 1000 } = options;
  
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      if (attempt === maxRetries - 1) throw error;
      await new Promise(r => setTimeout(r, delayMs * (attempt + 1)));
    }
  }
  throw new Error("Max retries exceeded");
}
```

---

## Phase 8: Security Enhancements

### 8.1 Validate Environment Variables at Startup

Create `src/core/config/env.ts`:

```typescript
const required = [
  "VITE_SUPABASE_URL",
  "VITE_SUPABASE_PUBLISHABLE_KEY",
] as const;

export function validateEnv() {
  const missing = required.filter(key => !import.meta.env[key]);
  
  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(", ")}`);
  }
}

// Call in main.tsx before rendering
validateEnv();
```

### 8.2 Create Input Validation Utilities

```typescript
// src/core/utils/validation.ts
export const validators = {
  isValidLatitude: (lat: number) => lat >= -90 && lat <= 90,
  isValidLongitude: (lng: number) => lng >= -180 && lng <= 180,
  isValidUUID: (id: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id),
  sanitizeText: (text: string) => text.trim().slice(0, 5000),
};
```

---

## Phase 9: Developer Experience

### 9.1 Update ESLint Configuration

Add stricter rules to `eslint.config.js`:

```javascript
export default [
  // ... existing config
  {
    rules: {
      "@typescript-eslint/no-explicit-any": "warn",
      "@typescript-eslint/explicit-function-return-type": "off",
      "no-console": ["warn", { allow: ["warn", "error"] }],
      "react-hooks/exhaustive-deps": "error",
      "no-unused-vars": "off",
      "@typescript-eslint/no-unused-vars": ["error", { argsIgnorePattern: "^_" }],
    },
  },
];
```

### 9.2 Add Architecture Documentation

Create `docs/ARCHITECTURE.md`:

```markdown
# Architecture Overview

## Folder Structure
- `src/features/` - Feature-based modules
- `src/shared/` - Shared utilities and components
- `src/core/` - Core application infrastructure

## Data Flow
1. Components consume data via hooks
2. Hooks call services
3. Services interact with Supabase
4. Real-time updates via subscriptions

## Conventions
- All database operations in services
- Components are presentation-focused
- Types defined per feature + shared domain types
```

---

## Implementation Order

| Phase | Priority | Effort | Impact |
|-------|----------|--------|--------|
| Phase 3 (TypeScript) | High | Medium | High |
| Phase 2 (Supabase safety) | High | Medium | High |
| Phase 7 (Error handling) | High | Low | High |
| Phase 4 (React patterns) | High | Medium | High |
| Phase 8 (Security) | High | Low | High |
| Phase 1 (Structure) | Medium | High | Medium |
| Phase 5 (UI quality) | Medium | Medium | Medium |
| Phase 6 (Performance) | Medium | Medium | Medium |
| Phase 9 (DX) | Low | Low | Medium |

---

## Technical Notes

- The existing hook pattern in `useAlerts.ts`, `useCommunityPosts.ts`, and `usePanicSession.ts` is well-structured and should be the template for other data hooks
- The Supabase types file is auto-generated and comprehensive - leverage it fully
- The map system already has clean layer separation via hooks (`useIncidentLayers`, `useHeatmapLayers`, `useAuthorityMarkers`)
- Real-time subscriptions are correctly implemented with cleanup in useEffect return
- The `notificationService.ts` is a good example of the service pattern to follow

