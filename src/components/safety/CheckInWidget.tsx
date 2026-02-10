/**
 * Silent Check-In Widget
 * Compact timer that shows on home screen
 */

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Clock, Check, X, AlertTriangle } from "lucide-react";
import { useCheckIn } from "@/hooks/useCheckIn";

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export function CheckInWidget() {
  const { timer, timeRemaining, isOverdue, startCheckIn, checkIn, cancelCheckIn } = useCheckIn();
  const [showSetup, setShowSetup] = useState(false);
  const [minutes, setMinutes] = useState(30);

  if (timer && timer.status === "active") {
    return (
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className={`rounded-xl p-4 border ${
          isOverdue
            ? "bg-destructive/10 border-destructive/30"
            : "bg-card border-border"
        }`}
      >
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-full ${isOverdue ? "bg-destructive/20" : "bg-primary/10"}`}>
            {isOverdue ? (
              <AlertTriangle className="w-5 h-5 text-destructive" />
            ) : (
              <Clock className="w-5 h-5 text-primary" />
            )}
          </div>
          <div className="flex-1">
            <p className="font-medium text-sm">
              {isOverdue ? "Check-in overdue!" : "Silent Check-In"}
            </p>
            <p className={`text-lg font-mono font-bold ${isOverdue ? "text-destructive" : "text-foreground"}`}>
              {timeRemaining !== null ? formatTime(timeRemaining) : "--:--"}
            </p>
          </div>
          <div className="flex gap-2">
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={checkIn}
              className="p-2.5 bg-success text-success-foreground rounded-full"
            >
              <Check className="w-5 h-5" />
            </motion.button>
            <button
              onClick={cancelCheckIn}
              className="p-2.5 bg-secondary text-muted-foreground rounded-full"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
        {isOverdue && (
          <p className="text-xs text-destructive mt-2">
            Tap ✓ to confirm you're safe, or auto-alert will trigger
          </p>
        )}
      </motion.div>
    );
  }

  return (
    <>
      <button
        onClick={() => setShowSetup(!showSetup)}
        className="w-full py-3 bg-card hover:bg-card/80 border border-border rounded-xl text-sm font-medium flex items-center justify-center gap-2 transition-colors"
      >
        <Clock className="w-4 h-4 text-primary" />
        Set Silent Check-In
      </button>

      <AnimatePresence>
        {showSetup && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="bg-card border border-border rounded-xl p-4 mt-2 space-y-3">
              <p className="text-sm text-muted-foreground">
                If you don't check in within the time, we'll auto-start a panic alert.
              </p>
              <div>
                <label className="text-xs text-muted-foreground">Check-in every: {minutes} min</label>
                <input
                  type="range"
                  min={5}
                  max={120}
                  step={5}
                  value={minutes}
                  onChange={(e) => setMinutes(Number(e.target.value))}
                  className="w-full"
                />
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setShowSetup(false)}
                  className="flex-1 py-2 bg-secondary rounded-lg text-sm"
                >
                  Cancel
                </button>
                <button
                  onClick={() => { startCheckIn(minutes); setShowSetup(false); }}
                  className="flex-1 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium"
                >
                  Start Timer
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
