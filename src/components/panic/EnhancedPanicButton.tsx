/**
 * Enhanced Panic Button
 * Supports incident type selection, background recording,
 * real-time tracking, and amber alert chat rooms
 */

import { useState, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  AlertTriangle,
  Shield,
  Mic,
  MapPin,
  Upload,
  Radio,
  Phone,
  Users,
  X,
  Navigation,
  ChevronRight,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useGeolocation } from "@/hooks/useGeolocation";
import { usePanicSession } from "@/hooks/usePanicSession";
import { useRateLimit } from "@/hooks/useRateLimit";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

interface IncidentType {
  id: string;
  category: string;
  name: string;
  icon: string;
  color: string;
  requires_recording: boolean;
  auto_notify_authorities: boolean;
}

const CATEGORY_LABELS: Record<string, string> = {
  panic: "🚨 Panic",
  amber: "🟠 Amber Alert",
  break_in: "🏠 Break-In",
  medical: "🏥 Medical",
  fire: "🔥 Fire",
};

export function EnhancedPanicButton() {
  const { user } = useAuth();
  const { latitude, longitude } = useGeolocation();
  const { checkSOSLimit } = useRateLimit();
  const navigate = useNavigate();
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

  const [showIncidentTypes, setShowIncidentTypes] = useState(false);
  const [incidentTypes, setIncidentTypes] = useState<IncidentType[]>([]);
  const [selectedIncident, setSelectedIncident] = useState<IncidentType | null>(null);
  const [isPressed, setIsPressed] = useState(false);
  const [holdProgress, setHoldProgress] = useState(0);
  const [chatRoomId, setChatRoomId] = useState<string | null>(null);

  // Load incident types
  useEffect(() => {
    const load = async () => {
      const { data } = await supabase
        .from("incident_types")
        .select("*")
        .order("category");
      if (data) setIncidentTypes(data as IncidentType[]);
    };
    load();
  }, []);

  const handleSelectIncident = (incident: IncidentType) => {
    setSelectedIncident(incident);
    setShowIncidentTypes(false);
  };

  // Reverse geocode helper
  const getLocationName = useCallback(async (lat: number, lng: number): Promise<string> => {
    try {
      const token = import.meta.env.VITE_MAPBOX_TOKEN;
      if (!token) return "Unknown Location";
      const res = await fetch(
        `https://api.mapbox.com/geocoding/v5/mapbox.places/${lng},${lat}.json?access_token=${token}&limit=1`
      );
      const data = await res.json();
      return data.features?.[0]?.place_name || "Unknown Location";
    } catch {
      return "Unknown Location";
    }
  }, []);

  const handleActivatePanic = useCallback(async () => {
    if (!user || !latitude || !longitude || !selectedIncident) return;

    const allowed = await checkSOSLimit();
    if (!allowed) return;

    // Start the panic session (handles audio + location)
    const sessionId = await startPanic("manual");
    if (!sessionId) return;

    // Update session with incident metadata
    const locationName = await getLocationName(latitude, longitude);
    await supabase.from("panic_sessions").update({
      session_type: selectedIncident.category,
      incident_type: selectedIncident.name,
      location_name: locationName,
      current_location_name: locationName,
      severity: "critical",
      responders_needed: getRespondersNeeded(selectedIncident.category),
      recording_status: selectedIncident.requires_recording ? "recording" : "pending",
    }).eq("id", sessionId);

    // Create amber alert chat room if amber category
    if (selectedIncident.category === "amber") {
      const { data: chatRoom } = await supabase.from("chat_rooms").insert({
        panic_session_id: sessionId,
        type: "amber",
        title: `🚨 AMBER ALERT: ${selectedIncident.name}`,
        description: `Emergency at ${locationName}. Join to help coordinate.`,
        is_active: true,
      }).select().single();

      if (chatRoom) {
        setChatRoomId(chatRoom.id);
        await supabase.from("panic_sessions").update({ chat_room_id: chatRoom.id }).eq("id", sessionId);

        // Send system message
        await supabase.from("chat_messages").insert({
          chat_room_id: chatRoom.id,
          user_id: user.id,
          message: `🚨 AMBER ALERT: ${selectedIncident.name} reported at ${locationName}. Please report sightings.`,
          type: "system",
        });
      }
    }

    toast.success(`🚨 ${selectedIncident.name} alert activated!`, { duration: 5000 });
  }, [user, latitude, longitude, selectedIncident, startPanic, checkSOSLimit, getLocationName]);

  const handleEndPanic = useCallback(async () => {
    if (chatRoomId) {
      await supabase.from("chat_rooms").update({ is_active: false, closed_at: new Date().toISOString() }).eq("id", chatRoomId);
      setChatRoomId(null);
    }
    await endPanic("ended");
    setSelectedIncident(null);
  }, [endPanic, chatRoomId]);

  const handleMouseDown = () => {
    if (!selectedIncident) {
      setShowIncidentTypes(true);
      return;
    }
    if (isActive) {
      handleEndPanic();
      return;
    }

    setIsPressed(true);
    let progress = 0;
    const interval = setInterval(() => {
      progress += 2;
      setHoldProgress(progress);
      if (progress >= 100) {
        clearInterval(interval);
        handleActivatePanic();
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

  // Group incident types by category
  const groupedTypes = incidentTypes.reduce((acc, type) => {
    if (!acc[type.category]) acc[type.category] = [];
    acc[type.category].push(type);
    return acc;
  }, {} as Record<string, IncidentType[]>);

  return (
    <div className="relative flex flex-col items-center">
      <AnimatePresence mode="wait">
        {isActive && session ? (
          /* ===== ACTIVE SESSION ===== */
          <motion.div
            key="active"
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.8, opacity: 0 }}
            className="flex flex-col items-center gap-4 w-full max-w-md"
          >
            {/* Pulsing alert circle */}
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
                <motion.div animate={{ rotate: 360 }} transition={{ duration: 2, repeat: Infinity, ease: "linear" }}>
                  <AlertTriangle className="w-16 h-16 text-white" />
                </motion.div>
                <span className="text-sm font-bold text-white uppercase mt-2">
                  {selectedIncident?.name || "ACTIVE"}
                </span>
              </motion.div>
            </div>

            {/* Status cards */}
            <div className="w-full space-y-3">
              <div className="bg-destructive/10 border-2 border-destructive/30 rounded-2xl p-4">
                <div className="flex items-center gap-3 mb-3">
                  <Radio className="w-6 h-6 text-destructive animate-pulse" />
                  <div className="flex-1">
                    <p className="font-bold text-destructive text-lg">🚨 ALERT ACTIVE</p>
                    <p className="text-sm text-muted-foreground">Help is on the way</p>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2 mt-3">
                  {isRecording && (
                    <div className="bg-background/50 rounded-lg p-2 text-center">
                      <Mic className="w-4 h-4 mx-auto mb-1 text-destructive" />
                      <p className="text-xs font-bold">Recording</p>
                    </div>
                  )}
                  {chunkCount > 0 && (
                    <div className="bg-background/50 rounded-lg p-2 text-center">
                      <Upload className="w-4 h-4 mx-auto mb-1 text-success" />
                      <p className="text-xs font-bold">{chunkCount} chunks</p>
                    </div>
                  )}
                  <div className="bg-background/50 rounded-lg p-2 text-center">
                    <MapPin className="w-4 h-4 mx-auto mb-1 text-primary" />
                    <p className="text-xs font-bold">GPS Active</p>
                  </div>
                </div>
              </div>

              {/* Amber chat room link */}
              {chatRoomId && (
                <motion.button
                  whileTap={{ scale: 0.95 }}
                  onClick={() => navigate(`/amber-chat/${chatRoomId}`)}
                  className="w-full p-4 bg-warning/10 border-2 border-warning/30 rounded-xl flex items-center justify-between"
                >
                  <div className="flex items-center gap-3">
                    <Users className="w-6 h-6 text-warning" />
                    <div className="text-left">
                      <p className="font-bold text-warning">Join Community Chat</p>
                      <p className="text-xs text-muted-foreground">Coordinate with nearby people</p>
                    </div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-warning" />
                </motion.button>
              )}
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
                onClick={handleEndPanic}
                className="w-full py-3 bg-secondary hover:bg-secondary/80 rounded-xl font-medium transition-colors"
              >
                End Alert (I'm Safe)
              </button>
            </div>
          </motion.div>
        ) : showIncidentTypes ? (
          /* ===== INCIDENT TYPE SELECTION ===== */
          <motion.div
            key="select"
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className="w-full max-w-md"
          >
            <div className="bg-card rounded-2xl p-6 shadow-2xl border border-border">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-lg">Select Emergency Type</h3>
                <button
                  onClick={() => setShowIncidentTypes(false)}
                  className="w-8 h-8 rounded-lg hover:bg-secondary flex items-center justify-center"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-4 max-h-[60vh] overflow-y-auto scrollbar-hide">
                {Object.entries(groupedTypes).map(([category, types]) => (
                  <div key={category}>
                    <p className="text-xs font-semibold text-muted-foreground uppercase mb-2">
                      {CATEGORY_LABELS[category] || category}
                    </p>
                    <div className="grid grid-cols-2 gap-2">
                      {types.map((type) => (
                        <motion.button
                          key={type.id}
                          whileTap={{ scale: 0.95 }}
                          onClick={() => handleSelectIncident(type)}
                          className="p-4 rounded-xl border-2 border-border text-left hover:border-primary transition-colors"
                        >
                          <div className="text-2xl mb-2">{type.icon}</div>
                          <p className="font-medium text-sm">{type.name}</p>
                        </motion.button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        ) : (
          /* ===== READY STATE ===== */
          <motion.div
            key="ready"
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="flex flex-col items-center gap-4"
          >
            {selectedIncident && (
              <div className="bg-card rounded-xl p-3 mb-2 border border-border">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{selectedIncident.icon}</span>
                  <div>
                    <p className="font-medium text-sm">{selectedIncident.name}</p>
                    <button
                      onClick={() => setSelectedIncident(null)}
                      className="text-xs text-primary hover:underline"
                    >
                      Change
                    </button>
                  </div>
                </div>
              </div>
            )}

            <div className="relative">
              {/* Progress ring */}
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
                animate={!isPressed ? {
                  boxShadow: [
                    "0 0 0 0 hsl(var(--panic) / 0.4)",
                    "0 0 0 30px hsl(var(--panic) / 0)",
                  ],
                } : {}}
                transition={!isPressed ? { duration: 2, repeat: Infinity } : {}}
                className="relative w-32 h-32 rounded-full gradient-panic shadow-2xl flex flex-col items-center justify-center cursor-pointer"
              >
                <Shield className="w-12 h-12 text-white" />
                <span className="text-xs font-bold text-white uppercase mt-2">
                  {isPressed ? "Hold..." : selectedIncident ? "Activate" : "Emergency"}
                </span>
              </motion.button>
            </div>

            <p className="text-sm text-muted-foreground text-center max-w-xs">
              {selectedIncident ? "Hold button to activate alert" : "Tap to select emergency type"}
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {panicError && (
        <p className="text-xs text-destructive mt-2 text-center max-w-[200px]">{panicError}</p>
      )}
    </div>
  );
}

function getRespondersNeeded(category: string): string[] {
  const map: Record<string, string[]> = {
    panic: ["police"],
    amber: ["police"],
    break_in: ["police"],
    medical: ["ambulance", "police"],
    fire: ["fire", "ambulance"],
  };
  return map[category] || ["police"];
}
