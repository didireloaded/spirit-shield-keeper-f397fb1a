/**
 * Incident Preview Card
 * Bottom sheet that appears when tapping a map marker
 * Shows type, distance, time, verification status, and quick actions
 */

import { motion } from "framer-motion";
import {
  X,
  MapPin,
  Clock,
  Shield,
  MessageSquare,
  ThumbsUp,
  AlertTriangle,
  CheckCircle,
  Navigation,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { formatDistance, distanceInMeters } from "@/lib/geo";
import { Button } from "@/components/ui/button";

interface IncidentPreviewCardProps {
  incident: {
    id: string;
    type: string;
    latitude: number;
    longitude: number;
    description?: string | null;
    status?: string;
    verified_count?: number;
    comment_count?: number;
    created_at?: string;
    user_id?: string;
  };
  userLocation: { lat: number; lng: number } | null;
  onClose: () => void;
  onViewDetails: () => void;
  onNavigate: () => void;
}

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

export function IncidentPreviewCard({
  incident,
  userLocation,
  onClose,
  onViewDetails,
  onNavigate,
}: IncidentPreviewCardProps) {
  const config = typeConfig[incident.type] || typeConfig.other;

  // Calculate distance from user
  const distance = userLocation
    ? distanceInMeters(
        userLocation.lat,
        userLocation.lng,
        incident.latitude,
        incident.longitude
      )
    : null;

  // Format time ago
  const timeAgo = incident.created_at
    ? formatDistanceToNow(new Date(incident.created_at), { addSuffix: true })
    : "Unknown";

  const isResolved = incident.status === "resolved";
  const isVerified = (incident.verified_count || 0) >= 3;

  return (
    <motion.div
      initial={{ opacity: 0, y: 100 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 100 }}
      transition={{ type: "spring", damping: 25, stiffness: 300 }}
      className="absolute bottom-24 left-4 right-4 z-[var(--z-map-feedback)]"
    >
      <div className="bg-card border border-border rounded-2xl shadow-2xl overflow-hidden backdrop-blur-sm">
        {/* Header with type and status */}
        <div className={`px-4 py-3 flex items-center gap-3 ${config.bgColor}`}>
          <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center">
            <AlertTriangle className={`w-4 h-4 ${config.color}`} />
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
        <div className="p-4 space-y-4">
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
          {incident.description && (
            <p className="text-sm text-foreground line-clamp-2">
              {incident.description}
            </p>
          )}

          {/* Stats - confirmations and comments */}
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
              <ThumbsUp className="w-4 h-4" />
              <span>{incident.verified_count || 0} confirmed</span>
            </div>
            <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
              <MessageSquare className="w-4 h-4" />
              <span>{incident.comment_count || 0} comments</span>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex gap-2">
            <Button variant="outline" className="flex-1" onClick={onNavigate}>
              <Navigation className="w-4 h-4 mr-2" />
              Navigate
            </Button>
            <Button className="flex-1" onClick={onViewDetails}>
              View Details
            </Button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

export default IncidentPreviewCard;
