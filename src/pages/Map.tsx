import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Eye, EyeOff, Plus, X, AlertTriangle, Car, User, Skull, HelpCircle, 
  MapPin, Navigation, Layers, Check, Crosshair, Route, Users
} from "lucide-react";
import { BottomNav } from "@/components/BottomNav";
import MapboxMap from "@/components/MapboxMap";
import IncidentDetailsModal from "@/components/IncidentDetailsModal";
import { NearYouStrip } from "@/components/map/NearYouStrip";
import { IncidentPreviewCard } from "@/components/map/IncidentPreviewCard";
import { HeatmapToggle } from "@/components/map/HeatmapToggle";
import { LiveIndicator } from "@/components/map/LiveIndicator";
import { EmptyState } from "@/components/EmptyState";
import { useGeolocation } from "@/hooks/useGeolocation";
import { useAuth } from "@/contexts/AuthContext";
import { useNearbyAlerts } from "@/hooks/useNearbyAlerts";
import { useNotificationAlerts } from "@/hooks/useNotificationAlerts";
import { useRateLimit } from "@/hooks/useRateLimit";
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
  status?: string;
  verified_count?: number;
  comment_count?: number;
}

interface Alert {
  id: string;
  latitude: number;
  longitude: number;
  type: string;
  status: string;
  created_at?: string;
  description?: string | null;
}

interface SafetySession {
  id: string;
  destination: string;
  destination_lat: number | null;
  destination_lng: number | null;
  status: string;
  expected_arrival: string;
}

interface RouteData {
  id: string;
  startLat: number;
  startLng: number;
  endLat: number;
  endLng: number;
  destinationName?: string;
  status?: string;
}

