import { motion } from "framer-motion";
import { X, MapPin, Clock, User, AlertTriangle, Mic, Play, Pause } from "lucide-react";
import { formatDistanceToNow, format } from "date-fns";
import { useState, useRef } from "react";

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

export const AlertDetailsModal = ({ alert, onClose, userLocation }: AlertDetailsModalProps) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Calculate distance if user location is available
  const calculateDistance = () => {
    if (!userLocation) return null;
    const R = 6371; // Earth's radius in km
    const dLat = (alert.latitude - userLocation.latitude) * (Math.PI / 180);
    const dLon = (alert.longitude - userLocation.longitude) * (Math.PI / 180);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(userLocation.latitude * (Math.PI / 180)) *
        Math.cos(alert.latitude * (Math.PI / 180)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return (R * c).toFixed(2);
  };

  const distance = calculateDistance();

  const toggleAudio = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }
    setIsPlaying(!isPlaying);
  };

  const isPanic = alert.type === "panic";
  const isAmber = alert.type === "amber";

  return (
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
        className="w-full max-w-md bg-card rounded-2xl overflow-hidden"
      >
        {/* Header */}
        <div
          className={`p-4 ${
            isPanic
              ? "bg-destructive"
              : isAmber
              ? "bg-warning"
              : "bg-primary"
          }`}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <AlertTriangle
                className={`w-6 h-6 ${isAmber ? "text-warning-foreground" : "text-white"}`}
              />
              <div>
                <h2
                  className={`text-lg font-bold capitalize ${
                    isAmber ? "text-warning-foreground" : "text-white"
                  }`}
                >
                  {alert.type} Alert
                </h2>
                <p
                  className={`text-sm ${
                    isAmber ? "text-warning-foreground/80" : "text-white/80"
                  }`}
                >
                  {alert.status === "active" ? "🔴 Active" : "Resolved"}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className={`p-2 rounded-full ${
                isAmber ? "hover:bg-black/10" : "hover:bg-white/10"
              } transition-colors`}
            >
              <X className={`w-5 h-5 ${isAmber ? "text-warning-foreground" : "text-white"}`} />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-4 space-y-4">
          {/* Timestamp */}
          <div className="flex items-center gap-3 p-3 bg-secondary rounded-xl">
            <Clock className="w-5 h-5 text-muted-foreground" />
            <div>
              <p className="text-sm font-medium">Time Reported</p>
              <p className="text-xs text-muted-foreground">
                {alert.created_at
                  ? `${formatDistanceToNow(new Date(alert.created_at), { addSuffix: true })} • ${format(
                      new Date(alert.created_at),
                      "PPp"
                    )}`
                  : "Unknown"}
              </p>
            </div>
          </div>

          {/* Location */}
          <div className="flex items-center gap-3 p-3 bg-secondary rounded-xl">
            <MapPin className="w-5 h-5 text-destructive" />
            <div className="flex-1">
              <p className="text-sm font-medium">Location</p>
              <p className="text-xs text-muted-foreground">
                {alert.latitude.toFixed(6)}, {alert.longitude.toFixed(6)}
              </p>
              {distance && (
                <p className="text-xs text-primary font-medium mt-1">
                  📍 {distance} km from your location
                </p>
              )}
            </div>
            <a
              href={`https://www.google.com/maps?q=${alert.latitude},${alert.longitude}`}
              target="_blank"
              rel="noopener noreferrer"
              className="px-3 py-1.5 bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-medium rounded-lg transition-colors"
            >
              Open Map
            </a>
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

          {/* Reporter ID */}
          <div className="flex items-center gap-3 p-3 bg-secondary rounded-xl">
            <User className="w-5 h-5 text-muted-foreground" />
            <div>
              <p className="text-sm font-medium">Reporter ID</p>
              <p className="text-xs text-muted-foreground font-mono">
                {alert.user_id.slice(0, 8)}...
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-border">
          <button
            onClick={onClose}
            className="w-full py-3 bg-secondary hover:bg-secondary/80 rounded-xl font-medium transition-colors"
          >
            Close
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
};
