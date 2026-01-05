import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";

interface NotificationPayload {
  title: string;
  body: string;
  data?: Record<string, unknown>;
}

export const usePushNotifications = () => {
  const { user } = useAuth();
  const [permission, setPermission] = useState<NotificationPermission>("default");
  const [supported, setSupported] = useState(false);

  useEffect(() => {
    // Check if notifications are supported
    if ("Notification" in window) {
      setSupported(true);
      setPermission(Notification.permission);
    }
  }, []);

  const requestPermission = useCallback(async () => {
    if (!supported) return false;

    try {
      const result = await Notification.requestPermission();
      setPermission(result);
      return result === "granted";
    } catch (error) {
      console.error("Error requesting notification permission:", error);
      return false;
    }
  }, [supported]);

  const showNotification = useCallback(
    ({ title, body, data }: NotificationPayload) => {
      if (!supported || permission !== "granted") return;

      try {
        const notification = new Notification(title, {
          body,
          icon: "/favicon.ico",
          badge: "/favicon.ico",
          tag: data?.id as string || Date.now().toString(),
          data,
          requireInteraction: true,
        });

        notification.onclick = () => {
          window.focus();
          notification.close();
          
          // Handle navigation based on notification type
          if (data?.type === "alert") {
            window.location.href = "/alerts";
          } else if (data?.type === "trip") {
            window.location.href = "/look-after-me";
          } else if (data?.type === "watcher") {
            window.location.href = "/watchers";
          }
        };

        // Auto-close after 10 seconds
        setTimeout(() => notification.close(), 10000);
      } catch (error) {
        console.error("Error showing notification:", error);
      }
    },
    [supported, permission]
  );

  const notifyNearbyAlert = useCallback(
    (alertType: string, distance: string) => {
      showNotification({
        title: `🚨 ${alertType.toUpperCase()} Alert Nearby`,
        body: `A ${alertType} alert was triggered ${distance} away from you.`,
        data: { type: "alert" },
      });
    },
    [showNotification]
  );

  const notifyTripStatus = useCallback(
    (status: "late" | "arrived" | "emergency", userName: string) => {
      const messages = {
        late: {
          title: "⏰ Trip Running Late",
          body: `${userName} is running late on their trip.`,
        },
        arrived: {
          title: "✅ Arrived Safely",
          body: `${userName} has arrived at their destination safely.`,
        },
        emergency: {
          title: "🚨 EMERGENCY",
          body: `${userName} has triggered an emergency alert during their trip!`,
        },
      };

      const message = messages[status];
      showNotification({
        title: message.title,
        body: message.body,
        data: { type: "trip" },
      });
    },
    [showNotification]
  );

  const notifyWatcherRequest = useCallback(
    (userName: string, action: "request" | "accepted" | "rejected") => {
      const messages = {
        request: {
          title: "👀 New Watcher Request",
          body: `${userName} wants you to be their watcher.`,
        },
        accepted: {
          title: "✅ Watcher Request Accepted",
          body: `${userName} accepted your watcher request.`,
        },
        rejected: {
          title: "❌ Watcher Request Declined",
          body: `${userName} declined your watcher request.`,
        },
      };

      const message = messages[action];
      showNotification({
        title: message.title,
        body: message.body,
        data: { type: "watcher" },
      });
    },
    [showNotification]
  );

  return {
    supported,
    permission,
    requestPermission,
    showNotification,
    notifyNearbyAlert,
    notifyTripStatus,
    notifyWatcherRequest,
  };
};
