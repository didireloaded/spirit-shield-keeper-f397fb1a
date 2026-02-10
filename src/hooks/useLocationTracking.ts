/**
 * Location Tracking Hook
 * Tracks and publishes current user's location to Supabase
 */

import { useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { distanceInMeters } from "@/lib/geo";

interface LocationTrackingOptions {
  enabled: boolean;
  ghostMode: boolean;
  updateInterval?: number;
}

export function useLocationTracking({
  enabled,
  ghostMode,
  updateInterval = 10000,
}: LocationTrackingOptions) {
  const { user } = useAuth();
  const watchIdRef = useRef<number | null>(null);
  const lastUpdateRef = useRef<number>(0);
  const currentLocationRef = useRef<{ lat: number; lng: number } | null>(null);

  const updateLocation = useCallback(
    async (position: GeolocationPosition) => {
      if (!user) return;

      const now = Date.now();
      const { latitude, longitude, heading, speed, accuracy } = position.coords;

      // Throttle updates
      if (now - lastUpdateRef.current < updateInterval) return;

      // Skip if not moved significantly (>10m)
      if (currentLocationRef.current) {
        const dist = distanceInMeters(
          currentLocationRef.current.lat,
          currentLocationRef.current.lng,
          latitude,
          longitude
        );
        const isMoving = (speed || 0) > 0.5;
        if (dist < 10 && !isMoving) return;
      }

      lastUpdateRef.current = now;
      currentLocationRef.current = { lat: latitude, lng: longitude };

      const isMoving = (speed || 0) > 0.5;

      try {
        const { error } = await supabase.from("user_locations").upsert(
          {
            user_id: user.id,
            latitude,
            longitude,
            heading: heading ?? null,
            speed: speed ?? null,
            accuracy: accuracy ?? null,
            is_moving: isMoving,
            ghost_mode: ghostMode,
          } as any,
          { onConflict: "user_id" }
        );

        if (error) { /* silent - location updates are non-critical */ }
      } catch {
        // Silent fail - location tracking is best-effort
      }
    },
    [user, ghostMode, updateInterval]
  );

  useEffect(() => {
    if (!enabled || !user) {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
      return;
    }

    const watchId = navigator.geolocation.watchPosition(
      updateLocation,
      () => {},
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 5000 }
    );

    watchIdRef.current = watchId;

    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
    };
  }, [enabled, user, updateLocation]);

  return { currentLocation: currentLocationRef.current };
}
