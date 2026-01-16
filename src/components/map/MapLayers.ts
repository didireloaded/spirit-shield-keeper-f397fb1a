import mapboxgl from "mapbox-gl";

/**
 * Convert incidents/alerts to GeoJSON features
 */
export function toGeoJSONFeatures(
  items: Array<{
    id: string;
    latitude: number;
    longitude: number;
    type: string;
    status?: string;
    verified_count?: number;
    created_at?: string;
    description?: string | null;
  }>
): GeoJSON.FeatureCollection {
  return {
    type: "FeatureCollection",
    features: items.map((item) => ({
      type: "Feature" as const,
      id: item.id,
      geometry: {
        type: "Point" as const,
        coordinates: [item.longitude, item.latitude],
      },
      properties: {
        id: item.id,
        type: item.type,
        status: item.status || "active",
        verified: (item.verified_count || 0) >= 3,
        confidence_score: Math.min(100, (item.verified_count || 0) * 20 + 40),
        created_at: item.created_at,
        description: item.description,
        isRecent: item.created_at
          ? Date.now() - new Date(item.created_at).getTime() < 30 * 60 * 1000
          : false,
      },
    })),
  };
}

/**
 * Add clustered incident source
 */
export function addIncidentSource(map: mapboxgl.Map) {
  if (map.getSource("incidents")) return;

  map.addSource("incidents", {
    type: "geojson",
    data: {
      type: "FeatureCollection",
      features: [],
    },
    cluster: true,
    clusterRadius: 50,
    clusterMaxZoom: 14,
  });
}

/**
 * Add cluster and unclustered point layers
 */
export function addIncidentLayers(map: mapboxgl.Map) {
  if (map.getLayer("clusters")) return;

  // Cluster circles
  map.addLayer({
    id: "clusters",
    type: "circle",
    source: "incidents",
    filter: ["has", "point_count"],
    paint: {
      "circle-color": [
        "step",
        ["get", "point_count"],
        "#ef4444", // Red for small clusters
        5,
        "#dc2626", // Darker red for medium
        10,
        "#b91c1c", // Even darker for large
      ],
      "circle-radius": [
        "step",
        ["get", "point_count"],
        20,
        5,
        25,
        10,
        30,
      ],
      "circle-opacity": 0.85,
      "circle-stroke-width": 2,
      "circle-stroke-color": "#ffffff",
    },
  });

  // Cluster count labels
  map.addLayer({
    id: "cluster-count",
    type: "symbol",
    source: "incidents",
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

  // Individual incident markers
  map.addLayer({
    id: "unclustered-point",
    type: "circle",
    source: "incidents",
    filter: ["!", ["has", "point_count"]],
    paint: {
      // Size based on status
      "circle-radius": [
        "case",
        ["==", ["get", "status"], "resolved"],
        6,
        ["==", ["get", "isRecent"], true],
        12,
        10,
      ],
      // Color based on type
      "circle-color": [
        "case",
        ["==", ["get", "type"], "panic"],
        "#ef4444",
        ["==", ["get", "type"], "amber"],
        "#f59e0b",
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
        "#6b7280", // default
      ],
      // Opacity based on status
      "circle-opacity": [
        "case",
        ["==", ["get", "status"], "resolved"],
        0.4,
        0.9,
      ],
      // Stroke for verified incidents
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

  // Pulse effect layer for recent/active incidents
  map.addLayer(
    {
      id: "unclustered-pulse",
      type: "circle",
      source: "incidents",
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
          "#ef4444",
        ],
        "circle-opacity": 0.3,
      },
    },
    "unclustered-point" // Insert before the main points layer
  );
}

/**
 * Add heatmap layer for incident density
 */
export function addHeatmapLayer(map: mapboxgl.Map) {
  if (map.getLayer("incident-heat")) return;

  map.addLayer(
    {
      id: "incident-heat",
      type: "heatmap",
      source: "incidents",
      maxzoom: 15,
      paint: {
        // Weight by confidence score
        "heatmap-weight": [
          "interpolate",
          ["linear"],
          ["get", "confidence_score"],
          0,
          0,
          100,
          1,
        ],
        // Intensity
        "heatmap-intensity": [
          "interpolate",
          ["linear"],
          ["zoom"],
          0,
          1,
          15,
          3,
        ],
        // Color gradient
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
        // Opacity fade at high zoom
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
    "clusters" // Insert below clusters
  );
}

/**
 * Update incident source data
 */
export function updateIncidentSource(
  map: mapboxgl.Map,
  features: GeoJSON.FeatureCollection
) {
  const source = map.getSource("incidents") as mapboxgl.GeoJSONSource;
  if (source) {
    source.setData(features);
  }
}

/**
 * Toggle heatmap visibility
 */
export function toggleHeatmap(map: mapboxgl.Map, visible: boolean) {
  if (map.getLayer("incident-heat")) {
    map.setLayoutProperty(
      "incident-heat",
      "visibility",
      visible ? "visible" : "none"
    );
  }
}
