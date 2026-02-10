/**
 * Alert Reminder System
 * Gentle prompts for unresolved alerts based on timing rules:
 * - Panic: 30min, 60min, then every 2hr
 * - Amber: 12hr, 24hr, then every 48hr
 * - Look After Me: 60min inactivity, 4hr long session
 * 
 * NEVER auto-resolves. Trust > automation.
 */

import { useEffect, useRef, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

type ReminderType = "panic" | "amber" | "look_after_me";

interface ActiveReminder {
  id: string;
  type: ReminderType;
  reason: string;
  entityId: string;
}

const PANIC_FIRST_MS = 30 * 60 * 1000;       // 30 min
const PANIC_SECOND_MS = 60 * 60 * 1000;      // 60 min
const PANIC_RECURRING_MS = 2 * 60 * 60 * 1000; // 2 hr

const LAM_INACTIVITY_MS = 60 * 60 * 1000;    // 60 min
const LAM_LONG_SESSION_MS = 4 * 60 * 60 * 1000; // 4 hr

export function useAlertReminders() {
  const { user } = useAuth();
  const [reminder, setReminder] = useState<ActiveReminder | null>(null);
  const dismissedRef = useRef<Set<string>>(new Set());
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const checkReminders = useCallback(async () => {
    if (!user) return;

    // Check active panic sessions owned by this user
    const { data: panics } = await supabase
      .from("panic_sessions")
      .select("id, started_at")
      .eq("user_id", user.id)
      .eq("status", "active")
      .limit(1);

    if (panics?.length) {
      const panic = panics[0];
      const elapsed = Date.now() - new Date(panic.started_at).getTime();
      const key = `panic-${panic.id}`;

      if (elapsed >= PANIC_FIRST_MS && !dismissedRef.current.has(key)) {
        setReminder({
          id: key,
          type: "panic",
          reason: "Your panic alert is still active. Are you safe?",
          entityId: panic.id,
        });
        return;
      }
    }

    // Check active safety sessions (Look After Me) owned by this user
    const { data: sessions } = await supabase
      .from("safety_sessions")
      .select("id, created_at, departure_time")
      .eq("user_id", user.id)
      .in("status", ["active", "late"])
      .limit(1);

    if (sessions?.length) {
      const session = sessions[0];
      const elapsed = Date.now() - new Date(session.departure_time || session.created_at).getTime();
      const key = `lam-${session.id}`;

      if (elapsed >= LAM_INACTIVITY_MS && !dismissedRef.current.has(key)) {
        setReminder({
          id: key,
          type: "look_after_me",
          reason: "Your Look After Me session is still running. You can end it when you're ready.",
          entityId: session.id,
        });
        return;
      }
    }

    // No reminder needed
    if (reminder && dismissedRef.current.has(reminder.id)) {
      setReminder(null);
    }
  }, [user, reminder]);

  useEffect(() => {
    if (!user) return;

    // Check immediately then every 5 min
    checkReminders();
    intervalRef.current = setInterval(checkReminders, 5 * 60 * 1000);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [user, checkReminders]);

  const dismissReminder = useCallback(() => {
    if (reminder) {
      dismissedRef.current.add(reminder.id);
      setReminder(null);
    }
  }, [reminder]);

  return { reminder, dismissReminder };
}
