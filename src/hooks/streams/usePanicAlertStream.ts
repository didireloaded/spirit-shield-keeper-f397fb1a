/**
 * PanicAlert Stream
 * Real-time subscription for panic sessions + location logs
 * Maps to: PanicAlert { panicId, userId, status, initialLocation, lastKnownLocation, movementPath }
 * 
 * RULES:
 * - movementPath updates in real time
 * - If device disconnects, lastKnownLocation persists
 * - Visible on Map regardless of ghostMode
 * - Appears in Community as live alert
 */

import { useEffect, useState, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface PanicAlertData {
  panicId: string;
  userId: string;
  status: "active" | "ended";
  startedAt: string;
  endedAt?: string | null;
  initialLocation: {
    lat: number;
    lng: number;
    placeName: string | null;
  };
  lastKnownLocation: {
    lat: number;
    lng: number;
    placeName: string | null;
    updatedAt: string;
  };
  movementPath: Array<{ lat: number; lng: number; timestamp: string }>;
  incidentType?: string | null;
  userName?: string;
}

export function usePanicAlertStream() {
  const [alerts, setAlerts] = useState<PanicAlertData[]>([]);
  const [loading, setLoading] = useState(true);
  const pathsRef = useRef<Map<string, Array<{ lat: number; lng: number; timestamp: string }>>>(new Map());

  const fetchAlerts = useCallback(async () => {
    try {
      const { data: sessions } = await supabase
        .from("panic_sessions")
        .select("*")
        .in("status", ["active", "ended"])
        .gte("created_at", new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
        .order("created_at", { ascending: false })
        .limit(50);

      if (!sessions?.length) { setAlerts([]); setLoading(false); return; }

      // Fetch profiles + location logs in parallel
      const userIds = [...new Set(sessions.map((s) => s.user_id))];
      const sessionIds = sessions.map((s) => s.id);

      const [{ data: profiles }, { data: logs }] = await Promise.all([
        supabase.from("profiles").select("id, full_name").in("id", userIds),
        supabase.from("panic_location_logs").select("panic_session_id, lat, lng, recorded_at")
          .in("panic_session_id", sessionIds).order("recorded_at", { ascending: true }),
      ]);

      const profileMap = new Map(profiles?.map((p) => [p.id, p.full_name]) || []);

      // Build paths
      const pathMap = new Map<string, Array<{ lat: number; lng: number; timestamp: string }>>();
      logs?.forEach((l) => {
        const arr = pathMap.get(l.panic_session_id) || [];
        arr.push({ lat: l.lat, lng: l.lng, timestamp: l.recorded_at });
        pathMap.set(l.panic_session_id, arr);
      });
      pathsRef.current = pathMap;

      setAlerts(sessions.map((s) => ({
        panicId: s.id,
        userId: s.user_id,
        status: s.status === "active" ? "active" : "ended",
        startedAt: s.started_at,
        endedAt: s.ended_at,
        initialLocation: { lat: s.initial_lat, lng: s.initial_lng, placeName: s.location_name || null },
        lastKnownLocation: {
          lat: s.last_known_lat, lng: s.last_known_lng,
          placeName: s.current_location_name || s.location_name || null,
          updatedAt: s.last_location_at,
        },
        movementPath: pathMap.get(s.id) || [],
        incidentType: s.incident_type,
        userName: profileMap.get(s.user_id) || "User",
      })));
    } catch (e) {
      console.error("[PanicAlertStream] error:", e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAlerts();

    const channel = supabase
      .channel("stream-panic-alerts")
      .on("postgres_changes", { event: "*", schema: "public", table: "panic_sessions" }, () => fetchAlerts())
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "panic_location_logs" }, (payload) => {
        const log = payload.new as any;
        const point = { lat: log.lat, lng: log.lng, timestamp: log.recorded_at };

        // Update path cache
        const path = pathsRef.current.get(log.panic_session_id) || [];
        path.push(point);
        pathsRef.current.set(log.panic_session_id, path);

        // Update alert state
        setAlerts((prev) => prev.map((a) => {
          if (a.panicId !== log.panic_session_id) return a;
          return {
            ...a,
            lastKnownLocation: { lat: log.lat, lng: log.lng, placeName: log.location_name || a.lastKnownLocation.placeName, updatedAt: log.recorded_at },
            movementPath: [...a.movementPath, point],
          };
        }));
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [fetchAlerts]);

  const activeAlerts = alerts.filter((a) => a.status === "active");

  return { alerts, activeAlerts, loading, refetch: fetchAlerts };
}
