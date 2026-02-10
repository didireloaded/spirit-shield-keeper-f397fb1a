/**
 * "Are You Safe?" Passive Prompt
 * Gentle overlay — not intrusive
 */

import { motion, AnimatePresence } from "framer-motion";
import { Heart, AlertTriangle } from "lucide-react";

interface Props {
  visible: boolean;
  reason: string;
  onSafe: () => void;
  onNeedHelp: () => void;
  onDismiss: () => void;
}

const reasonMessages: Record<string, string> = {
  night_movement: "We noticed you're moving late at night.",
  long_inactivity: "We haven't heard from you in a while.",
  sudden_location_change: "Your location changed unexpectedly.",
};

export function SafetyCheckPrompt({ visible, reason, onSafe, onNeedHelp, onDismiss }: Props) {
  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 50 }}
          className="fixed bottom-28 left-4 right-4 z-50"
        >
          <div className="bg-card border border-border rounded-2xl p-5 shadow-xl">
            <div className="flex items-start gap-3 mb-4">
              <div className="p-2 bg-primary/10 rounded-full">
                <Heart className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="font-semibold">Just checking in</p>
                <p className="text-sm text-muted-foreground mt-1">
                  {reasonMessages[reason] || "Are you doing okay?"} Are you safe?
                </p>
              </div>
            </div>

            <div className="flex gap-3">
              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={onSafe}
                className="flex-1 py-3 bg-success text-success-foreground rounded-xl text-sm font-semibold"
              >
                ✓ Yes, all good
              </motion.button>
              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={onNeedHelp}
                className="flex-1 py-3 bg-destructive text-destructive-foreground rounded-xl text-sm font-semibold"
              >
                Need help
              </motion.button>
            </div>

            <button
              onClick={onDismiss}
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
