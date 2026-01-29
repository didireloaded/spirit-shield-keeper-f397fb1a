/**
 * Map Markers Hook
 * Fetches markers within current map bounds
 * Only fetches when map is idle (not during pan/zoom)
 */

import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { MapBounds } from "./useMapBounds";
import { QUERY_LIMITS } from "@/core/config/constants";

export interface MapMarker {
  id: string;
  latitude: number;
  longitude: number;
  type: string;
  description: string | null;
  user_id: string;
  created_at: string;
  status?: string;
  verified_count?: number;
  comment_count?: number;
  expires_at?: string;
}

interface UseMapMarkersOptions {
  bounds: MapBounds | null;
  isIdle: boolean;
  enabled?: boolean;
}

export function useMapMarkers({
  bounds,
  isIdle,
  enabled = true,
}: UseMapMarkersOptions) {
  const [markers, setMarkers] = useState<MapMarker[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchMarkers = useCallback(async () => {
    if (!bounds || !isIdle || !enabled) return;

    setLoading(true);
    setError(null);

    try {
      const { data, error: fetchError } = await supabase
        .from("markers")
        .select("*")
        .gte("latitude", bounds.minLat)
        .lte("latitude", bounds.maxLat)
        .gte("longitude", bounds.minLng)
        .lte("longitude", bounds.maxLng)
        .gte("expires_at", new Date().toISOString())
        .order("created_at", { ascending: false })
        .limit(QUERY_LIMITS.MARKERS);

      if (fetchError) {
        setError(fetchError.message);
      } else {
        setMarkers(data ?? []);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch markers");
    } finally {
      setLoading(false);
    }
  }, [bounds, isIdle, enabled]);

  // Fetch when bounds change and map is idle
  useEffect(() => {
    fetchMarkers();
  }, [fetchMarkers]);

  // Set up realtime subscription
  useEffect(() => {
    if (!enabled) return;

    const channel = supabase
      .channel("map-markers-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "markers" },
        () => {
          // Refetch on any change
          if (isIdle) {
            fetchMarkers();
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [enabled, isIdle, fetchMarkers]);

  return {
    markers,
    loading,
    error,
    refetch: fetchMarkers,
  };
}
