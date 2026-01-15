import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface NotificationSettings {
  id: string;
  user_id: string;
  sound_enabled: boolean;
  vibration_enabled: boolean;
  push_enabled: boolean;
  panic_override: boolean;
  quiet_hours_enabled: boolean;
  quiet_hours_start: string;
  quiet_hours_end: string;
}

const defaultSettings: Omit<NotificationSettings, "id" | "user_id"> = {
  sound_enabled: true,
  vibration_enabled: true,
  push_enabled: true,
  panic_override: true,
  quiet_hours_enabled: false,
  quiet_hours_start: "22:00",
  quiet_hours_end: "07:00",
};

export const useNotificationSettings = () => {
  const { user } = useAuth();
  const [settings, setSettings] = useState<NotificationSettings | null>(null);
  const [loading, setLoading] = useState(true);

  // Fetch settings
  const fetchSettings = useCallback(async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from("notification_settings")
        .select("*")
        .eq("user_id", user.id)
        .single();

      if (error && error.code === "PGRST116") {
        // No settings found, create default settings
        const { data: newSettings, error: insertError } = await supabase
          .from("notification_settings")
          .insert({ user_id: user.id })
          .select()
          .single();

        if (!insertError && newSettings) {
          setSettings(newSettings as NotificationSettings);
        }
      } else if (!error && data) {
        setSettings(data as NotificationSettings);
      }
    } catch (error) {
      console.error("Error fetching notification settings:", error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  // Update settings
  const updateSettings = async (updates: Partial<NotificationSettings>) => {
    if (!user || !settings) return { error: new Error("Not authenticated") };

    try {
      const { error } = await supabase
        .from("notification_settings")
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq("user_id", user.id);

      if (!error) {
        setSettings((prev) => (prev ? { ...prev, ...updates } : prev));
      }

      return { error };
    } catch (error) {
      console.error("Error updating notification settings:", error);
      return { error };
    }
  };

  // Check if should notify based on settings and priority
  const shouldNotify = useCallback(
    (priority: "low" | "normal" | "high" = "normal"): boolean => {
      if (!settings) return true; // Default to notify if no settings

      // Panic/high priority always notifies if panic_override is enabled
      if (priority === "high" && settings.panic_override) {
        return true;
      }

      // Check quiet hours
      if (settings.quiet_hours_enabled) {
        const now = new Date();
        const currentTime = `${now.getHours().toString().padStart(2, "0")}:${now.getMinutes().toString().padStart(2, "0")}`;
        const start = settings.quiet_hours_start;
        const end = settings.quiet_hours_end;

        // Handle overnight quiet hours (e.g., 22:00 to 07:00)
        if (start > end) {
          if (currentTime >= start || currentTime < end) {
            return priority === "high" && settings.panic_override;
          }
        } else {
          if (currentTime >= start && currentTime < end) {
            return priority === "high" && settings.panic_override;
          }
        }
      }

      return settings.push_enabled;
    },
    [settings]
  );

  // Check if sound should play
  const shouldPlaySound = useCallback(
    (priority: "low" | "normal" | "high" = "normal"): boolean => {
      if (!settings) return true;
      if (priority === "high" && settings.panic_override) return true;
      return settings.sound_enabled;
    },
    [settings]
  );

  // Check if should vibrate
  const shouldVibrate = useCallback(
    (priority: "low" | "normal" | "high" = "normal"): boolean => {
      if (!settings) return true;
      if (priority === "high" && settings.panic_override) return true;
      return settings.vibration_enabled;
    },
    [settings]
  );

  return {
    settings: settings || defaultSettings,
    loading,
    updateSettings,
    shouldNotify,
    shouldPlaySound,
    shouldVibrate,
    refetch: fetchSettings,
  };
};
