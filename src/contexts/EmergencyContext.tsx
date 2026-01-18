/**
 * Global Emergency Context
 * Provides emergency system state and controls across the app
 */

import React, { createContext, useContext, ReactNode } from "react";
import { useEmergencySystem } from "@/hooks/useEmergencySystem";
import { useOfflineSOS } from "@/hooks/useOfflineSOS";
import { CrashCountdownModal } from "@/components/CrashCountdownModal";

interface EmergencyContextType {
  // SOS state
  isActive: boolean;
  isRecording: boolean;
  emergencyType: "manual" | "crash" | "ai" | null;
  silentMode: boolean;
  
  // Crash detection
  isCrashDetected: boolean;
  crashCountdown: number | null;
  currentSpeed: number;
  
  // Threat detection
  threatLevel: "safe" | "monitor" | "notify" | "escalate";
  threatScore: number;
  
  // Offline status
  isOnline: boolean;
  offlineQueueLength: number;
  
  // Actions
  triggerSOS: (type?: "manual" | "crash" | "ai") => Promise<string | null>;
  endSOS: () => Promise<void>;
  cancelSOS: () => Promise<void>;
  cancelCrashCountdown: () => void;
  toggleSilentMode: () => void;
}

const EmergencyContext = createContext<EmergencyContextType | null>(null);

export const useEmergency = () => {
  const context = useContext(EmergencyContext);
  if (!context) {
    throw new Error("useEmergency must be used within EmergencyProvider");
  }
  return context;
};

interface EmergencyProviderProps {
  children: ReactNode;
}

export const EmergencyProvider = ({ children }: EmergencyProviderProps) => {
  const emergency = useEmergencySystem({
    enableCrashDetection: true,
    enableThreatDetection: true,
    crashCountdownSeconds: 10,
  });

  const offline = useOfflineSOS();

  // Handle SOS with offline fallback
  const handleTriggerSOS = async (type: "manual" | "crash" | "ai" = "manual") => {
    if (!offline.isOnline) {
      // Use offline fallback
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 5000,
        });
      }).catch(() => null);

      if (position) {
        await offline.triggerOfflineSOS(
          position.coords.latitude,
          position.coords.longitude
        );
      }
      return null;
    }

    return emergency.triggerSOS(type);
  };

  const value: EmergencyContextType = {
    isActive: emergency.isActive,
    isRecording: emergency.isRecording,
    emergencyType: emergency.emergencyType,
    silentMode: emergency.silentMode,
    isCrashDetected: emergency.isCrashDetected,
    crashCountdown: emergency.crashCountdown,
    currentSpeed: emergency.currentSpeed,
    threatLevel: emergency.threatLevel,
    threatScore: emergency.threatScore,
    isOnline: offline.isOnline,
    offlineQueueLength: offline.queueLength,
    triggerSOS: handleTriggerSOS,
    endSOS: emergency.endSOS,
    cancelSOS: emergency.cancelSOS,
    cancelCrashCountdown: emergency.cancelCrashCountdown,
    toggleSilentMode: emergency.toggleSilentMode,
  };

  return (
    <EmergencyContext.Provider value={value}>
      {children}
      
      {/* Global Crash Countdown Modal */}
      <CrashCountdownModal
        isVisible={emergency.crashCountdown !== null}
        countdown={emergency.crashCountdown || 0}
        crashInfo={emergency.crashEvent ? {
          previousSpeed: emergency.crashEvent.previousSpeed,
          currentSpeed: emergency.crashEvent.currentSpeed,
        } : undefined}
        onCancel={emergency.cancelCrashCountdown}
        onConfirmEmergency={() => emergency.triggerSOS("crash")}
      />
    </EmergencyContext.Provider>
  );
};
