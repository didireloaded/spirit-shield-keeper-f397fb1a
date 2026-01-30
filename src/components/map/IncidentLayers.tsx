/**
 * Incident Layers for Mapbox
 * Production-ready incident markers with proper styling
 * Pulsing animations, clustering, verification badges
 * 
 * CRITICAL: Uses refs for map readiness to prevent race conditions.
 * All source/layer operations guard with mapLoadedRef.current.
 */

import { useEffect, useRef, MutableRefObject } from "react";
import mapboxgl from "mapbox-gl";

interface Incident {
  id: string;
  latitude: number;
  longitude: number;
  type: string;
  status?: string;
  verified?: boolean;
  confidence_score?: number;
  created_at?: string;
  description?: string | null;
}

interface IncidentLayersProps {
  mapRef: MutableRefObject<mapboxgl.Map | null>;
  mapLoadedRef: MutableRefObject<boolean>;
  incidents: Incident[];
  onSelect?: (incident: Incident) => void;
}

const SOURCE_ID = "incidents";

/**
 * Convert incidents to GeoJSON with all necessary properties
 */
function incidentsToGeoJSON(incidents: Incident[]): GeoJSON.FeatureCollection {
  const now = Date.now();
  
  return {
    type: "FeatureCollection",
    features: incidents
      .filter((i) => {
        // Filter resolved incidents older than 24h
        if (i.status === "resolved") return false;
        if (!i.created_at) return true;
        return now - new Date(i.created_at).getTime() < 24 * 60 * 60 * 1000;
      })
      .map((incident) => {
        const createdAt = incident.created_at ? new Date(incident.created_at) : new Date();
        const isRecent = now - createdAt.getTime() < 30 * 60 * 1000; // 30 min

        return {
          type: "Feature" as const,
          id: incident.id,
          geometry: {
            type: "Point" as const,
            coordinates: [incident.longitude, incident.latitude],
          },
          properties: {
            id: incident.id,
            type: incident.type || "other",
            status: incident.status || "active",
            verified: incident.verified || false,
            confidence: incident.confidence_score || 50,
            isRecent,
            description: incident.description,
            created_at: incident.created_at,
          },
        };
      }),
  };
}

/**
 * Add all incident layers to the map
 * Only call this AFTER map.on("load") has fired
 */
