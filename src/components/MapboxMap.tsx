/**
 * MapboxMap - Production-ready map component
 * Uses real-time Supabase data only - no mock data
 * Clean separation of concerns with layer hooks
 */

import { useEffect, useRef, useState, useCallback } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { supabase } from "@/integrations/supabase/client";
import { useIncidentLayers } from "./map/IncidentLayers";
import { useHeatmapLayers } from "./map/HeatmapLayers";
import { useAuthorityMarkers } from "./map/AuthorityMarkers";

interface RouteData {
  id: string;
  startLat: number;
  startLng: number;
  endLat: number;
  endLng: number;
  destinationName?: string;
  status?: string;
}

interface WatcherData {
  id: string;
  name: string;
  avatarUrl?: string;
  latitude: number;
  longitude: number;
  updatedAt: string;
}

interface IncidentData {
  id: string;
  latitude: number;
  longitude: number;
  type: string;
  description?: string | null;
  status?: string;
  verified?: boolean;
  verified_count?: number;
  confidence_score?: number;
  created_at?: string;
}

interface ResponderData {
  id: string;
  name?: string;
  role: "police" | "ambulance" | "authority" | "volunteer";
  latitude: number;
  longitude: number;
  status: "en_route" | "on_scene" | "available" | "offline";
  eta_minutes?: number;
  incident_id?: string;
}

interface MapboxMapProps {
  onMapLoad?: (map: mapboxgl.Map) => void;
  onLocationUpdate?: (lat: number, lng: number) => void;
  onMarkerClick?: (incident: IncidentData) => void;
  onMapClick?: (lat: number, lng: number) => void;
  showUserLocation?: boolean;
  incidents?: IncidentData[];
  responders?: ResponderData[];
  routes?: RouteData[];
  watchers?: WatcherData[];
  heatmapEnabled?: boolean;
  className?: string;
}

