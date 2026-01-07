import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  X, CheckCircle, AlertTriangle, XCircle, Clock, MessageCircle, 
  Send, Trash2, MapPin, ExternalLink, Shield
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useMarkerInteractions } from "@/hooks/useMarkerInteractions";
import { useAuth } from "@/contexts/AuthContext";
import { formatDistanceToNow } from "date-fns";

interface Marker {
  id: string;
  latitude: number;
  longitude: number;
  type: string;
  description: string | null;
  user_id: string;
  created_at: string;
  status?: string;
  verified_count?: number;
  comment_count?: number;
}

interface IncidentDetailsModalProps {
  marker: Marker | null;
  onClose: () => void;
  userLocation?: { lat: number; lng: number } | null;
}

const reactionConfig = {
  verified: { icon: CheckCircle, label: "Verified", color: "text-success" },
  still_active: { icon: AlertTriangle, label: "Still Active", color: "text-warning" },
  resolved: { icon: Shield, label: "Resolved", color: "text-primary" },
  fake: { icon: XCircle, label: "False Report", color: "text-destructive" },
};

const typeColors: Record<string, string> = {
  robbery: "bg-destructive",
  assault: "bg-destructive",
  kidnapping: "bg-destructive",
  accident: "bg-warning",
  suspicious: "bg-accent",
  other: "bg-muted",
};

export const IncidentDetailsModal = ({ marker, onClose, userLocation }: IncidentDetailsModalProps) => {
  const { user } = useAuth();
  const [newComment, setNewComment] = useState("");
  const {
    reactions,
    comments,
    userReaction,
    reactionCounts,
    loading,
    addReaction,
    addComment,
    deleteComment,
  } = useMarkerInteractions(marker?.id || null);

  if (!marker) return null;

  const calculateDistance = () => {
    if (!userLocation) return null;
    const R = 6371;
    const dLat = (marker.latitude - userLocation.lat) * Math.PI / 180;
    const dLon = (marker.longitude - userLocation.lng) * Math.PI / 180;
    const a = 
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(userLocation.lat * Math.PI / 180) * Math.cos(marker.latitude * Math.PI / 180) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return (R * c).toFixed(1);
  };

  const distance = calculateDistance();
  const timeAgo = formatDistanceToNow(new Date(marker.created_at), { addSuffix: true });

  const handleSubmitComment = async () => {
    if (!newComment.trim()) return;
    await addComment(newComment);
    setNewComment("");
  };

  const openInMaps = () => {
    const url = `https://www.google.com/maps/dir/?api=1&destination=${marker.latitude},${marker.longitude}`;
    window.open(url, "_blank");
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center z-50"
        onClick={(e) => {
          if (e.target === e.currentTarget) onClose();
        }}
      >
        <motion.div
          initial={{ opacity: 0, y: 100 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 100 }}
          className="bg-card w-full sm:max-w-lg sm:rounded-2xl rounded-t-2xl max-h-[90vh] overflow-hidden flex flex-col"
        >
          {/* Header */}
          <div className="px-5 py-4 border-b border-border flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-xl ${typeColors[marker.type] || typeColors.other} flex items-center justify-center`}>
                <AlertTriangle className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="font-bold capitalize">{marker.type} Incident</h2>
                <p className="text-xs text-muted-foreground">{timeAgo}</p>
              </div>
            </div>
            <button onClick={onClose} className="p-2 rounded-lg hover:bg-secondary">
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto">
            {/* Location & Distance */}
            <div className="px-5 py-4 border-b border-border">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <MapPin className="w-4 h-4" />
                  <span className="font-mono text-xs">
                    {marker.latitude.toFixed(5)}, {marker.longitude.toFixed(5)}
                  </span>
                </div>
                {distance && (
                  <span className="text-sm font-medium">{distance} km away</span>
                )}
              </div>
              
              {marker.description && (
                <p className="mt-3 text-sm">{marker.description}</p>
              )}

              <Button 
                variant="outline" 
                size="sm" 
                className="mt-3 w-full"
                onClick={openInMaps}
              >
                <ExternalLink className="w-4 h-4 mr-2" />
                Open in Maps
              </Button>
            </div>

            {/* Reactions */}
            <div className="px-5 py-4 border-b border-border">
              <p className="text-xs text-muted-foreground font-medium mb-3">COMMUNITY FEEDBACK</p>
              <div className="grid grid-cols-2 gap-2">
                {(Object.keys(reactionConfig) as Array<keyof typeof reactionConfig>).map((type) => {
                  const config = reactionConfig[type];
                  const Icon = config.icon;
                  const count = reactionCounts[type] || 0;
                  const isSelected = userReaction?.reaction_type === type;

                  return (
                    <motion.button
                      key={type}
                      whileTap={{ scale: 0.97 }}
                      onClick={() => addReaction(type)}
                      disabled={!user}
                      className={`px-3 py-2.5 rounded-xl border-2 transition-all flex items-center gap-2 ${
                        isSelected
                          ? "border-primary bg-primary/10"
                          : "border-border hover:border-muted-foreground/30"
                      } ${!user ? "opacity-50 cursor-not-allowed" : ""}`}
                    >
                      <Icon className={`w-4 h-4 ${isSelected ? config.color : "text-muted-foreground"}`} />
                      <span className={`text-sm ${isSelected ? "font-medium" : ""}`}>
                        {config.label}
                      </span>
                      {count > 0 && (
                        <span className="ml-auto text-xs bg-secondary px-1.5 py-0.5 rounded">
                          {count}
                        </span>
                      )}
                    </motion.button>
                  );
                })}
              </div>
              {!user && (
                <p className="text-xs text-muted-foreground mt-2 text-center">
                  Log in to react to incidents
                </p>
              )}
            </div>

            {/* Comments */}
            <div className="px-5 py-4">
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs text-muted-foreground font-medium">
                  COMMENTS ({comments.length})
                </p>
              </div>

              {comments.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No comments yet
                </p>
              ) : (
                <div className="space-y-3 max-h-48 overflow-y-auto">
                  {comments.map((comment) => (
                    <div key={comment.id} className="bg-secondary/50 rounded-lg p-3">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center text-xs font-medium">
                            {comment.profile?.full_name?.[0] || "?"}
                          </div>
                          <span className="text-sm font-medium">
                            {comment.profile?.full_name || "Anonymous"}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true })}
                          </span>
                        </div>
                        {user?.id === comment.user_id && (
                          <button
                            onClick={() => deleteComment(comment.id)}
                            className="p-1 rounded hover:bg-destructive/20 text-muted-foreground hover:text-destructive"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                      <p className="text-sm mt-1.5">{comment.content}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Comment Input */}
          {user && (
            <div className="px-5 py-4 border-t border-border">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      handleSubmitComment();
                    }
                  }}
                  placeholder="Add a comment..."
                  className="flex-1 px-4 py-2.5 bg-secondary rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
                <Button
                  onClick={handleSubmitComment}
                  disabled={!newComment.trim()}
                  size="icon"
                  className="shrink-0"
                >
                  <Send className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default IncidentDetailsModal;
