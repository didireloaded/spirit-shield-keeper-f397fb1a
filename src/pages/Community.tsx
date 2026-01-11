import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Loader2, Users } from "lucide-react";
import { BottomNav } from "@/components/BottomNav";
import { PostCard } from "@/components/community/PostCard";
import { CreatePostModal } from "@/components/community/CreatePostModal";
import { CommentsSheet } from "@/components/community/CommentsSheet";
import { useCommunityPosts, CommunityPost } from "@/hooks/useCommunityPosts";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";

const Community = () => {
  const { posts, loading, createPost, toggleReaction, reportPost } = useCommunityPosts();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedPost, setSelectedPost] = useState<CommunityPost | null>(null);
  const [reportingPostId, setReportingPostId] = useState<string | null>(null);
  const [reportReason, setReportReason] = useState("");
  const [fullscreenImage, setFullscreenImage] = useState<string | null>(null);

  const handleReport = async () => {
    if (reportingPostId && reportReason.trim()) {
      await reportPost(reportingPostId, reportReason.trim());
      setReportingPostId(null);
      setReportReason("");
    }
  };

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-background/95 backdrop-blur-sm border-b border-border">
        <div className="max-w-lg mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold">Community</h1>
              <p className="text-xs text-muted-foreground">
                What people around you are sharing
              </p>
            </div>
            <Button
              onClick={() => setShowCreateModal(true)}
              size="sm"
              className="gap-2"
            >
              <Plus className="w-4 h-4" />
              Post
            </Button>
          </div>
        </div>
      </header>

      {/* Feed */}
      <main className="max-w-lg mx-auto px-4 py-4 space-y-4">
        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="bg-card rounded-xl h-64 animate-pulse"
              />
            ))}
          </div>
        ) : posts.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-20 h-20 mx-auto bg-secondary rounded-full flex items-center justify-center mb-4">
              <Users className="w-10 h-10 text-muted-foreground" />
            </div>
            <h3 className="font-semibold text-lg mb-2">No posts yet</h3>
            <p className="text-muted-foreground text-sm mb-6">
              Be the first to share something with your community
            </p>
            <Button onClick={() => setShowCreateModal(true)}>
              Create First Post
            </Button>
          </div>
        ) : (
          posts.map((post, index) => (
            <motion.div
              key={post.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
            >
              <PostCard
                post={post}
                onLike={toggleReaction}
                onComment={setSelectedPost}
                onReport={setReportingPostId}
                onImageClick={setFullscreenImage}
              />
            </motion.div>
          ))
        )}
      </main>

      {/* Create Post Modal */}
      <CreatePostModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSubmit={createPost}
      />

      {/* Comments Sheet */}
      <CommentsSheet post={selectedPost} onClose={() => setSelectedPost(null)} />

      {/* Report Dialog */}
      <AlertDialog
        open={!!reportingPostId}
        onOpenChange={(open) => !open && setReportingPostId(null)}
      >
        <AlertDialogContent className="bg-card">
          <AlertDialogHeader>
            <AlertDialogTitle>Report Post</AlertDialogTitle>
            <AlertDialogDescription>
              Help us understand what's wrong with this post.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <Input
            placeholder="Reason for reporting..."
            value={reportReason}
            onChange={(e) => setReportReason(e.target.value)}
            className="bg-secondary border-0"
          />
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleReport}
              disabled={!reportReason.trim()}
            >
              Submit Report
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Fullscreen Image Viewer */}
      <AnimatePresence>
        {fullscreenImage && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black z-50 flex items-center justify-center"
            onClick={() => setFullscreenImage(null)}
          >
            <img
              src={fullscreenImage}
              alt="Full size"
              className="max-w-full max-h-full object-contain"
            />
          </motion.div>
        )}
      </AnimatePresence>

      <BottomNav />
    </div>
  );
};

export default Community;
