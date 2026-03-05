/**
 * React Query cache configuration per data type
 */

export const CACHE_CONFIG = {
  // Real-time data — short cache
  incidents: { staleTime: 30_000, gcTime: 5 * 60_000 },
  panic_alerts: { staleTime: 0, gcTime: 60_000 },

  // User data — medium cache
  user_profile: { staleTime: 5 * 60_000, gcTime: 30 * 60_000 },
  watchers: { staleTime: 2 * 60_000, gcTime: 10 * 60_000 },

  // Static data — long cache
  authorities: { staleTime: 24 * 60 * 60_000, gcTime: 7 * 24 * 60 * 60_000 },
  incident_types: { staleTime: 24 * 60 * 60_000, gcTime: 7 * 24 * 60 * 60_000 },
} as const;
