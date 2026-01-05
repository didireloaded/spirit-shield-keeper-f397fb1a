import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Eye, EyeOff, Plus, X, AlertTriangle, Car, User, Skull, HelpCircle } from "lucide-react";
import { BottomNav } from "@/components/BottomNav";
import MapboxMap from "@/components/MapboxMap";
import { useGeolocation } from "@/hooks/useGeolocation";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type MarkerType = "robbery" | "accident" | "suspicious" | "assault" | "kidnapping" | "other";

interface Marker {
  id: string;
  latitude: number;
  longitude: number;
  type: string;
  description: string | null;
  user_id: string;
  created_at: string;
}

interface Alert {
  id: string;
  latitude: number;
  longitude: number;
  type: string;
  status: string;
}

const markerTypeConfig: Record<MarkerType, { label: string; icon: any; color: string }> = {
  robbery: { label: "Robbery", icon: AlertTriangle, color: "bg-destructive" },
  accident: { label: "Accident", icon: Car, color: "bg-warning" },
  suspicious: { label: "Suspicious Activity", icon: User, color: "bg-accent" },
  assault: { label: "Assault", icon: AlertTriangle, color: "bg-destructive" },
  kidnapping: { label: "Kidnapping", icon: Skull, color: "bg-destructive" },
  other: { label: "Other", icon: HelpCircle, color: "bg-muted" },
};

