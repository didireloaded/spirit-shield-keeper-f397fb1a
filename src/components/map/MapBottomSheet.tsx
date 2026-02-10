/**
 * Map Bottom Sheet
 * Draggable bottom sheet for incident details
 * Supports HIDDEN, PARTIAL, and FULL states
 */

import { useState, useRef, useCallback, useEffect } from "react";
import { motion, AnimatePresence, PanInfo } from "framer-motion";
import { X, MapPin, Clock, ThumbsUp, MessageSquare, Navigation, Shield, CheckCircle } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { formatDistance, distanceInMeters } from "@/lib/geo";
import { Button } from "@/components/ui/button";
import type { MapMarker } from "@/hooks/useMapMarkers";

export type SheetState = "HIDDEN" | "PARTIAL" | "FULL";

const SHEET_HEIGHTS = {
  HIDDEN: 0,
  PARTIAL: 200,
  FULL: typeof window !== "undefined" ? Math.min(window.innerHeight * 0.75, 600) : 450,
};

// Type configuration for labels and colors
const typeConfig: Record<string, { label: string; color: string; bgColor: string }> = {
  robbery: { label: "Robbery", color: "text-white", bgColor: "bg-destructive" },
  assault: { label: "Assault", color: "text-white", bgColor: "bg-destructive" },
  kidnapping: { label: "Kidnapping", color: "text-white", bgColor: "bg-destructive" },
  panic: { label: "Emergency", color: "text-white", bgColor: "bg-destructive" },
  crash: { label: "Vehicle Crash", color: "text-white", bgColor: "bg-orange-500" },
  amber: { label: "Amber Alert", color: "text-warning-foreground", bgColor: "bg-warning" },
  accident: { label: "Accident", color: "text-warning-foreground", bgColor: "bg-warning" },
  suspicious: { label: "Suspicious", color: "text-white", bgColor: "bg-accent" },
  other: { label: "Incident", color: "text-foreground", bgColor: "bg-muted" },
};

interface MapBottomSheetProps {
  marker: MapMarker | null;
  userLocation: { lat: number; lng: number } | null;
  state: SheetState;
  onStateChange: (state: SheetState) => void;
  onClose: () => void;
  onViewDetails?: () => void;
  onNavigate?: () => void;
}

export function MapBottomSheet({
  marker,
  userLocation,
  state,
  onStateChange,
  onClose,
  onViewDetails,
  onNavigate,
}: MapBottomSheetProps) {
  const [dragY, setDragY] = useState(0);
  const sheetRef = useRef<HTMLDivElement>(null);

  // Calculate distance from user
  const distance =
    marker && userLocation
      ? distanceInMeters(
          userLocation.lat,
          userLocation.lng,
          marker.latitude,
          marker.longitude
        )
      : null;

  // Format time ago
  const timeAgo = marker?.created_at
    ? formatDistanceToNow(new Date(marker.created_at), { addSuffix: true })
    : "Unknown";

  const config = marker ? typeConfig[marker.type] || typeConfig.other : typeConfig.other;
  const isResolved = marker?.status === "resolved";
  const isVerified = (marker?.verified_count || 0) >= 3;

  const handleDragEnd = useCallback(
    (_: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
      const velocity = info.velocity.y;
      const offset = info.offset.y;

      // Swipe down to close/minimize
      if (velocity > 500 || offset > 100) {
        if (state === "FULL") {
          onStateChange("PARTIAL");
        } else {
          onStateChange("HIDDEN");
        }
      }
      // Swipe up to expand
      else if (velocity < -500 || offset < -100) {
        if (state === "PARTIAL") {
          onStateChange("FULL");
        }
      }

      setDragY(0);
    },
    [state, onStateChange]
  );

  const handleNavigate = useCallback(() => {
    if (marker) {
      window.open(
        `https://www.google.com/maps/dir/?api=1&destination=${marker.latitude},${marker.longitude}`,
        "_blank"
      );
    }
    onNavigate?.();
  }, [marker, onNavigate]);

  // Reset state when marker changes
  useEffect(() => {
    if (marker && state === "HIDDEN") {
      onStateChange("PARTIAL");
    }
  }, [marker]);

  return (
    <AnimatePresence>
      {state !== "HIDDEN" && marker && (
        <motion.div
          ref={sheetRef}
          initial={{ y: "100%" }}
          animate={{ y: 0 }}
          exit={{ y: "100%" }}
          transition={{ type: "spring", damping: 30, stiffness: 300 }}
          drag="y"
          dragConstraints={{ top: 0, bottom: 0 }}
          dragElastic={{ top: 0.1, bottom: 0.3 }}
          onDragEnd={handleDragEnd}
          style={{
            height: SHEET_HEIGHTS[state],
            y: dragY,
          }}
          className="
            fixed bottom-20 left-0 right-0 z-[var(--z-map-buttons)]
            bg-card border-t border-border
            rounded-t-3xl shadow-2xl
            overflow-hidden
          "
        >
          {/* Drag Handle */}
          <div className="flex justify-center pt-3 pb-2 cursor-grab active:cursor-grabbing">
            <div className="w-12 h-1.5 rounded-full bg-muted-foreground/30" />
          </div>

          {/* Header */}
          <div className={`px-4 py-3 flex items-center gap-3 ${config.bgColor}`}>
            <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center">
              <MapPin className={`w-4 h-4 ${config.color}`} />
            </div>
            <div className="flex-1">
              <h3 className={`font-bold ${config.color}`}>{config.label}</h3>
            </div>

            {/* Status badges */}
            <div className="flex items-center gap-2">
              {isVerified && (
                <span className="px-2 py-1 bg-white/20 rounded-full text-xs font-medium text-white flex items-center gap-1">
                  <Shield className="w-3 h-3" />
                  Verified
                </span>
              )}
              {isResolved && (
                <span className="px-2 py-1 bg-success/80 rounded-full text-xs font-medium text-white flex items-center gap-1">
                  <CheckCircle className="w-3 h-3" />
                  Resolved
                </span>
              )}
            </div>

            <button
              onClick={onClose}
              className="p-1.5 rounded-lg bg-white/20 hover:bg-white/30 transition-colors"
            >
              <X className={`w-4 h-4 ${config.color}`} />
            </button>
          </div>

          {/* Content */}
          <div className="p-4 space-y-4 overflow-y-auto" style={{ maxHeight: "calc(100% - 100px)" }}>
            {/* Meta info - distance and time */}
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              {distance !== null && (
                <span className="flex items-center gap-1.5">
                  <MapPin className="w-4 h-4 text-primary" />
                  {formatDistance(distance)} away
                </span>
              )}
              <span className="flex items-center gap-1.5">
                <Clock className="w-4 h-4" />
                {timeAgo}
              </span>
            </div>

            {/* Description */}
            {marker.description && (
              <p className="text-sm text-foreground">
                {marker.description}
              </p>
            )}

            {/* Stats */}
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                <ThumbsUp className="w-4 h-4" />
                <span>{marker.verified_count || 0} confirmed</span>
              </div>
              <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                <MessageSquare className="w-4 h-4" />
                <span>{marker.comment_count || 0} comments</span>
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex gap-2 pt-2">
              <Button variant="outline" className="flex-1" onClick={handleNavigate}>
                <Navigation className="w-4 h-4 mr-2" />
                Navigate
              </Button>
              <Button className="flex-1" onClick={onViewDetails}>
                View Details
              </Button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default MapBottomSheet;
