/**
 * Silent Check-In System
 * Users set timers — if they don't check in, auto-escalate to panic
 */

import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export interface CheckInTimer {
  id: string;
  user_id: string;
  interval_minutes: number;
  next_check_in: string;
  status: "active" | "paused" | "expired" | "cancelled";
  missed_count: number;
  auto_panic: boolean;
  last_checked_in: string | null;
  created_at: string;
}

export const useCheckIn = () => {
  const { user } = useAuth();
  const [timer, setTimer] = useState<CheckInTimer | null>(null);
  const [loading, setLoading] = useState(true);
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null);
  const countdownRef = useRef<NodeJS.Timeout | null>(null);

  const fetchActiveTimer = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from("check_in_timers")
      .select("*")
      .eq("user_id", user.id)
      .eq("status", "active")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (data) setTimer(data as CheckInTimer);
    else setTimer(null);
    setLoading(false);
  }, [user]);

  useEffect(() => { fetchActiveTimer(); }, [fetchActiveTimer]);

  // Countdown timer
  useEffect(() => {
    if (!timer || timer.status !== "active") {
      setTimeRemaining(null);
      return;
    }

    const updateCountdown = () => {
      const remaining = new Date(timer.next_check_in).getTime() - Date.now();
      setTimeRemaining(Math.max(0, Math.floor(remaining / 1000)));
    };

    updateCountdown();
    countdownRef.current = setInterval(updateCountdown, 1000);
    return () => { if (countdownRef.current) clearInterval(countdownRef.current); };
  }, [timer]);

  const startCheckIn = useCallback(async (intervalMinutes: number = 30, autoPanic: boolean = true) => {
    if (!user) return null;
    const nextCheckIn = new Date(Date.now() + intervalMinutes * 60 * 1000).toISOString();

    // Cancel any existing active timers
    await supabase
      .from("check_in_timers")
      .update({ status: "cancelled" })
      .eq("user_id", user.id)
      .eq("status", "active");

    const { data, error } = await supabase
      .from("check_in_timers")
      .insert({
        user_id: user.id,
        interval_minutes: intervalMinutes,
        next_check_in: nextCheckIn,
        auto_panic: autoPanic,
      })
      .select()
      .single();

    if (!error && data) {
      setTimer(data as CheckInTimer);
      toast.success(`Check-in set for ${intervalMinutes} minutes`);
      return data;
    }
    return null;
  }, [user]);

  const checkIn = useCallback(async () => {
    if (!user || !timer) return;
    const nextCheckIn = new Date(Date.now() + timer.interval_minutes * 60 * 1000).toISOString();

    await supabase
      .from("check_in_timers")
      .update({
        next_check_in: nextCheckIn,
        last_checked_in: new Date().toISOString(),
        missed_count: 0,
      })
      .eq("id", timer.id);

    setTimer(prev => prev ? {
      ...prev,
      next_check_in: nextCheckIn,
      last_checked_in: new Date().toISOString(),
      missed_count: 0,
    } : null);

    toast.success("✅ Checked in! Timer reset.");
  }, [user, timer]);

  const cancelCheckIn = useCallback(async () => {
    if (!user || !timer) return;
    await supabase
      .from("check_in_timers")
      .update({ status: "cancelled" })
      .eq("id", timer.id);

    setTimer(null);
    toast.info("Check-in timer cancelled");
  }, [user, timer]);

  const isOverdue = timeRemaining !== null && timeRemaining <= 0;

  return {
    timer,
    loading,
    timeRemaining,
    isOverdue,
    startCheckIn,
    checkIn,
    cancelCheckIn,
  };
};
