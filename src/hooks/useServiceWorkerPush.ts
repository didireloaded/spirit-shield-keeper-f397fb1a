/**
 * Service Worker Push Registration
 * Registers the notification-worker.js and manages push subscriptions
 */

import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export function useServiceWorkerPush() {
  const { user } = useAuth();
  const [registration, setRegistration] = useState<ServiceWorkerRegistration | null>(null);
  const [pushSubscription, setPushSubscription] = useState<PushSubscription | null>(null);
  const [permission, setPermission] = useState<NotificationPermission>("default");
  const [supported, setSupported] = useState(false);

  // Register service worker on mount
  useEffect(() => {
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) return;
    setSupported(true);
    setPermission(Notification.permission);

    navigator.serviceWorker
      .register("/notification-worker.js")
      .then((reg) => {
        setRegistration(reg);
        return (reg as any).pushManager?.getSubscription?.() ?? null;
      })
      .then((sub) => {
        if (sub) setPushSubscription(sub);
      })
      .catch((err) => console.error("[SW] Registration failed:", err));
  }, []);

  // Navigation from SW taps is handled by useNotificationNavigation (NOTIFICATION_TAP)
  // No duplicate handler needed here.

  // Request permission and subscribe
  const requestPermission = useCallback(async (): Promise<boolean> => {
    if (!supported || !registration) return false;

    try {
      const result = await Notification.requestPermission();
      setPermission(result);
      if (result !== "granted") return false;

      // Subscribe to push (VAPID key would be needed for real web push)
      // For now, store a subscription record so the server knows this user wants push
      const sub = await (registration as any).pushManager?.getSubscription?.();
      if (sub) {
        setPushSubscription(sub);
        await savePushSubscription(sub);
      }

      return true;
    } catch (err) {
      console.error("[SW] Permission request failed:", err);
      return false;
    }
  }, [supported, registration]);

  // Save subscription to database
  const savePushSubscription = async (sub: PushSubscription) => {
    if (!user) return;
    const subJson = sub.toJSON();

    try {
      await supabase.from("push_subscriptions").upsert(
        {
          user_id: user.id,
          endpoint: sub.endpoint,
          p256dh: subJson.keys?.p256dh || "",
          auth: subJson.keys?.auth || "",
        },
        { onConflict: "user_id" }
      );
    } catch (err) {
      console.error("[SW] Failed to save push subscription:", err);
    }
  };

  return {
    supported,
    permission,
    registration,
    pushSubscription,
    requestPermission,
  };
}
