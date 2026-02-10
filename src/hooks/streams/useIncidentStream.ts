/**
 * Incident Stream
 * Real-time subscription for incident reports (markers + alerts)
 * Maps to: IncidentReport { incidentId, reportedBy, status, location, incidentType, description, activityLog }
 * 
 * RULES:
 * - Description is required
 * - Appears on Map and Community
 * - Status changes update live
 * - No movement tracking
 */

import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface IncidentData {
  incidentId: string;
  reportedBy: string;
  status: "active" | "handling" | "resolved";
  createdAt: string;
  updatedAt: string;
  location: {
    lat: number;
    lng: number;
    placeName: string | null;
  };
  incidentType: string;
  description: string | null;
  source: "alert" | "marker";
}

export function useIncidentStream() {
  const [incidents, setIncidents] = useState<IncidentData[]>([]);
  const [loading, setLoading] = useState(true);

  const mapAlert = (a: any): IncidentData => ({
    incidentId: a.id,
    reportedBy: a.user_id,
    status: a.status === "resolved" ? "resolved" : a.status === "escalated" ? "handling" : "active",
    createdAt: a.created_at || new Date().toISOString(),
    updatedAt: a.updated_at || a.created_at || new Date().toISOString(),
    location: { lat: a.latitude, lng: a.longitude, placeName: null },
    incidentType: a.type || "other",
    description: a.description,
    source: "alert",
  });

  const mapMarker = (m: any): IncidentData => ({
    incidentId: m.id,
    reportedBy: m.user_id,
    status: m.status === "resolved" ? "resolved" : "active",
    createdAt: m.created_at || new Date().toISOString(),
    updatedAt: m.created_at || new Date().toISOString(),
    location: { lat: m.latitude, lng: m.longitude, placeName: null },
    incidentType: m.type || "other",
    description: m.description,
    source: "marker",
  });

  const fetchAll = useCallback(async () => {
    try {
      const [{ data: alerts }, { data: markers }] = await Promise.all([
        supabase.from("alerts").select("*").in("status", ["active", "escalated"]).order("created_at", { ascending: false }).limit(100),
        supabase.from("markers").select("*").gte("expires_at", new Date().toISOString()).order("created_at", { ascending: false }).limit(100),
      ]);

      setIncidents([
        ...(alerts || []).map(mapAlert),
        ...(markers || []).map(mapMarker),
      ]);
    } catch (e) {
      console.error("[IncidentStream] error:", e);
    } finally {
      setLoading(false);
    }
  }, []);

  const merge = useCallback((incident: IncidentData) => {
    setIncidents((prev) => {
      const idx = prev.findIndex((i) => i.incidentId === incident.incidentId);
      if (idx >= 0) { const n = [...prev]; n[idx] = incident; return n; }
      return [incident, ...prev];
    });
  }, []);

  useEffect(() => {
    fetchAll();

    const ch1 = supabase
      .channel("stream-incidents-alerts")
      .on("postgres_changes", { event: "*", schema: "public", table: "alerts" }, (payload) => {
        if (payload.eventType === "DELETE") {
          setIncidents((prev) => prev.filter((i) => i.incidentId !== (payload.old as any).id));
        } else { merge(mapAlert(payload.new)); }
      })
      .subscribe();

    const ch2 = supabase
      .channel("stream-incidents-markers")
      .on("postgres_changes", { event: "*", schema: "public", table: "markers" }, (payload) => {
        if (payload.eventType === "DELETE") {
          setIncidents((prev) => prev.filter((i) => i.incidentId !== (payload.old as any).id));
        } else { merge(mapMarker(payload.new)); }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(ch1);
      supabase.removeChannel(ch2);
    };
  }, [fetchAll, merge]);

  const activeIncidents = incidents.filter((i) => i.status === "active");

  return { incidents, activeIncidents, loading, refetch: fetchAll };
}
