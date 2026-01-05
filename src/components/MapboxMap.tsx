import { useEffect, useRef, useState, useCallback } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { supabase } from "@/integrations/supabase/client";

interface MapboxMapProps {
  onMapLoad?: (map: mapboxgl.Map) => void;
  onLocationUpdate?: (lat: number, lng: number) => void;
  showUserLocation?: boolean;
  markers?: Array<{
    id: string;
    latitude: number;
    longitude: number;
    type: string;
    description?: string;
  }>;
  alerts?: Array<{
    id: string;
    latitude: number;
    longitude: number;
    type: string;
    status: string;
  }>;
  onMapClick?: (lat: number, lng: number) => void;
  className?: string;
}

const markerColors: Record<string, string> = {
  robbery: "#EF4444",
  assault: "#DC2626",
  kidnapping: "#B91C1C",
  accident: "#F59E0B",
  suspicious: "#8B5CF6",
  danger: "#7C3AED",
  other: "#6B7280",
  panic: "#EF4444",
  amber: "#F59E0B",
};

export const MapboxMap = ({
  onMapLoad,
  onLocationUpdate,
  showUserLocation = true,
  markers = [],
  alerts = [],
  onMapClick,
  className = "",
}: MapboxMapProps) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const userMarker = useRef<mapboxgl.Marker | null>(null);
  const markerRefs = useRef<Map<string, mapboxgl.Marker>>(new Map());
  const [mapLoaded, setMapLoaded] = useState(false);
  const [mapboxToken, setMapboxToken] = useState<string | null>(null);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);

  // Fetch Mapbox token
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

    // Default to Windhoek, Namibia
    const defaultCenter: [number, number] = [17.0832, -22.5609];

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: "mapbox://styles/mapbox/dark-v11",
      center: defaultCenter,
      zoom: 13,
      pitch: 0,
    });

    map.current.addControl(
      new mapboxgl.NavigationControl({ visualizePitch: false }),
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

  // Update incident markers
  useEffect(() => {
    if (!map.current || !mapLoaded) return;

    // Clear old markers that are no longer in the list
    const currentIds = new Set([...markers.map((m) => m.id), ...alerts.map((a) => a.id)]);
    markerRefs.current.forEach((marker, id) => {
      if (!currentIds.has(id)) {
        marker.remove();
        markerRefs.current.delete(id);
      }
    });

    // Add/update markers
    [...markers, ...alerts].forEach((item) => {
      if (markerRefs.current.has(item.id)) return;

      const color = markerColors[item.type] || markerColors.other;
      const isAlert = "status" in item;

      const el = document.createElement("div");
      el.className = "incident-marker";
      el.innerHTML = `
        <div class="relative cursor-pointer transform hover:scale-110 transition-transform">
          ${isAlert ? '<div class="absolute -inset-2 rounded-full animate-ping" style="background-color: ' + color + '40"></div>' : ""}
          <div class="w-8 h-8 rounded-full flex items-center justify-center shadow-lg" style="background-color: ${color}">
            <svg class="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
        </div>
      `;

      const popup = new mapboxgl.Popup({ offset: 25, closeButton: false }).setHTML(`
        <div class="p-2 text-sm">
          <strong class="capitalize">${item.type}</strong>
          ${"description" in item && item.description ? `<p class="text-gray-600 mt-1">${item.description}</p>` : ""}
        </div>
      `);

      const marker = new mapboxgl.Marker({ element: el })
        .setLngLat([item.longitude, item.latitude])
        .setPopup(popup)
        .addTo(map.current!);

      markerRefs.current.set(item.id, marker);
    });
  }, [markers, alerts, mapLoaded]);

  // Center on user
  const centerOnUser = useCallback(() => {
    if (map.current && userLocation) {
      map.current.flyTo({
        center: [userLocation.lng, userLocation.lat],
        zoom: 15,
        duration: 1000,
      });
    }
  }, [userLocation]);

  if (!mapboxToken) {
    return (
      <div className={`flex items-center justify-center bg-card ${className}`}>
        <div className="text-center space-y-4 p-6">
          <div className="w-16 h-16 mx-auto rounded-full bg-primary/10 flex items-center justify-center animate-pulse">
            <svg className="w-8 h-8 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </div>
          <p className="text-muted-foreground text-sm">Loading map...</p>
        </div>
      </div>
    );
  }

  return <div ref={mapContainer} className={className} />;
};

export default MapboxMap;
