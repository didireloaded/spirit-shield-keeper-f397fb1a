/**
 * Look After Me Map Layer
 * Watch-only tracking layer for users with active safety sessions
 * Only shows users who are watch-linked AND have Look After Me enabled
 * Respects Ghost Mode globally
 */

import { useEffect, useRef, useState } from "react";
import mapboxgl from "mapbox-gl";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface TrackedUser {
  id: string;
  user_id: string;
  destination: string;
  destination_lat: number | null;
  destination_lng: number | null;
  expected_arrival: string;
  status: string;
  current_lat?: number;
  current_lng?: number;
  user_name?: string;
  avatar_url?: string;
}

interface LookAfterMeMapLayerProps {
  map: mapboxgl.Map | null;
}

export function LookAfterMeMapLayer({ map }: LookAfterMeMapLayerProps) {
  const { user } = useAuth();
  const [trackedUsers, setTrackedUsers] = useState<TrackedUser[]>([]);
  const markersRef = useRef<Map<string, mapboxgl.Marker>>(new Map());
  const destinationMarkersRef = useRef<Map<string, mapboxgl.Marker>>(new Map());

  // Fetch active safety sessions for users I'm watching
  useEffect(() => {
    if (!user) return;

    const fetchTrackedUsers = async () => {
      // Get my watch list
      const { data: watchers } = await supabase
        .from("watchers")
        .select("user_id")
        .eq("watcher_id", user.id)
        .eq("status", "accepted");

      if (!watchers?.length) return;

      const watchedUserIds = watchers.map((w) => w.user_id);

      // Get active safety sessions for watched users
      const { data: sessions } = await supabase
        .from("safety_sessions")
        .select("*")
        .in("user_id", watchedUserIds)
        .in("status", ["active", "late"])
        .order("created_at", { ascending: false });

      if (!sessions?.length) {
        setTrackedUsers([]);
        return;
      }

      // Get profiles and current locations
      const sessionUserIds = sessions.map((s) => s.user_id);
      const [{ data: profiles }, { data: locations }] = await Promise.all([
        supabase.from("profiles").select("id, full_name, avatar_url, ghost_mode").in("id", sessionUserIds),
        supabase.from("user_locations").select("user_id, latitude, longitude, ghost_mode").in("user_id", sessionUserIds),
      ]);

      const profileMap = new Map(profiles?.map((p) => [p.id, p]) || []);
      const locationMap = new Map(locations?.map((l) => [l.user_id, l]) || []);

      const tracked: TrackedUser[] = sessions
        .filter((s) => {
          const profile = profileMap.get(s.user_id);
          const loc = locationMap.get(s.user_id);
          // Respect ghost mode
          return !(profile?.ghost_mode || loc?.ghost_mode);
        })
        .map((s) => {
          const profile = profileMap.get(s.user_id);
          const loc = locationMap.get(s.user_id);
          return {
            id: s.id,
            user_id: s.user_id,
            destination: s.destination,
            destination_lat: s.destination_lat,
            destination_lng: s.destination_lng,
            expected_arrival: s.expected_arrival,
            status: s.status || "active",
            current_lat: loc?.latitude,
            current_lng: loc?.longitude,
            user_name: profile?.full_name || "User",
            avatar_url: profile?.avatar_url,
          };
        });

      setTrackedUsers(tracked);
    };

    fetchTrackedUsers();

    // Real-time updates
    const channel = supabase
      .channel("look-after-me-map")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "safety_sessions" },
        () => fetchTrackedUsers()
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "user_locations" },
        () => fetchTrackedUsers()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  // Render markers
  useEffect(() => {
    if (!map) return;

    const currentMarkers = markersRef.current;
    const destMarkers = destinationMarkersRef.current;

    // Remove stale
    currentMarkers.forEach((marker, id) => {
      if (!trackedUsers.find((t) => t.id === id)) {
        marker.remove();
        currentMarkers.delete(id);
      }
    });
    destMarkers.forEach((marker, id) => {
      if (!trackedUsers.find((t) => t.id === id)) {
        marker.remove();
        destMarkers.delete(id);
      }
    });

    trackedUsers.forEach((tracked) => {
      if (tracked.current_lat == null || tracked.current_lng == null) return;

      const isLate = tracked.status === "late";

      // User position marker
      let marker = currentMarkers.get(tracked.id);
      if (!marker) {
        const el = document.createElement("div");
        el.className = "lam-marker";
        el.style.cursor = "pointer";

        el.innerHTML = `
          <div class="relative flex flex-col items-center">
            <div class="relative w-9 h-9 rounded-full border-2 ${isLate ? "border-amber-500" : "border-emerald-500"} shadow-lg overflow-hidden bg-card">
              ${tracked.avatar_url
                ? `<img src="${tracked.avatar_url}" class="w-full h-full object-cover" />`
                : `<div class="w-full h-full bg-emerald-600 flex items-center justify-center text-white text-sm font-bold">${(tracked.user_name || "U")[0]}</div>`
              }
            </div>
            <div class="mt-0.5 px-1.5 py-0.5 rounded-full ${isLate ? "bg-amber-500" : "bg-emerald-600"} shadow-sm">
              <span class="text-[9px] font-bold text-white">${isLate ? "LATE" : "EN ROUTE"}</span>
            </div>
          </div>
        `;

        const popup = new mapboxgl.Popup({ offset: 20, closeButton: false })
          .setHTML(`
            <div class="p-2 text-sm">
              <p class="font-semibold">${tracked.user_name}</p>
              <p class="text-xs opacity-70">→ ${tracked.destination}</p>
              <p class="text-xs mt-1 ${isLate ? "text-amber-600 font-medium" : "text-emerald-600"}">
                ${isLate ? "⚠ Running late" : "On the way"}
              </p>
            </div>
          `);

        marker = new mapboxgl.Marker({ element: el, anchor: "bottom" })
          .setLngLat([tracked.current_lng, tracked.current_lat])
          .setPopup(popup)
          .addTo(map);

        currentMarkers.set(tracked.id, marker);
      } else {
        marker.setLngLat([tracked.current_lng, tracked.current_lat]);
      }

      // Destination marker
      if (tracked.destination_lat && tracked.destination_lng) {
        let destMarker = destMarkers.get(tracked.id);
        if (!destMarker) {
          const destEl = document.createElement("div");
          destEl.innerHTML = `
            <div class="w-6 h-6 rounded-full bg-green-500 border-2 border-white shadow-md flex items-center justify-center">
              <span class="text-white text-xs">📍</span>
            </div>
          `;

          destMarker = new mapboxgl.Marker({ element: destEl, anchor: "center" })
            .setLngLat([tracked.destination_lng, tracked.destination_lat])
            .addTo(map);

          destMarkers.set(tracked.id, destMarker);
        }
      }
    });

    return () => {
      currentMarkers.forEach((m) => m.remove());
      currentMarkers.clear();
      destMarkers.forEach((m) => m.remove());
      destMarkers.clear();
    };
  }, [map, trackedUsers]);

  return null;
}

export default LookAfterMeMapLayer;
