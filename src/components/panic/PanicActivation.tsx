import { useState, useCallback } from "react";
import { motion } from "framer-motion";
import { Shield, Mic, Upload, MapPin, Phone, X } from "lucide-react";
import { usePanicSession } from "@/hooks/usePanicSession";
import { useRateLimit } from "@/hooks/useRateLimit";
import { useGeolocation } from "@/hooks/useGeolocation";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface IncidentType {
  id: string;
  category: string;
  name: string;
  icon: string;
  color: string;
  requires_recording: boolean | null;
}

interface Props {
  incident: IncidentType;
  onBack: () => void;
}

export function PanicActivation({ incident, onBack }: Props) {
  const [isPressed, setIsPressed] = useState(false);
  const [holdProgress, setHoldProgress] = useState(0);
  const { latitude, longitude } = useGeolocation();
  const { checkSOSLimit } = useRateLimit();

  const {
    session,
    isActive,
    isRecording,
    chunkCount,
    error: panicError,
    startPanic,
    endPanic,
  } = usePanicSession();

  const handleActivate = useCallback(async () => {
    if (!latitude || !longitude) {
      toast.error("Unable to get location. Please enable GPS.");
      return;
    }
    const allowed = await checkSOSLimit();
    if (!allowed) return;

    const sessionId = await startPanic("manual");
    if (!sessionId) return;

    // Update with incident metadata
    await supabase.from("panic_sessions").update({
      session_type: incident.category,
      incident_type: incident.name,
      severity: "critical",
    }).eq("id", sessionId);

    toast.success(`🚨 ${incident.name} alert activated!`);
  }, [latitude, longitude, startPanic, checkSOSLimit, incident]);

  const handleEnd = useCallback(async () => {
    await endPanic("ended");
  }, [endPanic]);

  const handleMouseDown = () => {
    if (isActive) {
      handleEnd();
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
        setIsPressed(false);
        setHoldProgress(0);
      }
    }, 30);

    const handleUp = () => {
      clearInterval(interval);
      setIsPressed(false);
      setHoldProgress(0);
      document.removeEventListener("mouseup", handleUp);
      document.removeEventListener("touchend", handleUp);
    };
    document.addEventListener("mouseup", handleUp);
    document.addEventListener("touchend", handleUp);
  };

  if (isActive) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="flex flex-col items-center gap-4 w-full max-w-md"
      >
        {/* Pulsing alert */}
        <div className="relative">
          {[0, 1, 2].map((i) => (
            <motion.div
              key={i}
              className="absolute inset-0 rounded-full bg-destructive"
              animate={{ scale: [1, 2.5, 2.5], opacity: [0.5, 0.2, 0] }}
              transition={{ duration: 2, repeat: Infinity, delay: i * 0.4 }}
            />
          ))}
          <motion.div
            animate={{
              boxShadow: [
                "0 0 30px hsl(var(--panic) / 0.5)",
                "0 0 60px hsl(var(--panic) / 0.8)",
                "0 0 30px hsl(var(--panic) / 0.5)",
              ],
            }}
            transition={{ duration: 1.5, repeat: Infinity }}
            className="relative w-40 h-40 rounded-full gradient-panic flex flex-col items-center justify-center shadow-2xl"
          >
            <div className="text-4xl mb-2">{incident.icon}</div>
            <span className="text-sm font-bold text-white uppercase">
              {incident.name}
            </span>
          </motion.div>
        </div>

        {/* Status */}
        <div className="w-full bg-destructive/10 border-2 border-destructive/30 rounded-2xl p-4">
          <p className="font-bold text-destructive text-center mb-3">🚨 ALERT ACTIVE</p>
          <div className="space-y-2 text-sm">
            {isRecording && (
              <div className="flex items-center gap-2">
                <Mic className="w-4 h-4 text-destructive animate-pulse" />
                <span>Recording audio evidence</span>
              </div>
            )}
            {chunkCount > 0 && (
              <div className="flex items-center gap-2">
                <Upload className="w-4 h-4 text-success" />
                <span>{chunkCount} chunks uploaded</span>
              </div>
            )}
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4 text-primary" />
              <span>GPS tracking active</span>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="w-full space-y-2">
          <a
            href="tel:10111"
            className="w-full py-4 bg-primary text-primary-foreground rounded-xl font-bold flex items-center justify-center gap-2"
          >
            <Phone className="w-5 h-5" />
            Call Emergency Services
          </a>
          <button
            onClick={handleEnd}
            className="w-full py-3 bg-secondary hover:bg-secondary/80 rounded-xl font-medium transition-colors"
          >
            End Alert (I'm Safe)
          </button>
          <button
            onClick={onBack}
            className="w-full py-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            Back
          </button>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="flex flex-col items-center gap-4"
    >
      {/* Selected incident */}
      <div className="bg-card rounded-xl p-3 border border-border">
        <div className="flex items-center gap-3">
          <span className="text-2xl">{incident.icon}</span>
          <div>
            <p className="font-medium text-sm">{incident.name}</p>
            <button onClick={onBack} className="text-xs text-primary hover:underline">Change</button>
          </div>
        </div>
      </div>

      {/* Hold button */}
      <div className="relative">
        <svg className="absolute -inset-4 w-[160px] h-[160px] -rotate-90" viewBox="0 0 160 160">
          <circle cx="80" cy="80" r="72" fill="none" stroke="hsl(var(--destructive) / 0.2)" strokeWidth="6" />
          <motion.circle
            cx="80" cy="80" r="72" fill="none"
            stroke="hsl(var(--destructive))" strokeWidth="6" strokeLinecap="round"
            strokeDasharray={452}
            animate={{ strokeDashoffset: 452 - (452 * holdProgress) / 100 }}
            transition={{ duration: 0.05 }}
          />
        </svg>

        <motion.button
          onMouseDown={handleMouseDown}
          onTouchStart={handleMouseDown}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className="relative w-32 h-32 rounded-full gradient-panic shadow-2xl flex flex-col items-center justify-center cursor-pointer"
        >
          <Shield className="w-12 h-12 text-white" />
          <span className="text-xs font-bold text-white uppercase mt-2">
            {isPressed ? "Hold..." : "Activate"}
          </span>
        </motion.button>
      </div>

      <p className="text-sm text-muted-foreground text-center">
        Hold button to activate alert
      </p>

      {panicError && (
        <p className="text-xs text-destructive text-center max-w-[200px]">{panicError}</p>
      )}
    </motion.div>
  );
}
