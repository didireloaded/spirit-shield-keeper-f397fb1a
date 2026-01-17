/**
 * Master hook that integrates all emergency system features:
 * - Panic sessions (audio recording, location streaming)
 * - Crash detection (vehicle accidents)
 * - Threat detection (AI-based risk scoring)
 * - Silent SOS mode
 * - Emergency contact notifications
 */

import { useState, useCallback, useEffect } from "react";
import { usePanicSession } from "./usePanicSession";
import { useCrashDetection } from "./useCrashDetection";
import { useThreatDetection } from "./useThreatDetection";
import { useNotificationAlerts } from "./useNotificationAlerts";
import { toast } from "sonner";

interface EmergencySystemOptions {
  enableCrashDetection?: boolean;
  enableThreatDetection?: boolean;
  crashCountdownSeconds?: number;
  onEmergencyStart?: () => void;
  onEmergencyEnd?: () => void;
}

export const useEmergencySystem = ({
  enableCrashDetection = true,
  enableThreatDetection = true,
  crashCountdownSeconds = 10,
  onEmergencyStart,
  onEmergencyEnd,
}: EmergencySystemOptions = {}) => {
  const [silentMode, setSilentMode] = useState(false);
  const [crashCountdown, setCrashCountdown] = useState<number | null>(null);
  const [emergencyType, setEmergencyType] = useState<"manual" | "crash" | "ai" | null>(null);

  // Core panic session
  const {
    session,
    isActive,
    isRecording,
    chunkCount,
    error: panicError,
    startPanic,
    endPanic,
    cancelPanic,
  } = usePanicSession();

  // Notification alerts
  const { triggerEmergencyAlert, triggerAlert } = useNotificationAlerts();

  // Threat detection with escalation callback
  const {
    threatState,
    reportAudioSpike,
    reportSilentSOS,
    reportSOSCancel,
    reportLowBattery,
    resetThreat,
    endSOSTracking,
    THREAT_LEVELS,
  } = useThreatDetection({
    enabled: enableThreatDetection,
    onThreatEscalation: async (state) => {
      console.log("[EmergencySystem] Threat escalation triggered:", state);
      
      // If SOS not already active, consider auto-triggering
      if (!isActive && state.level === "escalate") {
        toast.error("⚠️ High threat detected. Consider triggering SOS.");
        await triggerEmergencyAlert();
      }
    },
  });

  // Handle crash detection
  const handleCrashDetected = useCallback(async (event: any) => {
    console.log("[EmergencySystem] Crash detected:", event);
    
    // Start countdown
    setCrashCountdown(crashCountdownSeconds);
    setEmergencyType("crash");
    
    // Play alert sound
    if (!silentMode) {
      await triggerEmergencyAlert();
    }
    
    toast.warning(
      `🚗 Crash detected! SOS will trigger in ${crashCountdownSeconds} seconds. Tap to cancel.`,
      { duration: crashCountdownSeconds * 1000 }
    );
  }, [crashCountdownSeconds, silentMode, triggerEmergencyAlert]);

  // Crash detection
  const {
    isCrashDetected,
    crashEvent,
    isMonitoring: isCrashMonitoring,
    currentSpeed,
    setMonitoring: setCrashMonitoring,
    dismissCrash,
  } = useCrashDetection({
    enabled: enableCrashDetection,
    onCrashDetected: handleCrashDetected,
  });

  // Countdown timer for crash SOS
  useEffect(() => {
    if (crashCountdown === null) return;
    
    if (crashCountdown <= 0) {
      // Auto-trigger SOS
      setCrashCountdown(null);
      triggerSOS("crash");
      return;
    }
    
    const timer = setTimeout(() => {
      setCrashCountdown((prev) => (prev !== null ? prev - 1 : null));
    }, 1000);
    
    return () => clearTimeout(timer);
  }, [crashCountdown]);

  // Trigger SOS with type
  const triggerSOS = useCallback(async (type: "manual" | "crash" | "ai" = "manual") => {
    setEmergencyType(type);
    
    // Report to threat detection
    reportSilentSOS(silentMode);
    
    // Start panic session
    const sessionId = await startPanic();
    
    if (sessionId) {
      onEmergencyStart?.();
      
      if (!silentMode) {
        await triggerAlert("high");
      }
      
      console.log(`[EmergencySystem] SOS triggered: ${type}, session: ${sessionId}`);
    }
    
    return sessionId;
  }, [silentMode, reportSilentSOS, startPanic, onEmergencyStart, triggerAlert]);

  // End SOS
  const endSOS = useCallback(async () => {
    await endPanic("ended");
    endSOSTracking();
    setEmergencyType(null);
    onEmergencyEnd?.();
  }, [endPanic, endSOSTracking, onEmergencyEnd]);

  // Cancel SOS
  const cancelSOS = useCallback(async () => {
    reportSOSCancel();
    await cancelPanic();
    endSOSTracking();
    setEmergencyType(null);
  }, [reportSOSCancel, cancelPanic, endSOSTracking]);

  // Cancel crash countdown
  const cancelCrashCountdown = useCallback(() => {
    setCrashCountdown(null);
    setEmergencyType(null);
    dismissCrash();
    toast.info("Crash alert cancelled. Glad you're okay!");
  }, [dismissCrash]);

  // Toggle silent mode
  const toggleSilentMode = useCallback(() => {
    setSilentMode((prev) => !prev);
  }, []);

  // Monitor battery level
  useEffect(() => {
    if (!enableThreatDetection) return;
    
    const checkBattery = async () => {
      try {
        // @ts-ignore - Battery API may not be available
        const battery = await navigator.getBattery?.();
        if (battery) {
          reportLowBattery(battery.level * 100);
          
          battery.addEventListener("levelchange", () => {
            reportLowBattery(battery.level * 100);
          });
        }
      } catch (e) {
        // Battery API not available
      }
    };
    
    checkBattery();
  }, [enableThreatDetection, reportLowBattery]);

  return {
    // Session state
    session,
    isActive,
    isRecording,
    chunkCount,
    error: panicError,
    emergencyType,
    
    // SOS controls
    triggerSOS,
    endSOS,
    cancelSOS,
    
    // Silent mode
    silentMode,
    setSilentMode,
    toggleSilentMode,
    
    // Crash detection
    isCrashDetected,
    crashEvent,
    crashCountdown,
    isCrashMonitoring,
    currentSpeed,
    setCrashMonitoring,
    cancelCrashCountdown,
    
    // Threat detection
    threatState,
    threatLevel: threatState.level,
    threatScore: threatState.score,
    reportAudioSpike,
    resetThreat,
    THREAT_LEVELS,
  };
};
