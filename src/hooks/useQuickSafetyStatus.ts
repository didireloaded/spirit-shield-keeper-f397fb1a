/**
 * Quick Safety Status Hook
 * Allows users to broadcast a lightweight status to their trusted circle
 */

import { useState, useCallback, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export type SafetyStatusType = "safe" | "need_help" | "on_my_way";

export interface UserSafetyStatus {
  id: string;
  user_id: string;
  status: SafetyStatusType;
  message: string | null;
  latitude: number | null;
  longitude: number | null;
  expires_at: string | null;
  created_at: string;
}

export const useQuickSafetyStatus = () => {
  const { user } = useAuth();
  const [currentStatus, setCurrentStatus] = useState<UserSafetyStatus | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchCurrentStatus = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from("user_safety_status")
      .select("*")
      .eq("user_id", user.id)
      .gte("expires_at", new Date().toISOString())
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (data) setCurrentStatus(data as unknown as UserSafetyStatus);
    else setCurrentStatus(null);
  }, [user]);

  useEffect(() => {
    fetchCurrentStatus();
  }, [fetchCurrentStatus]);

  const sendStatus = useCallback(async (status: SafetyStatusType, message?: string) => {
    if (!user) { toast.error("Sign in to send status"); return; }
    setLoading(true);

    // Get current position if available
    let latitude: number | null = null;
    let longitude: number | null = null;
    try {
      const pos = await new Promise<GeolocationPosition>((resolve, reject) =>
        navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 5000 })
      );
      latitude = pos.coords.latitude;
      longitude = pos.coords.longitude;
    } catch { /* location optional */ }

    const { data, error } = await supabase
      .from("user_safety_status")
      .insert({
        user_id: user.id,
        status,
        message: message || null,
        latitude,
        longitude,
      })
      .select()
      .single();

    setLoading(false);

    if (error) {
      toast.error("Failed to send status");
    } else {
      setCurrentStatus(data as unknown as UserSafetyStatus);
      const labels: Record<SafetyStatusType, string> = {
        safe: "Marked as safe ✓",
        need_help: "Help request sent",
        on_my_way: "On my way status shared",
      };
      toast.success(labels[status]);
    }
  }, [user]);

  const clearStatus = useCallback(async () => {
    if (!user || !currentStatus) return;
    await supabase
      .from("user_safety_status")
      .delete()
      .eq("id", currentStatus.id);
    setCurrentStatus(null);
    toast.success("Status cleared");
  }, [user, currentStatus]);

  return { currentStatus, loading, sendStatus, clearStatus, fetchCurrentStatus };
};
