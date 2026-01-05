import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { AlertTriangle, Shield, X, Mic, MicOff, MapPin } from "lucide-react";
import { useAudioRecording } from "@/hooks/useAudioRecording";
import { useGeolocation } from "@/hooks/useGeolocation";
import { useAlerts } from "@/hooks/useAlerts";
import { toast } from "sonner";

interface PanicButtonProps {
  variant?: "panic" | "amber";
}

export const PanicButton = ({ variant = "panic" }: PanicButtonProps) => {
  const [isPressed, setIsPressed] = useState(false);
  const [holdProgress, setHoldProgress] = useState(0);
  const [isActivated, setIsActivated] = useState(false);
  const [alertId, setAlertId] = useState<string | null>(null);

  const { isRecording, startRecording, stopRecording, error: audioError } = useAudioRecording();
  const { latitude, longitude, error: geoError } = useGeolocation();
  const { createAlert, cancelAlert } = useAlerts();

  const isPanic = variant === "panic";
  const buttonLabel = isPanic ? "Panic" : "Amber";
  const alertType = isPanic ? "panic" : "amber";

  const handleActivate = useCallback(async () => {
    console.log(`[${buttonLabel}] Activating alert...`);

    // Start audio recording
    await startRecording();

    // Get current location
    if (!latitude || !longitude) {
      toast.error("Unable to get your location. Please enable GPS.");
      return;
    }

    // Create alert in database (without audio URL for now)
    const { data, error } = await createAlert(
      alertType,
      latitude,
      longitude,
      `${buttonLabel} alert triggered`
    );

    if (error) {
      console.error(`[${buttonLabel}] Failed to create alert:`, error);
      toast.error("Failed to create alert. Please try again.");
      return;
    }

    if (data) {
      setAlertId(data.id);
      setIsActivated(true);
      toast.success(`${buttonLabel} alert activated! Recording audio...`);
    }
  }, [startRecording, latitude, longitude, createAlert, alertType, buttonLabel]);

  const handleDeactivate = useCallback(async () => {
    console.log(`[${buttonLabel}] Deactivating alert...`);

    // Stop recording and upload audio
    const audioUrl = await stopRecording();

    if (audioUrl && alertId) {
      // Update alert with audio URL would go here
      console.log(`[${buttonLabel}] Audio uploaded:`, audioUrl);
    }

    toast.info("Alert finalized. Evidence saved.");
    setIsActivated(false);
    setAlertId(null);
  }, [stopRecording, alertId, buttonLabel]);

  const handleCancel = useCallback(async () => {
    if (alertId) {
      await cancelAlert(alertId);
    }
    if (isRecording) {
      await stopRecording();
    }
    setIsActivated(false);
    setAlertId(null);
    setHoldProgress(0);
    toast.info("Alert cancelled.");
  }, [alertId, isRecording, cancelAlert, stopRecording]);

  const handleMouseDown = () => {
    if (isActivated) {
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
        {isActivated ? (
          <motion.div
            key="activated"
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.8, opacity: 0 }}
            className="flex flex-col items-center gap-4"
          >
            <div className="relative">
              <div className={`absolute inset-0 rounded-full ${isPanic ? "bg-panic" : "bg-warning"} animate-ping opacity-30`} />
              <div className={`w-28 h-28 rounded-full ${gradientClass} flex flex-col items-center justify-center ${shadowClass}`}>
                {isRecording ? (
                  <Mic className="w-10 h-10 text-white animate-pulse" />
                ) : (
                  <AlertTriangle className="w-10 h-10 text-white" />
                )}
                <span className="text-[10px] font-bold text-white uppercase mt-1">
                  {isRecording ? "Recording" : "Active"}
                </span>
              </div>
            </div>

            <div className="text-center">
              <p className={`text-sm font-bold ${isPanic ? "text-destructive" : "text-warning"}`}>
                {buttonLabel.toUpperCase()} ALERT ACTIVE
              </p>
              <p className="text-xs text-muted-foreground">
                {isRecording ? "Tap again to stop recording" : "Evidence saved"}
              </p>
            </div>

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
                  ${!isPressed && !isActivated ? pulseClass : ""}
                `}
              >
                <Shield className="w-8 h-8 text-white" />
                <span className="text-[10px] font-bold text-white uppercase tracking-wide">
                  {isPressed ? "Hold..." : buttonLabel}
                </span>
              </motion.button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {(audioError || geoError) && (
        <p className="text-xs text-destructive mt-2 text-center max-w-[200px]">
          {audioError || geoError}
        </p>
      )}
    </div>
  );
};
