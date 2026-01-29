/**
 * Map Status Bar
 * Shows location status, ghost mode, and live incident count
 */

import { motion } from "framer-motion";
import { Eye, EyeOff } from "lucide-react";
import { LiveIndicator } from "./LiveIndicator";

interface MapStatusBarProps {
  ghostMode: boolean;
  onGhostToggle: () => void;
  latitude: number | null;
  longitude: number | null;
  liveCount: number;
  className?: string;
}

export function MapStatusBar({
  ghostMode,
  onGhostToggle,
  latitude,
  longitude,
  liveCount,
  className = "",
}: MapStatusBarProps) {
  return (
    <div className={`flex items-center justify-between gap-3 ${className}`}>
      {/* Location & Status */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex-1 glass rounded-xl px-4 py-3 flex items-center gap-3"
      >
        <div
          className={`w-2.5 h-2.5 rounded-full ${
            ghostMode ? "bg-accent" : "bg-success"
          } animate-pulse`}
        />
        <div className="flex-1 min-w-0">
          <p className="text-xs text-muted-foreground">
            {ghostMode ? "Hidden from others" : "Location active"}
          </p>
          <p className="text-sm font-medium truncate">
            {latitude && longitude
              ? `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`
              : "Acquiring location..."}
          </p>
        </div>

        {/* Live indicator */}
        <LiveIndicator count={liveCount} />
      </motion.div>

      {/* Ghost Mode Toggle */}
      <motion.button
        whileTap={{ scale: 0.95 }}
        onClick={onGhostToggle}
        className={`p-3 rounded-xl shadow-lg transition-all ${
          ghostMode
            ? "bg-accent text-accent-foreground"
            : "glass text-foreground"
        }`}
        title={ghostMode ? "Disable ghost mode" : "Enable ghost mode"}
      >
        {ghostMode ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
      </motion.button>
    </div>
  );
}

export default MapStatusBar;
