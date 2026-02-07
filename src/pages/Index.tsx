import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Camera, Heart, MessageSquare, Users, X, AlertTriangle } from "lucide-react";
import { BottomNav } from "@/components/BottomNav";
import { SafetyStatusBanner } from "@/components/home/SafetyStatusBanner";
import { QuickSafetyActions } from "@/components/home/QuickSafetyActions";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { useNavigate } from "react-router-dom";
import { pageVariants, listContainerVariants, listItemVariants } from "@/lib/animations";

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

// Detect incident keywords in post content
const detectIncidentKeywords = (content: string) => {
  const incidentPatterns: Record<string, string[]> = {
    emergency: ['help', 'emergency', 'urgent', 'sos', 'danger'],
    theft: ['stolen', 'robbery', 'theft', 'burglary', 'break-in'],
    assault: ['assault', 'attack', 'violence', 'fight', 'threat'],
    suspicious: ['suspicious', 'sketchy', 'weird', 'strange'],
    accident: ['accident', 'crash', 'collision', 'injury'],
  };

  const lowerContent = content.toLowerCase();

  for (const [type, keywords] of Object.entries(incidentPatterns)) {
    const found = keywords.filter(k => lowerContent.includes(k));
    if (found.length > 0) return { hasIncident: true, type, keywords: found };
  }

  return { hasIncident: false, type: null, keywords: [] as string[] };
};

