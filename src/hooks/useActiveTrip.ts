/**
 * Active Trip Hook
 * Fetches and tracks the user's active safety session
 * Used for displaying route on the map
 */

import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface ActiveTrip {
  id: string;
  destination: string;
  destination_lat: number | null;
  destination_lng: number | null;
  status: string;
  expected_arrival: string;
  departure_time: string;
}

export interface RouteData {
  id: string;
  startLat: number;
  startLng: number;
  endLat: number;
  endLng: number;
  destinationName?: string;
  status?: string;
}

interface UseActiveTripOptions {
  userLat?: number | null;
  userLng?: number | null;
}

export function useActiveTrip(options: UseActiveTripOptions = {}) {
  const { userLat, userLng } = options;
  const { user } = useAuth();
  const [activeTrip, setActiveTrip] = useState<ActiveTrip | null>(null);
  const [routes, setRoutes] = useState<RouteData[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchActiveTrip = useCallback(async () => {
    if (!user) {
      setActiveTrip(null);
      setRoutes([]);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const { data, error: fetchError } = await supabase
        .from("safety_sessions")
        .select("*")
        .eq("user_id", user.id)
        .in("status", ["active", "late"])
        .order("created_at", { ascending: false })
        .limit(1)
        .single();

      if (fetchError && fetchError.code !== "PGRST116") {
        // PGRST116 = no rows returned, not an error
        setError(fetchError.message);
      }

      setActiveTrip(data ?? null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch trip");
    } finally {
      setLoading(false);
    }
  }, [user]);

  // Initial fetch
  useEffect(() => {
    fetchActiveTrip();
  }, [fetchActiveTrip]);

  // Real-time subscription
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel("safety-session-map")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "safety_sessions",
          filter: `user_id=eq.${user.id}`,
        },
        () => fetchActiveTrip()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, fetchActiveTrip]);

  // Build routes when trip or user location changes
  useEffect(() => {
    if (
      activeTrip &&
      userLat != null &&
      userLng != null &&
      activeTrip.destination_lat != null &&
      activeTrip.destination_lng != null
    ) {
      setRoutes([
        {
          id: activeTrip.id,
          startLat: userLat,
          startLng: userLng,
          endLat: activeTrip.destination_lat,
          endLng: activeTrip.destination_lng,
          destinationName: activeTrip.destination,
          status: activeTrip.status,
        },
      ]);
    } else {
      setRoutes([]);
    }
  }, [activeTrip, userLat, userLng]);

  return {
    activeTrip,
    routes,
    loading,
    error,
    refetch: fetchActiveTrip,
    hasActiveTrip: activeTrip !== null,
    isLate: activeTrip?.status === "late",
  };
}
