/**
 * UserPresence Stream
 * Real-time subscription for user presence data
 * Maps to: UserPresence { userId, isOnline, ghostMode, lastUpdatedAt, location }
 * 
 * RULES:
 * - ghostMode === true → location not exposed to map or users
 * - Used by: Active Users Panel, Map presence dots
 * - Panic/Incident logic ignores ghostMode
 */

import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface UserPresence {
  userId: string;
  isOnline: boolean;
  ghostMode: boolean;
  lastUpdatedAt: string | null;
  location: {
    lat: number;
    lng: number;
    placeName: string | null;
  } | null;
  profile?: {
    avatar_url?: string | null;
    full_name?: string | null;
    username?: string | null;
  } | null;
  isMoving: boolean;
  speed?: number | null;
  heading?: number | null;
}

export function useUserPresenceStream() {
  const [presences, setPresences] = useState<UserPresence[]>([]);
  const [loading, setLoading] = useState(true);

  const mapRow = (row: any, profile?: any): UserPresence => ({
    userId: row.user_id,
    isOnline: true,
    ghostMode: row.ghost_mode ?? false,
    lastUpdatedAt: row.updated_at,
    location: row.ghost_mode
      ? null
      : { lat: row.latitude, lng: row.longitude, placeName: row.location_name || null },
    profile: profile || null,
    isMoving: row.is_moving ?? false,
    speed: row.speed,
    heading: row.heading,
  });

  const fetchAll = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from("user_locations")
        .select(`*, profile:profiles!user_id (avatar_url, full_name, username)`)
        .order("updated_at", { ascending: false })
        .limit(200);

      if (error) throw error;

      setPresences(
        (data || []).map((d: any) => {
          const profile = Array.isArray(d.profile) ? d.profile[0] ?? null : d.profile;
          return mapRow(d, profile);
        })
      );
    } catch (e) {
      console.error("[UserPresenceStream] fetch error:", e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAll();

    const channel = supabase
      .channel("stream-user-presence")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "user_locations" },
        async (payload) => {
          if (payload.eventType === "DELETE") {
            setPresences((prev) => prev.filter((p) => p.userId !== (payload.old as any).user_id));
            return;
          }

          const row = payload.new as any;

          // Fetch profile
          const { data: profile } = await supabase
            .from("profiles")
            .select("avatar_url, full_name, username")
            .eq("id", row.user_id)
            .single();

          const updated = mapRow(row, profile);

          setPresences((prev) => {
            const idx = prev.findIndex((p) => p.userId === row.user_id);
            if (idx >= 0) {
              const next = [...prev];
              next[idx] = updated;
              return next;
            }
            return [...prev, updated];
          });
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [fetchAll]);

  // Filtered: only non-ghost for UI consumers
  const visiblePresences = presences.filter((p) => !p.ghostMode);

  return { presences, visiblePresences, loading, refetch: fetchAll };
}
