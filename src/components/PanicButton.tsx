import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { AlertTriangle, Shield, Mic, MapPin, Upload, Radio } from "lucide-react";
import { usePanicSession } from "@/hooks/usePanicSession";

interface PanicButtonProps {
  variant?: "panic" | "amber";
  onAmberTap?: () => void;
}

export const PanicButton = ({ variant = "panic", onAmberTap }: PanicButtonProps) => {
  const isPanic = variant === "panic";

  const {
    session,
    isActive,
    isRecording,
    chunkCount,
    error,
    startPanic,
    endPanic,
  } = usePanicSession();

  const buttonLabel = isPanic ? "Panic" : "Amber";

  const handleTap = useCallback(async () => {
    if (!isPanic) {
      // Amber button opens the amber form modal
      onAmberTap?.();
      return;
    }

    // Panic: single tap toggle
    if (isActive) {
      await endPanic("ended");
    } else {
      await startPanic("manual");
    }
  }, [isPanic, isActive, startPanic, endPanic, onAmberTap]);

  const gradientClass = isPanic ? "gradient-panic" : "bg-warning";
  const shadowClass = isPanic ? "shadow-panic" : "shadow-lg";

  return (
    <div className="relative flex flex-col items-center">
      <AnimatePresence mode="wait">
        {isPanic && isActive ? (
          <motion.div
            key="activated"
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.8, opacity: 0 }}
            className="flex flex-col items-center gap-3"
          >
            {/* Active state circle - subtle, no pulsing */}
            <motion.button
              onClick={handleTap}
              className={`w-24 h-24 rounded-full ${gradientClass} flex flex-col items-center justify-center ${shadowClass} cursor-pointer ring-4 ring-destructive/30`}
            >
              {isRecording ? (
                <Mic className="w-8 h-8 text-white" />
              ) : (
                <AlertTriangle className="w-8 h-8 text-white" />
              )}
              <span className="text-[10px] font-bold text-white uppercase mt-1">
                {isRecording ? "Recording" : "Active"}
              </span>
            </motion.button>

            {/* Status */}
            <div className="flex flex-col items-center gap-1 text-center">
              <p className="text-xs font-bold text-destructive">
                🚨 ACTIVE
              </p>
              <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
                {isRecording && (
                  <span className="flex items-center gap-1">
                    <Radio className="w-3 h-3 text-destructive" />
                    Live
                  </span>
                )}
                {chunkCount > 0 && (
                  <span className="flex items-center gap-1">
                    <Upload className="w-3 h-3 text-success" />
                    {chunkCount}
                  </span>
                )}
                <span className="flex items-center gap-1">
                  <MapPin className="w-3 h-3" />
                  GPS
                </span>
              </div>
              <p className="text-[10px] text-muted-foreground">
                Tap to end
              </p>
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="ready"
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="flex flex-col items-center gap-2"
          >
            <motion.button
              onClick={handleTap}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className={`
                relative w-24 h-24 rounded-full
                ${gradientClass} ${shadowClass}
                flex flex-col items-center justify-center gap-1
                cursor-pointer select-none
              `}
            >
              <Shield className="w-8 h-8 text-white" />
              <span className="text-[10px] font-bold text-white uppercase tracking-wide">
                {buttonLabel}
              </span>
            </motion.button>

            <p className="text-xs text-muted-foreground text-center">
              {isPanic ? "Tap to activate" : "Tap to report"}
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {error && (
        <p className="text-xs text-destructive mt-2 text-center max-w-[200px]">
          {error}
        </p>
      )}
    </div>
  );
};
