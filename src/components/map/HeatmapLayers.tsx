/**
 * Heatmap Layer for Mapbox
 * Visualizes incident density with toggleable visibility
 * No mock data - uses real-time incident data only
 */

import { useEffect } from "react";
import mapboxgl from "mapbox-gl";

interface Incident {
  id: string;
  latitude: number;
  longitude: number;
  confidence_score?: number;
  created_at?: string;
  status?: string;
}

interface HeatmapLayersProps {
  map: mapboxgl.Map | null;
  incidents: Incident[];
  mapLoaded: boolean;
  visible: boolean;
}

/**
 * Convert incidents to GeoJSON for heatmap
 */
function incidentsToHeatmapGeoJSON(incidents: Incident[]): GeoJSON.FeatureCollection {
  // Filter to only include recent active incidents for heatmap
  const recentIncidents = incidents.filter((i) => {
    if (i.status === "resolved") return false;
    if (!i.created_at) return true;
    // Only show last 24 hours in heatmap
    return Date.now() - new Date(i.created_at).getTime() < 24 * 60 * 60 * 1000;
  });

  return {
    type: "FeatureCollection",
    features: recentIncidents.map((incident) => ({
      type: "Feature" as const,
      geometry: {
        type: "Point" as const,
        coordinates: [incident.longitude, incident.latitude],
      },
      properties: {
        confidence: incident.confidence_score || 50,
      },
    })),
  };
}

export function useHeatmapLayers({
  map,
  incidents,
  mapLoaded,
  visible,
}: HeatmapLayersProps) {
  useEffect(() => {
    if (!map || !mapLoaded) return;

    const sourceId = "heatmap-source";
    const layerId = "incident-heatmap";

    // Add source if not exists
    if (!map.getSource(sourceId)) {
      map.addSource(sourceId, {
        type: "geojson",
        data: incidentsToHeatmapGeoJSON([]),
      });

      // Add heatmap layer (insert at bottom)
      map.addLayer(
        {
          id: layerId,
          type: "heatmap",
          source: sourceId,
          maxzoom: 15,
          paint: {
            // Weight by confidence score
            "heatmap-weight": [
              "interpolate",
              ["linear"],
              ["get", "confidence"],
              0,
              0,
              100,
              1,
            ],
            // Intensity based on zoom
            "heatmap-intensity": [
              "interpolate",
              ["linear"],
              ["zoom"],
              0,
              1,
              15,
              3,
            ],
            // Color gradient - yellow to red
            "heatmap-color": [
              "interpolate",
              ["linear"],
              ["heatmap-density"],
              0,
              "rgba(0,0,0,0)",
              0.2,
              "rgba(255,200,0,0.3)",
              0.4,
              "rgba(255,140,0,0.5)",
              0.6,
              "rgba(255,80,0,0.7)",
              0.8,
              "rgba(255,0,0,0.8)",
              1,
              "rgba(200,0,0,0.9)",
            ],
            // Radius based on zoom
            "heatmap-radius": [
              "interpolate",
              ["linear"],
              ["zoom"],
              0,
              5,
              15,
              30,
            ],
            // Fade out at high zoom
            "heatmap-opacity": [
              "interpolate",
              ["linear"],
              ["zoom"],
              12,
              0.8,
              15,
              0,
            ],
          },
        },
        "incident-clusters" // Insert below clusters
      );
    }

    // Update source data
    const source = map.getSource(sourceId) as mapboxgl.GeoJSONSource;
    if (source) {
      source.setData(incidentsToHeatmapGeoJSON(incidents));
    }

    // Toggle visibility
    if (map.getLayer(layerId)) {
      map.setLayoutProperty(layerId, "visibility", visible ? "visible" : "none");
    }
  }, [map, mapLoaded, incidents, visible]);
}

export default useHeatmapLayers;
