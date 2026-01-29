/**
 * Map Controls
 * Floating action buttons for map interactions
 * Recenter, settings, layers, etc.
 */

import { motion } from "framer-motion";
import { Navigation, Settings, Layers, Plus, X, Crosshair } from "lucide-react";

interface MapControlsProps {
  onRecenter?: () => void;
  onSettings?: () => void;
  onToggleLayers?: () => void;
  onAddIncident?: () => void;
  isAddingIncident?: boolean;
  showLayersButton?: boolean;
  showSettingsButton?: boolean;
  className?: string;
}

export function MapControls({
  onRecenter,
  onSettings,
  onToggleLayers,
  onAddIncident,
  isAddingIncident = false,
  showLayersButton = true,
  showSettingsButton = false,
  className = "",
}: MapControlsProps) {
  return (
    <div className={`flex flex-col gap-3 ${className}`}>
      {/* Recenter Button */}
      {onRecenter && (
        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={onRecenter}
          className="
            w-12 h-12 rounded-xl
            bg-card/90 backdrop-blur-sm
            border border-border/50
            shadow-lg
            flex items-center justify-center
            text-muted-foreground hover:text-foreground
            transition-colors
          "
          title="Center on my location"
        >
          <Crosshair className="w-5 h-5" />
        </motion.button>
      )}

      {/* Layers Toggle */}
      {showLayersButton && onToggleLayers && (
        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={onToggleLayers}
          className="
            w-12 h-12 rounded-xl
            bg-card/90 backdrop-blur-sm
            border border-border/50
            shadow-lg
            flex items-center justify-center
            text-muted-foreground hover:text-foreground
            transition-colors
          "
          title="Map layers"
        >
          <Layers className="w-5 h-5" />
        </motion.button>
      )}

      {/* Settings Button */}
      {showSettingsButton && onSettings && (
        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={onSettings}
          className="
            w-12 h-12 rounded-xl
            bg-card/90 backdrop-blur-sm
            border border-border/50
            shadow-lg
            flex items-center justify-center
            text-muted-foreground hover:text-foreground
            transition-colors
          "
          title="Settings"
        >
          <Settings className="w-5 h-5" />
        </motion.button>
      )}

      {/* Add Incident Button */}
      {onAddIncident && (
        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={onAddIncident}
          className={`
            w-14 h-14 rounded-xl
            shadow-lg
            flex items-center justify-center
            transition-all
            ${
              isAddingIncident
                ? "bg-destructive text-destructive-foreground"
                : "bg-warning text-warning-foreground"
            }
          `}
          title={isAddingIncident ? "Cancel report" : "Report incident"}
        >
          {isAddingIncident ? (
            <X className="w-6 h-6" />
          ) : (
            <Plus className="w-6 h-6" />
          )}
        </motion.button>
      )}
    </div>
  );
}

export default MapControls;
