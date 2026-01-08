import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { AlertTriangle, Shield, X, Mic, MapPin, Upload, Radio } from "lucide-react";
import { usePanicSession } from "@/hooks/usePanicSession";

interface PanicButtonProps {
  variant?: "panic" | "amber";
}

export const PanicButton = ({ variant = "panic" }: PanicButtonProps) => {
  const [isPressed, setIsPressed] = useState(false);
  const [holdProgress, setHoldProgress] = useState(0);

  const { 
    session, 
    isActive, 
    isRecording, 
    chunkCount, 
    error, 
    startPanic, 
    endPanic, 
    cancelPanic 
  } = usePanicSession();

  const isPanic = variant === "panic";
  const buttonLabel = isPanic ? "Panic" : "Amber";

  const handleActivate = useCallback(async () => {
    console.log(`[${buttonLabel}] Activating panic session...`);
    await startPanic();
  }, [startPanic, buttonLabel]);

  const handleDeactivate = useCallback(async () => {
    console.log(`[${buttonLabel}] Deactivating panic session...`);
    await endPanic("ended");
  }, [endPanic, buttonLabel]);

  const handleCancel = useCallback(async () => {
    await cancelPanic();
    setHoldProgress(0);
  }, [cancelPanic]);

  const handleMouseDown = () => {
    if (isActive) {
      // Second press - stop recording
      handleDeactivate();
      return;
    }

    setIsPressed(true);
    let progress = 0;
    const interval = setInterval(() => {
      progress += 2;
      setHoldProgress(progress);
      if (progress >= 100) {
        clearInterval(interval);
        handleActivate();
      }
    }, 30);

    const handleMouseUp = () => {
      clearInterval(interval);
      setIsPressed(false);
      setHoldProgress(0);
      document.removeEventListener("mouseup", handleMouseUp);
      document.removeEventListener("touchend", handleMouseUp);
    };

    document.addEventListener("mouseup", handleMouseUp);
    document.addEventListener("touchend", handleMouseUp);
  };

  const gradientClass = isPanic ? "gradient-panic" : "bg-warning";
  const shadowClass = isPanic ? "shadow-panic" : "shadow-lg";
  const pulseClass = isPanic ? "panic-pulse" : "";
  const strokeColor = isPanic ? "hsl(var(--panic))" : "hsl(var(--warning))";

  return (
    <div className="relative flex flex-col items-center">
      <AnimatePresence mode="wait">
        {isActive ? (
          <motion.div
            key="activated"
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.8, opacity: 0 }}
            className="flex flex-col items-center gap-4"
          >
            {/* Active state - main circle */}
            <div className="relative">
              <div className={`absolute inset-0 rounded-full ${isPanic ? "bg-panic" : "bg-warning"} animate-ping opacity-30`} />
              <div className={`w-32 h-32 rounded-full ${gradientClass} flex flex-col items-center justify-center ${shadowClass}`}>
                {isRecording ? (
                  <Mic className="w-12 h-12 text-white animate-pulse" />
                ) : (
                  <AlertTriangle className="w-12 h-12 text-white" />
                )}
                <span className="text-xs font-bold text-white uppercase mt-1">
                  {isRecording ? "Recording" : "Active"}
                </span>
              </div>
            </div>

            {/* Status indicators */}
            <div className="flex flex-col items-center gap-2 text-center">
              <p className={`text-sm font-bold ${isPanic ? "text-destructive" : "text-warning"}`}>
                🚨 {buttonLabel.toUpperCase()} ALERT ACTIVE
              </p>
              
              {/* Real-time stats */}
              <div className="flex items-center gap-4 text-xs text-muted-foreground">
                {isRecording && (
                  <div className="flex items-center gap-1">
                    <Radio className="w-3 h-3 text-destructive animate-pulse" />
                    <span>Live</span>
                  </div>
                )}
                {chunkCount > 0 && (
                  <div className="flex items-center gap-1">
                    <Upload className="w-3 h-3 text-green-500" />
                    <span>{chunkCount} chunks uploaded</span>
                  </div>
                )}
                {session && (
                  <div className="flex items-center gap-1">
                    <MapPin className="w-3 h-3" />
                    <span>GPS tracking</span>
                  </div>
                )}
              </div>

              <p className="text-xs text-muted-foreground">
                Tap button again to end | Evidence uploading continuously
              </p>
            </div>

            {/* Cancel button */}
            <button
              onClick={handleCancel}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-secondary text-secondary-foreground hover:bg-secondary/80 transition-colors text-sm"
            >
              <X className="w-4 h-4" />
              Cancel Alert
            </button>
          </motion.div>
        ) : (
          <motion.div
            key="ready"
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="flex flex-col items-center gap-2"
          >
            <div className="relative">
              {/* Progress ring */}
              <svg
                className="absolute -inset-2 w-[120px] h-[120px] -rotate-90"
                viewBox="0 0 120 120"
              >
                <circle
                  cx="60"
                  cy="60"
                  r="54"
                  fill="none"
                  stroke={`${strokeColor}20`}
                  strokeWidth="5"
                />
                <motion.circle
                  cx="60"
                  cy="60"
                  r="54"
                  fill="none"
                  stroke={strokeColor}
                  strokeWidth="5"
                  strokeLinecap="round"
                  strokeDasharray={339}
                  strokeDashoffset={339 - (339 * holdProgress) / 100}
                  transition={{ duration: 0.05 }}
                />
              </svg>

              {/* Main button */}
              <motion.button
                onMouseDown={handleMouseDown}
                onTouchStart={handleMouseDown}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className={`
                  relative w-24 h-24 rounded-full
                  ${gradientClass} ${shadowClass}
                  flex flex-col items-center justify-center gap-1
                  cursor-pointer select-none
                  transition-all duration-200
                  ${!isPressed && !isActive ? pulseClass : ""}
                `}
              >
                <Shield className="w-8 h-8 text-white" />
                <span className="text-[10px] font-bold text-white uppercase tracking-wide">
                  {isPressed ? "Hold..." : buttonLabel}
                </span>
              </motion.button>
            </div>

            <p className="text-xs text-muted-foreground text-center mt-2">
              Hold to activate
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
