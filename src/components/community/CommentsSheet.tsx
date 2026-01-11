import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Send, Loader2 } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useCommunityComments, CommunityPost } from "@/hooks/useCommunityPosts";

interface CommentsSheetProps {
  post: CommunityPost | null;
  onClose: () => void;
}

export const CommentsSheet = ({ post, onClose }: CommentsSheetProps) => {
  const { comments, loading, addComment } = useCommunityComments(post?.id || null);
  const [newComment, setNewComment] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim()) return;

    setIsSubmitting(true);
    const { error } = await addComment(newComment.trim());
    if (!error) {
      setNewComment("");
    }
    setIsSubmitting(false);
  };

  return (
    <AnimatePresence>
      {post && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/60 z-50 flex items-end"
          onClick={onClose}
        >
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            onClick={(e) => e.stopPropagation()}
            className="w-full bg-card rounded-t-3xl max-h-[80vh] flex flex-col"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-border">
              <h3 className="font-semibold">Comments</h3>
              <button
                onClick={onClose}
                className="p-2 rounded-full bg-secondary hover:bg-secondary/80 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Original Post Preview */}
            <div className="p-4 border-b border-border bg-secondary/30">
              <div className="flex items-center gap-2 mb-2">
                <Avatar className="w-6 h-6">
                  <AvatarImage src={post.profiles?.avatar_url || undefined} />
                  <AvatarFallback className="text-xs">
                    {(post.profiles?.full_name || "A")[0]}
                  </AvatarFallback>
                </Avatar>
                <span className="text-sm font-medium">
                  {post.profiles?.full_name || "Anonymous"}
                </span>
              </div>
              <p className="text-sm text-muted-foreground line-clamp-2">
                {post.content}
              </p>
            </div>

            {/* Comments List */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {loading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                </div>
              ) : comments.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-muted-foreground text-sm">
                    No comments yet. Be the first to comment!
                  </p>
                </div>
              ) : (
                comments.map((comment) => {
                  const userName = comment.profiles?.full_name || "Anonymous";
                  const userInitials = userName[0].toUpperCase();

                  return (
                    <div key={comment.id} className="flex gap-3">
                      <Avatar className="w-8 h-8 flex-shrink-0">
                        <AvatarImage
                          src={comment.profiles?.avatar_url || undefined}
                        />
                        <AvatarFallback className="text-xs bg-secondary">
                          {userInitials}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-baseline gap-2">
                          <span className="text-sm font-medium">{userName}</span>
                          <span className="text-xs text-muted-foreground">
                            {formatDistanceToNow(new Date(comment.created_at), {
                              addSuffix: true,
                            })}
                          </span>
                        </div>
                        <p className="text-sm mt-1 whitespace-pre-wrap break-words">
                          {comment.content}
                        </p>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Comment Input */}
            <form
              onSubmit={handleSubmit}
              className="p-4 border-t border-border flex gap-2"
            >
              <Input
                placeholder="Write a comment..."
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                className="flex-1 bg-secondary border-0"
                disabled={isSubmitting}
              />
              <Button
                type="submit"
                size="icon"
                disabled={!newComment.trim() || isSubmitting}
              >
                {isSubmitting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
              </Button>
            </form>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
