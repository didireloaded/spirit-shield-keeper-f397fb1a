/**
 * Notification service for handling all app notifications
 * 
 * IMPORTANT: Notifications are created server-side only via:
 * 1. Database triggers (SECURITY DEFINER functions)
 * 2. Edge functions using service role key
 * 
 * Client-side code should NOT insert into the notifications table directly.
 */

// Notification types and their configurations
export const NOTIFICATION_CONFIG = {
  panic: {
    title: "🚨 Emergency Alert",
    sound: true,
    vibration: true,
    silent: false,
    priority: "high" as const,
    radiusKm: 1,
  },
  crash: {
    title: "🚗 Possible Crash Detected",
    sound: true,
    vibration: true,
    silent: false,
    priority: "high" as const,
    radiusKm: 2,
  },
  amber: {
    title: "🟡 Amber Alert",
    sound: true,
    vibration: true,
    silent: false,
    priority: "high" as const,
    radiusKm: 5,
  },
  authority_responding: {
    title: "🛡 Authority Update",
    sound: false,
    vibration: false,
    silent: true,
    priority: "normal" as const,
    radiusKm: 1,
  },
  resolved: {
    title: "✅ Incident Resolved",
    sound: false,
    vibration: false,
    silent: true,
    priority: "low" as const,
    radiusKm: 1,
  },
  comment: {
    title: "💬 New Comment",
    sound: false,
    vibration: false,
    silent: true,
    priority: "low" as const,
    radiusKm: 0,
  },
  nearby: {
    title: "⚠️ Safety Notice",
    sound: false,
    vibration: false,
    silent: true,
    priority: "normal" as const,
    radiusKm: 0.5,
  },
};

export type NotificationType = keyof typeof NOTIFICATION_CONFIG;

export interface NotificationPayload {
  type: NotificationType;
  title?: string;
  message: string;
  data?: Record<string, unknown>;
  incidentId?: string;
  location?: { lat: number; lng: number };
}

/**
 * Get human-readable message for incident type
 */
export function getIncidentMessage(
  type: NotificationType,
  context?: { distance?: number; verified?: boolean }
): string {
  switch (type) {
    case "panic":
      return context?.distance
        ? `Someone ${Math.round(context.distance)}m away has triggered an emergency alert.`
        : "Someone nearby has triggered an emergency alert.";

    case "crash":
      return context?.distance
        ? `A possible vehicle crash was detected ${Math.round(context.distance)}m away.`
        : "A possible vehicle crash was detected nearby.";

    case "amber":
      return "A missing person was reported in your area. Tap to view details.";

    case "authority_responding":
      return "Authorities are responding to an incident nearby.";

    case "resolved":
      return "An incident nearby has been resolved safely.";

    case "comment":
      return "Someone commented on a safety post you're following.";

    case "nearby":
      return "An incident was reported near your route.";

    default:
      return "Safety update in your area.";
  }
}

/**
 * Format relative time
 */
export function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffMins < 1440) return `${Math.floor(diffMins / 60)}h ago`;
  return `${Math.floor(diffMins / 1440)}d ago`;
}
