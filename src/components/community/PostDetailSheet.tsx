/**
 * Post Detail Sheet
 * Full post view with comments
 * Per PDF: Bottom sheet for comments
 */

import { useState } from "react";
import { Send, Loader2, Heart, MessageCircle, MapPin } from "lucide-react";
import { ProfileChip } from "./ProfileChip";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Sheet,
  SheetContent,
} from "@/components/ui/sheet";
import {
  useCommunityComments,
  useCommunityReactions,
  type CommunityPost,
} from "@/hooks/useCommunityPosts";
import { formatDistanceToNow } from "date-fns";

interface PostDetailSheetProps {
  post: CommunityPost | null;
  onClose: () => void;
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

export function PostDetailSheet({ post, onClose }: PostDetailSheetProps) {
  const { comments, loading, addComment } = useCommunityComments(post?.id || null);
  const { reactions, userReaction, toggleReaction } = useCommunityReactions(post?.id || null);
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
  const likeCount = reactions.filter((r) => r.reaction_type === "like").length;
  const helpfulCount = reactions.filter((r) => r.reaction_type === "helpful").length;

  return (
    <Sheet open={!!post} onOpenChange={() => onClose()}>
      <SheetContent side="bottom" className="h-[90vh] rounded-t-3xl p-0 overflow-hidden">
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center gap-3 p-4 border-b border-border">
            <ProfileChip
              user={post.profile ? { id: post.user_id, ...post.profile } : null}
              createdAt={post.created_at}
              isAnonymous={isAnon}
            />
          </div>

          {/* Scrollable Content */}
          <div className="flex-1 overflow-y-auto">
            <div className="p-4">
              {/* Post Image */}
              {post.image_url && (
                <div className="rounded-xl overflow-hidden mb-4">
                  <img
                    src={post.image_url}
                    alt="Post"
                    className="w-full h-64 object-cover"
                  />
                </div>
              )}

              {/* Post Content */}
              <p className="text-base leading-relaxed">
                {post.content
                  .replace("[INCIDENT] ", "")
                  .replace("[SUSPICIOUS] ", "")}
              </p>

              {/* Location */}
              {post.location_label && (
                <div className="flex items-center gap-1 text-xs text-muted-foreground mt-3">
                  <MapPin className="w-3 h-3" />
                  <span>
                    {/^-?\d+\.\d+,\s*-?\d+\.\d+$/.test(post.location_label.trim())
                      ? "Nearby"
                      : post.location_label}
                  </span>
                </div>
              )}

              {/* Reactions */}
              <div className="flex items-center gap-4 mt-4 pt-4 border-t border-border">
                <Button
                  variant={userReaction === "helpful" ? "default" : "outline"}
                  size="sm"
                  onClick={() => toggleReaction("helpful")}
                  className="gap-2 rounded-full"
                >
                  <Heart className={`w-4 h-4 ${userReaction === "helpful" ? "fill-current" : ""}`} />
                  {helpfulCount} Helpful
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="gap-2 rounded-full"
                >
                  <MessageCircle className="w-4 h-4" />
                  {comments.length} Comments
                </Button>
              </div>
            </div>

            {/* Comments Section */}
            <div className="border-t border-border">
              <h3 className="p-4 font-semibold text-sm">Comments</h3>
              
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                </div>
              ) : comments.length === 0 ? (
                <p className="px-4 pb-4 text-sm text-muted-foreground">
                  No comments yet. Be the first to comment!
                </p>
              ) : (
                <div className="px-4 pb-4 space-y-4">
                  {comments.map((comment) => {
                    const commentIsAnon = false; // Comments typically aren't anonymous
                    const commentName = comment.profile?.full_name || "User";
                    const commentInitials = getInitials(commentName);

                    return (
                      <div key={comment.id} className="flex gap-3">
                        <Avatar className="w-8 h-8 flex-shrink-0">
                          {comment.profile?.avatar_url && (
                            <AvatarImage src={comment.profile.avatar_url} />
                          )}
                          <AvatarFallback className="bg-secondary text-xs">
                            {commentInitials}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 text-xs">
                            <span className="font-medium">{commentName}</span>
                            <span className="text-muted-foreground">
                              {formatDistanceToNow(new Date(comment.created_at), {
                                addSuffix: true,
                              })}
                            </span>
                          </div>
                          <p className="text-sm mt-1">{comment.content}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Comment Input */}
          <div className="p-4 border-t border-border bg-background">
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Add a comment..."
                value={commentInput}
                onChange={(e) => setCommentInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleAddComment()}
                className="flex-1 px-4 py-2 bg-secondary rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
              <Button
                size="icon"
                onClick={handleAddComment}
                disabled={submitting || !commentInput.trim()}
                className="rounded-full"
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
