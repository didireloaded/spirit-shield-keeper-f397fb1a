import { useState } from "react";
import { motion } from "framer-motion";
import { Navigation, MapPin, AlertTriangle, Eye, EyeOff, Plus } from "lucide-react";
import { BottomNav } from "@/components/BottomNav";
import { useGeolocation } from "@/hooks/useGeolocation";
import { useAlerts } from "@/hooks/useAlerts";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const Map = () => {
  const [ghostMode, setGhostMode] = useState(false);
  
  const { latitude, longitude } = useGeolocation(!ghostMode);
  const { alerts } = useAlerts();
  const { user } = useAuth();

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

  return (
    <div className="min-h-screen bg-background">
      {/* Full Screen Map Simulation */}
      <div className="relative h-[calc(100vh-4rem)]">
        {/* Simulated Map Background */}
        <div className="absolute inset-0 bg-gradient-to-br from-card via-secondary to-card">
          {/* Map Grid Pattern */}
          <div className="absolute inset-0 opacity-10">
            <div className="h-full w-full" style={{
              backgroundImage: `
                linear-gradient(hsl(var(--muted-foreground) / 0.3) 1px, transparent 1px),
                linear-gradient(90deg, hsl(var(--muted-foreground) / 0.3) 1px, transparent 1px)
              `,
              backgroundSize: '50px 50px'
            }} />
          </div>

          {/* Robbery Pin */}
          <motion.div 
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="absolute top-1/4 left-1/4 flex flex-col items-center"
          >
            <div className="relative">
              <div className="absolute inset-0 bg-destructive rounded-full animate-ping opacity-30" />
              <div className="w-10 h-10 bg-destructive rounded-full flex items-center justify-center shadow-lg">
                <AlertTriangle className="w-5 h-5 text-destructive-foreground" />
              </div>
            </div>
            <span className="mt-1 px-2 py-0.5 bg-card/90 rounded text-xs font-medium">Robbery</span>
          </motion.div>

          {/* Accident Pin */}
          <motion.div 
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.1 }}
            className="absolute top-1/2 right-1/3 flex flex-col items-center"
          >
            <div className="relative">
              <div className="absolute inset-0 bg-warning rounded-full animate-ping opacity-30" />
              <div className="w-10 h-10 bg-warning rounded-full flex items-center justify-center shadow-lg">
                <AlertTriangle className="w-5 h-5 text-warning-foreground" />
              </div>
            </div>
            <span className="mt-1 px-2 py-0.5 bg-card/90 rounded text-xs font-medium">Accident</span>
          </motion.div>

          {/* User Location */}
          {!ghostMode && (
            <motion.div 
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2 }}
              className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center"
            >
              <div className="relative">
                <div className="absolute -inset-4 bg-primary/20 rounded-full animate-pulse" />
                <div className="w-4 h-4 bg-primary rounded-full border-2 border-card" />
              </div>
              <span className="mt-2 px-2 py-0.5 bg-primary rounded text-xs font-medium text-primary-foreground">You</span>
            </motion.div>
          )}
        </div>

        {/* Map Controls - Top Right */}
        <div className="absolute top-4 right-4 flex flex-col gap-2">
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={handleGhostToggle}
            className={`p-3 rounded-full shadow-lg transition-colors ${
              ghostMode ? "bg-accent" : "bg-card"
            }`}
          >
            {ghostMode ? (
              <EyeOff className="w-5 h-5 text-accent-foreground" />
            ) : (
              <Eye className="w-5 h-5 text-foreground" />
            )}
          </motion.button>
          
          <motion.button
            whileTap={{ scale: 0.95 }}
            className="p-3 rounded-full bg-card shadow-lg"
          >
            <Navigation className="w-5 h-5 text-foreground" />
          </motion.button>
        </div>

        {/* Add Report Button - Bottom Right */}
        <motion.button
          whileTap={{ scale: 0.95 }}
          className="absolute bottom-24 right-4 p-4 rounded-full bg-warning shadow-lg"
        >
          <Plus className="w-6 h-6 text-warning-foreground" />
        </motion.button>

        {/* Ghost Mode Indicator */}
        {ghostMode && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="absolute top-4 left-4 flex items-center gap-2 px-3 py-2 bg-accent/90 rounded-full"
          >
            <EyeOff className="w-4 h-4 text-accent-foreground" />
            <span className="text-sm font-medium text-accent-foreground">Ghost Mode Active</span>
          </motion.div>
        )}
      </div>

      <BottomNav />
    </div>
  );
};

export default Map;
