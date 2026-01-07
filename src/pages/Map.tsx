import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Eye, EyeOff, Plus, X, AlertTriangle, Car, User, Skull, HelpCircle, 
  MapPin, Navigation, Layers, ChevronDown, Check, Crosshair
} from "lucide-react";
import { BottomNav } from "@/components/BottomNav";
import MapboxMap from "@/components/MapboxMap";
import { useGeolocation } from "@/hooks/useGeolocation";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

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
  suspicious: { label: "Suspicious", icon: User, color: "bg-accent" },
  assault: { label: "Assault", icon: AlertTriangle, color: "bg-destructive" },
  kidnapping: { label: "Kidnapping", icon: Skull, color: "bg-destructive" },
  other: { label: "Other", icon: HelpCircle, color: "bg-muted" },
};

const Map = () => {
  const [ghostMode, setGhostMode] = useState(false);
  const [showAddPin, setShowAddPin] = useState(false);
  const [showLegend, setShowLegend] = useState(false);
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
      const { data: markersData } = await supabase
        .from("markers")
        .select("*")
        .gte("expires_at", new Date().toISOString());

      if (markersData) setMarkers(markersData);

      const { data: alertsData } = await supabase
        .from("alerts")
        .select("*")
        .eq("status", "active");

      if (alertsData) setAlerts(alertsData);
    };

    fetchData();

    const markersChannel = supabase
      .channel("markers-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "markers" },
        () => fetchData()
      )
      .subscribe();

    const alertsChannel = supabase
      .channel("alerts-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "alerts" },
        () => fetchData()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(markersChannel);
      supabase.removeChannel(alertsChannel);
    };
  }, []);

  const handleGhostToggle = async () => {
    if (!user) return;
    
    const newGhostMode = !ghostMode;
    setGhostMode(newGhostMode);
    
    await supabase
      .from("profiles")
      .update({ ghost_mode: newGhostMode })
      .eq("id", user.id);
    
    toast.info(newGhostMode ? "Ghost mode enabled" : "Ghost mode disabled");
  };

  const handleMapClick = useCallback((lat: number, lng: number) => {
    if (showAddPin) {
      setSelectedLocation({ lat, lng });
    }
  }, [showAddPin]);

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
      toast.error("Failed to report incident");
      console.error(error);
    } else {
      toast.success("Incident reported!");
      setShowAddPin(false);
      setSelectedLocation(null);
      setDescription("");
    }
  };

  const handleCancelReport = () => {
    setShowAddPin(false);
    setSelectedLocation(null);
    setDescription("");
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Map Container */}
      <div className="relative h-[calc(100vh-4rem)]">
        <MapboxMap
          className="absolute inset-0"
          showUserLocation={!ghostMode}
          markers={markers}
          alerts={alerts}
          onMapClick={handleMapClick}
        />

        {/* Top Bar */}
        <div className="absolute top-0 left-0 right-0 p-4 z-10">
          <div className="flex items-center justify-between gap-3">
            {/* Location & Status */}
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex-1 glass rounded-xl px-4 py-3 flex items-center gap-3"
            >
              <div className={`w-2.5 h-2.5 rounded-full ${ghostMode ? 'bg-accent' : 'bg-success'} animate-pulse`} />
              <div className="flex-1 min-w-0">
                <p className="text-xs text-muted-foreground">
                  {ghostMode ? 'Hidden from others' : 'Location active'}
                </p>
                <p className="text-sm font-medium truncate">
                  {latitude && longitude 
                    ? `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`
                    : 'Acquiring location...'
                  }
                </p>
              </div>
            </motion.div>

            {/* Ghost Mode Toggle */}
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={handleGhostToggle}
              className={`p-3 rounded-xl shadow-lg transition-all ${
                ghostMode 
                  ? "bg-accent text-accent-foreground" 
                  : "glass text-foreground"
              }`}
            >
              {ghostMode ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
            </motion.button>
          </div>
        </div>

        {/* Alert Banner */}
        <AnimatePresence>
          {alerts.length > 0 && !showAddPin && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="absolute top-20 left-4 right-4 z-10"
            >
              <div className="bg-destructive/95 backdrop-blur-sm text-destructive-foreground px-4 py-3 rounded-xl flex items-center gap-3 shadow-panic">
                <div className="w-8 h-8 bg-destructive-foreground/20 rounded-lg flex items-center justify-center">
                  <AlertTriangle className="w-4 h-4" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-semibold">
                    {alerts.length} Active Alert{alerts.length !== 1 ? 's' : ''} Nearby
                  </p>
                  <p className="text-xs opacity-80">Tap markers for details</p>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Right Side Actions */}
        <div className="absolute right-4 bottom-28 flex flex-col gap-3 z-10">
          {/* Legend Toggle */}
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={() => setShowLegend(!showLegend)}
            className="p-3 rounded-xl glass shadow-lg"
          >
            <Layers className="w-5 h-5 text-foreground" />
          </motion.button>

          {/* Report Incident Button */}
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={() => {
              if (!showAddPin) {
                setShowAddPin(true);
                toast.info("Tap on the map to place your report", { duration: 3000 });
              } else {
                handleCancelReport();
              }
            }}
            className={`p-4 rounded-xl shadow-lg transition-all ${
              showAddPin 
                ? "bg-destructive text-destructive-foreground" 
                : "bg-warning text-warning-foreground"
            }`}
          >
            {showAddPin ? <X className="w-6 h-6" /> : <Plus className="w-6 h-6" />}
          </motion.button>
        </div>

        {/* Legend Panel */}
        <AnimatePresence>
          {showLegend && (
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="absolute right-4 top-20 z-20 glass rounded-xl p-4 w-56 shadow-lg"
            >
              <h4 className="text-sm font-semibold mb-3 flex items-center justify-between">
                Map Legend
                <button onClick={() => setShowLegend(false)}>
                  <X className="w-4 h-4 text-muted-foreground" />
                </button>
              </h4>
              <div className="space-y-2">
                {Object.entries(markerTypeConfig).map(([key, config]) => {
                  const Icon = config.icon;
                  return (
                    <div key={key} className="flex items-center gap-2 text-sm">
                      <div className={`w-6 h-6 rounded-full ${config.color} flex items-center justify-center`}>
                        <Icon className="w-3 h-3 text-white" />
                      </div>
                      <span className="text-muted-foreground">{config.label}</span>
                    </div>
                  );
                })}
                <div className="border-t border-border pt-2 mt-2">
                  <div className="flex items-center gap-2 text-sm">
                    <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center">
                      <Navigation className="w-3 h-3 text-white" />
                    </div>
                    <span className="text-muted-foreground">Your location</span>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Report Incident Panel */}
        <AnimatePresence>
          {showAddPin && (
            <motion.div
              initial={{ opacity: 0, y: 100 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 100 }}
              className="absolute bottom-20 left-0 right-0 z-20 px-4"
            >
              <div className="glass rounded-2xl p-5 shadow-lg">
                {/* Header */}
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-warning/20 flex items-center justify-center">
                      <MapPin className="w-5 h-5 text-warning" />
                    </div>
                    <div>
                      <h3 className="font-semibold">Report Incident</h3>
                      <p className="text-xs text-muted-foreground">Help keep others safe</p>
                    </div>
                  </div>
                  <button 
                    onClick={handleCancelReport}
                    className="p-2 rounded-lg hover:bg-secondary transition-colors"
                  >
                    <X className="w-5 h-5 text-muted-foreground" />
                  </button>
                </div>

                {/* Location Status */}
                <div className={`mb-4 p-3 rounded-xl flex items-center gap-3 ${
                  selectedLocation ? 'bg-success/10 border border-success/20' : 'bg-secondary'
                }`}>
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                    selectedLocation ? 'bg-success/20' : 'bg-muted'
                  }`}>
                    {selectedLocation ? (
                      <Check className="w-4 h-4 text-success" />
                    ) : (
                      <Crosshair className="w-4 h-4 text-muted-foreground animate-pulse" />
                    )}
                  </div>
                  <div className="flex-1">
                    {selectedLocation ? (
                      <>
                        <p className="text-sm font-medium text-success">Location selected</p>
                        <p className="text-xs text-muted-foreground">
                          {selectedLocation.lat.toFixed(5)}, {selectedLocation.lng.toFixed(5)}
                        </p>
                      </>
                    ) : (
                      <>
                        <p className="text-sm font-medium">Tap on map</p>
                        <p className="text-xs text-muted-foreground">Select incident location</p>
                      </>
                    )}
                  </div>
                </div>

                {/* Type Selection */}
                <p className="text-xs text-muted-foreground mb-2 font-medium">INCIDENT TYPE</p>
                <div className="grid grid-cols-3 gap-2 mb-4">
                  {(Object.keys(markerTypeConfig) as MarkerType[]).map((type) => {
                    const config = markerTypeConfig[type];
                    const Icon = config.icon;
                    const isSelected = selectedType === type;
                    return (
                      <motion.button
                        key={type}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => setSelectedType(type)}
                        className={`p-3 rounded-xl border-2 transition-all ${
                          isSelected
                            ? "border-primary bg-primary/10"
                            : "border-transparent bg-secondary hover:bg-secondary/80"
                        }`}
                      >
                        <Icon className={`w-5 h-5 mx-auto mb-1.5 ${
                          isSelected ? "text-primary" : "text-muted-foreground"
                        }`} />
                        <span className={`text-xs block ${
                          isSelected ? "text-primary font-medium" : "text-muted-foreground"
                        }`}>
                          {config.label}
                        </span>
                      </motion.button>
                    );
                  })}
                </div>

                {/* Description */}
                <textarea
                  placeholder="Add details (optional)..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-4 py-3 bg-secondary rounded-xl text-sm mb-4 resize-none focus:outline-none focus:ring-2 focus:ring-primary/30 placeholder:text-muted-foreground"
                  rows={2}
                />

                {/* Submit Button */}
                <Button
                  onClick={handleCreateMarker}
                  disabled={!selectedLocation}
                  className="w-full h-12 bg-warning hover:bg-warning/90 text-warning-foreground font-semibold rounded-xl disabled:opacity-40"
                >
                  <AlertTriangle className="w-5 h-5 mr-2" />
                  Report Incident
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Crosshair Indicator when adding pin */}
        <AnimatePresence>
          {showAddPin && !selectedLocation && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none z-10"
            >
              <div className="relative">
                <div className="absolute inset-0 -m-4 rounded-full bg-warning/20 animate-ping" />
                <Crosshair className="w-8 h-8 text-warning drop-shadow-lg" />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <BottomNav />
    </div>
  );
};

export default Map;
