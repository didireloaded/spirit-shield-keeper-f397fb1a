import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { usePushNotifications } from "./usePushNotifications";
import type { Database } from "@/integrations/supabase/types";

type Alert = Database["public"]["Tables"]["alerts"]["Row"];
type AlertInsert = Database["public"]["Tables"]["alerts"]["Insert"];

export const useAlerts = () => {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const { notifyNearbyAlert } = usePushNotifications();

  // Fetch watchers to notify them
  const notifyWatchers = useCallback(async (alertType: string) => {
    if (!user) return;

    // Get all people who are watching this user (accepted watchers)
    const { data: watchers } = await supabase
      .from("watchers")
      .select("watcher_id")
      .eq("user_id", user.id)
      .eq("status", "accepted");

    if (watchers && watchers.length > 0) {
      // Get user profile for notification
      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("id", user.id)
        .single();

      const userName = profile?.full_name || "Someone you watch";
      
      // Send in-app notification (in a real app, this would also send push via service)
      console.log(`Notifying ${watchers.length} watchers about ${alertType} alert from ${userName}`);
    }
  }, [user]);

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
            const newAlert = payload.new as Alert;
            setAlerts((prev) => [newAlert, ...prev]);
            
            // Notify about nearby alerts (not own alerts)
            if (newAlert.user_id !== user?.id) {
              notifyNearbyAlert(newAlert.type, "nearby");
            }
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
  }, [user?.id, notifyNearbyAlert]);

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

    // Notify watchers about the alert
    if (data && !error) {
      await notifyWatchers(type);
    }

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
