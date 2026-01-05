import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface GeolocationState {
  latitude: number | null;
  longitude: number | null;
  accuracy: number | null;
  heading: number | null;
  speed: number | null;
  error: string | null;
  loading: boolean;
}

export const useGeolocation = (updateToServer = true) => {
  const [state, setState] = useState<GeolocationState>({
    latitude: null,
    longitude: null,
    accuracy: null,
    heading: null,
    speed: null,
    error: null,
    loading: true,
  });
  
  const { user } = useAuth();

  const updateServerLocation = useCallback(
    async (position: GeolocationPosition) => {
      if (!user || !updateToServer) return;

      const { error } = await supabase.from("user_locations").upsert(
        {
          user_id: user.id,
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
          heading: position.coords.heading,
          speed: position.coords.speed,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id" }
      );

      if (error) {
        console.error("[Geolocation] Failed to update server:", error);
      }
    },
    [user, updateToServer]
  );

  const getCurrentPosition = useCallback(() => {
    if (!navigator.geolocation) {
      setState((prev) => ({
        ...prev,
        error: "Geolocation is not supported by your browser",
        loading: false,
      }));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setState({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
          heading: position.coords.heading,
          speed: position.coords.speed,
          error: null,
          loading: false,
        });
        updateServerLocation(position);
      },
      (error) => {
        setState((prev) => ({
          ...prev,
          error: error.message,
          loading: false,
        }));
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 30000,
      }
    );
  }, [updateServerLocation]);

  useEffect(() => {
    getCurrentPosition();

    // Watch position for real-time updates
    const watchId = navigator.geolocation.watchPosition(
      (position) => {
        setState({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
          heading: position.coords.heading,
          speed: position.coords.speed,
          error: null,
          loading: false,
        });
        updateServerLocation(position);
      },
      (error) => {
        setState((prev) => ({ ...prev, error: error.message }));
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 30000,
      }
    );

    return () => {
      navigator.geolocation.clearWatch(watchId);
    };
  }, [getCurrentPosition, updateServerLocation]);

  return { ...state, refresh: getCurrentPosition };
};
