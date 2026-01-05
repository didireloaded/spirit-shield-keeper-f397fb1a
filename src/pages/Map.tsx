import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Navigation, Layers, MapPin, AlertTriangle, Eye, EyeOff, Plus } from "lucide-react";
import { Header } from "@/components/Header";
import { BottomNav } from "@/components/BottomNav";
import { useGeolocation } from "@/hooks/useGeolocation";
import { useAlerts } from "@/hooks/useAlerts";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

// We'll load Mapbox dynamically
declare global {
  interface Window {
    mapboxgl: any;
  }
}

const Map = () => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<any>(null);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [ghostMode, setGhostMode] = useState(false);
  const [mapboxToken, setMapboxToken] = useState<string | null>(null);
  
  const { latitude, longitude, loading: locationLoading } = useGeolocation(!ghostMode);
  const { alerts } = useAlerts();
  const { user } = useAuth();

  // Fetch Mapbox token
  useEffect(() => {
    const fetchToken = async () => {
      const { data, error } = await supabase.functions.invoke("get-mapbox-token");
      if (!error && data?.token) {
        setMapboxToken(data.token);
      }
    };
    fetchToken();
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

  // Center on user
  const centerOnUser = () => {
    if (map.current && latitude && longitude) {
      map.current.flyTo({
        center: [longitude, latitude],
        zoom: 15,
        duration: 1000,
      });
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Header title="Live Map" />

      <div className="relative h-[calc(100vh-8rem)]">
        {/* Map Container */}
        <div
          ref={mapContainer}
          className="absolute inset-0 bg-gradient-to-b from-primary/5 to-primary/10"
        />

        {/* Map Placeholder when no token */}
        {!mapboxToken && (
          <div className="absolute inset-0 flex items-center justify-center bg-secondary/50">
            <div className="text-center space-y-4 p-6">
              <div className="w-20 h-20 mx-auto rounded-full bg-primary/10 flex items-center justify-center">
                <MapPin className="w-10 h-10 text-primary" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-foreground">Map Loading...</h2>
                <p className="text-muted-foreground text-sm mt-2">
                  Setting up Mapbox integration
                </p>
              </div>
              {latitude && longitude && (
                <p className="text-xs text-muted-foreground">
                  Your location: {latitude.toFixed(4)}, {longitude.toFixed(4)}
                </p>
              )}
            </div>
          </div>
        )}

        {/* Floating Controls */}
        <div className="absolute top-4 right-4 flex flex-col gap-2">
          {/* Ghost Mode Toggle */}
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={handleGhostToggle}
            className={`w-12 h-12 rounded-full shadow-lg flex items-center justify-center transition-colors ${
              ghostMode
                ? "bg-primary text-primary-foreground"
                : "bg-card border border-border"
            }`}
          >
            {ghostMode ? (
              <EyeOff className="w-5 h-5" />
            ) : (
              <Eye className="w-5 h-5 text-muted-foreground" />
            )}
          </motion.button>

          {/* Layers */}
          <motion.button
            whileTap={{ scale: 0.95 }}
            className="w-12 h-12 rounded-full bg-card border border-border shadow-lg flex items-center justify-center"
          >
            <Layers className="w-5 h-5 text-muted-foreground" />
          </motion.button>
        </div>

        {/* Center on User */}
        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={centerOnUser}
          className="absolute bottom-24 right-4 w-12 h-12 rounded-full bg-card border border-border shadow-lg flex items-center justify-center"
        >
          <Navigation className="w-5 h-5 text-primary" />
        </motion.button>

        {/* Add Marker Button */}
        <motion.button
          whileTap={{ scale: 0.95 }}
          className="absolute bottom-24 left-4 px-4 py-3 rounded-full bg-warning text-warning-foreground shadow-lg flex items-center gap-2 font-medium text-sm"
        >
          <Plus className="w-4 h-4" />
          Report Incident
        </motion.button>

        {/* Alert Summary */}
        {alerts.filter((a) => a.status === "active").length > 0 && (
          <div className="absolute top-4 left-4 right-20 bg-destructive/90 text-destructive-foreground px-4 py-2 rounded-xl flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 flex-shrink-0" />
            <span className="text-sm font-medium truncate">
              {alerts.filter((a) => a.status === "active").length} active alerts nearby
            </span>
          </div>
        )}
      </div>

      <BottomNav />
    </div>
  );
};

export default Map;
