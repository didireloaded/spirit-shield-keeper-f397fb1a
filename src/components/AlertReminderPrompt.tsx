/**
 * Alert Reminder Prompt
 * Gentle, non-intrusive overlay asking "Are you safe?"
 * Calm language. Never auto-resolves.
 */

import { motion, AnimatePresence } from "framer-motion";
import { Heart, Shield } from "lucide-react";
import { useAlertReminders } from "@/hooks/useAlertReminders";
import { useNavigate } from "react-router-dom";

export function AlertReminderPrompt() {
  const { reminder, dismissReminder } = useAlertReminders();
  const navigate = useNavigate();

  if (!reminder) return null;

  const handleAction = () => {
    dismissReminder();
    if (reminder.type === "panic") {
      navigate(`/map?panic=${reminder.entityId}`);
    } else if (reminder.type === "look_after_me") {
      navigate("/look-after-me");
    }
  };

  return (
    <AnimatePresence>
      {reminder && (
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 50 }}
          className="fixed bottom-28 left-4 right-4 z-50"
        >
          <div className="bg-card border border-border rounded-2xl p-5 shadow-xl max-w-lg mx-auto">
            <div className="flex items-start gap-3 mb-4">
              <div className="p-2 bg-primary/10 rounded-full">
                <Heart className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="font-semibold">Just checking in</p>
                <p className="text-sm text-muted-foreground mt-1">
                  {reminder.reason}
                </p>
              </div>
            </div>

            <div className="flex gap-3">
              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={dismissReminder}
                className="flex-1 py-3 bg-success text-success-foreground rounded-xl text-sm font-semibold"
              >
                ✓ I'm okay
              </motion.button>
              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={handleAction}
                className="flex-1 py-3 bg-secondary text-foreground rounded-xl text-sm font-semibold"
              >
                {reminder.type === "panic" ? "View alert" : "View session"}
              </motion.button>
            </div>

            <button
              onClick={dismissReminder}
              className="w-full mt-2 py-2 text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              Dismiss
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
