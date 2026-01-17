import { useState, useEffect, useRef, useCallback } from "react";
import { useGeolocation } from "./useGeolocation";

interface CrashEvent {
  timestamp: Date;
  previousSpeed: number;
  currentSpeed: number;
  speedDelta: number;
  deceleration: number;
  location: {
    lat: number;
    lng: number;
  };
}

interface UseCrashDetectionOptions {
  enabled?: boolean;
  minSpeedKmh?: number;        // Minimum speed before event (default: 35 km/h)
  speedDropThreshold?: number;  // Speed drop threshold (default: 25 km/h)
  timeWindowMs?: number;        // Time window for speed drop (default: 2000ms)
  stillnessTimeMs?: number;     // Time without movement to confirm crash (default: 10000ms)
  onCrashDetected?: (event: CrashEvent) => void;
}

// Convert m/s to km/h
const msToKmh = (speed: number | null): number => {
  if (speed === null || speed < 0) return 0;
  return speed * 3.6;
};

export const useCrashDetection = ({
  enabled = true,
  minSpeedKmh = 35,
  speedDropThreshold = 25,
  timeWindowMs = 2000,
  stillnessTimeMs = 10000,
  onCrashDetected,
}: UseCrashDetectionOptions = {}) => {
  const [isCrashDetected, setIsCrashDetected] = useState(false);
  const [crashEvent, setCrashEvent] = useState<CrashEvent | null>(null);
  const [isMonitoring, setIsMonitoring] = useState(enabled);
  
  const { latitude, longitude, speed, accuracy } = useGeolocation(false);
  
  // Track speed history
  const speedHistoryRef = useRef<Array<{ speed: number; timestamp: number }>>([]);
  const stillnessTimerRef = useRef<NodeJS.Timeout | null>(null);
  const lastSignificantSpeedRef = useRef<number>(0);
  const lastSignificantTimeRef = useRef<number>(0);

  // Calculate deceleration (m/s²)
  const calculateDeceleration = useCallback((
    speedBefore: number,
    speedAfter: number,
    timeMs: number
  ): number => {
    // Convert km/h to m/s
    const v1 = speedBefore / 3.6;
    const v2 = speedAfter / 3.6;
    const timeSeconds = timeMs / 1000;
    
    if (timeSeconds === 0) return 0;
    return Math.abs(v1 - v2) / timeSeconds;
  }, []);

  // Analyze speed pattern for crash detection
  const analyzeSpeedPattern = useCallback(() => {
    if (!enabled || !isMonitoring) return;
    
    const currentSpeedKmh = msToKmh(speed);
    const now = Date.now();
    
    // Add current speed to history
    speedHistoryRef.current.push({ speed: currentSpeedKmh, timestamp: now });
    
    // Keep only last 10 seconds of history
    speedHistoryRef.current = speedHistoryRef.current.filter(
      (entry) => now - entry.timestamp < 10000
    );
    
    // Track last significant speed (above threshold)
    if (currentSpeedKmh >= minSpeedKmh) {
      lastSignificantSpeedRef.current = currentSpeedKmh;
      lastSignificantTimeRef.current = now;
    }
    
    // Check for sudden deceleration
    const timeSinceHighSpeed = now - lastSignificantTimeRef.current;
    const previousSpeed = lastSignificantSpeedRef.current;
    
    if (
      previousSpeed >= minSpeedKmh &&
      currentSpeedKmh < 5 &&
      timeSinceHighSpeed < timeWindowMs &&
      timeSinceHighSpeed > 0
    ) {
      const speedDelta = previousSpeed - currentSpeedKmh;
      
      if (speedDelta >= speedDropThreshold) {
        const deceleration = calculateDeceleration(
          previousSpeed,
          currentSpeedKmh,
          timeSinceHighSpeed
        );
        
        console.log("[CrashDetection] Potential crash detected:", {
          previousSpeed,
          currentSpeedKmh,
          speedDelta,
          deceleration,
          timeSinceHighSpeed,
        });
        
        // Wait for stillness confirmation
        if (stillnessTimerRef.current) {
          clearTimeout(stillnessTimerRef.current);
        }
        
        stillnessTimerRef.current = setTimeout(() => {
          // Check if still stationary
          const latestSpeed = msToKmh(speed);
          
          if (latestSpeed < 5 && latitude && longitude) {
            const event: CrashEvent = {
              timestamp: new Date(),
              previousSpeed,
              currentSpeed: latestSpeed,
              speedDelta,
              deceleration,
              location: {
                lat: latitude,
                lng: longitude,
              },
            };
            
            console.log("[CrashDetection] Crash confirmed after stillness:", event);
            
            setIsCrashDetected(true);
            setCrashEvent(event);
            onCrashDetected?.(event);
          }
        }, stillnessTimeMs);
      }
    }
  }, [
    enabled,
    isMonitoring,
    speed,
    latitude,
    longitude,
    minSpeedKmh,
    speedDropThreshold,
    timeWindowMs,
    stillnessTimeMs,
    calculateDeceleration,
    onCrashDetected,
  ]);

  // Monitor speed changes
  useEffect(() => {
    if (speed !== null && enabled) {
      analyzeSpeedPattern();
    }
  }, [speed, enabled, analyzeSpeedPattern]);

  // Cleanup
  useEffect(() => {
    return () => {
      if (stillnessTimerRef.current) {
        clearTimeout(stillnessTimerRef.current);
      }
    };
  }, []);

  // Dismiss crash alert
  const dismissCrash = useCallback(() => {
    setIsCrashDetected(false);
    setCrashEvent(null);
    lastSignificantSpeedRef.current = 0;
    lastSignificantTimeRef.current = 0;
    
    if (stillnessTimerRef.current) {
      clearTimeout(stillnessTimerRef.current);
      stillnessTimerRef.current = null;
    }
  }, []);

  // Toggle monitoring
  const setMonitoring = useCallback((value: boolean) => {
    setIsMonitoring(value);
    if (!value) {
      dismissCrash();
    }
  }, [dismissCrash]);

  return {
    isCrashDetected,
    crashEvent,
    isMonitoring,
    currentSpeed: msToKmh(speed),
    setMonitoring,
    dismissCrash,
  };
};
