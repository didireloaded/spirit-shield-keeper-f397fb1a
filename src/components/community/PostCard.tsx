/**
 * PostCard Component
 * Clean white card with rounded corners, proper hierarchy
 * Per PDF specs: calm, premium UI
 */

import { motion } from "framer-motion";
import { MessageCircle, Heart, Share2, MapPin, AlertTriangle, Info } from "lucide-react";
import { ProfileChip } from "./ProfileChip";
import { Badge } from "@/components/ui/badge";
import type { CommunityPost } from "@/hooks/useCommunityPosts";

interface PostCardProps {
  post: CommunityPost;
  onClick?: () => void;
  onShare?: () => void;
  index?: number;
}

type IncidentType = "danger" | "warning" | "info";

const incidentBadges: Record<IncidentType, { label: string; className: string; icon: typeof AlertTriangle }> = {
  danger: {
    label: "Reported Incident",
    className: "bg-destructive/10 text-destructive border-destructive/20",
    icon: AlertTriangle,
  },
  warning: {
    label: "Suspicious Activity",
    className: "bg-warning/10 text-warning border-warning/30",
    icon: AlertTriangle,
  },
  info: {
    label: "Community Update",
    className: "bg-primary/10 text-primary border-primary/20",
    icon: Info,
  },
};

function getIncidentType(content: string): IncidentType | null {
  const lowerContent = content.toLowerCase();
  if (
    lowerContent.includes("robbery") ||
    lowerContent.includes("assault") ||
    lowerContent.includes("danger") ||
    lowerContent.includes("attack") ||
    lowerContent.includes("[incident]")
  ) {
    return "danger";
  }
  if (
    lowerContent.includes("suspicious") ||
    lowerContent.includes("warning") ||
    lowerContent.includes("careful") ||
    lowerContent.includes("[suspicious]")
  ) {
    return "warning";
  }
  return null;
}

function formatContent(content: string): string {
  return content
    .replace("[INCIDENT] ", "")
    .replace("[SUSPICIOUS] ", "");
}

function formatLocation(label: string | null): string | null {
  if (!label) return null;
  // If it looks like raw coordinates, show "Nearby" instead
  if (/^-?\d+\.\d+,\s*-?\d+\.\d+$/.test(label.trim())) {
    return "Nearby";
  }
  return label;
}

export function PostCard({ post, onClick, onShare, index = 0 }: PostCardProps) {
  const isAnon = post.visibility === "anonymous";
  const incidentType = getIncidentType(post.content);
  const locationLabel = formatLocation(post.location_label);
  const BadgeIcon = incidentType ? incidentBadges[incidentType].icon : null;

  const handleShare = async (e: React.MouseEvent) => {
    e.stopPropagation();
    onShare?.();
  };

  return (
    <motion.article
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ delay: index * 0.05 }}
      onClick={onClick}
      className="bg-card border border-border rounded-2xl p-4 cursor-pointer hover:bg-secondary/30 transition-colors shadow-sm"
    >
      {/* Header with Profile Chip */}
      <div className="flex items-start justify-between">
        <ProfileChip
          user={post.profile ? { id: post.user_id, ...post.profile } : null}
          createdAt={post.created_at}
          isAnonymous={isAnon}
        />
        {locationLabel && (
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <MapPin className="w-3 h-3" />
            <span className="truncate max-w-[100px]">{locationLabel}</span>
          </div>
        )}
      </div>

      {/* Incident Badge */}
      {incidentType && (
        <Badge
          variant="outline"
          className={`mt-3 ${incidentBadges[incidentType].className}`}
        >
          {BadgeIcon && <BadgeIcon className="w-3 h-3 mr-1" />}
          {incidentBadges[incidentType].label}
        </Badge>
      )}

      {/* Post Image */}
      {post.image_url && (
        <div className="mt-3 rounded-xl overflow-hidden">
          <img
            src={post.image_url}
            alt="Post"
            className="w-full h-48 object-cover"
            loading="lazy"
          />
        </div>
      )}

      {/* Post Content */}
      <p className="mt-3 text-sm leading-relaxed text-foreground">
        {formatContent(post.content)}
      </p>

      {/* Post Actions */}
      <div className="flex items-center justify-between mt-4 pt-3 border-t border-border">
        <button className="flex items-center gap-1.5 text-muted-foreground text-xs hover:text-foreground transition-colors">
          <MessageCircle className="w-4 h-4" />
          <span>{post.comments_count}</span>
        </button>
        <button className="flex items-center gap-1.5 text-muted-foreground text-xs hover:text-primary transition-colors">
          <Heart className="w-4 h-4" />
          <span>{post.likes_count} Helpful</span>
        </button>
        <button
          onClick={handleShare}
          className="flex items-center gap-1.5 text-muted-foreground text-xs hover:text-foreground transition-colors"
        >
          <Share2 className="w-4 h-4" />
        </button>
      </div>
    </motion.article>
  );
}
