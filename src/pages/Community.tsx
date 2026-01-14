import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus,
  MessageCircle,
  Share2,
  ThumbsUp,
  MapPin,
  X,
  Send,
  Image,
  AlertTriangle,
  Info,
  Loader2,
  Heart,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import { Header } from "@/components/Header";
import { BottomNav } from "@/components/BottomNav";
import {
  useCommunityPosts,
  useCommunityComments,
  useCommunityReactions,
  type CommunityPost,
} from "@/hooks/useCommunityPosts";
import { formatDistanceToNow } from "date-fns";
import { toast } from "sonner";
import { useGeolocation } from "@/hooks/useGeolocation";

type IncidentType = "danger" | "warning" | "info";

const incidentBadges: Record<IncidentType, { label: string; className: string }> = {
  danger: {
    label: "Reported Incident",
    className: "bg-destructive/10 text-destructive border-destructive/20",
  },
  warning: {
    label: "Suspicious Activity",
    className: "bg-warning/10 text-warning border-warning/30",
  },
  info: {
    label: "Community Update",
    className: "bg-primary/10 text-primary border-primary/20",
  },
};

function getIncidentType(content: string): IncidentType | null {
  const lowerContent = content.toLowerCase();
  if (
    lowerContent.includes("robbery") ||
    lowerContent.includes("assault") ||
    lowerContent.includes("danger") ||
    lowerContent.includes("attack")
  ) {
    return "danger";
  }
  if (
    lowerContent.includes("suspicious") ||
    lowerContent.includes("warning") ||
    lowerContent.includes("careful")
  ) {
    return "warning";
  }
  return null;
}

