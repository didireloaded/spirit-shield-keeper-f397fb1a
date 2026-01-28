/**
 * Application Constants
 * Centralized configuration values
 */

// ============= Query Limits =============
export const QUERY_LIMITS = {
  DEFAULT: 50,
  MAX: 100,
  ALERTS: 50,
  MARKERS: 100,
  COMMUNITY_POSTS: 30,
  NOTIFICATIONS: 50,
  MESSAGES: 50,
  WATCHERS: 100,
} as const;

// ============= Rate Limits =============
export const RATE_LIMITS = {
  SOS_PER_HOUR: 3,
  AMBER_PER_HOUR: 3,
  INCIDENT_REPORTS_PER_HOUR: 10,
  POSTS_PER_HOUR: 10,
  COMMENTS_PER_HOUR: 30,
} as const;

// ============= Geo Constants =============
export const GEO = {
  DEFAULT_ZOOM: 14,
  CLUSTER_ZOOM: 12,
  HEATMAP_FADE_ZOOM: 15,
  NEARBY_RADIUS_METERS: 500,
  HIGH_PRIORITY_RADIUS_METERS: 300,
  NOTIFICATION_RADIUS_KM: 10,
  MARKER_EXPIRY_HOURS: 24,
} as const;

// ============= Time Constants =============
export const TIME = {
  STALE_SHORT_MS: 10 * 1000, // 10 seconds
  STALE_MEDIUM_MS: 30 * 1000, // 30 seconds
  STALE_LONG_MS: 5 * 60 * 1000, // 5 minutes
  CACHE_PROFILE_MS: 10 * 60 * 1000, // 10 minutes
  AUDIO_CHUNK_SECONDS: 15,
  CRASH_COUNTDOWN_SECONDS: 10,
  LOCATION_UPDATE_INTERVAL_MS: 5000,
} as const;

// ============= UI Constants =============
export const UI = {
  TOAST_DURATION_MS: 4000,
  ANIMATION_DURATION_MS: 300,
  DEBOUNCE_SEARCH_MS: 300,
  MAX_FILE_SIZE_MB: 10,
  MAX_DESCRIPTION_LENGTH: 5000,
  MAX_SHORT_TEXT_LENGTH: 500,
} as const;

// ============= Alert Type Colors =============
export const ALERT_COLORS: Record<string, string> = {
  panic: "bg-destructive",
  amber: "bg-warning",
  robbery: "bg-purple-500",
  assault: "bg-destructive",
  accident: "bg-orange-500",
  suspicious: "bg-pink-500",
  kidnapping: "bg-destructive",
  medical: "bg-blue-500",
  fire: "bg-red-600",
  other: "bg-muted",
} as const;

// ============= Status Colors =============
export const STATUS_COLORS: Record<string, string> = {
  active: "bg-success",
  resolved: "bg-muted",
  cancelled: "bg-muted-foreground",
  escalated: "bg-destructive",
  late: "bg-warning",
  arrived: "bg-success",
  pending: "bg-warning",
  accepted: "bg-success",
  rejected: "bg-destructive",
} as const;

// ============= Responder Types =============
export const RESPONDER_CONFIG = {
  police: { emoji: "🚔", color: "#3B82F6" },
  ambulance: { emoji: "🚑", color: "#EF4444" },
  authority: { emoji: "🛡️", color: "#8B5CF6" },
} as const;

// ============= Marker Types =============
export const MARKER_TYPES = [
  "robbery",
  "accident", 
  "suspicious",
  "assault",
  "kidnapping",
  "other",
] as const;

export const MARKER_TYPE_CONFIG: Record<string, { label: string; color: string }> = {
  robbery: { label: "Robbery", color: "bg-destructive" },
  accident: { label: "Accident", color: "bg-warning" },
  suspicious: { label: "Suspicious", color: "bg-accent" },
  assault: { label: "Assault", color: "bg-destructive" },
  kidnapping: { label: "Kidnapping", color: "bg-destructive" },
  other: { label: "Other", color: "bg-muted" },
} as const;
