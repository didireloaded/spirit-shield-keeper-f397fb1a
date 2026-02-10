/**
 * Incident Credibility Layer
 * Community verification system for incidents
 */

import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export interface IncidentVerification {
  id: string;
  incident_id: string;
  incident_type: "marker" | "incident_report";
  user_id: string;
  action: "confirm" | "deny" | "add_info";
  comment: string | null;
  created_at: string;
}

export const useIncidentCredibility = (incidentId: string, incidentType: "marker" | "incident_report") => {
  const { user } = useAuth();
  const [verifications, setVerifications] = useState<IncidentVerification[]>([]);
  const [userAction, setUserAction] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchVerifications = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from("incident_verifications")
      .select("*")
      .eq("incident_id", incidentId)
      .eq("incident_type", incidentType);

    if (data) {
      setVerifications(data as IncidentVerification[]);
      const mine = data.find((v: any) => v.user_id === user?.id);
      if (mine) setUserAction((mine as any).action);
    }
    setLoading(false);
  }, [incidentId, incidentType, user?.id]);

  const submitVerification = useCallback(async (action: "confirm" | "deny" | "add_info", comment?: string) => {
    if (!user) { toast.error("Sign in to verify incidents"); return; }

    const { error } = await supabase
      .from("incident_verifications")
      .upsert({
        incident_id: incidentId,
        incident_type: incidentType,
        user_id: user.id,
        action,
        comment: comment || null,
      }, { onConflict: "incident_id,user_id" });

    if (error) {
      toast.error("Failed to submit verification");
    } else {
      setUserAction(action);
      toast.success(action === "confirm" ? "Incident confirmed" : action === "deny" ? "Marked as false report" : "Info added");
      fetchVerifications();
    }
  }, [user, incidentId, incidentType, fetchVerifications]);

  const confirmCount = verifications.filter(v => v.action === "confirm").length;
  const denyCount = verifications.filter(v => v.action === "deny").length;
  const credibilityScore = verifications.length > 0
    ? Math.round((confirmCount / verifications.length) * 100)
    : 0;

  return {
    verifications,
    userAction,
    loading,
    confirmCount,
    denyCount,
    credibilityScore,
    submitVerification,
    fetchVerifications,
  };
};
