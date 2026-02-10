/**
 * User Achievements Hook
 * Subtle gamification — community participation recognition
 */

import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface Achievement {
  id: string;
  achievement_type: string;
  title: string;
  description: string | null;
  earned_at: string;
}

export const useAchievements = () => {
  const { user } = useAuth();
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAchievements = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from("user_achievements")
      .select("*")
      .eq("user_id", user.id)
      .order("earned_at", { ascending: false });

    if (data) setAchievements(data as Achievement[]);
    setLoading(false);
  }, [user]);

  useEffect(() => { fetchAchievements(); }, [fetchAchievements]);

  return { achievements, loading, refetch: fetchAchievements };
};
