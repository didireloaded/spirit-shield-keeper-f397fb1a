/**
 * Crash detection countdown modal
 * Shows when a potential crash is detected
 * User has 10 seconds to cancel before auto-SOS
 */

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { AlertTriangle, X, Car, Heart } from "lucide-react";
import { Button } from "@/components/ui/button";

interface CrashCountdownModalProps {
  isVisible: boolean;
  countdown: number;
  crashInfo?: {
    previousSpeed: number;
    currentSpeed: number;
  };
  onCancel: () => void;
  onConfirmEmergency: () => void;
}

export const CrashCountdownModal = ({
  isVisible,
  countdown,
  crashInfo,
  onCancel,
  onConfirmEmergency,
}: CrashCountdownModalProps) => {
  const [progress, setProgress] = useState(100);

  // Update progress bar
  useEffect(() => {
    if (countdown > 0) {
      setProgress((countdown / 10) * 100);
    }
  }, [countdown]);

  if (!isVisible) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[100] bg-black/90 flex items-center justify-center p-4"
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          className="bg-destructive/20 border-2 border-destructive rounded-2xl p-6 w-full max-w-sm text-center"
        >
          {/* Alert Icon */}
          <motion.div
            animate={{
              scale: [1, 1.1, 1],
            }}
            transition={{
              duration: 0.5,
              repeat: Infinity,
            }}
            className="w-20 h-20 rounded-full bg-destructive/30 flex items-center justify-center mx-auto mb-4"
          >
            <Car className="w-10 h-10 text-destructive" />
          </motion.div>

          {/* Title */}
          <h2 className="text-2xl font-bold text-destructive mb-2">
            Crash Detected
          </h2>

          {/* Info */}
          {crashInfo && (
            <p className="text-sm text-muted-foreground mb-4">
              Speed dropped from {Math.round(crashInfo.previousSpeed)} km/h to{" "}
              {Math.round(crashInfo.currentSpeed)} km/h
            </p>
          )}

          {/* Countdown */}
          <div className="relative mb-6">
            <div className="text-6xl font-bold text-destructive">
              {countdown}
            </div>
            <p className="text-sm text-muted-foreground mt-2">
              seconds until emergency alert
            </p>

            {/* Progress bar */}
            <div className="mt-4 h-2 bg-destructive/20 rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-destructive"
                initial={{ width: "100%" }}
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.5 }}
              />
            </div>
          </div>

          {/* Buttons */}
          <div className="space-y-3">
            {/* I'm OK Button - Large and prominent */}
            <Button
              onClick={onCancel}
              size="lg"
              className="w-full h-16 text-lg font-bold bg-success hover:bg-success/90 text-success-foreground"
            >
              <Heart className="w-6 h-6 mr-2" />
              I'm OK - Cancel Alert
            </Button>

            {/* Emergency Now Button */}
            <Button
              onClick={onConfirmEmergency}
              variant="destructive"
              size="lg"
              className="w-full h-12"
            >
              <AlertTriangle className="w-5 h-5 mr-2" />
              I Need Help Now
            </Button>
          </div>

          {/* Info text */}
          <p className="text-xs text-muted-foreground mt-4">
            Emergency services and your contacts will be alerted if you don't respond
          </p>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};
