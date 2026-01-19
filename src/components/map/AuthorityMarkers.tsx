/**
 * Authority Responder Markers for Mapbox
 * Shows police, ambulance, and other responders with animated movement
 * Role-based icons, status indicators, and ETA badges
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

// Role configuration with colors and icons
const roleConfig: Record<string, { color: string; icon: string; label: string }> = {
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

// Status configuration for visual feedback
const statusConfig: Record<string, { pulse: boolean; opacity: number; label: string }> = {
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

export function useAuthorityMarkers({
  map,
  responders,
  mapLoaded,
}: AuthorityMarkersProps) {
  const markersRef = useRef<Map<string, mapboxgl.Marker>>(new Map());

  useEffect(() => {
    if (!map || !mapLoaded) return;

    const currentIds = new Set(responders.map((r) => r.id));

    // Remove stale markers
    markersRef.current.forEach((marker, id) => {
      if (!currentIds.has(id)) {
        marker.remove();
        markersRef.current.delete(id);
      }
    });

    // Add/update markers with smooth animation
    responders.forEach((responder) => {
      const existing = markersRef.current.get(responder.id);
      const config = roleConfig[responder.role] || roleConfig.authority;
      const status = statusConfig[responder.status] || statusConfig.available;

      if (existing) {
        // Smooth position update
        existing.setLngLat([responder.longitude, responder.latitude]);
      } else {
        // Create new marker element
        const el = document.createElement("div");
        el.className = "authority-marker";
        el.style.opacity = String(status.opacity);
        
        el.innerHTML = `
          <div class="relative cursor-pointer transform hover:scale-110 transition-transform duration-300">
            ${
              status.pulse
                ? `<div class="absolute -inset-3 rounded-full animate-ping" style="background: ${config.color}40"></div>`
                : ""
            }
            <div class="w-11 h-11 rounded-full flex items-center justify-center shadow-xl" 
                 style="background: linear-gradient(135deg, ${config.color}, ${config.color}dd); border: 3px solid white">
              <span class="text-xl">${config.icon}</span>
            </div>
            ${
              responder.status === "en_route" && responder.eta_minutes
                ? `<div class="absolute -bottom-1 -right-1 bg-white rounded-full px-2 py-0.5 text-xs font-bold shadow-lg" 
                     style="color: ${config.color}">
                    ${responder.eta_minutes}m
                  </div>`
                : ""
            }
            ${
              responder.status === "on_scene"
                ? `<div class="absolute -top-1 -right-1 w-4 h-4 bg-emerald-500 rounded-full border-2 border-white flex items-center justify-center">
                     <span class="text-white text-[8px]">✓</span>
                   </div>`
                : ""
            }
          </div>
        `;

        // Create popup with responder info
        const popup = new mapboxgl.Popup({
          offset: 30,
          closeButton: false,
          className: "responder-popup",
        }).setHTML(`
          <div class="p-3 text-sm min-w-[160px]">
            <div class="flex items-center gap-2 mb-2">
              <span class="text-lg">${config.icon}</span>
              <strong style="color: ${config.color}">${config.label}</strong>
            </div>
            <div class="space-y-1 text-xs text-gray-600">
              <p class="flex items-center gap-1">
                <span class="w-2 h-2 rounded-full" style="background: ${
                  responder.status === "on_scene"
                    ? "#22c55e"
                    : responder.status === "en_route"
                    ? "#f59e0b"
                    : "#9ca3af"
                }"></span>
                ${status.label}
              </p>
              ${responder.eta_minutes ? `<p>ETA: ${responder.eta_minutes} min</p>` : ""}
              ${responder.name ? `<p class="text-gray-400">${responder.name}</p>` : ""}
            </div>
          </div>
        `);

        const marker = new mapboxgl.Marker({ element: el })
          .setLngLat([responder.longitude, responder.latitude])
          .setPopup(popup)
          .addTo(map);

        markersRef.current.set(responder.id, marker);
      }
    });

    return () => {
      markersRef.current.forEach((marker) => marker.remove());
      markersRef.current.clear();
    };
  }, [map, mapLoaded, responders]);

  return markersRef.current;
}

export default useAuthorityMarkers;
