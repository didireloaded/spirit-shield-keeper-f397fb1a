import { useEffect, useRef, useState } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { supabase } from "@/integrations/supabase/client";

interface Marker {
  id: string;
  latitude: number;
  longitude: number;
  type: string;
}

interface Alert {
  id: string;
  latitude: number;
  longitude: number;
  type: string;
}

interface MiniMapProps {
  markers: Marker[];
  alerts: Alert[];
  userLocation?: { latitude: number; longitude: number } | null;
  className?: string;
}

const markerColors: Record<string, string> = {
  robbery: "#ef4444",
  accident: "#f59e0b",
  suspicious: "#8b5cf6",
  assault: "#dc2626",
  kidnapping: "#991b1b",
  other: "#6b7280",
  panic: "#ef4444",
  amber: "#f59e0b",
};

export const MiniMap = ({ markers, alerts, userLocation, className }: MiniMapProps) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const markersRef = useRef<mapboxgl.Marker[]>([]);
  const [mapboxToken, setMapboxToken] = useState<string | null>(null);

  // Fetch Mapbox token
  useEffect(() => {
    const fetchToken = async () => {
      const { data, error } = await supabase.functions.invoke("get-mapbox-token");
      if (!error && data?.token) {
        setMapboxToken(data.token);
      }
    };
    fetchToken();
  }, []);

  // Initialize map
  useEffect(() => {
    if (!mapContainer.current || !mapboxToken) return;

    mapboxgl.accessToken = mapboxToken;

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: "mapbox://styles/mapbox/dark-v11",
      center: userLocation ? [userLocation.longitude, userLocation.latitude] : [17.0658, -22.5609],
      zoom: 12,
      interactive: false, // Make it non-interactive for mini view
    });

    return () => {
      map.current?.remove();
    };
  }, [mapboxToken]);

  // Update center when user location changes
  useEffect(() => {
    if (map.current && userLocation) {
      map.current.setCenter([userLocation.longitude, userLocation.latitude]);
    }
  }, [userLocation]);

  // Render markers and alerts
  useEffect(() => {
    if (!map.current) return;

    // Clear existing markers
    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];

    // Add user location marker
    if (userLocation) {
      const userEl = document.createElement("div");
      userEl.className = "w-3 h-3 bg-primary rounded-full border-2 border-white shadow-lg";

      const userMarker = new mapboxgl.Marker({ element: userEl })
        .setLngLat([userLocation.longitude, userLocation.latitude])
        .addTo(map.current);

      markersRef.current.push(userMarker);
    }

    // Add incident markers
    markers.forEach((marker) => {
      const el = document.createElement("div");
      el.className = "w-3 h-3 rounded-full border border-white shadow-md";
      el.style.backgroundColor = markerColors[marker.type] || markerColors.other;

      const m = new mapboxgl.Marker({ element: el })
        .setLngLat([marker.longitude, marker.latitude])
        .addTo(map.current!);

      markersRef.current.push(m);
    });

    // Add alert markers with pulse effect
    alerts.forEach((alert) => {
      const el = document.createElement("div");
      el.innerHTML = `
        <div class="relative">
          <div class="absolute inset-0 w-4 h-4 rounded-full animate-ping opacity-50" style="background-color: ${
            markerColors[alert.type] || markerColors.panic
          }"></div>
          <div class="w-4 h-4 rounded-full border-2 border-white" style="background-color: ${
            markerColors[alert.type] || markerColors.panic
          }"></div>
        </div>
      `;

      const m = new mapboxgl.Marker({ element: el })
        .setLngLat([alert.longitude, alert.latitude])
        .addTo(map.current!);

      markersRef.current.push(m);
    });
  }, [markers, alerts, userLocation]);

  if (!mapboxToken) {
    return (
      <div className={`bg-card rounded-xl flex items-center justify-center ${className}`}>
        <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return <div ref={mapContainer} className={`rounded-xl overflow-hidden ${className}`} />;
};
