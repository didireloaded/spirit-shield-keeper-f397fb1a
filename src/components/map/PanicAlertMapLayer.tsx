/**
 * Panic Alert Map Layer
 * Real-time GPS tracking with movement path visualization
 * Shows live/ended status and persists last known location
 */

import { useEffect, useRef, useState } from "react";
import mapboxgl from "mapbox-gl";
import { supabase } from "@/integrations/supabase/client";
import { useFormattedLocation } from "@/lib/locationFormatter";

interface PanicAlert {
  id: string;
  user_id: string;
  status: string;
  initial_lat: number;
  initial_lng: number;
  last_known_lat: number;
  last_known_lng: number;
  incident_type?: string | null;
  location_name?: string | null;
  created_at: string;
  ended_at?: string | null;
  user_name?: string;
}

interface PanicAlertMapLayerProps {
  map: mapboxgl.Map | null;
  currentUserId?: string;
}

const PANIC_SOURCE = "panic-alerts-live";
const PANIC_TRAIL_SOURCE = "panic-trails-live";

export function PanicAlertMapLayer({ map, currentUserId }: PanicAlertMapLayerProps) {
  const [activePanics, setActivePanics] = useState<PanicAlert[]>([]);
  const markersRef = useRef<Map<string, mapboxgl.Marker>>(new Map());
  const trailsRef = useRef<Map<string, [number, number][]>>(new Map());

  // Fetch active panic sessions
  useEffect(() => {
    const fetchActivePanics = async () => {
      const { data } = await supabase
        .from("panic_sessions")
        .select(`
          id, user_id, status, initial_lat, initial_lng,
          last_known_lat, last_known_lng, incident_type,
          location_name, created_at, ended_at
        `)
        .in("status", ["active", "ended"])
        .gte("created_at", new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
        .order("created_at", { ascending: false })
        .limit(50);

      if (data) {
        // Fetch user names
        const userIds = [...new Set(data.map((d) => d.user_id))];
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, full_name")
          .in("id", userIds);

        const profileMap = new Map(profiles?.map((p) => [p.id, p.full_name]) || []);

        setActivePanics(
          data.map((d) => ({
            ...d,
            user_name: profileMap.get(d.user_id) || "User",
          }))
        );
      }
    };

    fetchActivePanics();

    // Subscribe to real-time changes
    const channel = supabase
      .channel("panic-sessions-map")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "panic_sessions" },
        () => fetchActivePanics()
      )
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "panic_location_logs" },
        (payload) => {
          const log = payload.new as any;
          // Update trail
          const existing = trailsRef.current.get(log.panic_session_id) || [];
          existing.push([log.lng, log.lat]);
          trailsRef.current.set(log.panic_session_id, existing);
          // Update marker position
          updateMarkerPosition(log.panic_session_id, log.lat, log.lng);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const updateMarkerPosition = (sessionId: string, lat: number, lng: number) => {
    const marker = markersRef.current.get(sessionId);
    if (marker) {
      marker.setLngLat([lng, lat]);
    }
  };

  // Render markers on map
  useEffect(() => {
    if (!map) return;

    const currentMarkers = markersRef.current;

    // Remove stale markers
    currentMarkers.forEach((marker, id) => {
      if (!activePanics.find((p) => p.id === id)) {
        marker.remove();
        currentMarkers.delete(id);
      }
    });

    // Add/update panic markers
    activePanics.forEach((panic) => {
      let marker = currentMarkers.get(panic.id);
      const isLive = panic.status === "active";
      const lat = panic.last_known_lat;
      const lng = panic.last_known_lng;

      if (!marker) {
        const el = document.createElement("div");
        el.className = "panic-alert-marker";
        el.style.cursor = "pointer";

        el.innerHTML = `
          <div class="relative flex flex-col items-center">
            ${isLive ? `
              <div class="absolute -inset-3 rounded-full bg-red-500/20 animate-ping" style="animation-duration:2s"></div>
              <div class="absolute -inset-1.5 rounded-full bg-red-500/10"></div>
            ` : ""}
            <div class="relative w-7 h-7 rounded-full ${isLive ? "bg-neutral-900" : "bg-neutral-600"} border border-red-500/60 shadow-md flex items-center justify-center">
              <span class="text-red-400 text-xs">●</span>
            </div>
            <div class="mt-0.5 px-1.5 py-px rounded-full ${isLive ? "bg-neutral-900/90 border border-red-500/40" : "bg-neutral-700/80"} shadow-sm">
              <span class="text-[9px] font-semibold ${isLive ? "text-red-400" : "text-neutral-400"} uppercase tracking-wider">${isLive ? "LIVE" : "Ended"}</span>
            </div>
          </div>
        `;

        const popup = new mapboxgl.Popup({
          offset: 25,
          closeButton: false,
          className: "panic-popup",
        }).setHTML(`
          <div class="p-2.5 text-sm" style="background:#1a1a1a;color:#e5e5e5;border-radius:10px;border:1px solid rgba(239,68,68,0.3)">
            <p class="font-semibold" style="color:#f87171;font-size:12px">● ${panic.incident_type || "Panic Alert"}</p>
            <p style="font-size:11px;margin-top:4px;opacity:0.8">${panic.user_name}</p>
            <p style="font-size:10px;margin-top:2px;opacity:0.5">${panic.location_name || "Location updating..."}</p>
          </div>
        `);

        marker = new mapboxgl.Marker({ element: el, anchor: "bottom" })
          .setLngLat([lng, lat])
          .setPopup(popup)
          .addTo(map);

        currentMarkers.set(panic.id, marker);
      } else {
        marker.setLngLat([lng, lat]);
      }
    });

    return () => {
      currentMarkers.forEach((marker) => marker.remove());
      currentMarkers.clear();
    };
  }, [map, activePanics]);

  return null;
}

export default PanicAlertMapLayer;
