import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Heart, MessageSquare, Users } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { formatDistanceToNow } from 'date-fns';

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

export const HomeFeed = () => {
  const [posts, setPosts] = useState<(Post & { profile?: Profile })[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPosts();
  }, []);

  const fetchPosts = async () => {
    const { data, error } = await supabase
      .from('posts')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(10);

    if (!error && data) {
      const userIds = [...new Set(data.map((p) => p.user_id))];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name, avatar_url')
        .in('id', userIds);

      const profileMap = new Map(profiles?.map((p) => [p.id, p]) || []);

      setPosts(
        data.map((post) => ({
          ...post,
          profile: profileMap.get(post.user_id),
        }))
      );
    }
    setLoading(false);
  };

  const getAvatarEmoji = (name: string | null | undefined) => {
    const emojis = ['👩', '👨', '👧', '👦', '🧑', '👴', '👵'];
    if (!name) return emojis[0];
    return emojis[name.charCodeAt(0) % emojis.length];
  };

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-32 bg-card rounded-xl animate-pulse" />
        ))}
      </div>
    );
  }

  if (posts.length === 0) {
    return (
      <div className="text-center py-8 bg-card rounded-xl">
        <p className="text-muted-foreground">No posts yet</p>
        <p className="text-sm text-muted-foreground mt-1">
          Be the first to share something!
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold text-gray-900 dark:text-white">
        Community Feed
      </h2>
      {posts.map((post, index) => (
        <motion.div
          key={post.id}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.05 }}
          className="bg-white dark:bg-card rounded-2xl p-4 shadow-sm border border-gray-100 dark:border-border"
        >
          <div className="flex items-center gap-2 mb-3">
            <div className="text-2xl">
              {getAvatarEmoji(post.profile?.full_name)}
            </div>
            <div className="flex-1">
              <p className="font-semibold text-gray-900 dark:text-white">
                {post.profile?.full_name || 'Anonymous'}
              </p>
              <p className="text-xs text-muted-foreground">
                {formatDistanceToNow(new Date(post.created_at), {
                  addSuffix: true,
                })}
                {post.location_name && ` • ${post.location_name}`}
              </p>
            </div>
          </div>
          <p className="mb-3 text-gray-800 dark:text-gray-200">{post.content}</p>
          <div className="flex gap-6 text-muted-foreground">
            <button className="flex items-center gap-2 hover:text-destructive transition-colors">
              <Heart className="w-5 h-5" />
              <span>{post.likes_count}</span>
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
  );
};