interface WatcherLocation {
  id: string;
  name: string;
  avatarUrl?: string;
  latitude: number;
  longitude: number;
  updatedAt: string;
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
  const [heatmapEnabled, setHeatmapEnabled] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [selectedType, setSelectedType] = useState<MarkerType>("robbery");
  const [description, setDescription] = useState("");
  const [markers, setMarkers] = useState<Marker[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [activeTrip, setActiveTrip] = useState<SafetySession | null>(null);
  const [routes, setRoutes] = useState<RouteData[]>([]);
  const [watcherLocations, setWatcherLocations] = useState<WatcherLocation[]>([]);
  const [selectedMarker, setSelectedMarker] = useState<Marker | null>(null);
  const [previewMarker, setPreviewMarker] = useState<Marker | null>(null);
  
  const { latitude, longitude, error: locationError } = useGeolocation(!ghostMode);
  const { user } = useAuth();
  const { playAlertSound, triggerVibration } = useNotificationAlerts();
  const { checkIncidentLimit, checking: rateLimitChecking } = useRateLimit();

  // Combine markers and alerts for nearby detection
  const allAlerts = [
    ...markers.map(m => ({
      id: m.id,
      latitude: m.latitude,
      longitude: m.longitude,
      type: m.type,
      status: m.status,
      created_at: m.created_at,
      description: m.description,
    })),
    ...alerts,
  ];

  const { nearbyAlert, isHighPriority, dismissAlert } = useNearbyAlerts({
    userLat: latitude,
    userLng: longitude,
    alerts: allAlerts,
    radiusMeters: 500,
  });

  // Count live/recent incidents
  const liveCount = allAlerts.filter(a => {
    if (a.status === "resolved") return false;
    if (!a.created_at) return true;
    return Date.now() - new Date(a.created_at).getTime() < 30 * 60 * 1000;
  }).length;

  // Trigger audio/vibration for high-priority nearby alerts
  useEffect(() => {
    if (nearbyAlert && isHighPriority) {
      playAlertSound("high");
      triggerVibration("high");
    }
  }, [nearbyAlert?.id, isHighPriority]);

  // Fetch active safety session for route display
  useEffect(() => {
    if (!user) return;

    const fetchActiveTrip = async () => {
      const { data } = await supabase
        .from("safety_sessions")
        .select("*")
        .eq("user_id", user.id)
        .in("status", ["active", "late"])
        .order("created_at", { ascending: false })
        .limit(1)
        .single();

      if (data) {
        setActiveTrip(data);
      } else {
        setActiveTrip(null);
        setRoutes([]);
      }
    };

    fetchActiveTrip();

    const channel = supabase
      .channel("safety-session-map")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "safety_sessions", filter: `user_id=eq.${user.id}` },
        () => fetchActiveTrip()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  // Update routes when activeTrip or user location changes
  useEffect(() => {
    if (activeTrip && latitude && longitude && activeTrip.destination_lat && activeTrip.destination_lng) {
      setRoutes([{
        id: activeTrip.id,
        startLat: latitude,
        startLng: longitude,
        endLat: activeTrip.destination_lat,
        endLng: activeTrip.destination_lng,
        destinationName: activeTrip.destination,
        status: activeTrip.status,
      }]);
    } else {
      setRoutes([]);
    }
  }, [activeTrip, latitude, longitude]);

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

      if (alertsData) setAlerts(alertsData as Alert[]);
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

  // Fetch watchers' locations
  useEffect(() => {
    if (!user) return;

    const fetchWatcherLocations = async () => {
      const { data: watcherRelations } = await supabase
        .from("watchers")
        .select("user_id, watcher_id")
        .eq("status", "accepted")
        .or(`user_id.eq.${user.id},watcher_id.eq.${user.id}`);

      if (!watcherRelations || watcherRelations.length === 0) {
        setWatcherLocations([]);
        return;
      }

      const watcherIds = [...new Set(
        watcherRelations.flatMap(r => [r.user_id, r.watcher_id])
          .filter(id => id !== user.id)
      )];

      if (watcherIds.length === 0) {
        setWatcherLocations([]);
        return;
      }

      const { data: locations } = await supabase
        .from("user_locations")
        .select("user_id, latitude, longitude, updated_at")
        .in("user_id", watcherIds);

      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, full_name, avatar_url")
        .in("id", watcherIds);

      if (locations && profiles) {
        const watcherLocs: WatcherLocation[] = locations
          .map(loc => {
            const profile = profiles.find(p => p.id === loc.user_id);
            return {
              id: loc.user_id,
              name: profile?.full_name || "Watcher",
              avatarUrl: profile?.avatar_url || undefined,
              latitude: loc.latitude,
              longitude: loc.longitude,
              updatedAt: loc.updated_at || new Date().toISOString(),
            };
          });
        setWatcherLocations(watcherLocs);
      }
    };

    fetchWatcherLocations();

    const locationsChannel = supabase
      .channel("watcher-locations-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "user_locations" },
        () => fetchWatcherLocations()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(locationsChannel);
    };
  }, [user]);

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

  const handleMarkerClick = useCallback((marker: Marker) => {
    setPreviewMarker(marker);
  }, []);

  const handleCreateMarker = async () => {
    if (!user || !selectedLocation) return;

    // Check rate limit before allowing report
    const allowed = await checkIncidentLimit();
    if (!allowed) return;

    const { data, error } = await supabase.from("markers").insert({
      user_id: user.id,
      latitude: selectedLocation.lat,
      longitude: selectedLocation.lng,
      type: selectedType,
      description: description || null,
    }).select().single();

    if (error) {
      toast.error("Failed to report incident");
      console.error(error);
    } else {
      toast.success("Incident reported!");
      setShowAddPin(false);
      setSelectedLocation(null);
      setDescription("");

      if (data) {
        supabase.functions.invoke("send-incident-notification", {
          body: { marker: data },
        }).catch(err => console.error("Notification error:", err));
      }
    }
  };

  const handleCancelReport = () => {
    setShowAddPin(false);
    setSelectedLocation(null);
    setDescription("");
  };

  const handleViewNearbyOnMap = () => {
    if (nearbyAlert) {
      // Find the full marker data
      const fullMarker = markers.find(m => m.id === nearbyAlert.id);
      if (fullMarker) {
        setPreviewMarker(fullMarker);
      }
      dismissAlert(nearbyAlert.id);
    }
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
          routes={routes}
          watchers={watcherLocations}
          heatmapEnabled={heatmapEnabled}
          onMapClick={handleMapClick}
          onMarkerClick={handleMarkerClick}
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
              
              {/* Live indicator */}
              <LiveIndicator count={liveCount} />
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

        {/* Near You Alert Strip */}
        <AnimatePresence>
          {nearbyAlert && !showAddPin && !previewMarker && (
            <div className="absolute top-20 left-0 right-0 z-20">
              <NearYouStrip
                alert={nearbyAlert}
                isHighPriority={isHighPriority}
                onDismiss={() => dismissAlert(nearbyAlert.id)}
                onViewOnMap={handleViewNearbyOnMap}
              />
            </div>
          )}
        </AnimatePresence>

        {/* Active Trip Banner */}
        <AnimatePresence>
          {activeTrip && !showAddPin && !nearbyAlert && !previewMarker && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="absolute top-20 left-4 right-4 z-10"
            >
              <div className={`backdrop-blur-sm px-4 py-3 rounded-xl flex items-center gap-3 shadow-lg ${
                activeTrip.status === 'late' 
                  ? 'bg-warning/95 text-warning-foreground' 
                  : 'bg-success/95 text-success-foreground'
              }`}>
                <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center">
                  <Route className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold">
                    Look After Me Active
                  </p>
                  <p className="text-xs opacity-80 truncate">
                    To: {activeTrip.destination}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-xs opacity-70">ETA</p>
                  <p className="text-sm font-bold">
                    {new Date(activeTrip.expected_arrival).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Right Side Actions */}
        <div className="absolute right-4 bottom-28 flex flex-col gap-3 z-10">
          {/* Heatmap Toggle */}
          <HeatmapToggle
            enabled={heatmapEnabled}
            onToggle={() => setHeatmapEnabled(!heatmapEnabled)}
          />

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
                <div className="border-t border-border pt-2 mt-2 space-y-2">
                  <div className="flex items-center gap-2 text-sm">
                    <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center">
                      <Navigation className="w-3 h-3 text-white" />
                    </div>
                    <span className="text-muted-foreground">Your location</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <div className="w-6 h-6 rounded-full bg-cyan-500 flex items-center justify-center">
                      <Users className="w-3 h-3 text-white" />
                    </div>
                    <span className="text-muted-foreground">Trusted contacts</span>
                    {watcherLocations.length > 0 && (
                      <span className="text-xs bg-cyan-500/20 text-cyan-400 px-1.5 py-0.5 rounded">
                        {watcherLocations.length}
                      </span>
                    )}
                  </div>
                  {routes.length > 0 && (
                    <div className="flex items-center gap-2 text-sm">
                      <div className="w-6 h-6 rounded-full bg-success flex items-center justify-center">
                        <Route className="w-3 h-3 text-white" />
                      </div>
                      <span className="text-muted-foreground">Active trip route</span>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Incident Preview Card (on marker tap) */}
        <AnimatePresence>
          {previewMarker && (
            <IncidentPreviewCard
              incident={previewMarker}
              userLocation={latitude && longitude ? { lat: latitude, lng: longitude } : null}
              onClose={() => setPreviewMarker(null)}
              onViewDetails={() => {
                setSelectedMarker(previewMarker);
                setPreviewMarker(null);
              }}
              onNavigate={() => {
                // Open in external maps app
                window.open(
                  `https://www.google.com/maps/dir/?api=1&destination=${previewMarker.latitude},${previewMarker.longitude}`,
                  "_blank"
                );
              }}
            />
          )}
        </AnimatePresence>

        {/* Report Incident Modal */}
        <AnimatePresence>
          {showAddPin && selectedLocation && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
              onClick={(e) => {
                if (e.target === e.currentTarget) handleCancelReport();
              }}
            >
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                className="bg-card rounded-2xl shadow-2xl max-w-md w-full border border-border overflow-hidden"
              >
                {/* Header */}
                <div className="px-6 py-4 border-b border-border">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-warning/20 rounded-full flex items-center justify-center">
                        <AlertTriangle className="w-5 h-5 text-warning" />
                      </div>
                      <div>
                        <h2 className="text-lg font-bold">Report Incident</h2>
                        <p className="text-sm text-muted-foreground">
                          Location selected on map
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={handleCancelReport}
                      className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                </div>

                {/* Form */}
                <div className="px-6 py-5 space-y-5">
                  {/* Location Display */}
                  <div className="bg-secondary/50 rounded-xl p-4 border border-border">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-success/20 rounded-lg flex items-center justify-center">
                        <MapPin className="w-4 h-4 text-success" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-success">Location confirmed</p>
                        <p className="text-xs text-muted-foreground font-mono">
                          {selectedLocation.lat.toFixed(6)}, {selectedLocation.lng.toFixed(6)}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Incident Type */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium">
                      Incident Type <span className="text-destructive">*</span>
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      {(Object.keys(markerTypeConfig) as MarkerType[]).map((type) => {
                        const config = markerTypeConfig[type];
                        const Icon = config.icon;
                        const isSelected = selectedType === type;
                        return (
                          <motion.button
                            key={type}
                            whileTap={{ scale: 0.97 }}
                            onClick={() => setSelectedType(type)}
                            className={`px-4 py-3 rounded-xl border-2 transition-all text-left ${
                              isSelected
                                ? "border-primary bg-primary/10"
                                : "border-border bg-secondary/30 hover:border-muted-foreground/30"
                            }`}
                          >
                            <div className="flex items-center gap-3">
                              <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${config.color}`}>
                                <Icon className="w-4 h-4 text-white" />
                              </div>
                              <span className={`text-sm font-medium ${
                                isSelected ? "text-primary" : "text-foreground"
                              }`}>
                                {config.label}
                              </span>
                            </div>
                          </motion.button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Description */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium">
                      Description <span className="text-muted-foreground">(Optional)</span>
                    </label>
                    <textarea
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="Provide additional details about the incident..."
                      className="w-full px-4 py-3 bg-secondary/50 border border-border rounded-xl text-sm placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none resize-none transition-all"
                      rows={3}
                    />
                  </div>
                </div>

                {/* Actions */}
                <div className="px-6 py-4 bg-secondary/30 border-t border-border flex gap-3">
                  <Button
                    variant="outline"
                    onClick={handleCancelReport}
                    className="flex-1 h-12 rounded-xl"
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleCreateMarker}
                    className="flex-1 h-12 bg-warning hover:bg-warning/90 text-warning-foreground rounded-xl font-semibold"
                  >
                    <Check className="w-5 h-5 mr-2" />
                    Submit Report
                  </Button>
                </div>
              </motion.div>
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

      {/* Incident Details Modal */}
      <IncidentDetailsModal
        marker={selectedMarker}
        onClose={() => setSelectedMarker(null)}
        userLocation={latitude && longitude ? { lat: latitude, lng: longitude } : null}
      />

      <BottomNav />
    </div>
  );
};

export default Map;
