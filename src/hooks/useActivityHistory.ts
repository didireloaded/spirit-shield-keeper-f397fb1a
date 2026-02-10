/**
 * Activity History Hook
 * Read-only access to past panic alerts, incidents, and community interactions
 */

import { useState, useCallback, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface ActivityItem {
  id: string;
  type: "panic" | "incident" | "community" | "check_in" | "verification";
  title: string;
  description: string;
  timestamp: string;
  status?: string;
  metadata?: Record<string, any>;
}

export const useActivityHistory = () => {
  const { user } = useAuth();
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchHistory = useCallback(async () => {
    if (!user) return;
    setLoading(true);

    const [panicRes, incidentRes, postsRes, checkInRes, verifyRes] = await Promise.all([
      supabase
        .from("panic_sessions")
        .select("id, status, started_at, ended_at, incident_type, location_name")
        .eq("user_id", user.id)
        .order("started_at", { ascending: false })
        .limit(50),
      supabase
        .from("incident_reports")
        .select("incident_id, incident_type, description, created_at, status")
        .eq("reported_by", user.id)
        .order("created_at", { ascending: false })
        .limit(50),
      supabase
        .from("community_posts")
        .select("id, content, created_at, likes_count, comments_count")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(50),
      supabase
        .from("safety_check_prompts")
        .select("id, trigger_reason, response, created_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(20),
      supabase
        .from("incident_verifications")
        .select("id, action, incident_id, created_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(20),
    ]);

    const items: ActivityItem[] = [];

    panicRes.data?.forEach((s: any) => items.push({
      id: s.id,
      type: "panic",
      title: `Panic Alert${s.incident_type ? ` — ${s.incident_type}` : ""}`,
      description: s.location_name || "Location recorded",
      timestamp: s.started_at,
      status: s.status,
    }));

    incidentRes.data?.forEach((r: any) => items.push({
      id: r.incident_id,
      type: "incident",
      title: `Reported: ${r.incident_type}`,
      description: r.description?.slice(0, 80) || "Incident report",
      timestamp: r.created_at,
      status: r.status,
    }));

    postsRes.data?.forEach((p: any) => items.push({
      id: p.id,
      type: "community",
      title: "Community Post",
      description: p.content?.slice(0, 80) || "Post",
      timestamp: p.created_at,
      metadata: { likes: p.likes_count, comments: p.comments_count },
    }));

    checkInRes.data?.forEach((c: any) => items.push({
      id: c.id,
      type: "check_in",
      title: "Safety Check-In",
      description: `Reason: ${c.trigger_reason} · Response: ${c.response || "none"}`,
      timestamp: c.created_at,
    }));

    verifyRes.data?.forEach((v: any) => items.push({
      id: v.id,
      type: "verification",
      title: `Incident ${v.action === "confirm" ? "Confirmed" : v.action === "deny" ? "Disputed" : "Info Added"}`,
      description: `Incident ${v.incident_id.slice(0, 8)}`,
      timestamp: v.created_at,
    }));

    items.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    setActivities(items);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  return { activities, loading, refetch: fetchHistory };
};
