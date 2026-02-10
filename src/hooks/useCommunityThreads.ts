/**
 * Community Threads Hook
 * Aggregates panic_sessions, amber_alerts, and incident_reports
 * into unified thread objects for the Community screen.
 */

import { useState, useEffect, useCallback, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";

export type ThreadType = "panic" | "amber" | "incident";
export type ThreadFilter = "all" | "panic" | "amber" | "incident";

export interface CommunityThread {
  id: string;
  type: ThreadType;
  title: string;
  status: string;
  location: string | null;
  createdAt: string;
  updatedAt: string | null;
  commentCount: number;
  /** Extra metadata per type */
  meta: Record<string, any>;
}

function mapPanicToThread(row: any): CommunityThread {
  const isLive = row.status === "active";
  return {
    id: row.id,
    type: "panic",
    title: row.incident_type
      ? `${row.incident_type} – Panic Alert`
      : "Panic Alert",
    status: isLive ? "live" : row.status ?? "ended",
    location: row.location_name ?? row.current_location_name ?? null,
    createdAt: row.started_at ?? row.created_at,
    updatedAt: row.updated_at,
    commentCount: row.participants_count ?? 0,
    meta: {
      severity: row.severity,
      userId: row.user_id,
      chatRoomId: row.chat_room_id,
    },
  };
}

function mapAmberToThread(row: any): CommunityThread {
  return {
    id: row.amber_id,
    type: "amber",
    title: `Missing: ${row.missing_name}`,
    status: row.status ?? "active",
    location: row.last_seen_place ?? null,
    createdAt: row.created_at,
    updatedAt: null,
    commentCount: 0,
    meta: {
      missingAge: row.missing_age,
      description: row.missing_description,
      photoUrl: row.photo_url,
    },
  };
}

function mapIncidentToThread(row: any): CommunityThread {
  return {
    id: row.incident_id,
    type: "incident",
    title: row.incident_type
      ? `${row.incident_type} Incident`
      : "Incident Report",
    status: row.status ?? "active",
    location: row.place_name ?? null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    commentCount: 0,
    meta: {
      description: row.description,
      credibility: row.credibility_status,
      credibilityScore: row.credibility_score,
    },
  };
}

/** Priority sort: live panic > active incidents > active amber > resolved */
function threadPriority(t: CommunityThread): number {
  if (t.type === "panic" && t.status === "live") return 0;
  if (t.type === "incident" && t.status === "active") return 1;
  if (t.type === "amber" && t.status === "active") return 2;
  if (t.status === "active") return 3;
  return 4;
}

export function useCommunityThreads() {
  const [threads, setThreads] = useState<CommunityThread[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<ThreadFilter>("all");
  const [visibleCount, setVisibleCount] = useState(10);

  const fetchThreads = useCallback(async () => {
    try {
      const [panicRes, amberRes, incidentRes] = await Promise.all([
        supabase
          .from("panic_sessions")
          .select("*")
          .order("started_at", { ascending: false })
          .limit(50),
        supabase
          .from("amber_alerts")
          .select("*")
          .order("created_at", { ascending: false })
          .limit(50),
        supabase
          .from("incident_reports")
          .select("*")
          .order("created_at", { ascending: false })
          .limit(50),
      ]);

      const all: CommunityThread[] = [
        ...(panicRes.data || []).map(mapPanicToThread),
        ...(amberRes.data || []).map(mapAmberToThread),
        ...(incidentRes.data || []).map(mapIncidentToThread),
      ];

      all.sort((a, b) => {
        const pDiff = threadPriority(a) - threadPriority(b);
        if (pDiff !== 0) return pDiff;
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      });

      setThreads(all);
    } catch (e) {
      console.error("[CommunityThreads] fetch error:", e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchThreads();

    // Real-time subscriptions for all three sources
    const ch = supabase
      .channel("community-threads-rt")
      .on("postgres_changes", { event: "*", schema: "public", table: "panic_sessions" }, () => fetchThreads())
      .on("postgres_changes", { event: "*", schema: "public", table: "amber_alerts" }, () => fetchThreads())
      .on("postgres_changes", { event: "*", schema: "public", table: "incident_reports" }, () => fetchThreads())
      .subscribe();

    return () => { supabase.removeChannel(ch); };
  }, [fetchThreads]);

  const filtered = useMemo(() => {
    const base = filter === "all" ? threads : threads.filter((t) => t.type === filter);
    return base.slice(0, visibleCount);
  }, [threads, filter, visibleCount]);

  const hasMore = useMemo(() => {
    const base = filter === "all" ? threads : threads.filter((t) => t.type === filter);
    return base.length > visibleCount;
  }, [threads, filter, visibleCount]);

  const loadMore = useCallback(() => setVisibleCount((c) => c + 10), []);

  return { threads: filtered, allThreads: threads, loading, filter, setFilter, hasMore, loadMore, refetch: fetchThreads };
}
