/**
 * Community Screen
 * Unified single feed with origin-type icons on each thread card.
 * No channel separation — all threads in one scrollable feed.
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
  CommunityThreadCard,
} from "@/components/community";
import { useCommunityPosts, type CommunityPost } from "@/hooks/useCommunityPosts";
import { useCommunityThreads, type CommunityThread } from "@/hooks/useCommunityThreads";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export default function Community() {
  const { posts, loading: postsLoading, creating, createPost, uploadImage } = useCommunityPosts();
  const { threads: allThreads, loading: threadsLoading, hasMore, loadMore } = useCommunityThreads();
  const [selectedPost, setSelectedPost] = useState<CommunityPost | null>(null);
  const [showCreatePost, setShowCreatePost] = useState(false);

  // Always show all threads — unified feed, no filter
  const threads = allThreads;
  const loading = postsLoading || threadsLoading;

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

  const handleOpenThread = (thread: CommunityThread) => {
    // Thread detail view — future enhancement
  };

  return (
    <div className="min-h-screen bg-background pb-24">
      <CommunityTopBar />

      <main className="max-w-lg mx-auto px-4 py-4 space-y-4">
        {loading ? (
          <FeedSkeleton />
        ) : (
          <>
            {/* Unified thread feed */}
            {threads.length > 0 && (
              <div className="space-y-3">
                <AnimatePresence>
                  {threads.map((thread) => (
                    <CommunityThreadCard
                      key={`${thread.type}-${thread.id}`}
                      thread={thread}
                      onOpen={handleOpenThread}
                    />
                  ))}
                </AnimatePresence>
                {hasMore && (
                  <div className="text-center pt-2">
                    <Button variant="ghost" size="sm" onClick={loadMore} className="text-xs text-muted-foreground">
                      Load more threads
                    </Button>
                  </div>
                )}
              </div>
            )}

            {/* Community posts */}
            {posts.length > 0 && threads.length > 0 && (
              <div className="flex items-center gap-2 pt-2">
                <div className="h-px flex-1 bg-border" />
                <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Community Posts</span>
                <div className="h-px flex-1 bg-border" />
              </div>
            )}
            {posts.length === 0 && threads.length === 0 ? (
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
          </>
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
