import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  X, MapPin, Clock, User, AlertTriangle, Mic, Play, Pause, 
  Shield, CheckCircle, ExternalLink, Shirt, Car, Image as ImageIcon
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

interface AmberAlert {
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

interface AmberAlertDetailsModalProps {
  alert: AmberAlert;
  onClose: () => void;
  userLocation?: { latitude: number; longitude: number } | null;
}

// Parse structured description from the amber alert
const parseDescription = (description: string | null) => {
  if (!description) return { main: "", outfit: "", vehicle: "", color: "", plate: "", photoUrl: "" };
  
  const parts = description.split(". ");
  let main = "";
  let outfit = "";
  let vehicle = "";
  let color = "";
  let plate = "";
  let photoUrl = "";
  
  parts.forEach(part => {
    if (part.startsWith("Outfit:")) {
      outfit = part.replace("Outfit:", "").trim();
    } else if (part.startsWith("Vehicle:")) {
      vehicle = part.replace("Vehicle:", "").trim();
    } else if (part.startsWith("Color:")) {
      color = part.replace("Color:", "").trim();
    } else if (part.startsWith("Plate:")) {
      plate = part.replace("Plate:", "").trim();
    } else if (part.startsWith("Photo:")) {
      photoUrl = part.replace("Photo:", "").trim();
    } else if (!part.startsWith("Photo:")) {
      main = part;
    }
  });
  
  return { main, outfit, vehicle, color, plate, photoUrl };
};

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

export const AmberAlertDetailsModal = ({ alert, onClose, userLocation }: AmberAlertDetailsModalProps) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isResolving, setIsResolving] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [areaName, setAreaName] = useState<string>("Loading location...");
  const [fullscreenImage, setFullscreenImage] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const { user } = useAuth();
  const navigate = useNavigate();
  
  const isOwner = user?.id === alert.user_id;
  const isResolved = alert.status === "resolved";
  const isActive = alert.status === "active";
  
  const parsedDescription = parseDescription(alert.description);
  
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

  const handleSafeAndSound = async () => {
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
      toast.success("🎉 Marked as Safe & Sound!");
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
          <div className={`p-4 ${isResolved ? "bg-success" : "bg-warning"}`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <AlertTriangle className={`w-6 h-6 ${isResolved ? "text-success-foreground" : "text-warning-foreground"}`} />
                <div>
                  <h2 className={`text-lg font-bold ${isResolved ? "text-success-foreground" : "text-warning-foreground"}`}>
                    Amber Alert
                  </h2>
                  <div className="flex items-center gap-2 mt-0.5">
                    <Badge 
                      variant="outline" 
                      className={`text-xs font-medium ${
                        isResolved 
                          ? "bg-success-foreground/10 text-success-foreground border-success-foreground/20" 
                          : "bg-warning-foreground/10 text-warning-foreground border-warning-foreground/20"
                      }`}
                    >
                      {isResolved ? (
                        <span className="flex items-center gap-1">
                          <CheckCircle className="w-3 h-3" />
                          Resolved • Safe & Sound
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
                className={`p-2 rounded-full hover:bg-black/10 transition-colors`}
              >
                <X className={`w-5 h-5 ${isResolved ? "text-success-foreground" : "text-warning-foreground"}`} />
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
              <MapPin className="w-5 h-5 text-warning" />
              <div className="flex-1">
                <p className="text-sm font-medium">Location</p>
                <p className="text-xs text-muted-foreground">{areaName}</p>
                {distance !== null && (
                  <p className="text-xs text-warning font-medium mt-1">
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

            {/* Photo - Displayed Inline */}
            {parsedDescription.photoUrl && (
              <div className="rounded-xl overflow-hidden">
                <p className="text-sm font-medium mb-2 flex items-center gap-2">
                  <ImageIcon className="w-4 h-4 text-muted-foreground" />
                  Missing Person Photo
                </p>
                <img
                  src={parsedDescription.photoUrl}
                  alt="Missing person"
                  className="w-full h-56 object-cover rounded-xl cursor-pointer hover:opacity-90 transition-opacity"
                  onClick={() => setFullscreenImage(parsedDescription.photoUrl)}
                />
              </div>
            )}

            {/* Description */}
            {parsedDescription.main && (
              <div className="p-3 bg-secondary rounded-xl">
                <p className="text-sm font-medium mb-1 flex items-center gap-2">
                  <User className="w-4 h-4 text-muted-foreground" />
                  Description
                </p>
                <p className="text-sm text-muted-foreground">{parsedDescription.main}</p>
              </div>
            )}

            {/* Outfit */}
            {parsedDescription.outfit && (
              <div className="p-3 bg-secondary rounded-xl">
                <p className="text-sm font-medium mb-1 flex items-center gap-2">
                  <Shirt className="w-4 h-4 text-muted-foreground" />
                  Outfit
                </p>
                <p className="text-sm text-muted-foreground">{parsedDescription.outfit}</p>
              </div>
            )}

            {/* Vehicle Details */}
            {(parsedDescription.vehicle || parsedDescription.color || parsedDescription.plate) && (
              <div className="p-3 bg-secondary rounded-xl space-y-2">
                <p className="text-sm font-medium flex items-center gap-2">
                  <Car className="w-4 h-4 text-muted-foreground" />
                  Vehicle Details
                </p>
                {parsedDescription.vehicle && (
                  <p className="text-sm text-muted-foreground">Make/Model: {parsedDescription.vehicle}</p>
                )}
                {parsedDescription.color && (
                  <p className="text-sm text-muted-foreground">Color: {parsedDescription.color}</p>
                )}
                {parsedDescription.plate && (
                  <p className="text-sm font-mono bg-card px-2 py-1 rounded inline-block">
                    Plate: {parsedDescription.plate}
                  </p>
                )}
              </div>
            )}

            {/* Audio Evidence */}
            {alert.audio_url && (
              <div className="p-3 bg-secondary rounded-xl">
                <div className="flex items-center gap-3">
                  <Mic className="w-5 h-5 text-warning" />
                  <div className="flex-1">
                    <p className="text-sm font-medium">Audio Evidence</p>
                    <p className="text-xs text-muted-foreground">Recorded at scene</p>
                  </div>
                  <button
                    onClick={toggleAudio}
                    className="w-10 h-10 bg-warning hover:bg-warning/90 rounded-full flex items-center justify-center transition-colors"
                  >
                    {isPlaying ? (
                      <Pause className="w-5 h-5 text-warning-foreground" />
                    ) : (
                      <Play className="w-5 h-5 text-warning-foreground ml-0.5" />
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
                  {isOwner ? "You reported this alert" : "A SafeGuard user"}
                </p>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="p-4 border-t border-border space-y-2">
            {/* Safe & Sound Button - Only for owner and active alerts */}
            {isOwner && isActive && (
              <Button
                onClick={() => setShowConfirmation(true)}
                className="w-full h-12 bg-success hover:bg-success/90 text-success-foreground font-semibold"
              >
                <CheckCircle className="w-5 h-5 mr-2" />
                Mark as Safe & Sound
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
              <h3 className="text-lg font-bold mb-2">Confirm Safe & Sound</h3>
              <p className="text-sm text-muted-foreground mb-6">
                Are you sure the missing person has been found and is safe? This will close the alert and notify the community.
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
                  onClick={handleSafeAndSound}
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

      {/* Fullscreen Image Modal */}
      <AnimatePresence>
        {fullscreenImage && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black z-[60] flex items-center justify-center"
            onClick={() => setFullscreenImage(null)}
          >
            <button
              onClick={() => setFullscreenImage(null)}
              className="absolute top-4 right-4 p-2 bg-black/50 rounded-full hover:bg-black/70 transition-colors z-10"
            >
              <X className="w-6 h-6 text-white" />
            </button>
            <img
              src={fullscreenImage}
              alt="Missing person"
              className="max-w-full max-h-full object-contain"
            />
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};
