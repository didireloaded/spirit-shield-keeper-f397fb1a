/**
 * Map Alerts Hook
 * Fetches active alerts (panic, amber, etc.) for map display
 * Real-time updates via Supabase subscription
 */

import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { QUERY_LIMITS } from "@/core/config/constants";

export interface MapAlert {
  id: string;
  latitude: number;
  longitude: number;
  type: string;
  status: string;
  created_at: string;
  description?: string | null;
  user_id: string;
}

type AlertStatus = "active" | "cancelled" | "escalated" | "resolved";

interface UseMapAlertsOptions {
  enabled?: boolean;
  statusFilter?: AlertStatus[];
}

export function useMapAlerts(options: UseMapAlertsOptions = {}) {
  const { enabled = true, statusFilter = ["active"] } = options;
  const [alerts, setAlerts] = useState<MapAlert[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchAlerts = useCallback(async () => {
    if (!enabled) return;

    setLoading(true);
    setError(null);

    try {
      const { data, error: fetchError } = await supabase
        .from("alerts")
        .select("id, latitude, longitude, type, status, created_at, description, user_id")
        .in("status", statusFilter)
        .order("created_at", { ascending: false })
        .limit(QUERY_LIMITS.DEFAULT);

      if (fetchError) {
        setError(fetchError.message);
      } else {
        setAlerts(data ?? []);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch alerts");
    } finally {
      setLoading(false);
    }
  }, [enabled, statusFilter]);

  // Initial fetch
  useEffect(() => {
    fetchAlerts();
  }, [fetchAlerts]);

  // Real-time subscription
  useEffect(() => {
    if (!enabled) return;

    const channel = supabase
      .channel("map-alerts-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "alerts" },
        () => fetchAlerts()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [enabled, fetchAlerts]);

  return {
    alerts,
    loading,
    error,
    refetch: fetchAlerts,
  };
}
