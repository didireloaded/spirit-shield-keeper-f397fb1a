import { motion } from "framer-motion";
import { 
  X, MapPin, Clock, Shield, Users, MessageSquare, 
  ThumbsUp, AlertTriangle, CheckCircle, Navigation 
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

const typeConfig: Record<string, { label: string; color: string; icon: typeof AlertTriangle }> = {
  robbery: { label: "Robbery", color: "bg-destructive", icon: AlertTriangle },
  assault: { label: "Assault", color: "bg-destructive", icon: AlertTriangle },
  kidnapping: { label: "Kidnapping", color: "bg-destructive", icon: AlertTriangle },
  panic: { label: "Emergency", color: "bg-destructive", icon: AlertTriangle },
  amber: { label: "Amber Alert", color: "bg-warning", icon: AlertTriangle },
  accident: { label: "Accident", color: "bg-warning", icon: AlertTriangle },
  suspicious: { label: "Suspicious", color: "bg-accent", icon: AlertTriangle },
  other: { label: "Incident", color: "bg-muted", icon: AlertTriangle },
};

export function IncidentPreviewCard({
  incident,
  userLocation,
  onClose,
  onViewDetails,
  onNavigate,
}: IncidentPreviewCardProps) {
  const config = typeConfig[incident.type] || typeConfig.other;
  const Icon = config.icon;

  const distance = userLocation
    ? distanceInMeters(
        userLocation.lat,
        userLocation.lng,
        incident.latitude,
        incident.longitude
      )
    : null;

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
      className="absolute bottom-24 left-4 right-4 z-20"
    >
      <div className="bg-card border border-border rounded-2xl shadow-2xl overflow-hidden">
        {/* Header with status */}
        <div className={`px-4 py-3 flex items-center gap-3 ${config.color}`}>
          <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center">
            <Icon className="w-4 h-4 text-white" />
          </div>
          <div className="flex-1">
            <h3 className="font-bold text-white">{config.label}</h3>
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
            <X className="w-4 h-4 text-white" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-4">
          {/* Meta info */}
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

          {/* Stats */}
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

          {/* Actions */}
          <div className="flex gap-2">
            <Button
              variant="outline"
              className="flex-1"
              onClick={onNavigate}
            >
              <Navigation className="w-4 h-4 mr-2" />
              Navigate
            </Button>
            <Button
              className="flex-1"
              onClick={onViewDetails}
            >
              View Details
            </Button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
