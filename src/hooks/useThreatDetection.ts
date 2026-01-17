import { useState, useCallback, useRef, useEffect } from "react";
import { useGeolocation } from "./useGeolocation";

// Threat score weights
const THREAT_WEIGHTS = {
  audioSpike: 30,
  silentSOSAtNight: 20,
  noMovementAfterSOS: 20,
  rapidLocationDeviation: 15,
  repeatedSOSCancels: 10,
  longActiveSOS: 15,
  lowBattery: 5,
};

// Threat level thresholds
const THREAT_LEVELS = {
  monitor: 40,
  notify: 60,
  escalate: 80,
};

interface ThreatSignal {
  type: keyof typeof THREAT_WEIGHTS;
  score: number;
  timestamp: Date;
  metadata?: Record<string, unknown>;
}

interface ThreatState {
  score: number;
  level: "safe" | "monitor" | "notify" | "escalate";
  signals: ThreatSignal[];
  escalated: boolean;
}

interface UseThreatDetectionOptions {
  enabled?: boolean;
  onThreatEscalation?: (state: ThreatState) => void;
}

export const useThreatDetection = ({
  enabled = true,
  onThreatEscalation,
}: UseThreatDetectionOptions = {}) => {
  const [threatState, setThreatState] = useState<ThreatState>({
    score: 0,
    level: "safe",
    signals: [],
    escalated: false,
  });
  
  const { latitude, longitude } = useGeolocation(false);
  
  // Track location history for deviation detection
  const locationHistoryRef = useRef<Array<{ lat: number; lng: number; timestamp: number }>>([]);
  const sosStartTimeRef = useRef<number | null>(null);
  const cancelCountRef = useRef(0);
  const lastMovementTimeRef = useRef<number>(Date.now());

  // Calculate threat level from score
  const getLevel = useCallback((score: number): ThreatState["level"] => {
    if (score >= THREAT_LEVELS.escalate) return "escalate";
    if (score >= THREAT_LEVELS.notify) return "notify";
    if (score >= THREAT_LEVELS.monitor) return "monitor";
    return "safe";
  }, []);

  // Add a threat signal
  const addSignal = useCallback((
    type: keyof typeof THREAT_WEIGHTS,
    metadata?: Record<string, unknown>
  ) => {
    if (!enabled) return;

    const signal: ThreatSignal = {
      type,
      score: THREAT_WEIGHTS[type],
      timestamp: new Date(),
      metadata,
    };

    setThreatState((prev) => {
      // Prevent duplicate signals within 60 seconds
      const recentSignal = prev.signals.find(
        (s) => 
          s.type === type && 
          Date.now() - s.timestamp.getTime() < 60000
      );
      
      if (recentSignal) return prev;

      const newSignals = [...prev.signals, signal];
      const newScore = Math.min(100, prev.score + signal.score);
      const newLevel = getLevel(newScore);
      const shouldEscalate = newLevel === "escalate" && !prev.escalated;

      const newState = {
        score: newScore,
        level: newLevel,
        signals: newSignals,
        escalated: prev.escalated || shouldEscalate,
      };

      if (shouldEscalate) {
        console.log("[ThreatDetection] ESCALATION:", newState);
        onThreatEscalation?.(newState);
      }

      return newState;
    });

    console.log("[ThreatDetection] Signal added:", signal);
  }, [enabled, getLevel, onThreatEscalation]);

  // Check if current time is night (10 PM - 6 AM)
  const isNightTime = useCallback((): boolean => {
    const hour = new Date().getHours();
    return hour >= 22 || hour < 6;
  }, []);

  // Audio spike detection (to be called from audio analysis)
  const reportAudioSpike = useCallback((amplitude: number) => {
    if (amplitude > 0.8) {
      addSignal("audioSpike", { amplitude });
    }
  }, [addSignal]);

  // Report silent SOS activation
  const reportSilentSOS = useCallback((isSilent: boolean) => {
    if (isSilent && isNightTime()) {
      addSignal("silentSOSAtNight");
    }
    sosStartTimeRef.current = Date.now();
  }, [addSignal, isNightTime]);

  // Report SOS cancellation
  const reportSOSCancel = useCallback(() => {
    cancelCountRef.current += 1;
    
    if (cancelCountRef.current >= 3) {
      addSignal("repeatedSOSCancels", { count: cancelCountRef.current });
    }
    
    // Reset after 30 minutes
    setTimeout(() => {
      cancelCountRef.current = Math.max(0, cancelCountRef.current - 1);
    }, 30 * 60 * 1000);
  }, [addSignal]);

  // Check for no movement after SOS
  const checkNoMovement = useCallback(() => {
    if (!sosStartTimeRef.current) return;
    
    const timeSinceSOS = Date.now() - sosStartTimeRef.current;
    const timeSinceMovement = Date.now() - lastMovementTimeRef.current;
    
    // If SOS is active for more than 2 minutes and no movement for 1 minute
    if (timeSinceSOS > 120000 && timeSinceMovement > 60000) {
      addSignal("noMovementAfterSOS", { 
        timeSinceSOS, 
        timeSinceMovement 
      });
    }
    
    // Check for long active SOS (more than 5 minutes)
    if (timeSinceSOS > 300000) {
      addSignal("longActiveSOS", { duration: timeSinceSOS });
    }
  }, [addSignal]);

  // Track location changes for deviation detection
  useEffect(() => {
    if (!enabled || latitude === null || longitude === null) return;

    const now = Date.now();
    const history = locationHistoryRef.current;
    
    // Add to history
    history.push({ lat: latitude, lng: longitude, timestamp: now });
    
    // Keep last 5 minutes
    locationHistoryRef.current = history.filter(
      (entry) => now - entry.timestamp < 300000
    );

    // Check for movement
    if (history.length >= 2) {
      const prev = history[history.length - 2];
      const distanceMoved = Math.sqrt(
        Math.pow((latitude - prev.lat) * 111000, 2) +
        Math.pow((longitude - prev.lng) * 111000 * Math.cos(latitude * Math.PI / 180), 2)
      );
      
      if (distanceMoved > 5) {
        lastMovementTimeRef.current = now;
      }
    }

    // Check for rapid deviation (sudden large movement)
    if (history.length >= 3) {
      const oldPos = history[0];
      const totalDistance = Math.sqrt(
        Math.pow((latitude - oldPos.lat) * 111000, 2) +
        Math.pow((longitude - oldPos.lng) * 111000 * Math.cos(latitude * Math.PI / 180), 2)
      );
      
      const timeSpan = now - oldPos.timestamp;
      const speedMps = totalDistance / (timeSpan / 1000);
      
      // If moving faster than 120 km/h, could indicate forced transport
      if (speedMps > 33.3) {
        addSignal("rapidLocationDeviation", { 
          speedKmh: speedMps * 3.6,
          distance: totalDistance 
        });
      }
    }

    // Periodically check no movement
    checkNoMovement();
  }, [enabled, latitude, longitude, addSignal, checkNoMovement]);

  // Report low battery
  const reportLowBattery = useCallback((level: number) => {
    if (level < 10) {
      addSignal("lowBattery", { level });
    }
  }, [addSignal]);

  // Reset threat state
  const resetThreat = useCallback(() => {
    setThreatState({
      score: 0,
      level: "safe",
      signals: [],
      escalated: false,
    });
    sosStartTimeRef.current = null;
    cancelCountRef.current = 0;
    locationHistoryRef.current = [];
  }, []);

  // End SOS tracking
  const endSOSTracking = useCallback(() => {
    sosStartTimeRef.current = null;
  }, []);

  return {
    threatState,
    reportAudioSpike,
    reportSilentSOS,
    reportSOSCancel,
    reportLowBattery,
    resetThreat,
    endSOSTracking,
    THREAT_LEVELS,
  };
};