function addIncidentLayers(map: mapboxgl.Map, onSelect?: (incident: Incident) => void) {
  // Add source
  map.addSource(SOURCE_ID, {
    type: "geojson",
    data: incidentsToGeoJSON([]),
    cluster: true,
    clusterRadius: 50,
    clusterMaxZoom: 14,
  });

  // Cluster circles with red gradient
  map.addLayer({
    id: "incident-clusters",
    type: "circle",
    source: SOURCE_ID,
    filter: ["has", "point_count"],
    paint: {
      "circle-color": [
        "step",
        ["get", "point_count"],
        "#ef4444",
        5,
        "#dc2626",
        10,
        "#b91c1c",
      ],
      "circle-radius": ["step", ["get", "point_count"], 20, 5, 25, 10, 30],
      "circle-opacity": 0.85,
      "circle-stroke-width": 2,
      "circle-stroke-color": "#ffffff",
    },
  });

  // Cluster count labels
  map.addLayer({
    id: "incident-cluster-count",
    type: "symbol",
    source: SOURCE_ID,
    filter: ["has", "point_count"],
    layout: {
      "text-field": "{point_count_abbreviated}",
      "text-size": 14,
      "text-font": ["DIN Pro Medium", "Arial Unicode MS Bold"],
    },
    paint: {
      "text-color": "#ffffff",
    },
  });

  // Pulse effect for recent/active incidents
  map.addLayer({
    id: "incident-pulse",
    type: "circle",
    source: SOURCE_ID,
    filter: [
      "all",
      ["!", ["has", "point_count"]],
      ["==", ["get", "isRecent"], true],
      ["!=", ["get", "status"], "resolved"],
    ],
    paint: {
      "circle-radius": 18,
      "circle-color": [
        "case",
        ["==", ["get", "type"], "panic"],
        "#ef4444",
        ["==", ["get", "type"], "amber"],
        "#f59e0b",
        ["==", ["get", "type"], "crash"],
        "#f97316",
        "#ef4444",
      ],
      "circle-opacity": 0.3,
    },
  });

  // Individual incident markers
  map.addLayer({
    id: "incident-points",
    type: "circle",
    source: SOURCE_ID,
    filter: ["!", ["has", "point_count"]],
    paint: {
      "circle-radius": [
        "case",
        ["==", ["get", "status"], "resolved"],
        6,
        ["==", ["get", "isRecent"], true],
        12,
        10,
      ],
      "circle-color": [
        "case",
        ["==", ["get", "status"], "resolved"],
        "#22c55e",
        ["==", ["get", "type"], "panic"],
        "#ef4444",
        ["==", ["get", "type"], "amber"],
        "#f59e0b",
        ["==", ["get", "type"], "crash"],
        "#f97316",
        ["==", ["get", "type"], "robbery"],
        "#ef4444",
        ["==", ["get", "type"], "assault"],
        "#dc2626",
        ["==", ["get", "type"], "kidnapping"],
        "#b91c1c",
        ["==", ["get", "type"], "accident"],
        "#f59e0b",
        ["==", ["get", "type"], "suspicious"],
        "#8b5cf6",
        "#6b7280",
      ],
      "circle-opacity": [
        "case",
        ["==", ["get", "status"], "resolved"],
        0.5,
        0.9,
      ],
      "circle-stroke-width": [
        "case",
        ["==", ["get", "verified"], true],
        3,
        2,
      ],
      "circle-stroke-color": [
        "case",
        ["==", ["get", "verified"], true],
        "#22c55e",
        ["==", ["get", "status"], "resolved"],
        "#6b7280",
        "#ffffff",
      ],
    },
  });

  // Click handler for clusters - zoom in
  map.on("click", "incident-clusters", (e) => {
    const features = map.queryRenderedFeatures(e.point, {
      layers: ["incident-clusters"],
    });
    if (!features.length) return;

    const clusterId = features[0].properties?.cluster_id;
    const source = map.getSource(SOURCE_ID) as mapboxgl.GeoJSONSource;

    source.getClusterExpansionZoom(clusterId, (err, zoom) => {
      if (err) return;

      const geometry = features[0].geometry;
      if (geometry.type === "Point") {
        map.easeTo({
          center: geometry.coordinates as [number, number],
          zoom: zoom || 14,
          duration: 500,
        });
      }
    });
  });

  // Click handler for individual points
  map.on("click", "incident-points", (e) => {
    if (!e.features?.length || !onSelect) return;

    const feature = e.features[0];
    const props = feature.properties;
    const geometry = feature.geometry;

    if (geometry.type === "Point" && props) {
      const [longitude, latitude] = geometry.coordinates;

      map.easeTo({
        center: [longitude, latitude],
        zoom: Math.max(map.getZoom(), 15),
        duration: 500,
      });

      onSelect({
        id: props.id,
        latitude,
        longitude,
        type: props.type,
        status: props.status,
        verified: props.verified === true || props.verified === "true",
        confidence_score: props.confidence,
        description: props.description,
        created_at: props.created_at,
      });
    }
  });

  // Cursor changes
  map.on("mouseenter", "incident-clusters", () => {
    map.getCanvas().style.cursor = "pointer";
  });
  map.on("mouseleave", "incident-clusters", () => {
    map.getCanvas().style.cursor = "";
  });
  map.on("mouseenter", "incident-points", () => {
    map.getCanvas().style.cursor = "pointer";
  });
  map.on("mouseleave", "incident-points", () => {
    map.getCanvas().style.cursor = "";
  });
}

export function useIncidentLayers({
  mapRef,
  mapLoadedRef,
  incidents,
  onSelect,
}: IncidentLayersProps) {
  const layersAddedRef = useRef(false);
  const onSelectRef = useRef(onSelect);
  
  // Keep onSelect ref updated
  useEffect(() => {
    onSelectRef.current = onSelect;
  }, [onSelect]);

  // Initialize layers - runs once when map is ready
  useEffect(() => {
    // Guard: map must exist and be loaded
    if (!mapRef.current || !mapLoadedRef.current) return;
    
    // Guard: don't add twice
    if (layersAddedRef.current) return;
    
    const map = mapRef.current;
    
    // Guard: source might already exist from previous mount
    if (map.getSource(SOURCE_ID)) {
      layersAddedRef.current = true;
      return;
    }

    try {
      addIncidentLayers(map, (incident) => {
        onSelectRef.current?.(incident);
      });
      layersAddedRef.current = true;
    } catch (error) {
      console.error("[IncidentLayers] Failed to add layers:", error);
    }
  }, [mapRef, mapLoadedRef]);

  // Update source data when incidents change
  useEffect(() => {
    // Guard: map must exist, be loaded, and layers must be added
    if (!mapRef.current || !mapLoadedRef.current || !layersAddedRef.current) return;

    const map = mapRef.current;

    try {
      const source = map.getSource(SOURCE_ID) as mapboxgl.GeoJSONSource;
      if (source) {
        source.setData(incidentsToGeoJSON(incidents));
      }
    } catch (error) {
      console.error("[IncidentLayers] Failed to update data:", error);
    }
  }, [mapRef, mapLoadedRef, incidents]);

  // Cleanup - mark as not added so next mount can re-add
  useEffect(() => {
    return () => {
      layersAddedRef.current = false;
    };
  }, []);
}

export default useIncidentLayers;
