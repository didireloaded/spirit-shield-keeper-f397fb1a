/**
 * Contextual Panic Mode
 * Infers emergency context from location, time, movement
 * Same button → smarter behavior
 */

import { useCallback } from "react";
import { useSafetyZones } from "./useSafetyZones";

export type PanicContext = "home_emergency" | "travel_emergency" | "silent_tracking";

interface ContextSignals {
  latitude: number | null;
  longitude: number | null;
  speed: number;
  hour: number;
}

export const useContextualPanic = () => {
  const { isInSafeZone } = useSafetyZones();

  const inferContext = useCallback((signals: ContextSignals): PanicContext => {
    const { latitude, longitude, speed, hour } = signals;

    // If in a known safe zone → home emergency
    if (latitude && longitude) {
      const zone = isInSafeZone(latitude, longitude);
      if (zone && (zone.zone_type === "home" || zone.zone_type === "work")) {
        return "home_emergency";
      }
    }

    // If moving fast → travel emergency
    if (speed > 5) return "travel_emergency";

    // Night time (10pm-5am) → silent tracking
    if (hour >= 22 || hour < 5) return "silent_tracking";

    // Default to travel emergency
    return "travel_emergency";
  }, [isInSafeZone]);

  const getContextConfig = useCallback((context: PanicContext) => {
    switch (context) {
      case "home_emergency":
        return {
          enableRecording: true,
          enableLocationTracking: true,
          silentMode: false,
          notifyAuthorities: true,
          broadcastRadius: 1000, // 1km for home
          label: "Home Emergency",
        };
      case "travel_emergency":
        return {
          enableRecording: true,
          enableLocationTracking: true,
          silentMode: false,
          notifyAuthorities: true,
          broadcastRadius: 5000, // 5km for travel
          label: "Travel Emergency",
        };
      case "silent_tracking":
        return {
          enableRecording: true,
          enableLocationTracking: true,
          silentMode: true,
          notifyAuthorities: false, // Only notify watchers silently
          broadcastRadius: 3000,
          label: "Silent Tracking",
        };
    }
  }, []);

  return { inferContext, getContextConfig };
};
