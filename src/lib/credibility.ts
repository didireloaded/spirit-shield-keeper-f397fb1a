/**
 * Credibility System
 * Manages user trust scores, spam detection, and incident verification
 * Adapted for profiles table (not users)
 */

import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

// Credibility thresholds
export const CREDIBILITY_THRESHOLDS = {
  TRUSTED: 80,
  NORMAL: 50,
  SUSPICIOUS: 30,
  WARNING: 20,
  BANNED: 10,
} as const;

// Credibility point changes
export const CREDIBILITY_POINTS = {
  REPORT_VERIFIED: 10,
  COMMUNITY_CONFIRM: 5,
  MODERATOR_VERIFY: 15,
  HELPFUL_VERIFICATION: 3,
  REPORT_FALSE: -15,
  SPAM_DETECTED: -30,
  FALSE_AMBER: -50,
  COMMUNITY_DISPUTE: -5,
  HARASSMENT: -25,
} as const;

/**
 * Update user's credibility score via DB function
 */
export async function updateCredibility(
  userId: string,
  action: string,
  pointsChange: number,
  reason?: string,
  referenceId?: string,
  referenceType?: "incident" | "post" | "comment"
) {
  try {
    const { data, error } = await supabase.rpc("update_user_credibility", {
      user_id_param: userId,
      action_param: action,
      points_change_param: pointsChange,
      reason_param: reason || null,
      reference_id_param: referenceId || null,
      reference_type_param: referenceType || null,
    });

    if (error) throw error;

    const result = data?.[0];
    if (!result) return null;

    if (Math.abs(pointsChange) >= 10) {
      if (pointsChange > 0) {
        toast.success(`+${pointsChange} credibility points! ${reason || ""}`);
      } else {
        toast.warning(`${pointsChange} credibility points. ${reason || ""}`);
      }
    }

    if (result.was_banned) {
      toast.error("Your account has been temporarily restricted due to low credibility.");
    }
    if (result.was_unbanned) {
      toast.success("Your account restrictions have been lifted!");
    }

    return result;
  } catch (error) {
    console.error("Error updating credibility:", error);
    return null;
  }
}

/**
 * Get credibility tier for a score
 */
export function getCredibilityTier(score: number) {
  if (score >= CREDIBILITY_THRESHOLDS.TRUSTED) {
    return { tier: "trusted" as const, color: "text-emerald-600", label: "Trusted Reporter", icon: "✓" };
  } else if (score >= CREDIBILITY_THRESHOLDS.NORMAL) {
    return { tier: "normal" as const, color: "text-blue-600", label: "Reporter", icon: "👤" };
  } else if (score >= CREDIBILITY_THRESHOLDS.SUSPICIOUS) {
    return { tier: "suspicious" as const, color: "text-yellow-600", label: "New Reporter", icon: "⚠" };
  } else if (score >= CREDIBILITY_THRESHOLDS.WARNING) {
    return { tier: "warning" as const, color: "text-orange-600", label: "Unverified", icon: "⚡" };
  } else {
    return { tier: "banned" as const, color: "text-red-600", label: "Restricted", icon: "⛔" };
  }
}

/**
 * Check if user can perform action based on credibility
 */
export async function checkCredibilityPermission(
  userId: string,
  action: "create_incident" | "create_amber" | "verify_incident" | "post_comment"
): Promise<{ allowed: boolean; reason?: string }> {
  try {
    const { data: profile, error } = await supabase
      .from("profiles")
      .select("credibility_score, is_restricted, restriction_expires_at")
      .eq("id", userId)
      .single();

    if (error) throw error;

    if (profile.is_restricted) {
      const expiresAt = profile.restriction_expires_at ? new Date(profile.restriction_expires_at) : null;
      if (!expiresAt || expiresAt > new Date()) {
        return {
          allowed: false,
          reason: `Your account is restricted.${expiresAt ? ` Restriction expires: ${expiresAt.toLocaleDateString()}` : ""}`,
        };
      }
    }

    const requirements: Record<string, number> = {
      create_amber: CREDIBILITY_THRESHOLDS.NORMAL,
      verify_incident: CREDIBILITY_THRESHOLDS.SUSPICIOUS,
      create_incident: CREDIBILITY_THRESHOLDS.WARNING,
      post_comment: CREDIBILITY_THRESHOLDS.WARNING,
    };

    const required = requirements[action];
    if (profile.credibility_score < required) {
      return {
        allowed: false,
        reason: `Credibility score too low. Need ${required}, you have ${profile.credibility_score}.`,
      };
    }

    return { allowed: true };
  } catch (error) {
    console.error("Error checking credibility:", error);
    return { allowed: false, reason: "Error checking permissions" };
  }
}

/**
 * Detect spam patterns via DB function
 */
export async function detectSpamPattern(userId: string) {
  try {
    const { data, error } = await supabase.rpc("detect_spam_pattern", {
      user_id_param: userId,
    });

    if (error) throw error;

    const result = data?.[0];
    if (result?.is_spam) {
      await updateCredibility(userId, "spam_detected", CREDIBILITY_POINTS.SPAM_DETECTED, result.reason);
      return { isSpam: true, reason: result.reason, confidence: result.confidence };
    }

    return { isSpam: false };
  } catch (error) {
    console.error("Error detecting spam:", error);
    return { isSpam: false };
  }
}

/**
 * Log user activity for pattern detection
 */
export async function logUserActivity(
  userId: string,
  activityType: "report" | "post" | "comment" | "verification",
  location?: { latitude: number; longitude: number },
  metadata?: Record<string, unknown>
) {
  try {
    await supabase.from("user_activity_log").insert({
      user_id: userId,
      activity_type: activityType,
      lat: location?.latitude ?? null,
      lng: location?.longitude ?? null,
      metadata: metadata ? JSON.parse(JSON.stringify(metadata)) : {},
    });
  } catch (error) {
    console.error("Error logging activity:", error);
  }
}

/**
 * Verify incident with community confirmation
 */
export async function verifyIncident(
  incidentId: string,
  userId: string,
  verificationType: "confirm" | "deny",
  incidentType: "marker" | "incident_report" = "marker",
  comment?: string
) {
  try {
    const { error: insertError } = await supabase
      .from("incident_verifications")
      .upsert(
        {
          incident_id: incidentId,
          incident_type: incidentType,
          user_id: userId,
          action: verificationType,
          comment: comment || null,
        },
        { onConflict: "incident_id,user_id" }
      );

    if (insertError) throw insertError;

    // Award credibility for helpful verification
    if (verificationType === "confirm") {
      await updateCredibility(
        userId,
        "incident_verified",
        CREDIBILITY_POINTS.HELPFUL_VERIFICATION,
        "Verified incident",
        incidentId,
        "incident"
      );
    }

    // Check auto-verify
    const { data } = await supabase.rpc("check_incident_auto_verify", {
      target_incident_id: incidentId,
      target_incident_type: incidentType,
    });

    return { success: true, autoVerified: !!data };
  } catch (error) {
    console.error("Error verifying incident:", error);
    return { success: false, autoVerified: false };
  }
}
