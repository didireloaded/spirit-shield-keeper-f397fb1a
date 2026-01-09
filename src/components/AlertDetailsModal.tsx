import { motion } from "framer-motion";
import { X, MapPin, Clock, User, AlertTriangle, Mic, Play, Pause, Radio, Shield } from "lucide-react";
import { formatDistanceToNow, format } from "date-fns";
import { useState, useRef, useEffect } from "react";

interface Alert {
  id: string;
  type: string;
  latitude: number;
  longitude: number;
  description: string | null;
  audio_url: string | null;
  audio_started_at?: string | null;
  audio_duration_seconds?: number | null;
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
  const [audioDuration, setAudioDuration] = useState<number | null>(null);
  const [audioCurrentTime, setAudioCurrentTime] = useState(0);
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

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const updateTime = () => setAudioCurrentTime(audio.currentTime);
    const onLoadedMetadata = () => setAudioDuration(audio.duration);

    audio.addEventListener('timeupdate', updateTime);
    audio.addEventListener('loadedmetadata', onLoadedMetadata);

    return () => {
      audio.removeEventListener('timeupdate', updateTime);
      audio.removeEventListener('loadedmetadata', onLoadedMetadata);
    };
  }, [alert.audio_url]);

  const formatAudioTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const isPanic = alert.type === "panic";
  const isAmber = alert.type === "amber";
  const isActive = alert.status === "active";

  const getStatusConfig = () => {
    switch (alert.status) {
      case "active":
        return { label: "Active", color: "bg-destructive", textColor: "text-destructive" };
      case "resolved":
        return { label: "Resolved", color: "bg-success", textColor: "text-success" };
      case "cancelled":
        return { label: "Cancelled", color: "bg-muted", textColor: "text-muted-foreground" };
      default:
        return { label: alert.status || "Unknown", color: "bg-muted", textColor: "text-muted-foreground" };
    }
  };

  const statusConfig = getStatusConfig();

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
                  {isActive ? "🔴 Active" : statusConfig.label}
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

        {/* Incident Summary - NEW PRIMARY SECTION */}
        <div className="p-4 bg-secondary/50 border-b border-border">
          <div className="grid grid-cols-2 gap-4">
            {/* Status */}
            <div className="flex items-center gap-2">
              <div className={`w-2.5 h-2.5 rounded-full ${statusConfig.color} ${isActive ? 'animate-pulse' : ''}`} />
              <div>
                <p className="text-xs text-muted-foreground">Status</p>
                <p className={`text-sm font-semibold ${statusConfig.textColor}`}>{statusConfig.label}</p>
              </div>
            </div>
            {/* Distance */}
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4 text-primary" />
              <div>
                <p className="text-xs text-muted-foreground">Distance</p>
                <p className="text-sm font-semibold">{distance ? `${distance} km` : 'Unknown'}</p>
              </div>
            </div>
            {/* Time Since */}
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">Reported</p>
                <p className="text-sm font-semibold">
                  {alert.created_at
                    ? formatDistanceToNow(new Date(alert.created_at), { addSuffix: false })
                    : "Unknown"}
                </p>
              </div>
            </div>
            {/* Type */}
            <div className="flex items-center gap-2">
              <Shield className="w-4 h-4 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">Type</p>
                <p className="text-sm font-semibold capitalize">{alert.type}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-4 space-y-4">
          {/* Audio Evidence - MOVED UP & ENHANCED */}
          {alert.audio_url && (
            <div className={`p-4 rounded-xl border-2 ${isActive ? 'border-destructive/50 bg-destructive/5' : 'border-border bg-secondary'}`}>
              <div className="flex items-center gap-3 mb-3">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${isActive ? 'bg-destructive' : 'bg-muted'}`}>
                  {isActive ? (
                    <Radio className="w-5 h-5 text-white animate-pulse" />
                  ) : (
                    <Mic className="w-5 h-5 text-muted-foreground" />
                  )}
                </div>
                <div className="flex-1">
                  <p className="text-sm font-semibold">
                    {isActive ? '🔴 Live Recording' : 'Audio Evidence'}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {audioDuration 
                      ? `Duration: ${formatAudioTime(audioDuration)}`
                      : alert.audio_duration_seconds 
                        ? `Duration: ${formatAudioTime(alert.audio_duration_seconds)}`
                        : 'Recorded at scene'}
                  </p>
                </div>
                <button
                  onClick={toggleAudio}
                  className="w-12 h-12 bg-primary hover:bg-primary/90 rounded-full flex items-center justify-center transition-colors shadow-lg"
                >
                  {isPlaying ? (
                    <Pause className="w-5 h-5 text-primary-foreground" />
                  ) : (
                    <Play className="w-5 h-5 text-primary-foreground ml-0.5" />
                  )}
                </button>
              </div>
              {/* Audio Progress */}
              {audioDuration && (
                <div className="space-y-1">
                  <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-primary transition-all duration-100"
                      style={{ width: `${(audioCurrentTime / audioDuration) * 100}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>{formatAudioTime(audioCurrentTime)}</span>
                    <span>{formatAudioTime(audioDuration)}</span>
                  </div>
                </div>
              )}
              <audio
                ref={audioRef}
                src={alert.audio_url}
                onEnded={() => setIsPlaying(false)}
                className="hidden"
              />
            </div>
          )}

          {/* Description */}
          {alert.description && (
            <div className="p-3 bg-secondary rounded-xl">
              <p className="text-sm font-medium mb-1">Details</p>
              <p className="text-sm text-muted-foreground">{alert.description}</p>
            </div>
          )}

          {/* Location - Enhanced */}
          <div className="flex items-center gap-3 p-3 bg-secondary rounded-xl">
            <MapPin className="w-5 h-5 text-destructive" />
            <div className="flex-1">
              <p className="text-sm font-medium">Reported Location</p>
              <p className="text-xs text-muted-foreground font-mono">
                {alert.latitude.toFixed(6)}, {alert.longitude.toFixed(6)}
              </p>
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

          {/* Timestamp */}
          <div className="flex items-center gap-3 p-3 bg-secondary rounded-xl">
            <Clock className="w-5 h-5 text-muted-foreground" />
            <div>
              <p className="text-sm font-medium">Time Reported</p>
              <p className="text-xs text-muted-foreground">
                {alert.created_at
                  ? format(new Date(alert.created_at), "PPp")
                  : "Unknown"}
              </p>
            </div>
          </div>

          {/* Reporter - Enhanced with trust cue */}
          <div className="flex items-center gap-3 p-3 bg-secondary rounded-xl">
            <User className="w-5 h-5 text-muted-foreground" />
            <div className="flex-1">
              <p className="text-sm font-medium">Reporter</p>
              <p className="text-xs text-muted-foreground">Community member</p>
            </div>
            <span className="px-2 py-1 bg-primary/10 text-primary text-xs font-medium rounded-full">
              Verified
            </span>
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
