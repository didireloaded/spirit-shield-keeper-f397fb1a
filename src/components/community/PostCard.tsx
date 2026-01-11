import { useState } from "react";
import { motion } from "framer-motion";
import { Heart, MessageCircle, Share2, MapPin, MoreHorizontal, Flag, CheckCircle } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { CommunityPost } from "@/hooks/useCommunityPosts";

interface PostCardProps {
  post: CommunityPost;
  onLike: (postId: string) => void;
  onComment: (post: CommunityPost) => void;
  onReport: (postId: string) => void;
  onImageClick?: (imageUrl: string) => void;
}

export const PostCard = ({
  post,
  onLike,
  onComment,
  onReport,
  onImageClick,
}: PostCardProps) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const userName = post.profiles?.full_name || "Anonymous";
  const userInitials = userName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  const contentNeedsTruncation = post.content.length > 200;
  const displayContent =
    isExpanded || !contentNeedsTruncation
      ? post.content
      : post.content.slice(0, 200) + "...";

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-card rounded-xl overflow-hidden"
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4">
        <div className="flex items-center gap-3">
          <Avatar className="w-10 h-10">
            <AvatarImage src={post.profiles?.avatar_url || undefined} />
            <AvatarFallback className="bg-secondary text-secondary-foreground">
              {userInitials}
            </AvatarFallback>
          </Avatar>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-medium text-sm">{userName}</span>
              {post.is_verified && (
                <CheckCircle className="w-4 h-4 text-primary" />
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              {formatDistanceToNow(new Date(post.created_at), { addSuffix: true })}
            </p>
          </div>
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <MoreHorizontal className="w-4 h-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="bg-popover">
            <DropdownMenuItem onClick={() => onReport(post.id)}>
              <Flag className="w-4 h-4 mr-2" />
              Report
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Content */}
      <div className="px-4 pb-3">
        <p className="text-sm leading-relaxed whitespace-pre-wrap">
          {displayContent}
        </p>
        {contentNeedsTruncation && (
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="text-primary text-sm mt-1 hover:underline"
          >
            {isExpanded ? "Show less" : "Read more"}
          </button>
        )}
      </div>

      {/* Image */}
      {post.image_url && (
        <div
          className="cursor-pointer"
          onClick={() => onImageClick?.(post.image_url!)}
        >
          <img
            src={post.image_url}
            alt="Post image"
            className="w-full max-h-80 object-cover"
          />
        </div>
      )}

      {/* Location */}
      {post.location_label && (
        <div className="px-4 py-2">
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <MapPin className="w-3 h-3" />
            <span>{post.location_label}</span>
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center justify-between px-4 py-3 border-t border-border">
        <button
          onClick={() => onLike(post.id)}
          className={`flex items-center gap-2 text-sm transition-colors ${
            post.user_reaction
              ? "text-destructive"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <Heart
            className={`w-5 h-5 ${post.user_reaction ? "fill-current" : ""}`}
          />
          <span>{post.likes_count}</span>
        </button>

        <button
          onClick={() => onComment(post)}
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <MessageCircle className="w-5 h-5" />
          <span>{post.comments_count}</span>
        </button>

        <button className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
          <Share2 className="w-5 h-5" />
        </button>
      </div>
    </motion.div>
  );
};
