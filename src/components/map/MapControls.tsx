/**
 * Map Controls (Left Side)
 * Minimal floating buttons - only render working controls
 */

import { motion } from "framer-motion";
import { Crosshair, Layers } from "lucide-react";

interface MapControlsProps {
  onRecenter?: () => void;
  onToggleLayers?: () => void;
  layersActive?: boolean;
  className?: string;
}

export function MapControls({
  onRecenter,
  onToggleLayers,
  layersActive = false,
  className = "",
}: MapControlsProps) {
  // Only render if at least one control is provided
  if (!onRecenter && !onToggleLayers) return null;

  return (
    <div className={`fixed bottom-44 left-4 z-20 flex flex-col gap-3 ${className}`}>
      {/* Recenter Button */}
      {onRecenter && (
        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={onRecenter}
          className="
            w-11 h-11 rounded-full
            bg-background/80 backdrop-blur-md
            border border-border/50
            shadow-lg
            flex items-center justify-center
            text-muted-foreground hover:text-foreground
            transition-colors
          "
          aria-label="Center on my location"
        >
          <Crosshair className="w-5 h-5" />
        </motion.button>
      )}

      {/* Layers Toggle */}
      {onToggleLayers && (
        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={onToggleLayers}
          className={`
            w-11 h-11 rounded-full
            bg-background/80 backdrop-blur-md
            border border-border/50
            shadow-lg
            flex items-center justify-center
            transition-colors
            ${layersActive ? "text-primary" : "text-muted-foreground hover:text-foreground"}
          `}
          aria-label="Toggle map layers"
        >
          <Layers className="w-5 h-5" />
        </motion.button>
      )}
    </div>
  );
}

export default MapControls;
