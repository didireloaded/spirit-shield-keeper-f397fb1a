import { useState, useEffect, useCallback, useRef } from "react";
import { distanceInMeters } from "@/lib/geo";

interface Alert {
  id: string;
  latitude: number;
  longitude: number;
  type: string;
  status?: string;
  created_at?: string;
  description?: string;
}

interface NearbyAlert extends Alert {
  distance: number;
}

interface UseNearbyAlertsOptions {
  userLat: number | null;
  userLng: number | null;
  alerts: Alert[];
  radiusMeters?: number;
  highPriorityTypes?: string[];
  cooldownMs?: number;
}

export function useNearbyAlerts({
  userLat,
  userLng,
  alerts,
  radiusMeters = 500,
  highPriorityTypes = ["panic", "amber", "assault", "kidnapping"],
  cooldownMs = 600000, // 10 minutes
}: UseNearbyAlertsOptions) {
  const [nearbyAlert, setNearbyAlert] = useState<NearbyAlert | null>(null);
  const [dismissedAlerts, setDismissedAlerts] = useState<Set<string>>(new Set());
  const lastAlertTime = useRef<number>(0);

  const checkNearbyAlerts = useCallback(() => {
    if (!userLat || !userLng || alerts.length === 0) {
      setNearbyAlert(null);
      return;
    }

    // Find the closest active alert within radius
    let closestAlert: NearbyAlert | null = null;
    let minDistance = Infinity;

    for (const alert of alerts) {
      // Skip dismissed alerts
      if (dismissedAlerts.has(alert.id)) continue;
      
      // Skip non-active alerts
      if (alert.status && alert.status !== "active") continue;

      const distance = distanceInMeters(
        userLat,
        userLng,
        alert.latitude,
        alert.longitude
      );

      if (distance <= radiusMeters && distance < minDistance) {
        minDistance = distance;
        closestAlert = { ...alert, distance };
      }
    }

    // Check cooldown for non-high-priority alerts
    if (closestAlert) {
      const isHighPriority = highPriorityTypes.includes(closestAlert.type);
      const now = Date.now();
      
      if (!isHighPriority && now - lastAlertTime.current < cooldownMs) {
        return; // Don't show if within cooldown
      }
      
      lastAlertTime.current = now;
    }

    setNearbyAlert(closestAlert);
  }, [userLat, userLng, alerts, radiusMeters, highPriorityTypes, cooldownMs, dismissedAlerts]);

  useEffect(() => {
    checkNearbyAlerts();
  }, [checkNearbyAlerts]);

  const dismissAlert = useCallback((alertId: string) => {
    setDismissedAlerts((prev) => new Set([...prev, alertId]));
    setNearbyAlert(null);
  }, []);

  const isHighPriority = nearbyAlert 
    ? highPriorityTypes.includes(nearbyAlert.type) 
    : false;

  return {
    nearbyAlert,
    isHighPriority,
    dismissAlert,
    checkNearbyAlerts,
  };
}
