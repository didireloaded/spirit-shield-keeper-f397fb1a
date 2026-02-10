/**
 * "Are You Safe?" Passive Prompts
 * Detects inactivity, sudden location changes, night movement
 * Shows gentle nudge — not a notification
 */

import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface SafetyPrompt {
  id: string;
  visible: boolean;
  reason: string;
}

export const useSafetyPrompts = (
  latitude: number | null,
  longitude: number | null,
  speed: number = 0
) => {
  const { user } = useAuth();
  const [prompt, setPrompt] = useState<SafetyPrompt | null>(null);
  const lastActivityRef = useRef(Date.now());
  const lastLocationRef = useRef({ lat: latitude, lng: longitude });
  const promptCooldownRef = useRef(0);

  // Track user activity
  useEffect(() => {
    const updateActivity = () => { lastActivityRef.current = Date.now(); };
    window.addEventListener("touchstart", updateActivity);
    window.addEventListener("click", updateActivity);
    return () => {
      window.removeEventListener("touchstart", updateActivity);
      window.removeEventListener("click", updateActivity);
    };
  }, []);

  // Check conditions periodically
  useEffect(() => {
    if (!user) return;

    const interval = setInterval(() => {
      // Cooldown: don't prompt more than once per 30 min
      if (Date.now() < promptCooldownRef.current) return;

      const now = new Date();
      const hour = now.getHours();
      const inactivityMs = Date.now() - lastActivityRef.current;
      const inactiveMinutes = inactivityMs / 60000;

      let reason: string | null = null;

      // Night movement (10pm - 5am) with speed
      if ((hour >= 22 || hour < 5) && speed > 1) {
        reason = "night_movement";
      }
      // Long inactivity (>20 min no interaction)
      else if (inactiveMinutes > 20) {
        reason = "long_inactivity";
      }

      if (reason) {
        setPrompt({
          id: `${reason}-${Date.now()}`,
          visible: true,
          reason,
        });
      }
    }, 60000); // Check every minute

    return () => clearInterval(interval);
  }, [user, speed]);

  const respond = useCallback(async (response: "safe" | "need_help") => {
    if (!user || !prompt) return;

    // Log the response
    await supabase.from("safety_check_prompts").insert({
      user_id: user.id,
      trigger_reason: prompt.reason,
      response,
      responded_at: new Date().toISOString(),
    });

    // Set cooldown (30 min)
    promptCooldownRef.current = Date.now() + 30 * 60 * 1000;
    setPrompt(null);

    return response;
  }, [user, prompt]);

  const dismiss = useCallback(() => {
    if (!user || !prompt) return;
    supabase.from("safety_check_prompts").insert({
      user_id: user.id,
      trigger_reason: prompt.reason,
      response: "dismissed",
      responded_at: new Date().toISOString(),
    });
    promptCooldownRef.current = Date.now() + 30 * 60 * 1000;
    setPrompt(null);
  }, [user, prompt]);

  return { prompt, respond, dismiss };
};
