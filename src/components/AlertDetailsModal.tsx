import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  X, MapPin, Clock, AlertTriangle, Mic, Play, Pause, 
  Shield, CheckCircle, ExternalLink
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

interface Alert {
  id: string;
  type: string;
  latitude: number;
  longitude: number;
  description: string | null;
  audio_url: string | null;
  created_at: string | null;
  status: string | null;
  user_id: string;
}

interface AlertDetailsModalProps {
  alert: Alert;
  onClose: () => void;
  userLocation?: { latitude: number; longitude: number } | null;
}

// Format distance in a human readable way
const formatDistance = (km: number): string => {
  if (km < 0.1) return "Less than 100m away";
  if (km < 1) return `${Math.round(km * 1000)}m away`;
  return `${km.toFixed(1)}km away`;
};

// Calculate distance between two coordinates
const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
  const R = 6371;
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

// Get human-readable alert type label
const getAlertTypeLabel = (type: string): string => {
  const labels: Record<string, string> = {
    panic: "Panic Alert",
    robbery: "Robbery Report",
    assault: "Assault Report",
    suspicious: "Suspicious Activity",
    accident: "Accident Report",
    other: "Incident Report",
  };
  return labels[type] || "Alert";
};

export const AlertDetailsModal = ({ alert, onClose, userLocation }: AlertDetailsModalProps) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isResolving, setIsResolving] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [areaName, setAreaName] = useState<string>("Loading location...");
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const { user } = useAuth();
  const navigate = useNavigate();

  const isOwner = user?.id === alert.user_id;
  const isResolved = alert.status === "resolved";
  const isActive = alert.status === "active";
  const isPanic = alert.type === "panic";

  // Calculate distance
  const distance = userLocation 
    ? calculateDistance(userLocation.latitude, userLocation.longitude, alert.latitude, alert.longitude)
    : null;

  // Reverse geocode to get area name using authenticated edge function
  useEffect(() => {
    const fetchAreaName = async () => {
      try {
        // Get Mapbox token from edge function
        const { data: tokenData, error: tokenError } = await supabase.functions.invoke('get-mapbox-token');
        
        if (tokenError || !tokenData?.token) {
          setAreaName("Unknown area");
          return;
        }

        const response = await fetch(
          `https://api.mapbox.com/geocoding/v5/mapbox.places/${alert.longitude},${alert.latitude}.json?types=neighborhood,locality,place&limit=1&access_token=${tokenData.token}`
        );
        const data = await response.json();
        if (data.features && data.features.length > 0) {
          setAreaName(data.features[0].place_name.split(",").slice(0, 2).join(", "));
        } else {
          setAreaName("Unknown area");
        }
      } catch {
        setAreaName("Unknown area");
      }
    };
    
    fetchAreaName();
  }, [alert.latitude, alert.longitude]);

  const toggleAudio = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }
    setIsPlaying(!isPlaying);
  };

  const handleResolve = async () => {
    setIsResolving(true);
    
    const { error } = await supabase
      .from("alerts")
      .update({ 
        status: "resolved", 
        resolved_at: new Date().toISOString() 
      })
      .eq("id", alert.id);

    if (error) {
      toast.error("Failed to update alert status");
    } else {
      toast.success("Alert marked as resolved");
      setShowConfirmation(false);
      onClose();
    }
    
    setIsResolving(false);
  };

  const handleOpenOnMap = () => {
    navigate(`/map?alertId=${alert.id}`);
    onClose();
  };

  // Format time reported
  const timeReported = alert.created_at 
    ? `Reported ${formatDistanceToNow(new Date(alert.created_at), { addSuffix: false })} ago`
    : "Recently reported";

  return (
    <>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/70 z-50 flex items-end sm:items-center justify-center p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ y: "100%", opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: "100%", opacity: 0 }}
          transition={{ type: "spring", damping: 25, stiffness: 300 }}
          onClick={(e) => e.stopPropagation()}
          className="w-full max-w-md bg-card rounded-2xl overflow-hidden max-h-[85vh] overflow-y-auto"
        >
          {/* Header */}
          <div className={`p-4 ${isResolved ? "bg-success" : isPanic ? "bg-destructive" : "bg-primary"}`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <AlertTriangle className={`w-6 h-6 ${isResolved ? "text-success-foreground" : "text-white"}`} />
                <div>
                  <h2 className={`text-lg font-bold ${isResolved ? "text-success-foreground" : "text-white"}`}>
                    {getAlertTypeLabel(alert.type)}
                  </h2>
                  <div className="flex items-center gap-2 mt-0.5">
                    <Badge 
                      variant="outline" 
                      className={`text-xs font-medium ${
                        isResolved 
                          ? "bg-success-foreground/10 text-success-foreground border-success-foreground/20" 
                          : "bg-white/10 text-white border-white/20"
                      }`}
                    >
                      {isResolved ? (
                        <span className="flex items-center gap-1">
                          <CheckCircle className="w-3 h-3" />
                          Resolved
                        </span>
                      ) : (
                        <span className="flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse" />
                          Active
                        </span>
                      )}
                    </Badge>
                  </div>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-2 rounded-full hover:bg-white/10 transition-colors"
              >
                <X className={`w-5 h-5 ${isResolved ? "text-success-foreground" : "text-white"}`} />
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="p-4 space-y-4">
            {/* Time Reported */}
            <div className="flex items-center gap-3 p-3 bg-secondary rounded-xl">
              <Clock className="w-5 h-5 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">Time Reported</p>
                <p className="text-xs text-muted-foreground">{timeReported}</p>
              </div>
            </div>

            {/* Location - Human Readable */}
            <div className="flex items-center gap-3 p-3 bg-secondary rounded-xl">
              <MapPin className="w-5 h-5 text-destructive" />
              <div className="flex-1">
                <p className="text-sm font-medium">Location</p>
                <p className="text-xs text-muted-foreground">{areaName}</p>
                {distance !== null && (
                  <p className="text-xs text-primary font-medium mt-1">
                    📍 {formatDistance(distance)}
                  </p>
                )}
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={handleOpenOnMap}
                className="gap-1 text-xs"
              >
                <ExternalLink className="w-3 h-3" />
                Open Map
              </Button>
            </div>

            {/* Description */}
            {alert.description && (
              <div className="p-3 bg-secondary rounded-xl">
                <p className="text-sm font-medium mb-1">Description</p>
                <p className="text-sm text-muted-foreground">{alert.description}</p>
              </div>
            )}

            {/* Audio Evidence */}
            {alert.audio_url && (
              <div className="p-3 bg-secondary rounded-xl">
                <div className="flex items-center gap-3">
                  <Mic className="w-5 h-5 text-destructive" />
                  <div className="flex-1">
                    <p className="text-sm font-medium">Audio Evidence</p>
                    <p className="text-xs text-muted-foreground">Recorded at scene</p>
                  </div>
                  <button
                    onClick={toggleAudio}
                    className="w-10 h-10 bg-destructive hover:bg-destructive/90 rounded-full flex items-center justify-center transition-colors"
                  >
                    {isPlaying ? (
                      <Pause className="w-5 h-5 text-white" />
                    ) : (
                      <Play className="w-5 h-5 text-white ml-0.5" />
                    )}
                  </button>
                </div>
                <audio
                  ref={audioRef}
                  src={alert.audio_url}
                  onEnded={() => setIsPlaying(false)}
                  className="hidden"
                />
              </div>
            )}

            {/* Reporter Info - Anonymized */}
            <div className="flex items-center gap-3 p-3 bg-secondary rounded-xl">
              <Shield className="w-5 h-5 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">Reported By</p>
                <p className="text-xs text-muted-foreground">
                  {isOwner ? "You reported this alert" : "Community member"}
                </p>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="p-4 border-t border-border space-y-2">
            {/* Resolve Button - Only for owner and active alerts */}
            {isOwner && isActive && (
              <Button
                onClick={() => setShowConfirmation(true)}
                className="w-full h-12 bg-success hover:bg-success/90 text-success-foreground font-semibold"
              >
                <CheckCircle className="w-5 h-5 mr-2" />
                Mark as Resolved
              </Button>
            )}
            
            <Button
              variant="secondary"
              onClick={onClose}
              className="w-full"
            >
              Close
            </Button>
          </div>
        </motion.div>
      </motion.div>

      {/* Confirmation Modal */}
      <AnimatePresence>
        {showConfirmation && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 z-[60] flex items-center justify-center p-4"
            onClick={() => setShowConfirmation(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-card rounded-2xl p-6 max-w-sm w-full text-center"
            >
              <div className="w-16 h-16 mx-auto bg-success/10 rounded-full flex items-center justify-center mb-4">
                <CheckCircle className="w-8 h-8 text-success" />
              </div>
              <h3 className="text-lg font-bold mb-2">Resolve This Alert?</h3>
              <p className="text-sm text-muted-foreground mb-6">
                Are you sure this incident has been resolved? This will close the alert and notify the community.
              </p>
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={() => setShowConfirmation(false)}
                  className="flex-1"
                  disabled={isResolving}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleResolve}
                  className="flex-1 bg-success hover:bg-success/90 text-success-foreground"
                  disabled={isResolving}
                >
                  {isResolving ? "Updating..." : "Confirm"}
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};
