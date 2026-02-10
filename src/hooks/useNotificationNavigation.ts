/**
 * Notification Navigation Handler
 * 
 * Receives NOTIFICATION_TAP messages from the service worker
 * and navigates to the exact context within the app.
 * 
 * Routes:
 * - panic      → /map?panic={id}&lat=...&lng=...&zoom=16
 * - incident   → /map?incident={id}&lat=...&lng=...&zoom=15
 * - amber      → /amber-chat/{id}
 * - lookAfterMe → /look-after-me
 */

import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

export function useNotificationNavigation() {
  const navigate = useNavigate();

  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    const handler = (event: MessageEvent) => {
      if (event.data?.type !== "NOTIFICATION_TAP") return;

      const { relatedType, relatedId, lat, lng, url } = event.data;

      switch (relatedType) {
        case "panic": {
          const params = new URLSearchParams();
          params.set("panic", relatedId);
          if (lat && lng) {
            params.set("lat", String(lat));
            params.set("lng", String(lng));
            params.set("zoom", "16");
          }
          navigate(`/map?${params.toString()}`);
          break;
        }
        case "incident": {
          const params = new URLSearchParams();
          params.set("incident", relatedId);
          if (lat && lng) {
            params.set("lat", String(lat));
            params.set("lng", String(lng));
            params.set("zoom", "15");
          }
          navigate(`/map?${params.toString()}`);
          break;
        }
        case "amber":
          navigate(`/amber-chat/${relatedId}`);
          break;
        case "lookAfterMe":
          navigate("/look-after-me");
          break;
        default:
          // Fallback to provided URL or alerts
          navigate(url || "/alerts");
          break;
      }
    };

    navigator.serviceWorker.addEventListener("message", handler);
    return () => navigator.serviceWorker.removeEventListener("message", handler);
  }, [navigate]);
}
