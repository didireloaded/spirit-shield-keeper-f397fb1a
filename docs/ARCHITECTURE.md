# Architecture Overview

This document describes the architectural patterns and conventions used in the Spirit Shield Keeper application.

## Folder Structure

```
src/
├── core/                    # Core application infrastructure
│   ├── api/                 # Supabase client and query helpers
│   ├── config/              # Environment validation and constants
│   ├── providers/           # React context providers (ErrorBoundary)
│   └── utils/               # Error handling, validation utilities
├── features/                # Feature-based modules (future)
│   ├── auth/
│   ├── alerts/
│   ├── community/
│   ├── map/
│   ├── emergency/
│   └── notifications/
├── shared/                  # Shared utilities and components
│   ├── components/          # Reusable UI components
│   │   ├── feedback/        # Loading, Error, Skeleton components
│   │   └── data-display/    # TimeAgo, DistanceBadge, StatusBadge
│   ├── hooks/               # Shared custom hooks
│   └── types/               # Domain types
├── components/              # App-specific components
├── contexts/                # React contexts (Auth, Emergency)
├── hooks/                   # App-specific hooks
├── pages/                   # Route page components
├── lib/                     # External library utilities
└── integrations/            # Third-party integrations (Supabase)
```

## Data Flow

```
┌─────────────────────────────────────────────────────────┐
│                    React Component                       │
│  (Presentational - consumes data, renders UI)           │
└─────────────────────────┬───────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────┐
│                    Custom Hook                           │
│  (useAlerts, useCommunityPosts, etc.)                   │
│  - Manages state (loading, error, data)                 │
│  - Handles real-time subscriptions                      │
│  - Provides mutation functions                          │
└─────────────────────────┬───────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────┐
│                 Supabase Client                          │
│  (src/core/api/supabase-client.ts)                      │
│  - Single source of truth                               │
│  - Type-safe database operations                        │
└─────────────────────────┬───────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────┐
│                   Supabase Backend                       │
│  - PostgreSQL with RLS                                  │
│  - Real-time subscriptions                              │
│  - Edge Functions                                       │
│  - Storage buckets                                      │
└─────────────────────────────────────────────────────────┘
```

## Conventions

### 1. Components

- **Presentational components** should not:
  - Know database table names
  - Shape raw database responses
  - Contain business rules
  - Make direct API calls

- **Container components** (pages):
  - Compose presentational components
  - Use hooks for data fetching
  - Handle routing and navigation

### 2. State Management

- Use **custom hooks** for all data fetching
- Use **React Query** for caching and background refetching
- Use **Contexts** for global state (Auth, Emergency)
- Avoid prop drilling - use composition

### 3. Error Handling

- Use `ErrorBoundary` for component-level error catching
- Use `formatUserError()` for user-friendly error messages
- Use `logError()` for debugging (never expose to users)
- Handle loading and error states in every hook

### 4. TypeScript

- Define domain types in `src/shared/types/domain.ts`
- Avoid `any` - use proper typing
- Use types from `@/integrations/supabase/types` for DB operations

### 5. Styling

- Use semantic design tokens from `index.css`
- Never use colors directly - always use tokens
- All colors must be HSL
- Use `cn()` for conditional class merging

### 6. Security

- RLS policies enforce access control
- Never trust client-side validation alone
- Validate inputs on both client and server
- Use rate limiting for sensitive actions

## Query Limits

```typescript
const QUERY_LIMITS = {
  DEFAULT: 50,
  MAX: 100,
  ALERTS: 50,
  COMMUNITY_POSTS: 30,
  NOTIFICATIONS: 50,
};
```

## Rate Limits

```typescript
const RATE_LIMITS = {
  SOS_PER_HOUR: 3,
  AMBER_PER_HOUR: 3,
  INCIDENT_REPORTS_PER_HOUR: 10,
  POSTS_PER_HOUR: 10,
};
```

## Key Files

| File | Purpose |
|------|---------|
| `src/core/api/supabase-client.ts` | Centralized Supabase client |
| `src/core/api/helpers.ts` | Query result handling, error formatting |
| `src/core/config/constants.ts` | Application constants |
| `src/core/config/env.ts` | Environment validation |
| `src/core/utils/errors.ts` | Error handling utilities |
| `src/core/utils/validation.ts` | Input validation |
| `src/core/providers/ErrorBoundary.tsx` | Global error boundary |
| `src/shared/types/domain.ts` | Domain type definitions |
| `src/shared/hooks/useSupabaseQuery.ts` | Standardized query hook |
