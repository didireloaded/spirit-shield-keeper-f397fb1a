/**
 * Community Screen
 * Mobile-first feed with clean, premium UI
 * Per PDF specs: PostCard, ProfileChip, FAB, Comments bottom sheet
 */

import { useState } from "react";
import { AnimatePresence } from "framer-motion";
import { MessageCircle } from "lucide-react";
import { BottomNav } from "@/components/BottomNav";
import {
  CommunityTopBar,
  PostCard,
  CreatePostFAB,
  CreatePostSheet,
  PostDetailSheet,
  FeedSkeleton,
} from "@/components/community";
import { useCommunityPosts, type CommunityPost } from "@/hooks/useCommunityPosts";
import { toast } from "sonner";

export default function Community() {
  const { posts, loading, creating, createPost, uploadImage } = useCommunityPosts();
  const [selectedPost, setSelectedPost] = useState<CommunityPost | null>(null);
  const [showCreatePost, setShowCreatePost] = useState(false);

  const handleShare = async (post: CommunityPost) => {
    try {
      await navigator.share({
        title: "Community Alert",
        text: post.content.slice(0, 100),
        url: window.location.href,
      });
    } catch {
      await navigator.clipboard.writeText(post.content);
      toast.success("Copied to clipboard");
    }
  };

  const handleCreatePost = async (data: {
    content: string;
    type: "danger" | "warning" | "info";
    image: File | null;
    isAnonymous: boolean;
    location: { lat: number; lng: number } | null;
  }) => {
    let imageUrl: string | null = null;
    if (data.image) {
      imageUrl = await uploadImage(data.image);
    }

    // Build content with type prefix for detection
    let finalContent = data.content;
    if (data.type === "danger") {
      finalContent = `[INCIDENT] ${data.content}`;
    } else if (data.type === "warning") {
      finalContent = `[SUSPICIOUS] ${data.content}`;
    }

    await createPost(finalContent, {
      imageUrl: imageUrl || undefined,
      locationLabel: data.location
        ? `${data.location.lat.toFixed(4)}, ${data.location.lng.toFixed(4)}`
        : undefined,
      visibility: data.isAnonymous ? "anonymous" : "public",
    });

    setShowCreatePost(false);
  };

  return (
    <div className="min-h-screen bg-background pb-24">
      <CommunityTopBar />

      <main className="max-w-lg mx-auto px-4 py-6">
        {/* Subtitle */}
        <p className="text-sm text-muted-foreground text-center mb-6">
          Local safety updates from people near you
        </p>

        {/* Feed */}
        {loading ? (
          <FeedSkeleton />
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
              {posts.map((post, index) => (
                <PostCard
                  key={post.id}
                  post={post}
                  index={index}
                  onClick={() => setSelectedPost(post)}
                  onShare={() => handleShare(post)}
                />
              ))}
            </AnimatePresence>
          </div>
        )}
      </main>

      {/* FAB */}
      <CreatePostFAB onClick={() => setShowCreatePost(true)} />

      {/* Create Post Sheet */}
      <CreatePostSheet
        open={showCreatePost}
        onOpenChange={setShowCreatePost}
        onSubmit={handleCreatePost}
        loading={creating}
      />

      {/* Post Detail Sheet */}
      <PostDetailSheet
        post={selectedPost}
        onClose={() => setSelectedPost(null)}
      />

      <BottomNav />
    </div>
  );
}
