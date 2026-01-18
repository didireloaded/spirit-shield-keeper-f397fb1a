/**
 * Notification service for handling all app notifications
 * Manages push notifications, in-app notifications, and geo-filtered delivery
 */

import { supabase } from "@/integrations/supabase/client";
import { distanceInMeters } from "@/lib/geo";

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
 * Create an in-app notification for a user
 */
export async function createNotification(
  userId: string,
  payload: NotificationPayload
) {
  const config = NOTIFICATION_CONFIG[payload.type];

  const { data, error } = await supabase.from("notifications").insert([{
    user_id: userId,
    type: payload.type,
    title: payload.title || config.title,
    body: payload.message,
    priority: config.priority,
    entity_id: payload.incidentId,
    entity_type: payload.incidentId ? "incident" : undefined,
    data: payload.data as any,
    read: false,
  }]);

  if (error) {
    console.error("[NotificationService] Failed to create notification:", error);
    return null;
  }

  return data;
}

/**
 * Notify users within a radius of an incident
 */
export async function notifyNearbyUsers(
  incidentLat: number,
  incidentLng: number,
  excludeUserId: string,
  payload: NotificationPayload
) {
  const config = NOTIFICATION_CONFIG[payload.type];
  const radiusMeters = config.radiusKm * 1000;

  // Get all user locations
  const { data: locations } = await supabase
    .from("user_locations")
    .select("user_id, latitude, longitude")
    .neq("user_id", excludeUserId);

  if (!locations || locations.length === 0) return [];

  // Filter users within radius
  const nearbyUsers = locations.filter((loc) => {
    const distance = distanceInMeters(
      incidentLat,
      incidentLng,
      loc.latitude,
      loc.longitude
    );
    return distance <= radiusMeters;
  });

  console.log(
    `[NotificationService] Found ${nearbyUsers.length} users within ${config.radiusKm}km`
  );

  // Create notifications for each nearby user
  const notifications = await Promise.all(
    nearbyUsers.map((user) =>
      createNotification(user.user_id, payload)
    )
  );

  return notifications.filter(Boolean);
}

/**
 * Notify a user's watchers
 */
export async function notifyWatchers(
  userId: string,
  payload: NotificationPayload
) {
  // Get all watchers for this user
  const { data: watchers } = await supabase
    .from("watchers")
    .select("watcher_id")
    .eq("user_id", userId)
    .eq("status", "accepted");

  if (!watchers || watchers.length === 0) return [];

  console.log(
    `[NotificationService] Notifying ${watchers.length} watchers`
  );

  // Create notifications for each watcher
  const notifications = await Promise.all(
    watchers.map((w) =>
      createNotification(w.watcher_id, payload)
    )
  );

  return notifications.filter(Boolean);
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
