/**
 * Safety Heatmap Hook
 * Aggregated incident data for passive intelligence
 */

import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface HeatmapPoint {
  lat: number;
  lng: number;
  incidentType: string;
  count: number;
  latestAt: string;
}

export const useSafetyHeatmap = () => {
  const [heatmapData, setHeatmapData] = useState<HeatmapPoint[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchHeatmap = useCallback(async (bounds: {
    minLat: number; maxLat: number; minLng: number; maxLng: number;
  }) => {
    setLoading(true);

    const { data, error } = await supabase.rpc("get_heatmap_data", {
      min_lat: bounds.minLat,
      max_lat: bounds.maxLat,
      min_lng: bounds.minLng,
      max_lng: bounds.maxLng,
    });

    if (!error && data) {
      setHeatmapData((data as any[]).map(d => ({
        lat: Number(d.lat_bucket),
        lng: Number(d.lng_bucket),
        incidentType: d.incident_type,
        count: Number(d.incident_count),
        latestAt: d.latest_at,
      })));
    }
    setLoading(false);
  }, []);

  return { heatmapData, loading, fetchHeatmap };
};
