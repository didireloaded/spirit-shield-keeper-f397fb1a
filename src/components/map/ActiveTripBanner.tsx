/**
 * Active Trip Banner
 * Shows when user has an active Look After Me session
 */

import { motion, AnimatePresence } from "framer-motion";
import { Route } from "lucide-react";
import type { ActiveTrip } from "@/hooks/useActiveTrip";

interface ActiveTripBannerProps {
  trip: ActiveTrip | null;
  visible: boolean;
  className?: string;
}

export function ActiveTripBanner({ trip, visible, className = "" }: ActiveTripBannerProps) {
  if (!trip) return null;

  const isLate = trip.status === "late";

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          className={className}
        >
          <div
            className={`
              backdrop-blur-sm px-4 py-3 rounded-xl
              flex items-center gap-3 shadow-lg
              ${isLate ? "bg-warning/95 text-warning-foreground" : "bg-success/95 text-success-foreground"}
            `}
          >
            <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center">
              <Route className="w-4 h-4" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold">Look After Me Active</p>
              <p className="text-xs opacity-80 truncate">
                To: {trip.destination}
              </p>
            </div>
            <div className="text-right">
              <p className="text-xs opacity-70">ETA</p>
              <p className="text-sm font-bold">
                {new Date(trip.expected_arrival).toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </p>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default ActiveTripBanner;
