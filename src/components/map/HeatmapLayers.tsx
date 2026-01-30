/**
 * Heatmap Layer for Mapbox
 * Visualizes incident density with confidence-weighted intensity
 * Toggleable visibility with smooth fade at high zoom
 * 
 * CRITICAL: Uses refs for map readiness to prevent race conditions.
 */

import { useEffect, useRef, MutableRefObject } from "react";
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
  mapRef: MutableRefObject<mapboxgl.Map | null>;
  mapLoadedRef: MutableRefObject<boolean>;
  incidents: Incident[];
  visible: boolean;
}

const SOURCE_ID = "heatmap-source";
const LAYER_ID = "incident-heatmap";

/**
 * Convert incidents to GeoJSON for heatmap with confidence weighting
 */
function incidentsToHeatmapGeoJSON(incidents: Incident[]): GeoJSON.FeatureCollection {
  const now = Date.now();
  
  // Filter to only include recent active incidents
  const recentIncidents = incidents.filter((i) => {
    if (i.status === "resolved") return false;
    if (!i.created_at) return true;
    // Only show last 24 hours in heatmap
    return now - new Date(i.created_at).getTime() < 24 * 60 * 60 * 1000;
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
  mapRef,
  mapLoadedRef,
  incidents,
  visible,
}: HeatmapLayersProps) {
  const layersAddedRef = useRef(false);

  // Initialize layers
  useEffect(() => {
    // Guard: map must exist and be loaded
    if (!mapRef.current || !mapLoadedRef.current) return;
    
    // Guard: don't add twice
    if (layersAddedRef.current) return;
    
    const map = mapRef.current;
    
    // Guard: source might already exist
    if (map.getSource(SOURCE_ID)) {
      layersAddedRef.current = true;
      return;
    }

    try {
      map.addSource(SOURCE_ID, {
        type: "geojson",
        data: incidentsToHeatmapGeoJSON([]),
      });

      // Add heatmap layer (insert below clusters for proper stacking)
      const firstSymbolLayer = map.getStyle()?.layers?.find(
        (layer) => layer.type === "symbol"
      )?.id;

      map.addLayer(
        {
          id: LAYER_ID,
          type: "heatmap",
          source: SOURCE_ID,
          maxzoom: 15,
          paint: {
            // Weight by confidence score (0-100)
            "heatmap-weight": [
              "interpolate",
              ["linear"],
              ["get", "confidence"],
              0,
              0,
              100,
              1,
            ],
            // Intensity increases with zoom
            "heatmap-intensity": [
              "interpolate",
              ["linear"],
              ["zoom"],
              0,
              1,
              15,
              3,
            ],
            // Color gradient: transparent -> yellow -> orange -> red
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
            // Radius increases with zoom for smooth visualization
            "heatmap-radius": [
              "interpolate",
              ["linear"],
              ["zoom"],
              0,
              5,
              15,
              30,
            ],
            // Fade out at high zoom to show individual markers
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
        firstSymbolLayer || "incident-clusters"
      );

      layersAddedRef.current = true;
    } catch (error) {
      console.error("[HeatmapLayers] Failed to add layers:", error);
    }
  }, [mapRef, mapLoadedRef]);

  // Update source data when incidents change
  useEffect(() => {
    if (!mapRef.current || !mapLoadedRef.current || !layersAddedRef.current) return;

    const map = mapRef.current;

    try {
      const source = map.getSource(SOURCE_ID) as mapboxgl.GeoJSONSource;
      if (source) {
        source.setData(incidentsToHeatmapGeoJSON(incidents));
      }
    } catch (error) {
      console.error("[HeatmapLayers] Failed to update data:", error);
    }
  }, [mapRef, mapLoadedRef, incidents]);

  // Toggle visibility
  useEffect(() => {
    if (!mapRef.current || !mapLoadedRef.current || !layersAddedRef.current) return;

    const map = mapRef.current;

    try {
      if (map.getLayer(LAYER_ID)) {
        map.setLayoutProperty(LAYER_ID, "visibility", visible ? "visible" : "none");
      }
    } catch (error) {
      console.error("[HeatmapLayers] Failed to toggle visibility:", error);
    }
  }, [mapRef, mapLoadedRef, visible]);

  // Cleanup
  useEffect(() => {
    return () => {
      layersAddedRef.current = false;
    };
  }, []);
}

export default useHeatmapLayers;
