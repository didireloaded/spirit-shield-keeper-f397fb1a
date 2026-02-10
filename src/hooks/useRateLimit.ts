/**
 * Rate limiting hook to prevent abuse of SOS and reporting features.
 * Uses the check_rate_limit database function.
 */

import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

interface RateLimitConfig {
  actionType: string;
  maxCount: number;
  windowMinutes: number;
}

const DEFAULT_LIMITS: Record<string, RateLimitConfig> = {
  sos_trigger: {
    actionType: "sos_trigger",
    maxCount: 3,
    windowMinutes: 60, // 3 SOS per hour
  },
  incident_report: {
    actionType: "incident_report",
    maxCount: 10,
    windowMinutes: 60, // 10 reports per hour
  },
  community_post: {
    actionType: "community_post",
    maxCount: 20,
    windowMinutes: 60, // 20 posts per hour
  },
  comment: {
    actionType: "comment",
    maxCount: 30,
    windowMinutes: 60, // 30 comments per hour
  },
  amber_alert: {
    actionType: "amber_alert",
    maxCount: 2,
    windowMinutes: 60, // 2 amber alerts per hour
  },
};

export const useRateLimit = () => {
  const { user } = useAuth();
  const [checking, setChecking] = useState(false);

  /**
   * Check if an action is allowed based on rate limits.
   * Returns true if allowed, false if rate limited.
   */
  const checkRateLimit = useCallback(
    async (actionKey: keyof typeof DEFAULT_LIMITS): Promise<boolean> => {
      if (!user) {
        toast.error("You must be logged in to perform this action");
        return false;
      }

      const config = DEFAULT_LIMITS[actionKey];
      if (!config) {
        // Unknown action - allow by default
        return true; // Allow if not configured
      }

      setChecking(true);

      try {
        const { data, error } = await supabase.rpc("check_rate_limit", {
          p_user_id: user.id,
          p_action_type: config.actionType,
          p_max_count: config.maxCount,
          p_window_minutes: config.windowMinutes,
        });

        if (error) {
          console.error("[RateLimit] Check failed:", error);
          // Allow on error to not block legitimate users
          return true;
        }

        if (!data) {
          const minutesRemaining = Math.ceil(config.windowMinutes / 2);
          toast.error(
            `Too many ${actionKey.replace("_", " ")}s. Please wait ${minutesRemaining} minutes.`
          );
          return false;
        }

        return true;
      } catch (err) {
        console.error("[RateLimit] Error:", err);
        return true;
      } finally {
        setChecking(false);
      }
    },
    [user]
  );

  /**
   * Check SOS rate limit - stricter messaging
   */
  const checkSOSLimit = useCallback(async (): Promise<boolean> => {
    const allowed = await checkRateLimit("sos_trigger");
    if (!allowed) {
      toast.error(
        "You've triggered too many SOS alerts recently. If this is a real emergency, please call 10111 directly."
      );
    }
    return allowed;
  }, [checkRateLimit]);

  /**
   * Check incident report rate limit
   */
  const checkIncidentLimit = useCallback(async (): Promise<boolean> => {
    return await checkRateLimit("incident_report");
  }, [checkRateLimit]);

  /**
   * Check Amber alert rate limit
   */
  const checkAmberLimit = useCallback(async (): Promise<boolean> => {
    const allowed = await checkRateLimit("amber_alert");
    if (!allowed) {
      toast.error(
        "You've submitted too many Amber alerts recently. Please contact authorities directly for urgent cases."
      );
    }
    return allowed;
  }, [checkRateLimit]);

  return {
    checkRateLimit,
    checkSOSLimit,
    checkIncidentLimit,
    checkAmberLimit,
    checking,
  };
};
