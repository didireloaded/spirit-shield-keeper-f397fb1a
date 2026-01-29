/**
 * Watcher Locations Hook
 * Fetches locations of trusted contacts (watchers)
 * Real-time updates via Supabase subscription
 */

import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface WatcherLocation {
  id: string;
  name: string;
  avatarUrl?: string;
  latitude: number;
  longitude: number;
  updatedAt: string;
}

export function useWatcherLocations() {
  const { user } = useAuth();
  const [locations, setLocations] = useState<WatcherLocation[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchWatcherLocations = useCallback(async () => {
    if (!user) {
      setLocations([]);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Get accepted watcher relationships
      const { data: watcherRelations, error: relError } = await supabase
        .from("watchers")
        .select("user_id, watcher_id")
        .eq("status", "accepted")
        .or(`user_id.eq.${user.id},watcher_id.eq.${user.id}`);

      if (relError) {
        setError(relError.message);
        setLoading(false);
        return;
      }

      if (!watcherRelations || watcherRelations.length === 0) {
        setLocations([]);
        setLoading(false);
        return;
      }

      // Get unique watcher IDs (excluding current user)
      const watcherIds = [
        ...new Set(
          watcherRelations
            .flatMap((r) => [r.user_id, r.watcher_id])
            .filter((id) => id !== user.id)
        ),
      ];

      if (watcherIds.length === 0) {
        setLocations([]);
        setLoading(false);
        return;
      }

      // Fetch locations and profiles in parallel
      const [locationsResult, profilesResult] = await Promise.all([
        supabase
          .from("user_locations")
          .select("user_id, latitude, longitude, updated_at")
          .in("user_id", watcherIds),
        supabase
          .from("profiles")
          .select("id, full_name, avatar_url")
          .in("id", watcherIds),
      ]);

      if (locationsResult.error) {
        setError(locationsResult.error.message);
        setLoading(false);
        return;
      }

      const locs = locationsResult.data ?? [];
      const profiles = profilesResult.data ?? [];

      const watcherLocs: WatcherLocation[] = locs.map((loc) => {
        const profile = profiles.find((p) => p.id === loc.user_id);
        return {
          id: loc.user_id,
          name: profile?.full_name || "Watcher",
          avatarUrl: profile?.avatar_url || undefined,
          latitude: loc.latitude,
          longitude: loc.longitude,
          updatedAt: loc.updated_at || new Date().toISOString(),
        };
      });

      setLocations(watcherLocs);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch watcher locations");
    } finally {
      setLoading(false);
    }
  }, [user]);

  // Initial fetch
  useEffect(() => {
    fetchWatcherLocations();
  }, [fetchWatcherLocations]);

  // Real-time subscription
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel("watcher-locations-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "user_locations" },
        () => fetchWatcherLocations()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, fetchWatcherLocations]);

  return {
    locations,
    loading,
    error,
    refetch: fetchWatcherLocations,
    count: locations.length,
  };
}
