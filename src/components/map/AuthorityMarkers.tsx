/**
 * Authority responder markers for the map
 * Shows police, ambulance, and other responders with their status
 */

import { useEffect, useRef } from "react";
import mapboxgl from "mapbox-gl";

interface Responder {
  id: string;
  name?: string;
  role: "police" | "ambulance" | "authority" | "volunteer";
  latitude: number;
  longitude: number;
  status: "en_route" | "on_scene" | "available" | "offline";
  eta_minutes?: number;
  incident_id?: string;
}

interface AuthorityMarkersProps {
  map: mapboxgl.Map | null;
  responders: Responder[];
  mapLoaded: boolean;
}

// Role to icon/color mapping
const roleConfig = {
  police: {
    color: "#3B82F6", // Blue
    icon: "🚔",
    label: "Police",
  },
  ambulance: {
    color: "#10B981", // Green
    icon: "🚑",
    label: "Ambulance",
  },
  authority: {
    color: "#6366F1", // Indigo
    icon: "🛡️",
    label: "Authority",
  },
  volunteer: {
    color: "#8B5CF6", // Purple
    icon: "🙋",
    label: "Volunteer",
  },
};

// Status to style mapping
const statusConfig = {
  en_route: {
    pulse: true,
    opacity: 1,
    label: "En Route",
  },
  on_scene: {
    pulse: false,
    opacity: 1,
    label: "On Scene",
  },
  available: {
    pulse: false,
    opacity: 0.6,
    label: "Available",
  },
  offline: {
    pulse: false,
    opacity: 0.3,
    label: "Offline",
  },
};

export const useAuthorityMarkers = ({
  map,
  responders,
  mapLoaded,
}: AuthorityMarkersProps) => {
  const markersRef = useRef<Map<string, mapboxgl.Marker>>(new Map());

  useEffect(() => {
    if (!map || !mapLoaded) return;

    const currentIds = new Set(responders.map((r) => r.id));

    // Remove old markers
    markersRef.current.forEach((marker, id) => {
      if (!currentIds.has(id)) {
        marker.remove();
        markersRef.current.delete(id);
      }
    });

    // Add/update markers
    responders.forEach((responder) => {
      const existing = markersRef.current.get(responder.id);
      const config = roleConfig[responder.role] || roleConfig.authority;
      const status = statusConfig[responder.status] || statusConfig.available;

      if (existing) {
        // Update position
        existing.setLngLat([responder.longitude, responder.latitude]);
      } else {
        // Create new marker
        const el = document.createElement("div");
        el.className = "authority-marker";
        el.innerHTML = `
          <div class="relative cursor-pointer transform hover:scale-110 transition-transform" style="opacity: ${status.opacity}">
            ${
              status.pulse
                ? `<div class="absolute -inset-2 rounded-full animate-pulse" style="background: ${config.color}30"></div>`
                : ""
            }
            <div class="w-10 h-10 rounded-full flex items-center justify-center shadow-lg border-2" 
                 style="background: ${config.color}; border-color: white">
              <span class="text-lg">${config.icon}</span>
            </div>
            ${
              responder.status === "en_route" && responder.eta_minutes
                ? `<div class="absolute -bottom-1 -right-1 bg-white rounded-full px-1.5 py-0.5 text-xs font-bold shadow" 
                     style="color: ${config.color}">
                    ${responder.eta_minutes}m
                  </div>`
                : ""
            }
          </div>
        `;

        // Create popup
        const popup = new mapboxgl.Popup({
          offset: 25,
          closeButton: false,
        }).setHTML(`
          <div class="p-3 text-sm">
            <div class="flex items-center gap-2 mb-1">
              <span>${config.icon}</span>
              <strong style="color: ${config.color}">${config.label}</strong>
            </div>
            <p class="text-gray-600 text-xs">
              Status: ${status.label}
              ${responder.eta_minutes ? `• ETA: ${responder.eta_minutes} min` : ""}
            </p>
          </div>
        `);

        const marker = new mapboxgl.Marker({ element: el })
          .setLngLat([responder.longitude, responder.latitude])
          .setPopup(popup)
          .addTo(map);

        markersRef.current.set(responder.id, marker);
      }
    });

    // Cleanup on unmount
    return () => {
      markersRef.current.forEach((marker) => marker.remove());
      markersRef.current.clear();
    };
  }, [map, mapLoaded, responders]);

  return markersRef.current;
};

export default useAuthorityMarkers;
