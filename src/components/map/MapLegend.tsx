/**
 * Enhanced Map Legend Panel
 * Slide-in panel with incident types, authorities, and status indicators
 */

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Info, X } from "lucide-react";
import { haptics } from "@/lib/haptics";

const incidentTypes = [
  { type: "panic", color: "#ef4444", label: "Emergency Alert", icon: "🚨" },
  { type: "amber", color: "#f59e0b", label: "Amber Alert", icon: "🔍" },
  { type: "crash", color: "#eab308", label: "Vehicle Crash", icon: "🚗" },
  { type: "robbery", color: "#8b5cf6", label: "Robbery", icon: "💰" },
  { type: "assault", color: "#ec4899", label: "Assault", icon: "⚡" },
  { type: "suspicious", color: "#06b6d4", label: "Suspicious Activity", icon: "👁️" },
];

const authorityTypes = [
  { type: "police", color: "#3b82f6", label: "Police", icon: "🚔" },
  { type: "ambulance", color: "#10b981", label: "Ambulance", icon: "🚑" },
  { type: "authority", color: "#6366f1", label: "Authority", icon: "🏛️" },
];

export function MapLegend() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      {/* Toggle Button */}
      <motion.button
        whileTap={{ scale: 0.95 }}
        onClick={() => {
          haptics.light();
          setIsOpen(!isOpen);
        }}
        className="fixed top-[var(--map-top-row)] right-[var(--map-inset)] z-[var(--z-map-controls)] w-10 h-10 rounded-full bg-background/80 backdrop-blur-md border border-border/50 shadow-lg flex items-center justify-center text-foreground hover:bg-background transition-colors"
        aria-label="Toggle map legend"
      >
        <Info className="w-5 h-5" />
      </motion.button>

      {/* Legend Panel */}
      <AnimatePresence>
        {isOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsOpen(false)}
              className="fixed inset-0 bg-black/50 z-[var(--z-modal-backdrop)] backdrop-blur-sm"
            />

            <motion.div
              initial={{ opacity: 0, x: 100 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 100 }}
              transition={{ type: "spring", damping: 25 }}
              className="fixed right-4 top-20 z-[var(--z-modal)] w-72 bg-background rounded-2xl border border-border shadow-2xl overflow-hidden"
            >
              <div className="flex items-center justify-between p-4 border-b border-border">
                <h3 className="font-semibold text-foreground">Map Legend</h3>
                <button
                  onClick={() => setIsOpen(false)}
                  className="p-1 hover:bg-muted rounded-lg transition-colors"
                >
                  <X className="w-5 h-5 text-muted-foreground" />
                </button>
              </div>

              <div className="p-4 space-y-5 max-h-96 overflow-y-auto">
                {/* Incidents */}
                <div>
                  <h4 className="text-xs font-medium text-muted-foreground uppercase mb-2.5">
                    Incident Types
                  </h4>
                  <div className="space-y-2">
                    {incidentTypes.map(({ type, color, label, icon }) => (
                      <div key={type} className="flex items-center gap-3">
                        <div className="w-4 h-4 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />
                        <span className="text-sm">{icon}</span>
                        <span className="text-sm text-foreground">{label}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Authorities */}
                <div>
                  <h4 className="text-xs font-medium text-muted-foreground uppercase mb-2.5">
                    Emergency Services
                  </h4>
                  <div className="space-y-2">
                    {authorityTypes.map(({ type, color, label, icon }) => (
                      <div key={type} className="flex items-center gap-3">
                        <div className="w-4 h-4 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />
                        <span className="text-sm">{icon}</span>
                        <span className="text-sm text-foreground">{label}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Status */}
                <div>
                  <h4 className="text-xs font-medium text-muted-foreground uppercase mb-2.5">Status</h4>
                  <div className="space-y-2">
                    <div className="flex items-center gap-3">
                      <div className="w-4 h-4 rounded-full bg-destructive flex-shrink-0 animate-pulse" />
                      <span className="text-sm text-foreground">Active/Ongoing</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="w-4 h-4 rounded-full bg-warning flex-shrink-0" />
                      <span className="text-sm text-foreground">In Progress</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="w-4 h-4 rounded-full bg-success flex-shrink-0" />
                      <span className="text-sm text-foreground">Resolved</span>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}

export default MapLegend;
