import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import type { Database } from "@/integrations/supabase/types";

type Alert = Database["public"]["Tables"]["alerts"]["Row"];
type AlertInsert = Database["public"]["Tables"]["alerts"]["Insert"];

export const useAlerts = () => {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    fetchAlerts();

    // Subscribe to real-time updates
    const channel = supabase
      .channel("alerts-changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "alerts",
        },
        (payload) => {
          if (payload.eventType === "INSERT") {
            setAlerts((prev) => [payload.new as Alert, ...prev]);
          } else if (payload.eventType === "UPDATE") {
            setAlerts((prev) =>
              prev.map((alert) =>
                alert.id === (payload.new as Alert).id
                  ? (payload.new as Alert)
                  : alert
              )
            );
          } else if (payload.eventType === "DELETE") {
            setAlerts((prev) =>
              prev.filter((alert) => alert.id !== (payload.old as Alert).id)
            );
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchAlerts = async () => {
    const { data, error } = await supabase
      .from("alerts")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(50);

    if (!error && data) {
      setAlerts(data);
    }
    setLoading(false);
  };

  const createAlert = async (
    type: AlertInsert["type"],
    latitude: number,
    longitude: number,
    description?: string,
    audioUrl?: string
  ) => {
    if (!user) return { error: new Error("Not authenticated") };

    const { data, error } = await supabase
      .from("alerts")
      .insert({
        user_id: user.id,
        type,
        latitude,
        longitude,
        description,
        audio_url: audioUrl,
      })
      .select()
      .single();

    return { data, error };
  };

  const resolveAlert = async (alertId: string) => {
    const { error } = await supabase
      .from("alerts")
      .update({ status: "resolved", resolved_at: new Date().toISOString() })
      .eq("id", alertId);

    return { error };
  };

  const cancelAlert = async (alertId: string) => {
    const { error } = await supabase
      .from("alerts")
      .update({ status: "cancelled" })
      .eq("id", alertId);

    return { error };
  };

  return {
    alerts,
    loading,
    createAlert,
    resolveAlert,
    cancelAlert,
    refetch: fetchAlerts,
  };
};
