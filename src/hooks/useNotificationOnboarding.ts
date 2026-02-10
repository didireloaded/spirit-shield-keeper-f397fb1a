/**
 * Manages whether the notification onboarding has been shown
 */
import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";

const STORAGE_KEY = "notification_onboarding_shown";

export function useNotificationOnboarding() {
  const { user } = useAuth();
  const [shouldShow, setShouldShow] = useState(false);

  useEffect(() => {
    if (!user) return;

    // Check if already shown for this user
    const shown = localStorage.getItem(`${STORAGE_KEY}_${user.id}`);
    if (!shown && "Notification" in window && Notification.permission === "default") {
      // Delay showing to let the app load first
      const timer = setTimeout(() => setShouldShow(true), 3000);
      return () => clearTimeout(timer);
    }
  }, [user]);

  const dismiss = () => {
    if (user) {
      localStorage.setItem(`${STORAGE_KEY}_${user.id}`, "true");
    }
    setShouldShow(false);
  };

  return { shouldShow, dismiss };
}
