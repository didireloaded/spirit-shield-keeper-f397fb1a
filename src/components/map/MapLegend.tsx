/**
 * Map Legend Panel
 * Shows legend for map markers and layers
 */

import { motion, AnimatePresence } from "framer-motion";
import { X, AlertTriangle, Car, User, Skull, HelpCircle, Navigation, Users, Route } from "lucide-react";

type MarkerType = "robbery" | "accident" | "suspicious" | "assault" | "kidnapping" | "other";

const markerTypeConfig: Record<MarkerType, { label: string; icon: any; color: string }> = {
  robbery: { label: "Robbery", icon: AlertTriangle, color: "bg-destructive" },
  accident: { label: "Accident", icon: Car, color: "bg-warning" },
  suspicious: { label: "Suspicious", icon: User, color: "bg-accent" },
  assault: { label: "Assault", icon: AlertTriangle, color: "bg-destructive" },
  kidnapping: { label: "Kidnapping", icon: Skull, color: "bg-destructive" },
  other: { label: "Other", icon: HelpCircle, color: "bg-muted" },
};

interface MapLegendProps {
  visible: boolean;
  onClose: () => void;
  watcherCount?: number;
  hasActiveRoute?: boolean;
  className?: string;
}

export function MapLegend({
  visible,
  onClose,
  watcherCount = 0,
  hasActiveRoute = false,
  className = "",
}: MapLegendProps) {
  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: 20 }}
          className={`glass rounded-xl p-4 w-56 shadow-lg ${className}`}
        >
          <h4 className="text-sm font-semibold mb-3 flex items-center justify-between">
            Map Legend
            <button onClick={onClose}>
              <X className="w-4 h-4 text-muted-foreground" />
            </button>
          </h4>

          <div className="space-y-2">
            {(Object.keys(markerTypeConfig) as MarkerType[]).map((key) => {
              const config = markerTypeConfig[key];
              const Icon = config.icon;
              return (
                <div key={key} className="flex items-center gap-2 text-sm">
                  <div
                    className={`w-6 h-6 rounded-full ${config.color} flex items-center justify-center`}
                  >
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
                {watcherCount > 0 && (
                  <span className="text-xs bg-cyan-500/20 text-cyan-400 px-1.5 py-0.5 rounded">
                    {watcherCount}
                  </span>
                )}
              </div>

              {hasActiveRoute && (
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
  );
}

export default MapLegend;