function getInitials(name: string | null | undefined): string {
  if (!name) return "?";
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

export default function Community() {
  const { posts, loading, creating, createPost, uploadImage } = useCommunityPosts();
  const [selectedPost, setSelectedPost] = useState<CommunityPost | null>(null);
  const [showCreatePost, setShowCreatePost] = useState(false);

  // Create post state
  const [postContent, setPostContent] = useState("");
  const [postType, setPostType] = useState<IncidentType>("info");
  const [postImage, setPostImage] = useState<File | null>(null);
  const [postImagePreview, setPostImagePreview] = useState<string | null>(null);
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { latitude, longitude } = useGeolocation();

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setPostImage(file);
      setPostImagePreview(URL.createObjectURL(file));
    }
  };

  const handleSubmitPost = async () => {
    if (!postContent.trim()) {
      toast.error("Please enter some content");
      return;
    }

    setUploading(true);
    try {
      let imageUrl: string | null = null;
      if (postImage) {
        imageUrl = await uploadImage(postImage);
      }

      // Build content with type prefix for detection
      let finalContent = postContent;
      if (postType === "danger") {
        finalContent = `[INCIDENT] ${postContent}`;
      } else if (postType === "warning") {
        finalContent = `[SUSPICIOUS] ${postContent}`;
      }

      await createPost(finalContent, {
        imageUrl: imageUrl || undefined,
        locationLabel:
          latitude && longitude
            ? `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`
            : undefined,
        visibility: isAnonymous ? "anonymous" : "public",
      });

      // Reset form
      setPostContent("");
      setPostType("info");
      setPostImage(null);
      setPostImagePreview(null);
      setIsAnonymous(false);
      setShowCreatePost(false);
    } finally {
      setUploading(false);
    }
  };

  const handleShare = async (post: CommunityPost) => {
    try {
      await navigator.share({
        title: "Community Alert",
        text: post.content.slice(0, 100),
        url: window.location.href,
      });
    } catch {
      // Fallback: copy to clipboard
      await navigator.clipboard.writeText(post.content);
      toast.success("Copied to clipboard");
    }
  };

  return (
    <div className="min-h-screen bg-background pb-24">
      <Header title="Community" />

      <main className="max-w-lg mx-auto px-4 py-6">
        {/* Header */}
        <div className="text-center mb-6">
          <p className="text-sm text-muted-foreground">
            Local safety updates from people near you
          </p>
        </div>

        {/* Feed */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
          </div>
        ) : posts.length === 0 ? (
          <div className="text-center py-12 bg-card rounded-xl border border-border">
            <MessageCircle className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <p className="font-medium">No posts yet</p>
            <p className="text-sm text-muted-foreground mt-1">
              Be the first to share a community update
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            <AnimatePresence>
              {posts.map((post, index) => {
                const incidentType = getIncidentType(post.content);
                const isAnon = post.visibility === "anonymous";
                const displayName = isAnon
                  ? "Anonymous"
                  : post.profile?.full_name || "Community Member";
                const initials = isAnon ? "?" : getInitials(post.profile?.full_name);

                return (
                  <motion.div
                    key={post.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    transition={{ delay: index * 0.05 }}
                    onClick={() => setSelectedPost(post)}
                    className="bg-card border border-border rounded-2xl p-4 cursor-pointer hover:bg-secondary/30 transition-colors"
                  >
                    {/* Post Header */}
                    <div className="flex items-start gap-3">
                      <Avatar className="w-10 h-10 border-2 border-border">
                        {!isAnon && post.profile?.avatar_url ? (
                          <AvatarImage src={post.profile.avatar_url} />
                        ) : null}
                        <AvatarFallback className="bg-primary/10 text-primary text-sm">
                          {initials}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 text-sm">
                          <span className="font-semibold truncate">
                            {displayName}
                          </span>
                          <span className="text-muted-foreground">·</span>
                          <span className="text-muted-foreground text-xs">
                            {formatDistanceToNow(new Date(post.created_at), {
                              addSuffix: true,
                            })}
                          </span>
                        </div>
                        {post.location_label && (
                          <div className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
                            <MapPin className="w-3 h-3" />
                            <span className="truncate">{post.location_label}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Incident Badge */}
                    {incidentType && (
                      <Badge
                        variant="outline"
                        className={`mt-3 ${incidentBadges[incidentType].className}`}
                      >
                        {incidentType === "danger" && (
                          <AlertTriangle className="w-3 h-3 mr-1" />
                        )}
                        {incidentType === "warning" && (
                          <AlertTriangle className="w-3 h-3 mr-1" />
                        )}
                        {incidentType === "info" && (
                          <Info className="w-3 h-3 mr-1" />
                        )}
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
                        />
                      </div>
                    )}

                    {/* Post Content */}
                    <p className="mt-3 text-sm leading-relaxed">
                      {post.content
                        .replace("[INCIDENT] ", "")
                        .replace("[SUSPICIOUS] ", "")}
                    </p>

                    {/* Post Actions */}
                    <div className="flex items-center justify-between mt-4 pt-3 border-t border-border">
                      <button className="flex items-center gap-1.5 text-muted-foreground text-xs hover:text-foreground transition-colors">
                        <MessageCircle className="w-4 h-4" />
                        {post.comments_count}
                      </button>
                      <button className="flex items-center gap-1.5 text-muted-foreground text-xs hover:text-primary transition-colors">
                        <Heart className="w-4 h-4" />
                        {post.likes_count} Helpful
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleShare(post);
                        }}
                        className="flex items-center gap-1.5 text-muted-foreground text-xs hover:text-foreground transition-colors"
                      >
                        <Share2 className="w-4 h-4" />
                      </button>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        )}
      </main>

      {/* Create Post Button */}
      <div className="fixed bottom-24 right-4 z-50">
        <Button
          size="icon"
          className="w-14 h-14 rounded-full shadow-lg bg-primary hover:bg-primary/90"
          onClick={() => setShowCreatePost(true)}
          data-testid="button-create-post"
        >
          <Plus className="w-6 h-6" />
        </Button>
      </div>

      {/* Post Detail Sheet */}
      <PostDetailSheet
        post={selectedPost}
        onClose={() => setSelectedPost(null)}
      />

      {/* Create Post Sheet */}
      <Sheet open={showCreatePost} onOpenChange={setShowCreatePost}>
        <SheetContent side="bottom" className="h-[80vh] rounded-t-3xl">
          <SheetHeader className="pb-4">
            <SheetTitle>Create Post</SheetTitle>
          </SheetHeader>

          <div className="space-y-4">
            {/* Post Type Selection */}
            <div className="flex gap-2 flex-wrap">
              {(
                [
                  { type: "danger", label: "Incident", color: incidentBadges.danger.className },
                  { type: "warning", label: "Suspicious Activity", color: incidentBadges.warning.className },
                  { type: "info", label: "General Update", color: incidentBadges.info.className },
                ] as const
              ).map((item) => (
                <Badge
                  key={item.type}
                  variant="outline"
                  onClick={() => setPostType(item.type)}
                  className={`cursor-pointer py-2 px-3 ${
                    postType === item.type
                      ? item.color
                      : "bg-secondary text-muted-foreground"
                  }`}
                >
                  {item.label}
                </Badge>
              ))}
            </div>

            <Textarea
              placeholder="What's happening in your area?"
              className="min-h-[120px] resize-none rounded-xl"
              value={postContent}
              onChange={(e) => setPostContent(e.target.value)}
              data-testid="input-post-content"
            />

            {/* Image Preview */}
            {postImagePreview && (
              <div className="relative">
                <img
                  src={postImagePreview}
                  alt="Preview"
                  className="w-full h-40 object-cover rounded-xl"
                />
                <Button
                  size="icon"
                  variant="destructive"
                  className="absolute top-2 right-2 w-8 h-8 rounded-full"
                  onClick={() => {
                    setPostImage(null);
                    setPostImagePreview(null);
                  }}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            )}

            {/* Attach Options */}
            <div className="flex items-center gap-3">
              <input
                type="file"
                accept="image/*"
                ref={fileInputRef}
                onChange={handleImageSelect}
                className="hidden"
              />
              <Button
                variant="outline"
                className="rounded-xl gap-2"
                onClick={() => fileInputRef.current?.click()}
              >
                <Image className="w-4 h-4" />
                Add Photo
              </Button>
              <Button variant="outline" className="rounded-xl gap-2" disabled>
                <MapPin className="w-4 h-4" />
                Location {latitude ? "✓" : ""}
              </Button>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <input
                type="checkbox"
                id="anonymous"
                checked={isAnonymous}
                onChange={(e) => setIsAnonymous(e.target.checked)}
                className="rounded"
              />
              <label htmlFor="anonymous" className="text-sm text-muted-foreground">
                Post anonymously
              </label>
            </div>

            <Button
              className="w-full h-12 rounded-xl mt-4"
              onClick={handleSubmitPost}
              disabled={creating || uploading || !postContent.trim()}
              data-testid="button-submit-post"
            >
              {creating || uploading ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : null}
              Post to Community
            </Button>
          </div>
        </SheetContent>
      </Sheet>

      <BottomNav />
    </div>
  );
}

// Post Detail Sheet Component
function PostDetailSheet({
  post,
  onClose,
}: {
  post: CommunityPost | null;
  onClose: () => void;
}) {
  const { comments, loading, addComment } = useCommunityComments(post?.id || null);
  const { reactions, userReaction, toggleReaction } = useCommunityReactions(
    post?.id || null
  );
  const [commentInput, setCommentInput] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleAddComment = async () => {
    if (!commentInput.trim()) return;
    setSubmitting(true);
    await addComment(commentInput);
    setCommentInput("");
    setSubmitting(false);
  };

  if (!post) return null;

  const isAnon = post.visibility === "anonymous";
  const displayName = isAnon
    ? "Anonymous"
    : post.profile?.full_name || "Community Member";
  const initials = isAnon ? "?" : getInitials(post.profile?.full_name);
  const incidentType = getIncidentType(post.content);

  const likeCount = reactions.filter((r) => r.reaction_type === "like").length;
  const helpfulCount = reactions.filter((r) => r.reaction_type === "helpful").length;

  return (
    <Sheet open={!!post} onOpenChange={() => onClose()}>
      <SheetContent side="bottom" className="h-[90vh] rounded-t-3xl p-0 overflow-hidden">
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center gap-3 p-4 border-b border-border">
            <Avatar className="w-10 h-10 border-2 border-border">
              {!isAnon && post.profile?.avatar_url ? (
                <AvatarImage src={post.profile.avatar_url} />
              ) : null}
              <AvatarFallback className="bg-primary/10 text-primary">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <p className="font-semibold text-sm">{displayName}</p>
              <p className="text-xs text-muted-foreground">
                {post.location_label || "Nearby"} ·{" "}
                {formatDistanceToNow(new Date(post.created_at), {
                  addSuffix: true,
                })}
              </p>
            </div>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="w-5 h-5" />
            </Button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto">
            <div className="p-4 space-y-4">
              {incidentType && (
                <Badge
                  variant="outline"
                  className={incidentBadges[incidentType].className}
                >
                  {incidentBadges[incidentType].label}
                </Badge>
              )}

              {post.image_url && (
                <img
                  src={post.image_url}
                  alt="Post"
                  className="w-full rounded-xl"
                />
              )}

              <p className="text-sm leading-relaxed">
                {post.content
                  .replace("[INCIDENT] ", "")
                  .replace("[SUSPICIOUS] ", "")}
              </p>

              {/* Reactions */}
              <div className="flex gap-2 pt-2">
                <Button
                  variant="outline"
                  size="sm"
                  className={`rounded-full ${
                    userReaction === "like" ? "bg-primary/10 border-primary" : ""
                  }`}
                  onClick={() => toggleReaction("like")}
                >
                  <ThumbsUp className="w-4 h-4 mr-1" />
                  {likeCount}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className={`rounded-full ${
                    userReaction === "helpful" ? "bg-primary/10 border-primary" : ""
                  }`}
                  onClick={() => toggleReaction("helpful")}
                >
                  <Heart className="w-4 h-4 mr-1" />
                  {helpfulCount} Helpful
                </Button>
              </div>

              {/* Comments Section */}
              <div className="pt-4 border-t border-border">
                <h3 className="font-semibold text-sm mb-4">
                  Comments ({comments.length})
                </h3>

                {loading ? (
                  <div className="flex justify-center py-4">
                    <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                  </div>
                ) : comments.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    No comments yet. Be the first to comment!
                  </p>
                ) : (
                  <div className="space-y-4">
                    {comments.map((comment) => (
                      <div key={comment.id} className="flex gap-3">
                        <Avatar className="w-8 h-8">
                          <AvatarFallback className="text-xs bg-secondary">
                            {getInitials(comment.profile?.full_name)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 bg-secondary rounded-xl p-3">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-medium text-xs">
                              {comment.profile?.full_name || "User"}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              {formatDistanceToNow(new Date(comment.created_at), {
                                addSuffix: true,
                              })}
                            </span>
                          </div>
                          <p className="text-sm">{comment.content}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Comment Input */}
          <div className="p-4 border-t border-border bg-background">
            <div className="flex items-center gap-2">
              <Textarea
                placeholder="Add a comment..."
                className="flex-1 min-h-[44px] max-h-24 rounded-xl resize-none"
                value={commentInput}
                onChange={(e) => setCommentInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleAddComment();
                  }
                }}
              />
              <Button
                size="icon"
                className="rounded-xl flex-shrink-0"
                onClick={handleAddComment}
                disabled={submitting || !commentInput.trim()}
              >
                {submitting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
              </Button>
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
