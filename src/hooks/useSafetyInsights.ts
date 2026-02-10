/**
 * Personal Safety Insights Hook
 * Private analytics: when users feel least safe, patterns, etc.
 */

import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface SafetyInsight {
  id: string;
  insight_type: string;
  data: Record<string, unknown>;
  period_start: string;
  period_end: string;
}

export interface InsightsSummary {
  totalAlerts: number;
  totalCheckIns: number;
  mostActiveHour: number | null;
  riskiestDayOfWeek: string | null;
  safeZoneUsage: number;
  averageThreatScore: number;
}

export const useSafetyInsights = () => {
  const { user } = useAuth();
  const [insights, setInsights] = useState<SafetyInsight[]>([]);
  const [summary, setSummary] = useState<InsightsSummary | null>(null);
  const [loading, setLoading] = useState(false);

  const generateInsights = useCallback(async () => {
    if (!user) return;
    setLoading(true);

    // Fetch user's panic sessions to derive insights
    const { data: sessions } = await supabase
      .from("panic_sessions")
      .select("started_at, threat_score, trigger_source")
      .eq("user_id", user.id)
      .order("started_at", { ascending: false })
      .limit(100);

    // Fetch check-in history
    const { data: checkIns } = await supabase
      .from("check_in_timers")
      .select("created_at, status, missed_count")
      .eq("user_id", user.id)
      .limit(100);

    // Fetch safety prompts
    const { data: prompts } = await supabase
      .from("safety_check_prompts")
      .select("trigger_reason, response, created_at")
      .eq("user_id", user.id)
      .limit(100);

    // Compute summary
    const hours = sessions?.map(s => new Date(s.started_at).getHours()) || [];
    const hourCounts: Record<number, number> = {};
    hours.forEach(h => { hourCounts[h] = (hourCounts[h] || 0) + 1; });
    const mostActiveHour = Object.entries(hourCounts).sort((a, b) => b[1] - a[1])[0];

    const days = sessions?.map(s => new Date(s.started_at).toLocaleDateString("en", { weekday: "long" })) || [];
    const dayCounts: Record<string, number> = {};
    days.forEach(d => { dayCounts[d] = (dayCounts[d] || 0) + 1; });
    const riskiestDay = Object.entries(dayCounts).sort((a, b) => b[1] - a[1])[0];

    const avgThreat = sessions?.length
      ? sessions.reduce((sum, s) => sum + (s.threat_score || 0), 0) / sessions.length
      : 0;

    setSummary({
      totalAlerts: sessions?.length || 0,
      totalCheckIns: checkIns?.filter(c => c.status !== "cancelled").length || 0,
      mostActiveHour: mostActiveHour ? parseInt(mostActiveHour[0]) : null,
      riskiestDayOfWeek: riskiestDay ? riskiestDay[0] : null,
      safeZoneUsage: 0, // Computed separately
      averageThreatScore: Math.round(avgThreat),
    });

    setLoading(false);
  }, [user]);

  return { insights, summary, loading, generateInsights };
};