const Map = () => {
  const [ghostMode, setGhostMode] = useState(false);
  const [showAddPin, setShowAddPin] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [selectedType, setSelectedType] = useState<MarkerType>("robbery");
  const [description, setDescription] = useState("");
  const [markers, setMarkers] = useState<Marker[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  
  const { latitude, longitude } = useGeolocation(!ghostMode);
  const { user } = useAuth();

  // Fetch markers and alerts
  useEffect(() => {
    const fetchData = async () => {
      // Fetch markers (not expired)
      const { data: markersData } = await supabase
        .from("markers")
        .select("*")
        .gte("expires_at", new Date().toISOString());

      if (markersData) setMarkers(markersData);

      // Fetch active alerts
      const { data: alertsData } = await supabase
        .from("alerts")
        .select("*")
        .eq("status", "active");

      if (alertsData) setAlerts(alertsData);
    };

    fetchData();

    // Real-time subscriptions
    const markersChannel = supabase
      .channel("markers-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "markers" },
        (payload) => {
          console.log("[Map] Markers update:", payload);
          fetchData();
        }
      )
      .subscribe();

    const alertsChannel = supabase
      .channel("alerts-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "alerts" },
        (payload) => {
          console.log("[Map] Alerts update:", payload);
          fetchData();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(markersChannel);
      supabase.removeChannel(alertsChannel);
    };
  }, []);

  // Toggle ghost mode
  const handleGhostToggle = async () => {
    if (!user) return;
    
    const newGhostMode = !ghostMode;
    setGhostMode(newGhostMode);
    
    await supabase
      .from("profiles")
      .update({ ghost_mode: newGhostMode })
      .eq("id", user.id);
    
    toast.info(newGhostMode ? "Ghost mode enabled - you're hidden" : "Ghost mode disabled - you're visible");
  };

  // Handle map click for pin placement
  const handleMapClick = useCallback((lat: number, lng: number) => {
    if (showAddPin) {
      setSelectedLocation({ lat, lng });
    }
  }, [showAddPin]);

  // Create marker
  const handleCreateMarker = async () => {
    if (!user || !selectedLocation) return;

    const { error } = await supabase.from("markers").insert({
      user_id: user.id,
      latitude: selectedLocation.lat,
      longitude: selectedLocation.lng,
      type: selectedType,
      description: description || null,
    });

    if (error) {
      toast.error("Failed to create marker");
      console.error(error);
    } else {
      toast.success("Incident reported!");
      setShowAddPin(false);
      setSelectedLocation(null);
      setDescription("");
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Map */}
      <div className="relative h-[calc(100vh-4rem)]">
        <MapboxMap
          className="absolute inset-0"
          showUserLocation={!ghostMode}
          markers={markers}
          alerts={alerts}
          onMapClick={handleMapClick}
        />

        {/* Ghost Mode Toggle */}
        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={handleGhostToggle}
          className={`absolute top-4 right-4 p-3 rounded-full shadow-lg z-10 transition-colors ${
            ghostMode ? "bg-accent" : "bg-card"
          }`}
        >
          {ghostMode ? (
            <EyeOff className="w-5 h-5 text-accent-foreground" />
          ) : (
            <Eye className="w-5 h-5 text-foreground" />
          )}
        </motion.button>

        {/* Ghost Mode Indicator */}
        <AnimatePresence>
          {ghostMode && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="absolute top-4 left-4 flex items-center gap-2 px-3 py-2 bg-accent/90 rounded-full z-10"
            >
              <EyeOff className="w-4 h-4 text-accent-foreground" />
              <span className="text-sm font-medium text-accent-foreground">Ghost Mode</span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Add Report Button */}
        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={() => {
            setShowAddPin(!showAddPin);
            if (!showAddPin) {
              toast.info("Tap on the map to place your report");
            }
          }}
          className={`absolute bottom-24 right-4 p-4 rounded-full shadow-lg z-10 transition-colors ${
            showAddPin ? "bg-destructive" : "bg-warning"
          }`}
        >
          {showAddPin ? (
            <X className="w-6 h-6 text-destructive-foreground" />
          ) : (
            <Plus className="w-6 h-6 text-warning-foreground" />
          )}
        </motion.button>

        {/* Pin Placement UI */}
        <AnimatePresence>
          {showAddPin && (
            <motion.div
              initial={{ opacity: 0, y: 50 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 50 }}
              className="absolute bottom-24 left-4 right-20 bg-card rounded-xl p-4 shadow-lg z-10 max-h-[60vh] overflow-y-auto"
            >
              <h3 className="font-semibold mb-3">Report Incident</h3>
              
              {/* Type Selection */}
              <div className="grid grid-cols-3 gap-2 mb-4">
                {(Object.keys(markerTypeConfig) as MarkerType[]).map((type) => {
                  const config = markerTypeConfig[type];
                  const Icon = config.icon;
                  return (
                    <button
                      key={type}
                      onClick={() => setSelectedType(type)}
                      className={`p-2 rounded-lg border-2 transition-all ${
                        selectedType === type
                          ? "border-primary bg-primary/10"
                          : "border-transparent bg-secondary"
                      }`}
                    >
                      <Icon className={`w-5 h-5 mx-auto mb-1 ${selectedType === type ? "text-primary" : "text-muted-foreground"}`} />
                      <span className="text-xs">{config.label}</span>
                    </button>
                  );
                })}
              </div>

              {/* Location Status */}
              <div className="mb-4 p-3 bg-secondary rounded-lg">
                {selectedLocation ? (
                  <div className="flex items-center gap-2 text-success">
                    <div className="w-2 h-2 bg-success rounded-full" />
                    <span className="text-sm">Location selected on map</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <div className="w-2 h-2 bg-muted-foreground rounded-full animate-pulse" />
                    <span className="text-sm">Tap on the map to select location</span>
                  </div>
                )}
              </div>

              {/* Description */}
              <textarea
                placeholder="Add a description (optional)"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full px-3 py-2 bg-secondary rounded-lg text-sm mb-4 resize-none focus:outline-none focus:ring-2 focus:ring-primary/20"
                rows={2}
              />

              {/* Submit Button */}
              <button
                onClick={handleCreateMarker}
                disabled={!selectedLocation}
                className="w-full py-3 bg-warning hover:bg-warning/90 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg font-semibold text-warning-foreground transition-colors"
              >
                Report Incident
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Active Alerts Summary */}
        {alerts.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="absolute top-16 left-4 right-16 bg-destructive/90 text-destructive-foreground px-4 py-2 rounded-xl flex items-center gap-2 z-10"
          >
            <AlertTriangle className="w-4 h-4 flex-shrink-0" />
            <span className="text-sm font-medium truncate">
              {alerts.length} active alert{alerts.length !== 1 ? "s" : ""} nearby
            </span>
          </motion.div>
        )}
      </div>

      <BottomNav />
    </div>
  );
};

export default Map;