const Index = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [posts, setPosts] = useState<(Post & { profile?: Profile })[]>([]);
  const [loading, setLoading] = useState(true);
  const [newPostContent, setNewPostContent] = useState("");
  const [likedPosts, setLikedPosts] = useState<Set<string>>(new Set());
  const [filter, setFilter] = useState<"all" | "area" | "urgent">("all");
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    fetchPosts();
    if (user) fetchLikedPosts();
  }, [user, filter]);

  // Real-time feed updates
  useEffect(() => {
    const channel = supabase
      .channel('posts-realtime')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'posts' }, async (payload) => {
        const { data: newPost } = await supabase.from('posts').select('*').eq('id', payload.new.id).single();
        if (newPost) {
          const { data: profile } = await supabase.from('profiles').select('id, full_name, avatar_url').eq('id', newPost.user_id).single();
          setPosts(prev => [{ ...newPost, profile: profile || undefined }, ...prev]);
          if (newPost.user_id !== user?.id) {
            toast.info('New post in your feed', {
              action: { label: 'View', onClick: () => window.scrollTo({ top: 0, behavior: 'smooth' }) },
            });
          }
        }
      })
      .subscribe();

    return () => { channel.unsubscribe(); };
  }, [user?.id]);

  const fetchPosts = async () => {
    let query = supabase.from("posts").select("*").order("created_at", { ascending: false }).limit(20);

    if (filter === "urgent") {
      query = query.or("content.ilike.%help%,content.ilike.%emergency%,content.ilike.%urgent%,content.ilike.%stolen%,content.ilike.%assault%");
    }

    const { data, error } = await query;

    if (!error && data) {
      const userIds = [...new Set(data.map(p => p.user_id))];
      const { data: profiles } = await supabase.from("profiles").select("id, full_name, avatar_url").in("id", userIds);
      const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);
      setPosts(data.map(post => ({ ...post, profile: profileMap.get(post.user_id) })));
    }
    setLoading(false);
  };

  const fetchLikedPosts = async () => {
    if (!user) return;
    const { data } = await supabase.from("post_likes").select("post_id").eq("user_id", user.id);
    if (data) setLikedPosts(new Set(data.map(l => l.post_id)));
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { toast.error('Image must be less than 5MB'); return; }
    if (!file.type.startsWith('image/')) { toast.error('Please select an image file'); return; }
    setSelectedImage(file);
    const reader = new FileReader();
    reader.onloadend = () => setImagePreview(reader.result as string);
    reader.readAsDataURL(file);
  };

  const uploadImage = async (file: File): Promise<string | null> => {
    if (!user) return null;
    setUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}/${Date.now()}.${fileExt}`;
      const { error: uploadError } = await supabase.storage.from('post-images').upload(fileName, file);
      if (uploadError) throw uploadError;
      const { data: { publicUrl } } = supabase.storage.from('post-images').getPublicUrl(fileName);
      return publicUrl;
    } catch (error) {
      console.error('Image upload failed:', error);
      toast.error('Failed to upload image');
      return null;
    } finally {
      setUploading(false);
    }
  };

  const handleCreatePost = async () => {
    if (!user || !newPostContent.trim()) { toast.error("Please write something to post"); return; }

    let imageUrl: string | null = null;
    if (selectedImage) {
      imageUrl = await uploadImage(selectedImage);
      if (!imageUrl) return;
    }

    const { error } = await supabase.from("posts").insert({
      user_id: user.id,
      content: newPostContent.trim(),
      image_url: imageUrl,
    });

    if (error) {
      toast.error("Failed to create post");
    } else {
      toast.success("Post created!");
      setNewPostContent("");
      setSelectedImage(null);
      setImagePreview(null);
      fetchPosts();
    }
  };

  const toggleLike = async (postId: string) => {
    if (!user) { toast.error("Please sign in to like posts"); return; }
    const isLiked = likedPosts.has(postId);

    if (isLiked) {
      await supabase.from("post_likes").delete().eq("post_id", postId).eq("user_id", user.id);
      setLikedPosts(prev => { const s = new Set(prev); s.delete(postId); return s; });
    } else {
      await supabase.from("post_likes").insert({ post_id: postId, user_id: user.id });
      setLikedPosts(prev => new Set([...prev, postId]));
    }
  };

  const getAvatarEmoji = (name: string | null | undefined) => {
    const emojis = ["👩", "👨", "👧", "👦", "🧑", "👴", "👵"];
    if (!name) return emojis[0];
    return emojis[name.charCodeAt(0) % emojis.length];
  };

  return (
    <motion.div
      variants={pageVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      className="min-h-screen bg-background pb-24"
    >
      <main className="max-w-lg mx-auto px-4 py-6 space-y-4">
        {/* Safety Status Banner */}
        <motion.div initial={{ y: -20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.1 }}>
          <SafetyStatusBanner />
        </motion.div>

        {/* Quick Safety Actions */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}>
          <QuickSafetyActions />
        </motion.div>

        {/* Create Post */}
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="bg-card rounded-xl p-4"
        >
          <textarea
            placeholder="What's happening in your area?"
            value={newPostContent}
            onChange={(e) => setNewPostContent(e.target.value)}
            className="w-full bg-secondary rounded-lg px-3 py-2 text-sm mb-2 resize-none focus:outline-none focus:ring-2 focus:ring-primary/20"
            rows={3}
          />

          {/* Image Preview */}
          {imagePreview && (
            <div className="relative mb-2">
              <img src={imagePreview} alt="Preview" className="w-full h-48 object-cover rounded-lg" />
              <button
                onClick={() => { setSelectedImage(null); setImagePreview(null); }}
                className="absolute top-2 right-2 p-1.5 bg-black/50 rounded-full text-white hover:bg-black/70"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          <div className="flex gap-2">
            <input type="file" accept="image/*" onChange={handleImageSelect} className="hidden" id="image-upload" />
            <label
              htmlFor="image-upload"
              className="px-4 py-2 bg-secondary hover:bg-secondary/80 rounded-lg text-sm flex items-center gap-2 transition-colors cursor-pointer"
            >
              <Camera className="w-4 h-4" />
              Photo
            </label>
            <button
              onClick={handleCreatePost}
              disabled={uploading}
              className="flex-1 py-2 bg-primary hover:bg-primary/90 rounded-lg text-sm font-medium text-primary-foreground transition-colors disabled:opacity-50"
            >
              {uploading ? 'Uploading...' : 'Post'}
            </button>
          </div>
        </motion.div>

        {/* Filter Tabs */}
        <motion.div
          initial={{ x: -20, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="flex gap-2"
        >
          {[
            { key: "all", label: "All Posts" },
            { key: "area", label: "My Area" },
            { key: "urgent", label: "🔴 Urgent" },
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
        </motion.div>

        {/* Feed */}
        {loading ? (
          <motion.div variants={listContainerVariants} initial="initial" animate="animate" className="space-y-4">
            {[1, 2, 3].map(i => (
              <motion.div key={i} variants={listItemVariants} className="h-40 bg-card rounded-xl skeleton" />
            ))}
          </motion.div>
        ) : posts.length > 0 ? (
          <motion.div variants={listContainerVariants} initial="initial" animate="animate" className="space-y-4">
            <AnimatePresence mode="popLayout">
              {posts.map((post) => {
                const incidentInfo = detectIncidentKeywords(post.content);

                return (
                  <motion.div
                    key={post.id}
                    variants={listItemVariants}
                    layout
                    exit={{ opacity: 0, scale: 0.9 }}
                    whileTap={{ scale: 0.99 }}
                    className={`bg-card rounded-xl p-4 ${incidentInfo.hasIncident ? 'ring-2 ring-destructive/30' : ''}`}
                  >
                    {/* Incident Detection Badge */}
                    {incidentInfo.hasIncident && (
                      <div className="flex items-center gap-2 mb-2 px-3 py-1.5 bg-destructive/10 rounded-lg">
                        <AlertTriangle className="w-4 h-4 text-destructive" />
                        <span className="text-xs font-medium text-destructive capitalize">
                          {incidentInfo.type} Alert Detected
                        </span>
                        <button
                          onClick={() => navigate('/map')}
                          className="ml-auto text-xs text-primary hover:underline"
                        >
                          Report to Map
                        </button>
                      </div>
                    )}

                    <div className="flex items-center gap-2 mb-3">
                      {post.profile?.avatar_url ? (
                        <img src={post.profile.avatar_url} alt="" className="w-10 h-10 rounded-full object-cover" />
                      ) : (
                        <div className="text-3xl">{getAvatarEmoji(post.profile?.full_name)}</div>
                      )}
                      <div className="flex-1">
                        <p className="font-semibold">{post.profile?.full_name || "User"}</p>
                        <p className="text-xs text-muted-foreground">
                          {formatDistanceToNow(new Date(post.created_at), { addSuffix: true })}
                          {post.location_name && ` • ${post.location_name}`}
                        </p>
                      </div>
                    </div>

                    <p className="mb-3">{post.content}</p>

                    {/* Post Image */}
                    {post.image_url && (
                      <img
                        src={post.image_url}
                        alt="Post image"
                        className="w-full h-48 object-cover rounded-lg mb-3"
                        loading="lazy"
                      />
                    )}

                    <div className="flex gap-6 text-muted-foreground">
                      <motion.button
                        onClick={() => toggleLike(post.id)}
                        whileTap={{ scale: 0.9 }}
                        className={`flex items-center gap-2 transition-colors ${
                          likedPosts.has(post.id) ? "text-destructive" : "hover:text-destructive"
                        }`}
                      >
                        <motion.div
                          animate={likedPosts.has(post.id) ? { scale: [1, 1.3, 1] } : {}}
                          transition={{ duration: 0.3 }}
                        >
                          <Heart className="w-5 h-5" fill={likedPosts.has(post.id) ? "currentColor" : "none"} />
                        </motion.div>
                        <span>{post.likes_count + (likedPosts.has(post.id) ? 1 : 0)}</span>
                      </motion.button>
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
                );
              })}
            </AnimatePresence>
          </motion.div>
        ) : (
          <div className="text-center py-12 bg-card rounded-xl">
            <p className="text-muted-foreground">No posts yet</p>
            <p className="text-sm text-muted-foreground mt-1">Be the first to share something!</p>
          </div>
        )}
      </main>

      <BottomNav />
    </motion.div>
  );
};

export default Index;
