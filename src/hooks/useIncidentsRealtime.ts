/**
 * Real-time incidents and responders subscription
 * Provides live data for the map system
 */

import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface Incident {
  id: string;
  user_id: string;
  type: string;
  status: string;
  latitude: number;
  longitude: number;
  description?: string | null;
  created_at: string;
  resolved_at?: string | null;
  audio_url?: string | null;
  confidence_score?: number;
  verified?: boolean;
  trigger_source?: string;
}

interface Responder {
  id: string;
  user_id: string;
  role: "authority" | "admin" | "volunteer";
  latitude: number;
  longitude: number;
  status: "available" | "responding" | "on_scene" | "offline";
  incident_id?: string | null;
  updated_at: string;
}

interface IncidentMarker extends Incident {
  incidentType: "panic" | "amber" | "crash" | "robbery" | "assault" | "suspicious" | "other";
  confidenceScore: number;
  verified: boolean;
  isRecent: boolean;
}

export const useIncidentsRealtime = () => {
  const [incidents, setIncidents] = useState<IncidentMarker[]>([]);
  const [responders, setResponders] = useState<Responder[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  // Transform raw incident to marker format
  const toMarkerFormat = useCallback((incident: Incident): IncidentMarker => {
    const createdAt = new Date(incident.created_at);
    const isRecent = Date.now() - createdAt.getTime() < 30 * 60 * 1000; // 30 min

    return {
      ...incident,
      incidentType: (incident.type as IncidentMarker["incidentType"]) || "other",
      confidenceScore: incident.confidence_score || 50,
      verified: incident.verified || false,
      isRecent,
    };
  }, []);

  // Merge new incident into state
  const mergeIncident = useCallback((newIncident: Incident) => {
    setIncidents((prev) => {
      const existing = prev.findIndex((i) => i.id === newIncident.id);
      const formatted = toMarkerFormat(newIncident);

      if (existing >= 0) {
        const updated = [...prev];
        updated[existing] = formatted;
        return updated;
      }
      return [formatted, ...prev];
    });
  }, [toMarkerFormat]);

  // Merge new responder into state
  const mergeResponder = useCallback((newResponder: Responder) => {
    setResponders((prev) => {
      const existing = prev.findIndex((r) => r.id === newResponder.id);

      if (existing >= 0) {
        const updated = [...prev];
        updated[existing] = newResponder;
        return updated;
      }
      return [...prev, newResponder];
    });
  }, []);

  // Fetch initial data
  const fetchIncidents = useCallback(async () => {
    const { data: alertsData } = await supabase
      .from("alerts")
      .select("*")
      .in("status", ["active", "escalated"])
      .order("created_at", { ascending: false })
      .limit(100);

    const { data: markersData } = await supabase
      .from("markers")
      .select("*")
      .gte("expires_at", new Date().toISOString())
      .order("created_at", { ascending: false })
      .limit(100);

    // Combine alerts and markers
    const combined: IncidentMarker[] = [
      ...(alertsData || []).map((a) => toMarkerFormat({
        id: a.id,
        user_id: a.user_id,
        type: a.type,
        status: a.status || "active",
        latitude: a.latitude,
        longitude: a.longitude,
        description: a.description,
        created_at: a.created_at || new Date().toISOString(),
        resolved_at: a.resolved_at,
        audio_url: a.audio_url,
      })),
      ...(markersData || []).map((m) => toMarkerFormat({
        id: m.id,
        user_id: m.user_id,
        type: m.type,
        status: m.status || "active",
        latitude: m.latitude,
        longitude: m.longitude,
        description: m.description,
        created_at: m.created_at || new Date().toISOString(),
        confidence_score: (m.verified_count || 0) * 20 + 40,
        verified: (m.verified_count || 0) >= 3,
      })),
    ];

    setIncidents(combined);
    setLoading(false);
  }, [toMarkerFormat]);

  // Subscribe to real-time updates
  useEffect(() => {
    fetchIncidents();

    // Subscribe to alerts
    const alertsChannel = supabase
      .channel("alerts-realtime-incidents")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "alerts" },
        (payload) => {
          if (payload.eventType === "DELETE") {
            setIncidents((prev) => prev.filter((i) => i.id !== (payload.old as any).id));
          } else {
            const incident = payload.new as any;
            mergeIncident({
              id: incident.id,
              user_id: incident.user_id,
              type: incident.type,
              status: incident.status || "active",
              latitude: incident.latitude,
              longitude: incident.longitude,
              description: incident.description,
              created_at: incident.created_at || new Date().toISOString(),
              resolved_at: incident.resolved_at,
              audio_url: incident.audio_url,
            });
          }
        }
      )
      .subscribe();

    // Subscribe to markers
    const markersChannel = supabase
      .channel("markers-realtime-incidents")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "markers" },
        (payload) => {
          if (payload.eventType === "DELETE") {
            setIncidents((prev) => prev.filter((i) => i.id !== (payload.old as any).id));
          } else {
            const marker = payload.new as any;
            mergeIncident({
              id: marker.id,
              user_id: marker.user_id,
              type: marker.type,
              status: marker.status || "active",
              latitude: marker.latitude,
              longitude: marker.longitude,
              description: marker.description,
              created_at: marker.created_at || new Date().toISOString(),
              confidence_score: (marker.verified_count || 0) * 20 + 40,
              verified: (marker.verified_count || 0) >= 3,
            });
          }
        }
      )
      .subscribe();

    // Subscribe to panic sessions for live tracking
    const panicChannel = supabase
      .channel("panic-realtime-incidents")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "panic_sessions" },
        (payload) => {
          if (payload.eventType !== "DELETE") {
            const session = payload.new as any;
            mergeIncident({
              id: session.id,
              user_id: session.user_id,
              type: "panic",
              status: session.status === "active" ? "active" : "resolved",
              latitude: session.last_known_lat,
              longitude: session.last_known_lng,
              description: null,
              created_at: session.started_at,
              resolved_at: session.ended_at,
              trigger_source: session.trigger_source,
              confidence_score: session.threat_score || 50,
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(alertsChannel);
      supabase.removeChannel(markersChannel);
      supabase.removeChannel(panicChannel);
    };
  }, [fetchIncidents, mergeIncident]);

  // Get active count
  const activeCount = incidents.filter(
    (i) => i.status === "active" && i.isRecent
  ).length;

  return {
    incidents,
    responders,
    loading,
    activeCount,
    refetch: fetchIncidents,
  };
};