export function MapboxMap({
  onMapLoad,
  onLocationUpdate,
  onMarkerClick,
  onMapClick,
  showUserLocation = true,
  incidents = [],
  responders = [],
  routes = [],
  watchers = [],
  heatmapEnabled = false,
  className = "",
}: MapboxMapProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const userMarker = useRef<mapboxgl.Marker | null>(null);
  const destinationMarkers = useRef<Map<string, mapboxgl.Marker>>(new Map());
  const watcherMarkers = useRef<Map<string, mapboxgl.Marker>>(new Map());
  const [mapLoaded, setMapLoaded] = useState(false);
  const [mapboxToken, setMapboxToken] = useState<string | null>(null);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);

  // Fetch Mapbox token from edge function
  useEffect(() => {
    const fetchToken = async () => {
      try {
        const { data, error } = await supabase.functions.invoke("get-mapbox-token");
        if (!error && data?.token) {
          setMapboxToken(data.token);
        } else {
          console.error("[Map] Failed to fetch Mapbox token:", error);
        }
      } catch (err) {
        console.error("[Map] Error fetching token:", err);
      }
    };
    fetchToken();
  }, []);

  // Initialize map
  useEffect(() => {
    if (!mapContainer.current || !mapboxToken || map.current) return;

    mapboxgl.accessToken = mapboxToken;

    // Default to Namibia (Windhoek)
    const defaultCenter: [number, number] = [17.0832, -22.5609];

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: "mapbox://styles/mapbox/dark-v11",
      center: defaultCenter,
      zoom: 13,
      pitch: 45,
      bearing: -17,
    });

    // Add controls
    map.current.addControl(
      new mapboxgl.NavigationControl({ visualizePitch: true }),
      "top-right"
    );

    map.current.addControl(
      new mapboxgl.GeolocateControl({
        positionOptions: { enableHighAccuracy: true },
        trackUserLocation: true,
        showUserHeading: true,
      }),
      "bottom-right"
    );

    map.current.on("load", () => {
      setMapLoaded(true);
      if (onMapLoad && map.current) {
        onMapLoad(map.current);
      }
    });

    // Handle map click for adding pins
    if (onMapClick) {
      map.current.on("click", (e) => {
        // Don't trigger if clicking on a feature
        const features = map.current?.queryRenderedFeatures(e.point, {
          layers: ["incident-clusters", "incident-points"],
        });
        if (features && features.length > 0) return;

        onMapClick(e.lngLat.lat, e.lngLat.lng);
      });
    }

    return () => {
      if (map.current) {
        map.current.remove();
        map.current = null;
      }
    };
  }, [mapboxToken, onMapLoad, onMapClick]);

  // Use layer hooks for clean separation
  useIncidentLayers({
    map: map.current,
    incidents,
    mapLoaded,
    onSelect: onMarkerClick,
  });

  useHeatmapLayers({
    map: map.current,
    incidents,
    mapLoaded,
    visible: heatmapEnabled,
  });

  useAuthorityMarkers({
    map: map.current,
    responders,
    mapLoaded,
  });

  // Get user location
  useEffect(() => {
    if (!showUserLocation) return;

    const watchId = navigator.geolocation.watchPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        setUserLocation({ lat: latitude, lng: longitude });
        if (onLocationUpdate) {
          onLocationUpdate(latitude, longitude);
        }
      },
      (error) => {
        console.error("[Map] Geolocation error:", error);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 5000 }
    );

    return () => {
      navigator.geolocation.clearWatch(watchId);
    };
  }, [showUserLocation, onLocationUpdate]);

  // Update user marker
  useEffect(() => {
    if (!map.current || !mapLoaded || !userLocation || !showUserLocation) return;

    if (!userMarker.current) {
      const el = document.createElement("div");
      el.className = "user-marker";
      el.innerHTML = `
        <div class="relative">
          <div class="absolute -inset-3 bg-blue-500/20 rounded-full animate-pulse"></div>
          <div class="w-4 h-4 bg-blue-500 rounded-full border-2 border-white shadow-lg"></div>
        </div>
      `;

      userMarker.current = new mapboxgl.Marker({ element: el })
        .setLngLat([userLocation.lng, userLocation.lat])
        .addTo(map.current);

      // Pan to user location on first load
      map.current.flyTo({
        center: [userLocation.lng, userLocation.lat],
        zoom: 14,
        duration: 1500,
      });
    } else {
      userMarker.current.setLngLat([userLocation.lng, userLocation.lat]);
    }
  }, [userLocation, mapLoaded, showUserLocation]);

  // Update watcher markers
  useEffect(() => {
    if (!map.current || !mapLoaded) return;

    const currentWatcherIds = new Set(watchers.map((w) => w.id));

    // Remove old markers
    watcherMarkers.current.forEach((marker, id) => {
      if (!currentWatcherIds.has(id)) {
        marker.remove();
        watcherMarkers.current.delete(id);
      }
    });

    // Add/update watcher markers
    watchers.forEach((watcher) => {
      const existingMarker = watcherMarkers.current.get(watcher.id);

      if (existingMarker) {
        existingMarker.setLngLat([watcher.longitude, watcher.latitude]);
      } else {
        const el = document.createElement("div");
        el.className = "watcher-marker";

        const initials = watcher.name
          .split(" ")
          .map((n) => n[0])
          .join("")
          .toUpperCase()
          .slice(0, 2);

        el.innerHTML = `
          <div class="relative cursor-pointer transform hover:scale-110 transition-transform">
            <div class="absolute -inset-1.5 bg-cyan-400/30 rounded-full animate-pulse"></div>
            <div class="w-10 h-10 rounded-full flex items-center justify-center shadow-lg border-2 border-white overflow-hidden" style="background: linear-gradient(135deg, #06B6D4, #0891B2)">
              ${
                watcher.avatarUrl
                  ? `<img src="${watcher.avatarUrl}" alt="${watcher.name}" class="w-full h-full object-cover" />`
                  : `<span class="text-white text-sm font-bold">${initials}</span>`
              }
            </div>
          </div>
        `;

        const lastUpdate = new Date(watcher.updatedAt);
        const minutesAgo = Math.floor((Date.now() - lastUpdate.getTime()) / 60000);
        const timeAgo =
          minutesAgo < 1
            ? "Just now"
            : minutesAgo < 60
            ? `${minutesAgo}m ago`
            : `${Math.floor(minutesAgo / 60)}h ago`;

        const popup = new mapboxgl.Popup({ offset: 25, closeButton: false }).setHTML(`
          <div class="p-3 text-sm">
            <div class="flex items-center gap-2 mb-1">
              <div class="w-2 h-2 rounded-full bg-cyan-500"></div>
              <strong class="text-cyan-600">${watcher.name}</strong>
            </div>
            <p class="text-gray-500 text-xs">Last updated: ${timeAgo}</p>
            <p class="text-xs text-gray-400 mt-1">Trusted Contact</p>
          </div>
        `);

        const marker = new mapboxgl.Marker({ element: el })
          .setLngLat([watcher.longitude, watcher.latitude])
          .setPopup(popup)
          .addTo(map.current!);

        watcherMarkers.current.set(watcher.id, marker);
      }
    });
  }, [watchers, mapLoaded]);

  // Draw routes for Look After Me trips
  useEffect(() => {
    if (!map.current || !mapLoaded || !mapboxToken) return;

    const drawRoutes = async () => {
      // Remove existing route layers and sources
      for (let i = 0; i < 10; i++) {
        const sourceId = `route-source-${i}`;
        const layerId = `route-layer-${i}`;
        const outlineLayerId = `route-outline-${i}`;

        if (map.current?.getLayer(layerId)) {
          map.current.removeLayer(layerId);
        }
        if (map.current?.getLayer(outlineLayerId)) {
          map.current.removeLayer(outlineLayerId);
        }
        if (map.current?.getSource(sourceId)) {
          map.current.removeSource(sourceId);
        }
      }

      // Clear destination markers
      destinationMarkers.current.forEach((marker) => marker.remove());
      destinationMarkers.current.clear();

      // Draw new routes
      for (let index = 0; index < routes.length; index++) {
        const route = routes[index];
        const sourceId = `route-source-${index}`;
        const layerId = `route-layer-${index}`;
        const outlineLayerId = `route-outline-${index}`;

        try {
          const response = await fetch(
            `https://api.mapbox.com/directions/v5/mapbox/driving/${route.startLng},${route.startLat};${route.endLng},${route.endLat}?geometries=geojson&overview=full&access_token=${mapboxToken}`
          );

          const data = await response.json();

          if (data.routes && data.routes[0]) {
            const routeGeometry = data.routes[0].geometry;

            map.current?.addSource(sourceId, {
              type: "geojson",
              data: {
                type: "Feature",
                properties: {},
                geometry: routeGeometry,
              },
            });

            // Route outline
            map.current?.addLayer({
              id: outlineLayerId,
              type: "line",
              source: sourceId,
              layout: {
                "line-join": "round",
                "line-cap": "round",
              },
              paint: {
                "line-color": route.status === "late" ? "#F59E0B" : "#10B981",
                "line-width": 8,
                "line-opacity": 0.3,
              },
            });

            // Route line
            map.current?.addLayer({
              id: layerId,
              type: "line",
              source: sourceId,
              layout: {
                "line-join": "round",
                "line-cap": "round",
              },
              paint: {
                "line-color": route.status === "late" ? "#F59E0B" : "#10B981",
                "line-width": 4,
                "line-opacity": 0.9,
              },
            });

            // Add destination marker
            const destEl = document.createElement("div");
            destEl.className = "destination-marker";
            destEl.innerHTML = `
              <div class="relative">
                <div class="absolute -inset-2 bg-emerald-500/30 rounded-full animate-pulse"></div>
                <div class="w-10 h-10 rounded-full bg-emerald-500 flex items-center justify-center shadow-lg border-2 border-white">
                  <svg class="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </div>
              </div>
            `;

            const destPopup = new mapboxgl.Popup({ offset: 25, closeButton: false }).setHTML(`
              <div class="p-3 text-sm">
                <strong class="text-emerald-600">Destination</strong>
                <p class="text-gray-600 text-xs mt-1">${route.destinationName || "Your destination"}</p>
              </div>
            `);

            const destMarker = new mapboxgl.Marker({ element: destEl })
              .setLngLat([route.endLng, route.endLat])
              .setPopup(destPopup)
              .addTo(map.current!);

            destinationMarkers.current.set(route.id, destMarker);

            // Fit bounds to show entire route (only if single route)
            if (routes.length === 1 && map.current) {
              const bounds = new mapboxgl.LngLatBounds();
              bounds.extend([route.startLng, route.startLat]);
              bounds.extend([route.endLng, route.endLat]);

              map.current.fitBounds(bounds, {
                padding: { top: 100, bottom: 200, left: 50, right: 50 },
                duration: 1000,
              });
            }
          }
        } catch (error) {
          console.error("[Map] Error fetching route:", error);
        }
      }
    };

    drawRoutes();
  }, [routes, mapLoaded, mapboxToken]);

  // Expose methods for external control
  const centerOnUser = useCallback(() => {
    if (map.current && userLocation) {
      map.current.flyTo({
        center: [userLocation.lng, userLocation.lat],
        zoom: 15,
        duration: 1000,
      });
    }
  }, [userLocation]);

  const flyTo = useCallback((lat: number, lng: number, zoom = 15) => {
    if (map.current) {
      map.current.flyTo({
        center: [lng, lat],
        zoom,
        duration: 1000,
      });
    }
  }, []);

  // Loading state
  if (!mapboxToken) {
    return (
      <div className={`flex items-center justify-center bg-background ${className}`}>
        <div className="flex flex-col items-center gap-3 text-muted-foreground">
          <div className="w-10 h-10 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          <span className="text-sm">Loading map...</span>
        </div>
      </div>
    );
  }

  return (
    <div ref={mapContainer} className={`w-full h-full ${className}`} />
  );
}

export default MapboxMap;
