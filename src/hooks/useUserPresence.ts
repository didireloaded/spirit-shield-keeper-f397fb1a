/**
 * User Presence Service Hook
 * Central real-time presence logic
 * Tracks: online/offline, ghost mode, GPS availability, watch-linked state
 * Feeds: Map, Active Users Panel, Panic & Look After Me layers
 */

import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface PresenceState {
  isOnline: boolean;
  ghostMode: boolean;
  gpsAvailable: boolean;
  isTracking: boolean;
  watchLinkedCount: number;
}

export function useUserPresence() {
  const { user } = useAuth();
  const [presence, setPresence] = useState<PresenceState>({
    isOnline: true,
    ghostMode: false,
    gpsAvailable: false,
    isTracking: false,
    watchLinkedCount: 0,
  });

  // Check GPS availability
  useEffect(() => {
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        () => setPresence((p) => ({ ...p, gpsAvailable: true })),
        () => setPresence((p) => ({ ...p, gpsAvailable: false })),
        { timeout: 5000 }
      );
    }
  }, []);

  // Fetch initial profile ghost mode
  useEffect(() => {
    if (!user) return;

    const fetchProfile = async () => {
      const { data } = await supabase
        .from("profiles")
        .select("ghost_mode")
        .eq("id", user.id)
        .single();

      if (data) {
        setPresence((p) => ({ ...p, ghostMode: data.ghost_mode || false }));
      }
    };

    const fetchWatchers = async () => {
      const { count } = await supabase
        .from("watchers")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id)
        .eq("status", "accepted");

      setPresence((p) => ({ ...p, watchLinkedCount: count || 0 }));
    };

    fetchProfile();
    fetchWatchers();
  }, [user]);

  // Online/offline detection
  useEffect(() => {
    const handleOnline = () => setPresence((p) => ({ ...p, isOnline: true }));
    const handleOffline = () => setPresence((p) => ({ ...p, isOnline: false }));

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  const setGhostMode = useCallback(
    async (enabled: boolean) => {
      if (!user) return;
      setPresence((p) => ({ ...p, ghostMode: enabled }));
      await supabase.from("profiles").update({ ghost_mode: enabled }).eq("id", user.id);
      // Also update user_locations
      await supabase.from("user_locations").update({ ghost_mode: enabled } as any).eq("user_id", user.id);
    },
    [user]
  );

  return {
    ...presence,
    setGhostMode,
  };
}
