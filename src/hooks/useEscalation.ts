/**
 * Authority Escalation Workflow
 * Allows escalating incidents to authorities or security
 */

import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export type EscalationTarget = "local_authority" | "private_security" | "community_leader";

export interface EscalationRequest {
  id: string;
  entity_id: string;
  entity_type: string;
  escalation_target: EscalationTarget;
  reason: string | null;
  status: string;
  created_at: string;
}

export const useEscalation = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [escalations, setEscalations] = useState<EscalationRequest[]>([]);

  const escalate = useCallback(async (
    entityId: string,
    entityType: "panic_session" | "incident_report" | "marker",
    target: EscalationTarget,
    reason?: string,
    authorityContactId?: string
  ) => {
    if (!user) return null;
    setLoading(true);

    const { data, error } = await supabase
      .from("escalation_requests")
      .insert({
        user_id: user.id,
        entity_id: entityId,
        entity_type: entityType,
        escalation_target: target,
        reason: reason || null,
        authority_contact_id: authorityContactId || null,
      })
      .select()
      .single();

    setLoading(false);

    if (error) {
      toast.error("Failed to escalate");
      return null;
    }

    toast.success("Escalation submitted");
    return data as EscalationRequest;
  }, [user]);

  const fetchMyEscalations = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from("escalation_requests")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (data) setEscalations(data as EscalationRequest[]);
  }, [user]);

  return { escalate, escalations, fetchMyEscalations, loading };
};
