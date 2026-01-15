import { useCallback, useRef, useEffect } from "react";
import { useNotificationSettings } from "./useNotificationSettings";

type Priority = "low" | "normal" | "high";

// Alert sound URLs - using base64 encoded short beeps for reliability
const ALERT_SOUNDS = {
  high: "data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2teleVkZVfDQ3Ipy8z1Ly2R0MaZjMDqA4nqAZ",
  normal: "data:audio/wav;base64,UklGRl9vT19teleVkZVfDQ3IoT19teleVkZVfDQ3Ip19AABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQ==",
  low: "data:audio/wav;base64,UklGRl9teleVkZVfDQ3Ip19AABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQ==",
};

// Vibration patterns in milliseconds
const VIBRATION_PATTERNS: Record<Priority, number[]> = {
  high: [100, 50, 100, 50, 200, 100, 200], // Intense pattern for emergencies
  normal: [100, 50, 100], // Double buzz
  low: [50], // Single short buzz
};

export const useNotificationAlerts = () => {
  const { shouldPlaySound, shouldVibrate } = useNotificationSettings();
  const audioContextRef = useRef<AudioContext | null>(null);

  // Initialize audio context on first user interaction
  useEffect(() => {
    const initAudioContext = () => {
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
    };

    // Initialize on any user interaction
    const events = ["click", "touchstart", "keydown"];
    events.forEach((event) => {
      document.addEventListener(event, initAudioContext, { once: true });
    });

    return () => {
      events.forEach((event) => {
        document.removeEventListener(event, initAudioContext);
      });
    };
  }, []);

  // Play alert sound
  const playAlertSound = useCallback(
    async (priority: Priority = "normal") => {
      if (!shouldPlaySound(priority)) return;

      try {
        // Try Web Audio API for better control
        if (audioContextRef.current) {
          const ctx = audioContextRef.current;
          
          // Resume if suspended
          if (ctx.state === "suspended") {
            await ctx.resume();
          }

          // Create oscillator for beep sound
          const oscillator = ctx.createOscillator();
          const gainNode = ctx.createGain();

          oscillator.connect(gainNode);
          gainNode.connect(ctx.destination);

          // Different frequencies for different priorities
          const frequencies: Record<Priority, number> = {
            high: 880, // A5 - higher pitch for urgency
            normal: 660, // E5
            low: 440, // A4
          };

          oscillator.frequency.value = frequencies[priority];
          oscillator.type = priority === "high" ? "sawtooth" : "sine";

          // Volume based on priority
          const volumes: Record<Priority, number> = {
            high: 0.5,
            normal: 0.3,
            low: 0.2,
          };

          gainNode.gain.setValueAtTime(volumes[priority], ctx.currentTime);
          
          // Fade out
          const duration = priority === "high" ? 0.3 : 0.15;
          gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + duration);

          oscillator.start(ctx.currentTime);
          oscillator.stop(ctx.currentTime + duration);

          // For high priority, play multiple beeps
          if (priority === "high") {
            setTimeout(() => {
              const osc2 = ctx.createOscillator();
              const gain2 = ctx.createGain();
              osc2.connect(gain2);
              gain2.connect(ctx.destination);
              osc2.frequency.value = 880;
              osc2.type = "sawtooth";
              gain2.gain.setValueAtTime(0.5, ctx.currentTime);
              gain2.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
              osc2.start();
              osc2.stop(ctx.currentTime + 0.3);
            }, 150);
          }
        } else {
          // Fallback to Audio element
          const audio = new Audio(ALERT_SOUNDS[priority]);
          audio.volume = priority === "high" ? 0.7 : priority === "normal" ? 0.4 : 0.2;
          await audio.play();
        }
      } catch (error) {
        console.error("Error playing alert sound:", error);
      }
    },
    [shouldPlaySound]
  );

  // Trigger vibration
  const triggerVibration = useCallback(
    (priority: Priority = "normal") => {
      if (!shouldVibrate(priority)) return;

      try {
        if ("vibrate" in navigator) {
          navigator.vibrate(VIBRATION_PATTERNS[priority]);
        }
      } catch (error) {
        console.error("Error triggering vibration:", error);
      }
    },
    [shouldVibrate]
  );

  // Combined alert - plays sound and vibrates based on priority
  const triggerAlert = useCallback(
    async (priority: Priority = "normal") => {
      // Trigger both simultaneously
      await Promise.all([
        playAlertSound(priority),
        Promise.resolve(triggerVibration(priority)),
      ]);
    },
    [playAlertSound, triggerVibration]
  );

  // Emergency alert - maximum attention
  const triggerEmergencyAlert = useCallback(async () => {
    await triggerAlert("high");
    
    // Repeat for emergencies
    setTimeout(() => triggerAlert("high"), 500);
    setTimeout(() => triggerAlert("high"), 1000);
  }, [triggerAlert]);

  return {
    playAlertSound,
    triggerVibration,
    triggerAlert,
    triggerEmergencyAlert,
  };
};
