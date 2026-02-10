/**
 * Live Location Label
 * Floating label showing user's current location name
 */

import { motion, AnimatePresence } from "framer-motion";
import { MapPin, Navigation, Clock } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { useFormattedLocation } from "@/lib/locationFormatter";

interface LiveLocationLabelProps {
  latitude: number;
  longitude: number;
  locationName?: string | null;
  isMoving?: boolean;
  lastUpdated?: string;
  speed?: number;
  mapboxToken?: string | null;
}

export function LiveLocationLabel({
  latitude,
  longitude,
  locationName,
  isMoving = false,
  lastUpdated,
  speed = 0,
  mapboxToken,
}: LiveLocationLabelProps) {
  const { locationName: resolvedName, loading } = useFormattedLocation(
    locationName ? null : latitude,
    locationName ? null : longitude
  );
  const location = locationName || resolvedName;

  const speedMph = (speed * 2.237).toFixed(0);

  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      className="fixed top-20 left-1/2 -translate-x-1/2 z-25 max-w-sm w-full px-4"
    >
      <div className="bg-background/90 backdrop-blur-md rounded-2xl border border-border/50 shadow-lg overflow-hidden">
        <div className="p-3 flex items-center gap-3">
          <div className={isMoving ? "animate-pulse" : ""}>
            {isMoving ? (
              <Navigation className="w-4 h-4 text-primary" fill="currentColor" />
            ) : (
              <MapPin className="w-4 h-4 text-primary" />
            )}
          </div>

          <div className="flex-1 min-w-0">
            <AnimatePresence mode="wait">
              {loading ? (
                <motion.div
                  key="loading"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="h-4 w-32 bg-muted animate-pulse rounded"
                />
              ) : (
                <motion.p
                  key={location}
                  initial={{ opacity: 0, y: -5 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 5 }}
                  className="text-sm font-medium text-foreground truncate"
                >
                  {location}
                </motion.p>
              )}
            </AnimatePresence>
            <div className="flex items-center gap-2 mt-0.5 text-xs text-muted-foreground">
              {lastUpdated && (
                <span className="flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {formatDistanceToNow(new Date(lastUpdated), { addSuffix: true })}
                </span>
              )}
              {isMoving && speed > 0.5 && (
                <span className="text-primary font-medium">{speedMph} mph</span>
              )}
            </div>
          </div>

          {isMoving && (
            <motion.div
              animate={{ opacity: [1, 0.5, 1] }}
              transition={{ duration: 2, repeat: Infinity }}
              className="flex items-center gap-1 px-2 py-1 bg-primary/10 rounded-full"
            >
              <span className="w-1.5 h-1.5 bg-primary rounded-full" />
              <span className="text-xs font-medium text-primary">LIVE</span>
            </motion.div>
          )}
        </div>
      </div>
    </motion.div>
  );
}

export default LiveLocationLabel;
