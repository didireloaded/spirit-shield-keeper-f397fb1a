/**
 * User Avatar Markers
 * Renders real-time user locations as avatar markers on the map
 */

import { useEffect, useRef } from "react";
import mapboxgl from "mapbox-gl";
import type { UserLocation } from "@/hooks/useRealtimeLocations";
import { formatDistanceToNow } from "date-fns";

interface UserAvatarMarkersProps {
  map: mapboxgl.Map | null;
  locations: UserLocation[];
  currentUserId?: string;
  onUserClick?: (location: UserLocation) => void;
}

const DEFAULT_AVATAR = `data:image/svg+xml,${encodeURIComponent(`
  <svg width="48" height="48" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="24" cy="24" r="24" fill="#3b82f6"/>
    <path d="M24 24c3.3 0 6-2.7 6-6s-2.7-6-6-6-6 2.7-6 6 2.7 6 6 6zm0 3c-4 0-12 2-12 6v3h24v-3c0-4-8-6-12-6z" fill="white"/>
  </svg>
`)}`;

export function UserAvatarMarkers({
  map,
  locations,
  currentUserId,
  onUserClick,
}: UserAvatarMarkersProps) {
  const markersRef = useRef<Map<string, mapboxgl.Marker>>(new Map());
  const onUserClickRef = useRef(onUserClick);
  onUserClickRef.current = onUserClick;

  useEffect(() => {
    if (!map) return;

    const currentMarkers = markersRef.current;

    // Remove markers no longer present
    currentMarkers.forEach((marker, userId) => {
      if (!locations.find((loc) => loc.user_id === userId)) {
        marker.remove();
        currentMarkers.delete(userId);
      }
    });

    // Add/update
    locations.forEach((location) => {
      // Skip current user
      if (location.user_id === currentUserId) return;

      let marker = currentMarkers.get(location.user_id);

      if (!marker) {
        const el = document.createElement("div");
        el.className = "user-avatar-marker";
        el.style.cursor = "pointer";
        el.style.transition = "transform 0.5s ease-out";

        const avatarUrl = location.profile?.avatar_url || DEFAULT_AVATAR;
        const isMoving = location.is_moving;

        el.innerHTML = `
          <div class="relative">
            <div class="relative w-10 h-10 rounded-full border-2 ${
              isMoving ? "border-green-500" : "border-white"
            } shadow-lg overflow-hidden bg-card">
              <img src="${avatarUrl}" alt="${location.profile?.full_name || "User"}"
                class="w-full h-full object-cover"
                onerror="this.src='${DEFAULT_AVATAR}'" />
            </div>
            <div class="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-white ${
              isMoving ? "bg-green-500" : "bg-blue-500"
            }"></div>
          </div>
        `;

        el.addEventListener("click", () => {
          onUserClickRef.current?.(location);
        });

        const popup = new mapboxgl.Popup({
          offset: 25,
          closeButton: false,
          className: "user-location-popup",
        }).setHTML(`
          <div class="p-2 text-sm">
            <p class="font-semibold">${location.profile?.full_name || "User"}</p>
            <p class="text-xs opacity-70">${location.location_name || "Moving..."}</p>
            <p class="text-xs opacity-50 mt-1">
              ${location.updated_at ? formatDistanceToNow(new Date(location.updated_at), { addSuffix: true }) : ""}
            </p>
            ${location.is_moving ? '<p class="text-xs mt-1" style="color:#22c55e">🏃 Moving</p>' : ""}
          </div>
        `);

        marker = new mapboxgl.Marker({ element: el, anchor: "bottom" })
          .setLngLat([location.longitude, location.latitude])
          .setPopup(popup)
          .addTo(map);

        currentMarkers.set(location.user_id, marker);
      } else {
        // Smooth position update
        marker.setLngLat([location.longitude, location.latitude]);
      }
    });

    return () => {
      currentMarkers.forEach((marker) => marker.remove());
      currentMarkers.clear();
    };
  }, [map, locations, currentUserId]);

  return null;
}

export default UserAvatarMarkers;
