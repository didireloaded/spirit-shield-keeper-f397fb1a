/**
 * Panic Alert Map Layer
 * Real-time GPS tracking with avatar-based markers
 * Shows live/ended status with red ring + user photo
 */

import { useEffect, useRef, useState, useCallback } from "react";
import mapboxgl from "mapbox-gl";
import { supabase } from "@/integrations/supabase/client";
import { PanicDetailSheet } from "./PanicDetailSheet";

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
  avatar_url?: string | null;
  chat_room_id?: string | null;
}

interface PanicAlertMapLayerProps {
  map: mapboxgl.Map | null;
  currentUserId?: string;
}

function getInitial(name?: string): string {
  return (name || "U")[0].toUpperCase();
}

export function PanicAlertMapLayer({ map, currentUserId }: PanicAlertMapLayerProps) {
  const [activePanics, setActivePanics] = useState<PanicAlert[]>([]);
  const [selectedPanic, setSelectedPanic] = useState<PanicAlert | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const markersRef = useRef<Map<string, mapboxgl.Marker>>(new Map());
  const popupsRef = useRef<Map<string, mapboxgl.Popup>>(new Map());
  const trailsRef = useRef<Map<string, [number, number][]>>(new Map());

  useEffect(() => {
    const fetchActivePanics = async () => {
      const { data } = await supabase
        .from("panic_sessions")
        .select(`
          id, user_id, status, initial_lat, initial_lng,
          last_known_lat, last_known_lng, incident_type,
          location_name, created_at, ended_at, chat_room_id
        `)
        .in("status", ["active", "ended"])
        .gte("created_at", new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
        .order("created_at", { ascending: false })
        .limit(50);

      if (data) {
        const userIds = [...new Set(data.map((d) => d.user_id))];
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, full_name, avatar_url")
          .in("id", userIds);

        const profileMap = new Map(profiles?.map((p) => [p.id, p]) || []);

        setActivePanics(
          data.map((d) => ({
            ...d,
            user_name: profileMap.get(d.user_id)?.full_name || "User",
            avatar_url: profileMap.get(d.user_id)?.avatar_url || null,
          }))
        );
      }
    };

    fetchActivePanics();

    const channel = supabase
      .channel("panic-sessions-map")
      .on("postgres_changes", { event: "*", schema: "public", table: "panic_sessions" }, () => fetchActivePanics())
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "panic_location_logs" }, (payload) => {
        const log = payload.new as any;
        const existing = trailsRef.current.get(log.panic_session_id) || [];
        existing.push([log.lng, log.lat]);
        trailsRef.current.set(log.panic_session_id, existing);
        updateMarkerPosition(log.panic_session_id, log.lat, log.lng);
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  const updateMarkerPosition = (sessionId: string, lat: number, lng: number) => {
    const marker = markersRef.current.get(sessionId);
    if (marker) marker.setLngLat([lng, lat]);
  };

  const handleViewDetails = useCallback((panic: PanicAlert) => {
    popupsRef.current.forEach((p) => p.remove());
    setSelectedPanic(panic);
    setDetailOpen(true);
  }, []);

  useEffect(() => {
    if (!map) return;

    const currentMarkers = markersRef.current;

    currentMarkers.forEach((marker, id) => {
      if (!activePanics.find((p) => p.id === id)) {
        marker.remove();
        currentMarkers.delete(id);
        popupsRef.current.get(id)?.remove();
        popupsRef.current.delete(id);
      }
    });

    activePanics.forEach((panic) => {
      let marker = currentMarkers.get(panic.id);
      const isLive = panic.status === "active";
      const lat = panic.last_known_lat;
      const lng = panic.last_known_lng;

      if (!marker) {
        const el = document.createElement("div");
        el.className = "panic-alert-marker";
        el.style.cursor = "pointer";

        // Avatar-based marker with red status ring
        const avatarContent = panic.avatar_url
          ? `<img src="${panic.avatar_url}" class="w-full h-full object-cover" onerror="this.style.display='none';this.nextElementSibling.style.display='flex'" />
             <div class="w-full h-full bg-red-600 items-center justify-center text-white text-sm font-bold" style="display:none">${getInitial(panic.user_name)}</div>`
          : `<div class="w-full h-full bg-red-600 flex items-center justify-center text-white text-sm font-bold">${getInitial(panic.user_name)}</div>`;

        el.innerHTML = `
          <div class="relative flex flex-col items-center">
            ${isLive ? `
              <div class="absolute -inset-3 rounded-full bg-red-500/20 animate-ping" style="animation-duration:2s"></div>
              <div class="absolute -inset-1.5 rounded-full bg-red-500/10"></div>
            ` : ""}
            <div class="relative w-10 h-10 rounded-full border-[3px] ${isLive ? "border-red-500" : "border-red-400/50"} shadow-lg overflow-hidden bg-neutral-900">
              ${avatarContent}
            </div>
            <div class="mt-0.5 px-1.5 py-px rounded-full ${isLive ? "bg-neutral-900/90 border border-red-500/40" : "bg-neutral-700/80"} shadow-sm">
              <span class="text-[9px] font-semibold ${isLive ? "text-red-400" : "text-neutral-400"} uppercase tracking-wider">${isLive ? "LIVE" : "Ended"}</span>
            </div>
          </div>
        `;

        // Dark popup card
        const popupContent = document.createElement("div");
        popupContent.innerHTML = `
          <div style="
            background:#141414;border-radius:12px;padding:12px 14px;min-width:200px;
            box-shadow:0 8px 32px rgba(0,0,0,0.5);border:1px solid rgba(255,255,255,0.06);
          ">
            <div style="display:flex;align-items:center;gap:6px;margin-bottom:8px">
              ${isLive ? `<span style="display:inline-block;width:6px;height:6px;border-radius:50%;background:#ef4444;box-shadow:0 0 6px #ef4444"></span>` : ""}
              <span style="font-size:11px;font-weight:600;color:${isLive ? '#f87171' : '#a3a3a3'};letter-spacing:0.02em">${panic.incident_type || "Panic Alert"}</span>
            </div>
            <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px">
              ${panic.avatar_url ? `<img src="${panic.avatar_url}" style="width:24px;height:24px;border-radius:50%;object-fit:cover;border:1px solid rgba(239,68,68,0.3)" />` : `<div style="width:24px;height:24px;border-radius:50%;background:#dc2626;display:flex;align-items:center;justify-content:center;font-size:11px;color:white;font-weight:600">${getInitial(panic.user_name)}</div>`}
              <span style="font-size:13px;color:#e5e5e5;font-weight:500">${panic.user_name}</span>
            </div>
            <p style="font-size:11px;color:#737373;margin:0">${panic.location_name || "Tracking location"}</p>
            <div style="margin-top:10px;display:flex;gap:6px">
              <button class="panic-popup-details-btn" style="
                flex:1;padding:6px 0;border-radius:8px;background:rgba(239,68,68,0.12);
                border:1px solid rgba(239,68,68,0.2);color:#fca5a5;font-size:11px;
                font-weight:500;cursor:pointer;transition:background 0.15s;
              ">View details</button>
            </div>
          </div>
        `;

        const detailsBtn = popupContent.querySelector(".panic-popup-details-btn");
        if (detailsBtn) detailsBtn.addEventListener("click", () => handleViewDetails(panic));

        const popup = new mapboxgl.Popup({
          offset: 25, closeButton: false, className: "panic-popup-modern", maxWidth: "240px",
        }).setDOMContent(popupContent);

        popupsRef.current.set(panic.id, popup);

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
      currentMarkers.forEach((m) => m.remove());
      currentMarkers.clear();
      popupsRef.current.forEach((p) => p.remove());
      popupsRef.current.clear();
    };
  }, [map, activePanics, handleViewDetails]);

  return (
    <PanicDetailSheet
      open={detailOpen}
      onClose={() => setDetailOpen(false)}
      panic={selectedPanic}
    />
  );
}

export default PanicAlertMapLayer;
