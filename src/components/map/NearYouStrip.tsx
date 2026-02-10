/**
 * Near You Alert Strip
 * Appears when user is within 500m of an active incident
 * Shows urgency level, distance, and quick actions
 */

import { motion } from "framer-motion";
import { AlertTriangle, X, MapPin, Clock, ChevronRight } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { formatDistance } from "@/lib/geo";

interface NearYouStripProps {
  alert: {
    id: string;
    type: string;
    distance: number;
    created_at?: string;
    description?: string;
  };
  isHighPriority: boolean;
  onDismiss: () => void;
  onViewOnMap: () => void;
}

// Type labels for human-readable display
const typeLabels: Record<string, string> = {
  panic: "Emergency Alert",
  amber: "Amber Alert",
  crash: "Vehicle Crash",
  robbery: "Robbery Reported",
  assault: "Assault Reported",
  kidnapping: "Kidnapping Alert",
  accident: "Accident Reported",
  suspicious: "Suspicious Activity",
  other: "Incident Reported",
};

export function NearYouStrip({
  alert,
  isHighPriority,
  onDismiss,
  onViewOnMap,
}: NearYouStripProps) {
  const timeAgo = alert.created_at
    ? formatDistanceToNow(new Date(alert.created_at), { addSuffix: true })
    : "Just now";

  return (
    <motion.div
      initial={{ opacity: 0, y: -20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -20, scale: 0.95 }}
      transition={{ type: "spring", damping: 25, stiffness: 300 }}
      className={`rounded-2xl shadow-2xl overflow-hidden ${
        isHighPriority
          ? "bg-destructive text-destructive-foreground shadow-panic"
          : "bg-warning text-warning-foreground"
      }`}
    >
      <div className="relative">
        {/* Pulsing background for high priority */}
        {isHighPriority && (
          <div className="absolute inset-0 bg-destructive animate-pulse opacity-30" />
        )}

        <div className="relative p-4">
          <div className="flex items-start gap-3">
            {/* Icon */}
            <div
              className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                isHighPriority ? "bg-white/20" : "bg-black/10"
              }`}
            >
              <AlertTriangle className="w-5 h-5" />
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="font-bold text-sm">
                  {typeLabels[alert.type] || "Incident Near You"}
                </span>
                {isHighPriority && (
                  <span className="px-2 py-0.5 bg-white/20 rounded-full text-xs font-medium animate-pulse">
                    URGENT
                  </span>
                )}
              </div>

              <div className="flex items-center gap-3 text-xs opacity-90">
                <span className="flex items-center gap-1">
                  <MapPin className="w-3 h-3" />
                  {formatDistance(alert.distance)} away
                </span>
                <span className="flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {timeAgo}
                </span>
              </div>

              {alert.description && (
                <p className="text-xs mt-2 opacity-80 line-clamp-1">
                  {alert.description}
                </p>
              )}
            </div>

            {/* Dismiss button */}
            <button
              onClick={onDismiss}
              className={`p-1.5 rounded-lg transition-colors flex-shrink-0 ${
                isHighPriority ? "hover:bg-white/20" : "hover:bg-black/10"
              }`}
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* View on map button */}
          <button
            onClick={onViewOnMap}
            className={`mt-3 w-full py-2.5 rounded-xl font-medium text-sm flex items-center justify-center gap-2 transition-colors ${
              isHighPriority
                ? "bg-white/20 hover:bg-white/30"
                : "bg-black/10 hover:bg-black/20"
            }`}
          >
            <MapPin className="w-4 h-4" />
            View on Map
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </motion.div>
  );
}

export default NearYouStrip;
