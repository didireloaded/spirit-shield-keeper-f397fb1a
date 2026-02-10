/**
 * Real-time User Locations Hook
 * Fetches and subscribes to live user locations with profiles
 */

import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface UserLocation {
  id: string;
  user_id: string;
  latitude: number;
  longitude: number;
  heading?: number | null;
  speed?: number | null;
  accuracy?: number | null;
  location_name?: string | null;
  is_moving: boolean;
  ghost_mode: boolean;
  updated_at: string | null;
  profile?: {
    avatar_url?: string | null;
    full_name?: string | null;
    username?: string | null;
  } | null;
}

export function useRealtimeLocations() {
  const [locations, setLocations] = useState<UserLocation[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchLocations = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from("user_locations")
        .select("*")
        .eq("ghost_mode", false)
        .order("updated_at", { ascending: false })
        .limit(200);

      if (error) throw error;

      if (!data || data.length === 0) {
        setLocations([]);
        return;
      }

      // Fetch profiles separately (no FK relationship)
      const userIds = [...new Set(data.map((d: any) => d.user_id))];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, avatar_url, full_name, username")
        .in("id", userIds);

      const profileMap = new Map(profiles?.map((p) => [p.id, p]) || []);

      setLocations(
        data.map((d: any) => ({
          ...d,
          is_moving: d.is_moving ?? false,
          ghost_mode: d.ghost_mode ?? false,
          profile: profileMap.get(d.user_id) || null,
        }))
      );
    } catch {
      // Silent fail - locations are non-critical
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLocations();

    const channel = supabase
      .channel("user-locations-realtime")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "user_locations",
        },
        async (payload) => {
          if (payload.eventType === "DELETE") {
            setLocations((prev) =>
              prev.filter((loc) => loc.user_id !== (payload.old as any).user_id)
            );
            return;
          }

          const newData = payload.new as any;

          // Skip ghost mode users
          if (newData.ghost_mode) {
            setLocations((prev) =>
              prev.filter((loc) => loc.user_id !== newData.user_id)
            );
            return;
          }

          // Fetch profile for this user
          const { data: profile } = await supabase
            .from("profiles")
            .select("avatar_url, full_name, username")
            .eq("id", newData.user_id)
            .single();

          const updatedLocation: UserLocation = {
            ...newData,
            is_moving: newData.is_moving ?? false,
            ghost_mode: newData.ghost_mode ?? false,
            profile,
          };

          setLocations((prev) => {
            const idx = prev.findIndex((loc) => loc.user_id === newData.user_id);
            if (idx >= 0) {
              const updated = [...prev];
              updated[idx] = updatedLocation;
              return updated;
            }
            return [...prev, updatedLocation];
          });
        }
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, [fetchLocations]);

  return { locations, loading, refetch: fetchLocations };
}
