/**
 * Heatmap Toggle Button
 * Toggles visibility of incident heatmap layer
 */

import { motion } from "framer-motion";
import { Flame, Thermometer } from "lucide-react";

interface HeatmapToggleProps {
  enabled: boolean;
  onToggle: () => void;
}

export function HeatmapToggle({ enabled, onToggle }: HeatmapToggleProps) {
  return (
    <motion.button
      whileTap={{ scale: 0.95 }}
      onClick={onToggle}
      className={`p-3 rounded-xl shadow-lg transition-all ${
        enabled
          ? "bg-destructive text-destructive-foreground shadow-panic"
          : "glass text-foreground hover:bg-secondary/80"
      }`}
      title={enabled ? "Hide heatmap" : "Show danger zones"}
    >
      {enabled ? (
        <Flame className="w-5 h-5" />
      ) : (
        <Thermometer className="w-5 h-5" />
      )}
    </motion.button>
  );
}

export default HeatmapToggle;
