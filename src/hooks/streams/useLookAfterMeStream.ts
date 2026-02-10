/**
 * LookAfterMe Stream
 * Real-time subscription for watch-linked safety sessions
 * Maps to: LookAfterMeSession { sessionId, userId, watchId, isActive, liveLocation, movementPath }
 * 
 * RULES:
 * - Only active when user explicitly enables it
 * - Visible on Map only if isActive === true AND ghostMode === false
 * - Real-time movement
 */

import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface LookAfterMeSession {
  sessionId: string;
  userId: string;
  isActive: boolean;
  startedAt: string;
  endedAt?: string | null;
  destination: string;
  liveLocation: {
    lat: number;
    lng: number;
    placeName: string | null;
    updatedAt: string | null;
  } | null;
  userName?: string;
  avatarUrl?: string | null;
  status: string;
  expectedArrival: string;
  destinationLat: number | null;
  destinationLng: number | null;
}

export function useLookAfterMeStream() {
  const { user } = useAuth();
  const [sessions, setSessions] = useState<LookAfterMeSession[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchSessions = useCallback(async () => {
    if (!user) { setLoading(false); return; }

    try {
      // Get users I watch
      const { data: watchers } = await supabase
        .from("watchers")
        .select("user_id")
        .eq("watcher_id", user.id)
        .eq("status", "accepted");

      if (!watchers?.length) { setSessions([]); setLoading(false); return; }

      const watchedIds = watchers.map((w) => w.user_id);

      const { data: safetySessions } = await supabase
        .from("safety_sessions")
        .select("*")
        .in("user_id", watchedIds)
        .in("status", ["active", "late"])
        .order("created_at", { ascending: false });

      if (!safetySessions?.length) { setSessions([]); setLoading(false); return; }

      const userIds = safetySessions.map((s) => s.user_id);
      const [{ data: profiles }, { data: locations }] = await Promise.all([
        supabase.from("profiles").select("id, full_name, avatar_url, ghost_mode").in("id", userIds),
        supabase.from("user_locations").select("user_id, latitude, longitude, location_name, updated_at, ghost_mode").in("user_id", userIds),
      ]);

      const profileMap = new Map(profiles?.map((p) => [p.id, p]) || []);
      const locationMap = new Map(locations?.map((l) => [l.user_id, l]) || []);

      setSessions(
        safetySessions
          .filter((s) => {
            const p = profileMap.get(s.user_id);
            const l = locationMap.get(s.user_id);
            return !(p?.ghost_mode || l?.ghost_mode);
          })
          .map((s) => {
            const p = profileMap.get(s.user_id);
            const l = locationMap.get(s.user_id);
            return {
              sessionId: s.id,
              userId: s.user_id,
              isActive: s.status === "active" || s.status === "late",
              startedAt: s.departure_time,
              endedAt: s.arrived_at,
              destination: s.destination,
              liveLocation: l ? {
                lat: l.latitude, lng: l.longitude,
                placeName: l.location_name || null,
                updatedAt: l.updated_at,
              } : null,
              userName: p?.full_name || "User",
              avatarUrl: p?.avatar_url,
              status: s.status || "active",
              expectedArrival: s.expected_arrival,
              destinationLat: s.destination_lat,
              destinationLng: s.destination_lng,
            };
          })
      );
    } catch (e) {
      console.error("[LookAfterMeStream] error:", e);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchSessions();

    const channel = supabase
      .channel("stream-look-after-me")
      .on("postgres_changes", { event: "*", schema: "public", table: "safety_sessions" }, () => fetchSessions())
      .on("postgres_changes", { event: "*", schema: "public", table: "user_locations" }, () => fetchSessions())
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [fetchSessions]);

  const activeSessions = sessions.filter((s) => s.isActive);

  return { sessions, activeSessions, loading, refetch: fetchSessions };
}
