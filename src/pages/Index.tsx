import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Camera, Heart, MessageSquare, Users } from "lucide-react";
import { BottomNav } from "@/components/BottomNav";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";

interface Post {
  id: string;
  content: string;
  image_url: string | null;
  likes_count: number;
  comments_count: number;
  created_at: string;
  user_id: string;
  location_name: string | null;
}

interface Profile {
  full_name: string | null;
  avatar_url: string | null;
}

const Index = () => {
  const { user } = useAuth();
  const [posts, setPosts] = useState<(Post & { profile?: Profile })[]>([]);
  const [loading, setLoading] = useState(true);
  const [newPostContent, setNewPostContent] = useState("");
  const [likedPosts, setLikedPosts] = useState<Set<string>>(new Set());
  const [filter, setFilter] = useState<"all" | "area" | "urgent">("all");

  useEffect(() => {
    fetchPosts();
    if (user) fetchLikedPosts();
  }, [user]);

  const fetchPosts = async () => {
    const { data, error } = await supabase
      .from("posts")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(20);

    if (!error && data) {
      // Fetch profiles for each post
      const userIds = [...new Set(data.map(p => p.user_id))];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, full_name, avatar_url")
        .in("id", userIds);

      const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);
      
      setPosts(data.map(post => ({
        ...post,
        profile: profileMap.get(post.user_id)
      })));
    }
    setLoading(false);
  };

  const fetchLikedPosts = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("post_likes")
      .select("post_id")
      .eq("user_id", user.id);
    
    if (data) {
      setLikedPosts(new Set(data.map(l => l.post_id)));
    }
  };

  const handleCreatePost = async () => {
    if (!user || !newPostContent.trim()) {
      toast.error("Please write something to post");
      return;
    }

    const { error } = await supabase.from("posts").insert({
      user_id: user.id,
      content: newPostContent.trim(),
    });

    if (error) {
      toast.error("Failed to create post");
    } else {
      toast.success("Post created!");
      setNewPostContent("");
      fetchPosts();
    }
  };

  const toggleLike = async (postId: string) => {
    if (!user) {
      toast.error("Please sign in to like posts");
      return;
    }

    const isLiked = likedPosts.has(postId);
    
    if (isLiked) {
      await supabase
        .from("post_likes")
        .delete()
        .eq("post_id", postId)
        .eq("user_id", user.id);
      
      setLikedPosts(prev => {
        const newSet = new Set(prev);
        newSet.delete(postId);
        return newSet;
      });
    } else {
      await supabase
        .from("post_likes")
        .insert({ post_id: postId, user_id: user.id });
      
      setLikedPosts(prev => new Set([...prev, postId]));
    }
  };

  const getAvatarEmoji = (name: string | null | undefined) => {
    const emojis = ["👩", "👨", "👧", "👦", "🧑", "👴", "👵"];
    if (!name) return emojis[0];
    return emojis[name.charCodeAt(0) % emojis.length];
  };

  return (
    <div className="min-h-screen bg-background pb-24">
      <main className="max-w-lg mx-auto px-4 py-6 space-y-4">
        {/* Create Post */}
        <div className="bg-card rounded-xl p-4">
          <textarea
            placeholder="What's happening in your area?"
            value={newPostContent}
            onChange={(e) => setNewPostContent(e.target.value)}
            className="w-full bg-secondary rounded-lg px-3 py-2 text-sm mb-2 resize-none focus:outline-none focus:ring-2 focus:ring-primary/20"
            rows={3}
          />
          <div className="flex gap-2">
            <button className="px-4 py-2 bg-secondary hover:bg-secondary/80 rounded-lg text-sm flex items-center gap-2 transition-colors">
              <Camera className="w-4 h-4" />
              Photo
            </button>
            <button 
              onClick={handleCreatePost}
              className="flex-1 py-2 bg-primary hover:bg-primary/90 rounded-lg text-sm font-medium text-primary-foreground transition-colors"
            >
              Post
            </button>
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="flex gap-2">
          {[
            { key: "all", label: "All Posts" },
            { key: "area", label: "My Area" },
            { key: "urgent", label: "Urgent" },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setFilter(tab.key as typeof filter)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                filter === tab.key 
                  ? "bg-primary text-primary-foreground" 
                  : "bg-card hover:bg-secondary"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Feed */}
        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-40 bg-card rounded-xl animate-pulse" />
            ))}
          </div>
        ) : posts.length > 0 ? (
          <div className="space-y-4">
            {posts.map((post, index) => (
              <motion.div
                key={post.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className="bg-card rounded-xl p-4"
              >
                <div className="flex items-center gap-2 mb-3">
                  <div className="text-3xl">{getAvatarEmoji(post.profile?.full_name)}</div>
                  <div className="flex-1">
                    <p className="font-semibold">{post.profile?.full_name || "User"}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(post.created_at), { addSuffix: true })}
                      {post.location_name && ` • ${post.location_name}`}
                    </p>
                  </div>
                </div>
                <p className="mb-4">{post.content}</p>
                <div className="flex gap-6 text-muted-foreground">
                  <button 
                    onClick={() => toggleLike(post.id)}
                    className={`flex items-center gap-2 transition-colors ${
                      likedPosts.has(post.id) ? "text-destructive" : "hover:text-destructive"
                    }`}
                  >
                    <Heart 
                      className="w-5 h-5" 
                      fill={likedPosts.has(post.id) ? "currentColor" : "none"} 
                    />
                    <span>{post.likes_count + (likedPosts.has(post.id) ? 1 : 0)}</span>
                  </button>
                  <button className="flex items-center gap-2 hover:text-primary transition-colors">
                    <MessageSquare className="w-5 h-5" />
                    <span>{post.comments_count}</span>
                  </button>
                  <button className="flex items-center gap-2 hover:text-primary transition-colors">
                    <Users className="w-5 h-5" />
                    <span>Share</span>
                  </button>
                </div>
              </motion.div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12 bg-card rounded-xl">
            <p className="text-muted-foreground">No posts yet</p>
            <p className="text-sm text-muted-foreground mt-1">Be the first to share something!</p>
          </div>
        )}
      </main>

      <BottomNav />
    </div>
  );
};

export default Index;
