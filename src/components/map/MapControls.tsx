/**
 * Map Controls
 * Left-side floating buttons for settings and layers
 */

import { motion } from "framer-motion";
import { Settings, Layers, Crosshair } from "lucide-react";

interface MapControlsProps {
  onRecenter?: () => void;
  onSettings?: () => void;
  onToggleLayers?: () => void;
  className?: string;
}

export function MapControls({
  onRecenter,
  onSettings,
  onToggleLayers,
  className = "",
}: MapControlsProps) {
  return (
    <div className={`fixed bottom-[280px] left-4 z-20 flex flex-col gap-3 ${className}`}>
      {/* Recenter Button */}
      {onRecenter && (
        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={onRecenter}
          className="
            w-11 h-11 rounded-full
            bg-background/90 backdrop-blur-sm
            border border-border/50
            shadow-md
            flex items-center justify-center
            text-muted-foreground hover:text-foreground
            transition-colors
          "
          title="Center on my location"
        >
          <Crosshair className="w-5 h-5" />
        </motion.button>
      )}

      {/* Settings Button */}
      {onSettings && (
        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={onSettings}
          className="
            w-11 h-11 rounded-full
            bg-background/90 backdrop-blur-sm
            border border-border/50
            shadow-md
            flex items-center justify-center
            text-muted-foreground hover:text-foreground
            transition-colors
          "
          title="Settings"
        >
          <Settings className="w-5 h-5" />
        </motion.button>
      )}

      {/* Layers Toggle */}
      {onToggleLayers && (
        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={onToggleLayers}
          className="
            w-11 h-11 rounded-full
            bg-background/90 backdrop-blur-sm
            border border-border/50
            shadow-md
            flex items-center justify-center
            text-muted-foreground hover:text-foreground
            transition-colors
          "
          title="Map layers"
        >
          <Layers className="w-5 h-5" />
        </motion.button>
      )}
    </div>
  );
}

export default MapControls;
